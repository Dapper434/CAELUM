"""REST surface for the React dashboard.

POST /api/onboard     — KMHFR check, then insert into facilities.
POST /api/orchestrate — forecast, logistics, RAG, Llama, validation shield.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from app.db.supabase_client import insert_facility, require_service_client
from app.regions import list_regions
from app.services.onboarding import verify_mfl_code
from app.services.pipeline import run_pipeline

api = Blueprint("api", __name__)


@api.get("/health")
def health():
    """Process is up. Does not touch Supabase."""
    return jsonify(status="ok", service="caelum-backend")


@api.get("/regions")
def regions():
    """Catchments the dashboard can select. Transfers cannot cross these."""
    return jsonify(regions=list_regions())


@api.post("/onboard")
def onboard():
    """Accept ``{"mfl_code": "10001"}`` and insert the verified facility."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or body.get("mfl_code") in (None, ""):
        return jsonify(error="mfl_code is required.", code="missing_mfl_code"), 400
    try:
        facility = verify_mfl_code(str(body["mfl_code"]))
    except ValueError as exc:
        return jsonify(error=str(exc), code="invalid_mfl_code"), 400

    saved = insert_facility(require_service_client(), facility)
    return jsonify(code="onboarded", facility=_public_facility(saved)), 201


@api.post("/orchestrate")
def orchestrate():
    """Run the multi-agent pipeline and return a shield-verified inbox card."""
    body = request.get_json(silent=True)
    payload, status = run_pipeline(body)
    return jsonify(payload), status


def _public_facility(row: dict) -> dict:
    return {
        "id": row.get("id"),
        "mfl_code": row.get("mfl_code"),
        "name": row.get("name"),
        "county": row.get("county"),
        "region_code": row.get("region_code"),
        "keph_level": row.get("keph_level"),
        "level_label": row.get("level_label"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
    }
