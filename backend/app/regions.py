"""Operating catchments. A transfer may not leave the region it starts in.

County membership is a fixed table. The language model does not assign regions.
"""

from __future__ import annotations

REGIONS: tuple[dict, ...] = (
    {
        "code": "nairobi",
        "name": "Nairobi Region",
        "counties": ("Nairobi", "Kiambu", "Machakos", "Kajiado"),
    },
    {
        "code": "south_rift",
        "name": "South Rift Region",
        "counties": ("Nakuru", "Narok", "Baringo"),
    },
    {
        "code": "north_rift",
        "name": "North Rift Region",
        "counties": ("Uasin Gishu", "Nandi", "Trans Nzoia", "Elgeyo-Marakwet"),
    },
)

_BY_CODE = {region["code"]: region for region in REGIONS}


def list_regions() -> list[dict]:
    """JSON-ready catalogue for the dashboard selector."""
    return [
        {
            "code": region["code"],
            "name": region["name"],
            "counties": list(region["counties"]),
        }
        for region in REGIONS
    ]


def get_region(code: str | None) -> dict | None:
    if not code:
        return None
    return _BY_CODE.get(code.strip().lower())


def region_for_county(county: str | None) -> str | None:
    """Return the catchment code for a KMHFR county, or None when it is unassigned."""
    if not county:
        return None
    key = county.strip().casefold()
    for region in REGIONS:
        if key in {name.casefold() for name in region["counties"]}:
            return region["code"]
    return None


def region_names() -> str:
    return ", ".join(region["name"] for region in REGIONS)
