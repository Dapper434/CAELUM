"""Service-role Supabase client and the ledger queries the workers share.

The anon key belongs to the React app. This process needs the service role:
forced RLS hides demand_logs, hospital_policies, and validation_events from
anon, and only the service role may insert facilities or proposals.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from postgrest.exceptions import APIError
from supabase import Client, create_client

from app.errors import CaelumError

logger = logging.getLogger(__name__)

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


def load_env() -> None:
    """Load backend/.env without overriding variables already set in the shell."""
    load_dotenv(_ENV_PATH)


def _configured(name: str) -> str | None:
    load_env()
    value = os.getenv(name, "").strip()
    if not value or value.startswith("your-") or "your-project" in value:
        return None
    return value


def require_service_client() -> Client:
    """Return the service-role client or raise a 503 the route can render."""
    url = _configured("SUPABASE_URL")
    key = _configured("SUPABASE_SERVICE_ROLE_KEY")
    if url is None or key is None:
        raise CaelumError(
            "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to real project values. "
            "The service role is required for onboarding writes, demand history, "
            "policy search, and the validation shield log.",
            status_code=503,
            code="supabase_not_configured",
        )
    return _build_client(url, key)


@lru_cache(maxsize=2)
def _build_client(url: str, key: str) -> Client:
    return create_client(url, key)


def _pg_code(exc: APIError) -> str | None:
    code = getattr(exc, "code", None)
    if code:
        return str(code)
    if exc.args and isinstance(exc.args[0], dict):
        raw = exc.args[0].get("code")
        return str(raw) if raw else None
    return None


def _as_rows(response) -> list[dict]:
    data = getattr(response, "data", None)
    return list(data or [])


def fetch_facilities(client: Client) -> list[dict]:
    response = (
        client.table("facilities")
        .select("id,mfl_code,name,county,region_code,keph_level,level_label,latitude,longitude")
        .eq("is_active", True)
        .order("name")
        .execute()
    )
    return _as_rows(response)


def fetch_demand_logs(client: Client, blood_group: str, product_type: str) -> list[dict]:
    response = (
        client.table("demand_logs")
        .select("facility_id,blood_group,log_date,units_issued")
        .eq("blood_group", blood_group)
        .eq("product_type", product_type)
        .order("log_date")
        .limit(5000)
        .execute()
    )
    return _as_rows(response)


def fetch_demand_logs_for_product(client: Client, product_type: str) -> list[dict]:
    """One ledger read for every blood group of a product. A scan uses this once."""
    response = (
        client.table("demand_logs")
        .select("facility_id,blood_group,log_date,units_issued")
        .eq("product_type", product_type)
        .order("log_date")
        .limit(8000)
        .execute()
    )
    return _as_rows(response)


def fetch_available_units(client: Client, blood_group: str, product_type: str) -> list[dict]:
    response = (
        client.table("blood_inventory")
        .select(
            "id,unit_code,lot_number,facility_id,blood_group,product_type,"
            "expiry_date,status,reserved_at,storage_temp_c"
        )
        .eq("blood_group", blood_group)
        .eq("product_type", product_type)
        .eq("status", "available")
        .is_("reserved_at", "null")
        .limit(2000)
        .execute()
    )
    return _as_rows(response)


def fetch_available_units_for_product(client: Client, product_type: str) -> list[dict]:
    """One stock read for every blood group of a product. A scan uses this once."""
    response = (
        client.table("blood_inventory")
        .select(
            "id,unit_code,lot_number,facility_id,blood_group,product_type,"
            "expiry_date,status,reserved_at,storage_temp_c"
        )
        .eq("product_type", product_type)
        .eq("status", "available")
        .is_("reserved_at", "null")
        .limit(4000)
        .execute()
    )
    return _as_rows(response)


def fetch_units_by_code(client: Client, unit_codes: list[str]) -> list[dict]:
    """Ledger lookup used by the validation shield. Do not trust the model here."""
    if not unit_codes:
        return []
    response = (
        client.table("blood_inventory")
        .select(
            "id,unit_code,lot_number,facility_id,blood_group,product_type,"
            "expiry_date,status,reserved_at,storage_temp_c"
        )
        .in_("unit_code", unit_codes)
        .execute()
    )
    return _as_rows(response)


def insert_facility(client: Client, facility: dict) -> dict:
    """Insert a KMHFR-verified facility. Duplicate MFL codes return 409."""
    existing = (
        client.table("facilities")
        .select("id,mfl_code,name,county,region_code,keph_level,level_label,latitude,longitude")
        .eq("mfl_code", facility["mfl_code"])
        .limit(1)
        .execute()
    )
    if _as_rows(existing):
        raise CaelumError(
            f"MFL code {facility['mfl_code']} is already on the CAELUM network.",
            status_code=409,
            code="duplicate_mfl_code",
        )

    payload = {
        "mfl_code": facility["mfl_code"],
        "name": facility["name"],
        "county": facility["county"],
        "region_code": facility["region_code"],
        "keph_level": facility["keph_level"],
        "level_label": facility["level_label"],
        "latitude": facility["latitude"],
        "longitude": facility["longitude"],
    }
    try:
        response = client.table("facilities").insert(payload).execute()
    except APIError as exc:
        if _pg_code(exc) == "23505":
            raise CaelumError(
                f"MFL code {facility['mfl_code']} is already on the CAELUM network.",
                status_code=409,
                code="duplicate_mfl_code",
            ) from exc
        logger.exception("Facility insert failed for MFL %s", facility["mfl_code"])
        raise CaelumError(
            "Supabase rejected the facility insert.",
            status_code=502,
            code="supabase_write_failed",
        ) from exc

    rows = _as_rows(response)
    if not rows:
        raise CaelumError(
            "Supabase accepted the facility insert but returned no row.",
            status_code=502,
            code="supabase_write_failed",
        )
    return rows[0]


def insert_validation_event(client: Client, event: dict) -> bool:
    """Append a shield outcome. A log failure must not hide a completed check."""
    try:
        client.table("validation_events").insert(event).execute()
    except APIError:
        logger.exception("validation_events insert failed")
        return False
    return True


def insert_proposal(client: Client, proposal: dict, inventory_ids: list[str]) -> dict:
    """Persist a shield-cleared proposal and its bag links."""
    try:
        response = client.table("transfer_proposals").insert(proposal).execute()
    except APIError as exc:
        logger.exception("transfer_proposals insert failed")
        raise CaelumError(
            "The verified proposal could not be saved to the approval inbox.",
            status_code=502,
            code="supabase_write_failed",
        ) from exc

    rows = _as_rows(response)
    if not rows:
        raise CaelumError(
            "Supabase accepted the proposal insert but returned no row.",
            status_code=502,
            code="supabase_write_failed",
        )
    saved = rows[0]
    links = [
        {"proposal_id": saved["id"], "inventory_id": inventory_id}
        for inventory_id in inventory_ids
    ]
    try:
        client.table("proposal_units").insert(links).execute()
    except APIError as exc:
        logger.exception("proposal_units insert failed; rolling back proposal %s", saved["id"])
        try:
            client.table("transfer_proposals").delete().eq("id", saved["id"]).execute()
        except APIError:
            logger.exception("Rollback of proposal %s failed", saved["id"])
        raise CaelumError(
            "The verified proposal could not be linked to inventory units.",
            status_code=502,
            code="supabase_write_failed",
        ) from exc
    return saved
