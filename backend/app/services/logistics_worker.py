"""Haversine corridors and the donor reserve rule. Deterministic — no language model.

A donor is eligible only when both of these hold:

* elapsed time (road minutes + handling buffer) is strictly less than the
  remaining shelf life of each selected unit, and within the cold-chain cap
* post-transfer days of cover are at least 3

Days of cover are ``(current_stock - requested_units) / daily_demand``.
The unit check ``remaining < 3`` is that rule only when the facility issues
exactly one unit per day. ``daily_demand`` comes from the forecast worker.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.timestamps import parse_timestamp, utc_now

EARTH_RADIUS_KM = 6371.0088
ROAD_SPEED_KMH = 55.0
HANDLING_BUFFER_MINUTES = 20
COLD_CHAIN_MAX_HOURS = 4.0
MIN_RESERVE_DAYS = 3.0
MAX_CORRIDORS = 3


@dataclass(frozen=True)
class Corridor:
    """One donor that passed distance, shelf-life, cold-chain, and reserve checks."""

    donor_facility_id: str
    donor_name: str
    donor_level_label: str
    recipient_facility_id: str
    distance_km: float
    road_minutes: int
    handling_minutes: int
    elapsed_minutes: int
    current_stock: int
    requested_units: int
    post_transfer_units: int
    daily_demand: float
    post_transfer_cover_days: float
    cold_chain_viable: bool
    units: tuple[dict, ...]

    @property
    def unit_codes(self) -> tuple[str, ...]:
        return tuple(unit["unit_code"] for unit in self.units)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres between two WGS84 points."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    a = min(1.0, max(0.0, a))
    return EARTH_RADIUS_KM * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def transit_minutes(distance_km: float, speed_kmh: float = ROAD_SPEED_KMH) -> int:
    """Road time only. The handling buffer is added by ``filter_donor_facilities``."""
    if distance_km < 0:
        raise ValueError("distance_km cannot be negative")
    if speed_kmh <= 0:
        raise ValueError("speed_kmh must be positive")
    if distance_km == 0:
        return 0
    return max(1, int(round(distance_km / speed_kmh * 60)))


def reserve_is_safe(
    current_stock: int,
    requested_units: int,
    daily_demand: float,
) -> tuple[bool, float]:
    """Return whether the donor keeps three days of cover, and that cover.

    ``post = current_stock - requested_units``. The donor is rejected when
    ``post / daily_demand < 3``. With a demand of one unit per day this is the
    same test as ``post < 3``. A demand of zero means the projected draw is
    zero, so any non-negative remainder has unbounded cover.
    """
    if current_stock < 0 or requested_units < 0:
        raise ValueError("stock and requested units cannot be negative")
    remaining = current_stock - requested_units
    if remaining < 0:
        return False, 0.0
    if daily_demand <= 0:
        return True, math.inf
    days = remaining / daily_demand
    return days + 1e-9 >= MIN_RESERVE_DAYS, days


def filter_donor_facilities(
    recipient: dict,
    donors: list[dict],
    inventory_by_facility: dict[str, list[dict]],
    daily_demand_by_facility: dict[str, float],
    requested_units: int,
    now: datetime | None = None,
) -> list[Corridor]:
    """Return at most three feasible donors, soonest-expiring stock first.

    Each inventory row needs ``unit_code`` and ``expiry_date``. Facility rows
    need ``id``, ``name``, ``latitude``, and ``longitude``.
    """
    if requested_units < 1:
        raise ValueError("requested_units must be at least 1")
    moment = now or utc_now()
    recipient_point = _coordinates(recipient)
    if recipient_point is None:
        return []

    corridors: list[Corridor] = []
    for donor in donors:
        donor_id = str(donor["id"]).lower()
        if donor_id == str(recipient.get("id")).lower():
            continue
        recipient_region = recipient.get("region_code")
        if recipient_region and donor.get("region_code") != recipient_region:
            continue
        donor_point = _coordinates(donor)
        if donor_point is None:
            continue
        if donor_id not in daily_demand_by_facility:
            continue
        daily_demand = float(daily_demand_by_facility[donor_id])
        stock = list(inventory_by_facility.get(donor_id, []))
        safe, cover_days = reserve_is_safe(len(stock), requested_units, daily_demand)
        if not safe:
            continue

        distance = haversine_km(*recipient_point, *donor_point)
        if distance <= 0:
            continue
        road = transit_minutes(distance)
        elapsed = road + HANDLING_BUFFER_MINUTES
        if elapsed / 60 > COLD_CHAIN_MAX_HOURS:
            continue

        viable = _units_that_outlast(stock, elapsed, moment)
        if len(viable) < requested_units:
            continue
        chosen = tuple(viable[:requested_units])
        corridors.append(
            Corridor(
                donor_facility_id=donor_id,
                donor_name=str(donor.get("name") or donor_id),
                donor_level_label=str(donor.get("level_label") or ""),
                recipient_facility_id=str(recipient["id"]).lower(),
                distance_km=distance,
                road_minutes=road,
                handling_minutes=HANDLING_BUFFER_MINUTES,
                elapsed_minutes=elapsed,
                current_stock=len(stock),
                requested_units=requested_units,
                post_transfer_units=len(stock) - requested_units,
                daily_demand=daily_demand,
                post_transfer_cover_days=cover_days,
                cold_chain_viable=True,
                units=chosen,
            )
        )

    corridors.sort(
        key=lambda corridor: (
            parse_timestamp(corridor.units[0]["expiry_date"]),
            corridor.elapsed_minutes,
            corridor.distance_km,
        )
    )
    return corridors[:MAX_CORRIDORS]


def _coordinates(facility: dict) -> tuple[float, float] | None:
    lat = facility.get("latitude")
    lon = facility.get("longitude")
    if lat is None or lon is None:
        return None
    return float(lat), float(lon)


def _units_that_outlast(units: list[dict], elapsed_minutes: int, now: datetime) -> list[dict]:
    """FEFO order. Remaining shelf life must be strictly longer than elapsed time."""
    elapsed = timedelta(minutes=elapsed_minutes)
    viable: list[tuple[datetime, dict]] = []
    for unit in units:
        expiry = parse_timestamp(unit["expiry_date"])
        if expiry - now <= elapsed:
            continue
        viable.append((expiry, unit))
    viable.sort(key=lambda item: item[0])
    return [unit for _, unit in viable]
