"""Holt-Winters demand forecast. Classical statsmodels only — no language model.

Days of cover are on-hand units divided by this worker's average daily forecast.
The orchestrator receives that number and is not asked to recompute it.
"""

from __future__ import annotations

import logging
import math
import warnings

import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from app.errors import InsufficientHistory

logger = logging.getLogger(__name__)

SEASONAL_PERIODS = 7
MIN_HISTORY_DAYS = SEASONAL_PERIODS * 2
FORECAST_HORIZON = 7


def build_dummy_history(days: int = 28) -> pd.DataFrame:
    """Reproducible daily issue series with a Monday–Sunday pattern.

    The frame is the default input for ``forecast_seven_day_demand`` so the
    fit can be inspected without a database. Clinical scans pass ``demand_logs``
    through ``history_from_demand_logs`` instead of this fixture.
    """
    if days < MIN_HISTORY_DAYS:
        raise ValueError(
            f"Holt-Winters weekly seasonality needs at least {MIN_HISTORY_DAYS} daily rows."
        )
    dates = pd.date_range("2026-09-07", periods=days, freq="D")
    weekly = (8, 9, 10, 9, 11, 6, 4)  # Mon .. Sun
    values = [weekly[int(day.dayofweek)] for day in dates]
    return pd.DataFrame({"ds": dates, "y": values})


def history_from_demand_logs(rows: list[dict]) -> pd.DataFrame:
    """Pivot daily ``units_issued`` rows into the forecast frame.

    Missing calendar days inside the span are filled with zero, which is correct
    only when ``demand_logs`` is a complete daily issue ledger.
    """
    if not rows:
        raise InsufficientHistory("No demand_logs rows for this facility and blood group.")
    frame = pd.DataFrame(rows)
    frame["ds"] = pd.to_datetime(pd.to_datetime(frame["log_date"], utc=True).dt.date)
    frame["y"] = pd.to_numeric(frame["units_issued"], errors="coerce")
    if frame["y"].isna().any():
        raise InsufficientHistory("demand_logs contains a non-numeric units_issued value.")
    frame = frame.groupby("ds", as_index=False)["y"].sum().sort_values("ds")
    span = pd.date_range(frame["ds"].iloc[0], frame["ds"].iloc[-1], freq="D")
    frame = (
        frame.set_index("ds")
        .reindex(span, fill_value=0)
        .rename_axis("ds")
        .reset_index()
    )
    if len(frame) < MIN_HISTORY_DAYS:
        raise InsufficientHistory(
            f"Need {MIN_HISTORY_DAYS} daily points for weekly Holt-Winters; found {len(frame)}."
        )
    return frame.loc[:, ["ds", "y"]]


def forecast_seven_day_demand(history: pd.DataFrame | None = None) -> dict:
    """Fit additive Holt-Winters and return the next 7 days of demand.

    ``history`` uses columns ``ds`` (date) and ``y`` (units issued). When it is
    omitted, a 28-day dummy series is fit so the function can be checked alone.
    If the seasonal fit fails, the worker falls back to the trailing 7-day mean.
    That fallback is still deterministic Python.
    """
    frame = build_dummy_history() if history is None else _copy_history(history)
    if len(frame) < MIN_HISTORY_DAYS:
        raise InsufficientHistory(
            f"Need {MIN_HISTORY_DAYS} daily points for weekly Holt-Winters; found {len(frame)}."
        )

    method = "holt_winters"
    try:
        forecast = _fit_holt_winters(frame["y"].to_numpy(dtype=float))
    except Exception as exc:
        logger.warning("Holt-Winters fit failed (%s); using the trailing 7-day mean.", exc)
        method = "trailing_mean"
        trailing = float(frame["y"].tail(FORECAST_HORIZON).mean())
        forecast = [max(trailing, 0.0)] * FORECAST_HORIZON

    daily = [round(max(value, 0.0), 4) for value in forecast]
    if any(math.isnan(value) for value in daily):
        trailing = float(frame["y"].tail(FORECAST_HORIZON).mean())
        daily = [round(max(trailing, 0.0), 4)] * FORECAST_HORIZON
        method = "trailing_mean"

    last = pd.Timestamp(frame["ds"].iloc[-1])
    future = pd.date_range(last + pd.Timedelta(days=1), periods=FORECAST_HORIZON, freq="D")
    average = sum(daily) / FORECAST_HORIZON
    return {
        "method": method,
        "history_points": int(len(frame)),
        "average_daily_demand": round(average, 4),
        "total_seven_day": round(sum(daily), 4),
        "daily_demand": [
            {"date": day.date().isoformat(), "units": units}
            for day, units in zip(future, daily)
        ],
    }


def days_of_cover(units_on_hand: int, average_daily_demand: float) -> float:
    """On-hand units divided by the forecast daily rate. Infinite when demand is 0."""
    if units_on_hand < 0:
        raise ValueError("units_on_hand cannot be negative")
    if average_daily_demand <= 0:
        return math.inf if units_on_hand > 0 else 0.0
    return units_on_hand / average_daily_demand


def _copy_history(history: pd.DataFrame) -> pd.DataFrame:
    if "ds" not in history.columns or "y" not in history.columns:
        raise ValueError("history must contain columns 'ds' and 'y'")
    frame = history.loc[:, ["ds", "y"]].copy()
    frame["ds"] = pd.to_datetime(frame["ds"])
    frame["y"] = pd.to_numeric(frame["y"], errors="coerce")
    if frame["y"].isna().any() or frame["ds"].isna().any():
        raise ValueError("history contains an unparseable date or demand value")
    return frame.sort_values("ds").reset_index(drop=True)


def _fit_holt_winters(values) -> list[float]:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = ExponentialSmoothing(
            values,
            trend="add",
            seasonal="add",
            seasonal_periods=SEASONAL_PERIODS,
            initialization_method="estimated",
        )
        fitted = model.fit(optimized=True, use_brute=False)
        forecast = fitted.forecast(FORECAST_HORIZON)
    return [float(value) for value in forecast]
