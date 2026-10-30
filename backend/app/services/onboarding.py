"""KMHFR onboarding. Deterministic HTTP only — no language model.

Demo registry codes (hackathon fixtures, not official MFL assignments):

    10001  Nairobi Hospital Hub                 Nairobi       Level 6
    10002  Kuresoi Sub-County Hospital          Nakuru        Level 4
    10003  Nakuru Level 5 Regional Hospital     Nakuru        Level 5
    10004  Naivasha District Hospital           Nakuru        Level 4
    10005  Eldoret Referral & Teaching Hospital Uasin Gishu  Level 6

Set KMHFR_LIVE=1 to GET {KMHFR_BASE_URL}/facilities/{mfl_code} instead.
"""

from __future__ import annotations

import json
import os

import requests
from requests.adapters import HTTPAdapter

from app.regions import region_for_county, region_names

LEVEL_LABELS = {
    1: "Level 1 Community",
    2: "Level 2 Dispensary",
    3: "Level 3 Health Centre",
    4: "Level 4 Sub-County",
    5: "Level 5 Regional Referral",
    6: "Level 6 National Referral",
}

# Coordinates match the React network map so a demo onboard lands on the same pins.
_FIXTURES: tuple[dict, ...] = (
    {
        "mfl_code": "10001",
        "name": "Nairobi Hospital Hub",
        "county": "Nairobi",
        "keph_level": 6,
        "level_label": "Level 6 / Tertiary Hub",
        "latitude": -1.2921,
        "longitude": 36.8219,
    },
    {
        "mfl_code": "10002",
        "name": "Kuresoi Sub-County Hospital",
        "county": "Nakuru",
        "keph_level": 4,
        "level_label": "Level 4 Sub-County",
        "latitude": -0.4821,
        "longitude": 35.7378,
    },
    {
        "mfl_code": "10003",
        "name": "Nakuru Level 5 Regional Hospital",
        "county": "Nakuru",
        "keph_level": 5,
        "level_label": "Level 5 Regional Referral",
        "latitude": -0.2833,
        "longitude": 36.0667,
    },
    {
        "mfl_code": "10004",
        "name": "Naivasha District Hospital",
        "county": "Nakuru",
        "keph_level": 4,
        "level_label": "Level 4 District Hospital",
        "latitude": -0.7172,
        "longitude": 36.4310,
    },
    {
        "mfl_code": "10005",
        "name": "Eldoret Referral & Teaching Hospital",
        "county": "Uasin Gishu",
        "keph_level": 6,
        "level_label": "Level 6 / National Teaching Hub",
        "latitude": 0.5143,
        "longitude": 35.2698,
    },
)

SIMULATED_REGISTRY: dict[str, dict] = {row["mfl_code"]: dict(row) for row in _FIXTURES}
SIMULATED_ORIGIN = "https://kmhfr.local"


class _SimulatedRegistryAdapter(HTTPAdapter):
    """Answer GET /facilities/{code} from the in-process registry.

    The requests session still performs a real HTTP round-trip through this
    transport. Unknown codes are HTTP 404. Nothing is sent to the public internet.
    """

    def send(self, request, stream=False, timeout=None, verify=True, cert=None, proxies=None):
        code = request.path_url.rstrip("/").split("/")[-1]
        record = SIMULATED_REGISTRY.get(code)
        response = requests.Response()
        response.status_code = 200 if record else 404
        response.headers["Content-Type"] = "application/json"
        response.encoding = "utf-8"
        response.url = request.url
        response.request = request
        body = dict(record) if record else {"error": "not_found", "mfl_code": code}
        response._content = json.dumps(body).encode("utf-8")
        response.reason = "OK" if record else "Not Found"
        return response


def verify_mfl_code(mfl_code: str) -> dict:
    """Resolve one Master Facility List code to a facility record.

    Returns name, county, KEPH level, level label, and latitude/longitude.
    Raises ValueError when the code is malformed or the registry has no row.
    """
    code = _normalize_mfl_code(mfl_code)
    if _live_mode():
        payload = _live_lookup(code)
    else:
        payload = _simulated_lookup(code)
    return _to_facility(code, payload)


def _live_mode() -> bool:
    return os.getenv("KMHFR_LIVE", "").strip().lower() in {"1", "true", "yes"}


def _normalize_mfl_code(mfl_code: str) -> str:
    code = str(mfl_code).strip()
    if not code.isdigit() or not 1 <= len(code) <= 10:
        raise ValueError(
            "MFL code must be a 1 to 10 digit Kenya Master Facility List code."
        )
    return code


def _simulated_lookup(code: str) -> dict:
    session = requests.Session()
    session.mount(f"{SIMULATED_ORIGIN}/", _SimulatedRegistryAdapter())
    response = session.get(f"{SIMULATED_ORIGIN}/facilities/{code}", timeout=5)
    if response.status_code == 404:
        raise ValueError(
            f"MFL code {code} is not registered in the Kenya Master Health Facility Registry."
        )
    if response.status_code != 200:
        raise ValueError(f"Simulated KMHFR returned HTTP {response.status_code}.")
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Simulated KMHFR response was not a JSON object.")
    return body


def _live_lookup(code: str) -> dict:
    base = os.getenv("KMHFR_BASE_URL", "").strip().rstrip("/")
    if not base:
        raise ValueError("KMHFR_LIVE is set but KMHFR_BASE_URL is empty.")
    headers = {"Accept": "application/json"}
    api_key = os.getenv("KMHFR_API_KEY", "").strip()
    if api_key and not api_key.startswith("your-"):
        headers["Authorization"] = f"Bearer {api_key}"
    try:
        response = requests.get(
            f"{base}/facilities/{code}",
            headers=headers,
            timeout=(3, 8),
        )
    except requests.RequestException as exc:
        raise ValueError("KMHFR could not be reached.") from exc
    if response.status_code == 404:
        raise ValueError(
            f"MFL code {code} is not registered in the Kenya Master Health Facility Registry."
        )
    if response.status_code != 200:
        raise ValueError(f"KMHFR returned HTTP {response.status_code}.")
    try:
        body = response.json()
    except ValueError as exc:
        raise ValueError("KMHFR response was not JSON.") from exc
    if not isinstance(body, dict):
        raise ValueError("KMHFR response was not a JSON object.")
    return {
        "name": body.get("name") or body.get("facility_name") or body.get("officialName"),
        "county": body.get("county") or body.get("county_name") or body.get("countyName"),
        "keph_level": body.get("keph_level") or body.get("level") or body.get("kephLevel"),
        "level_label": body.get("level_label") or body.get("levelLabel"),
        "latitude": body.get("latitude") if body.get("latitude") is not None else body.get("lat"),
        "longitude": body.get("longitude")
        if body.get("longitude") is not None
        else body.get("lon") or body.get("lng"),
    }


def _to_facility(code: str, payload: dict) -> dict:
    try:
        name = str(payload["name"]).strip()
        county = str(payload["county"]).strip()
        level = int(payload["keph_level"])
        latitude = float(payload["latitude"])
        longitude = float(payload["longitude"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(
            "Registry record is missing name, county, KEPH level, or coordinates."
        ) from exc
    if not name or not county or level not in LEVEL_LABELS:
        raise ValueError("Registry record is missing name, county, or a KEPH level from 1 to 6.")
    region_code = region_for_county(county)
    if region_code is None:
        raise ValueError(
            f"{name} is in {county}, which is outside the configured catchments ({region_names()})."
        )
    if not (-5 <= latitude <= 6 and 33 <= longitude <= 42):
        raise ValueError("Registry coordinates fall outside Kenya.")
    label = payload.get("level_label") or LEVEL_LABELS[level]
    return {
        "mfl_code": code,
        "name": name,
        "county": county,
        "region_code": region_code,
        "keph_level": level,
        "level_label": str(label),
        "latitude": latitude,
        "longitude": longitude,
    }
