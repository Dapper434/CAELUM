"""Forecast, logistics, retrieval, orchestration, then the validation shield.

Numeric fields on the response are copied from the workers. The language model
contributes the rationale and the corridor choice, and only after the shield
accepts every unit code.
"""

from __future__ import annotations

import logging
import math
from collections import defaultdict
from datetime import datetime
from uuid import uuid4

from pydantic import ValidationError
from postgrest.exceptions import APIError

from app.db.supabase_client import (
    fetch_available_units_for_product,
    fetch_demand_logs_for_product,
    fetch_facilities,
    insert_proposal,
    require_service_client,
)
from app.errors import CaelumError, InsufficientHistory
from app.regions import get_region, region_for_county
from app.schemas import PRODUCT_LABELS, BLOOD_GROUPS, OrchestrateRequest, TransferProposal
from app.services.forecast_worker import (
    days_of_cover,
    forecast_seven_day_demand,
    history_from_demand_logs,
)
from app.services.logistics_worker import (
    MIN_RESERVE_DAYS,
    Corridor,
    filter_donor_facilities,
)
from app.services.orchestrator import generate_transfer_proposal
from app.services.rag_retriever import build_shortage_context, retrieve_policies
from app.services.validator import CandidatePool, verify_llm_proposal
from app.timestamps import parse_timestamp, utc_now

logger = logging.getLogger(__name__)


def run_pipeline(body: dict | None) -> tuple[dict, int]:
    """Run one scan and return ``(payload, http_status)``."""
    if body is None:
        body = {}
    if not isinstance(body, dict):
        raise CaelumError("JSON object required.", status_code=400, code="invalid_body")
    try:
        request = OrchestrateRequest.model_validate(body)
    except ValidationError as exc:
        raise CaelumError(
            "Request body does not match the orchestrate schema.",
            status_code=400,
            code="invalid_body",
        ) from exc

    region = get_region(request.region_code)
    if region is None:
        raise CaelumError(
            f"Unknown operating region '{request.region_code}'.",
            status_code=400,
            code="unknown_region",
        )
    client = require_service_client()

    facilities = []
    for facility in fetch_facilities(client):
        code = facility.get("region_code") or region_for_county(facility.get("county"))
        facilities.append(
            {
                **facility,
                "id": str(facility["id"]).lower(),
                "region_code": code,
            }
        )
    in_region = [
        {**facility, "region_name": region["name"]}
        for facility in facilities
        if facility.get("region_code") == region["code"]
    ]
    if not in_region:
        return _stop(
            "no_facilities",
            f"No active hospitals are onboarded in {region['name']}.",
            region=region["code"],
            region_name=region["name"],
        )

    if request.recipient_facility_id:
        known = {facility["id"] for facility in facilities}
        in_ids = {facility["id"] for facility in in_region}
        if request.recipient_facility_id not in known:
            raise CaelumError(
                "Recipient facility is not an active facility on the network.",
                status_code=404,
                code="unknown_facility",
            )
        if request.recipient_facility_id not in in_ids:
            raise CaelumError(
                f"Recipient facility is outside {region['name']}. Scans stay inside one catchment.",
                status_code=400,
                code="outside_region",
            )

    groups = [request.blood_group] if request.blood_group else list(BLOOD_GROUPS)
    logs_by_group: dict[str, list[dict]] = defaultdict(list)
    units_by_group: dict[str, list[dict]] = defaultdict(list)
    for row in fetch_demand_logs_for_product(client, request.product_type):
        logs_by_group[str(row.get("blood_group"))].append(row)
    for row in fetch_available_units_for_product(client, request.product_type):
        units_by_group[str(row.get("blood_group"))].append(row)
    if request.blood_group is None:
        groups = [
            group
            for group in groups
            if logs_by_group.get(group) or units_by_group.get(group)
        ]
    best = None
    winning_units: dict[str, list[dict]] = {}
    winning_demand: dict[str, float] = {}
    skipped: list[dict] = []
    assessed_count = 0

    for group in groups:
        assessed, notes, units_by_facility, demand_by_facility = _assess_group(
            in_region,
            group,
            request.product_type,
            logs_by_group.get(group, []),
            units_by_group.get(group, []),
        )
        skipped.extend(notes)
        assessed_count += len(assessed)
        pool = assessed
        if request.recipient_facility_id:
            pool = [row for row in pool if row["facility_id"] == request.recipient_facility_id]
        else:
            pool = [row for row in pool if row["days_of_cover"] < MIN_RESERVE_DAYS]
        if not pool:
            continue
        winner = min(pool, key=lambda row: row["days_of_cover"])
        if best is None or winner["days_of_cover"] < best["days_of_cover"]:
            best = winner
            winning_units = units_by_facility
            winning_demand = demand_by_facility

    if best is None:
        code = "no_shortage" if not request.recipient_facility_id else "recipient_not_assessable"
        message = (
            "No facility is projected below 3 days of cover."
            if code == "no_shortage"
            else "The recipient does not have 14 days of issue history for the requested product."
        )
        return _stop(
            code,
            message,
            skipped=skipped,
            assessed=assessed_count,
            region=region["code"],
            region_name=region["name"],
        )

    now = utc_now()
    corridors = filter_donor_facilities(
        best["facility"],
        in_region,
        winning_units,
        winning_demand,
        request.requested_units,
        now=now,
    )
    if not corridors:
        return _stop(
            "no_feasible_corridor",
            f"No donor inside {region['name']} keeps a 3-day reserve, outlasts the elapsed "
            "transit time, and stays inside the 4-hour cold-chain cap.",
            forecast=_forecast_summary(best),
            skipped=skipped,
            region=region["code"],
            region_name=region["name"],
        )

    policies, rag_warning = _load_policies(client, best, request.product_type)
    citation, policy_id = _citation(policies)
    context = _model_context(best, corridors, policies, request.requested_units, request.product_type)
    proposal_code, manifest_code = _new_codes(now)

    llm_error = None
    try:
        proposal = generate_transfer_proposal(context)
        source = "llama-3.1-8b"
    except CaelumError as exc:
        logger.warning("Orchestrator unavailable (%s); promoting logistics rank 1.", exc.message)
        proposal = _deterministic_proposal(corridors[0], best, citation)
        source = "deterministic_fallback"
        llm_error = exc.message

    pool = _candidate_pool(best, corridors, request.product_type)
    verification = verify_llm_proposal(
        proposal.model_dump(),
        pool,
        client=client,
        proposal_code=proposal_code,
        on_hallucination="reject",
    )
    if not verification.accepted and source == "llama-3.1-8b":
        llm_error = verification.detail
        proposal = _deterministic_proposal(corridors[0], best, citation)
        source = "deterministic_fallback"
        verification = verify_llm_proposal(
            proposal.model_dump(),
            pool,
            client=client,
            proposal_code=proposal_code,
            on_hallucination="reject",
        )

    if not verification.accepted or verification.proposal is None:
        return {
            "verified": False,
            "code": "shield_rejected",
            "message": verification.detail,
            "proposal_code": proposal_code,
            "rejected_codes": verification.rejected_codes,
            "forecast": _forecast_summary(best),
            "region": region["code"],
            "region_name": region["name"],
        }, 409

    accepted = verification.proposal
    corridor = _matching_corridor(accepted, corridors)
    payload = _success_payload(
        accepted=accepted,
        corridor=corridor,
        selected=best,
        policies=policies,
        citation=citation,
        verification=verification,
        source=source,
        llm_error=llm_error,
        rag_warning=rag_warning,
        proposal_code=proposal_code,
        manifest_code=manifest_code,
        product_type=request.product_type,
        now=now,
        skipped=skipped,
    )
    saved, persist_error = _persist(
        client,
        payload,
        accepted,
        corridor,
        verification,
        policy_id,
        context,
        source,
    )
    payload["persisted"] = saved is not None
    payload["region"] = region["code"]
    payload["region_name"] = region["name"]
    if saved is not None:
        payload["proposal"]["dbId"] = saved.get("id")
    if persist_error:
        payload["persist_error"] = persist_error
    return payload, 200


def _assess_group(
    facilities: list[dict],
    blood_group: str,
    product_type: str,
    logs: list[dict],
    raw_units: list[dict],
):
    logs_by_facility: dict[str, list[dict]] = defaultdict(list)
    for row in logs:
        logs_by_facility[str(row["facility_id"]).lower()].append(row)

    now = utc_now()
    units_by_facility: dict[str, list[dict]] = defaultdict(list)
    for row in raw_units:
        try:
            expiry = parse_timestamp(row["expiry_date"])
        except (TypeError, ValueError):
            logger.warning("Skipping unit %s with an unreadable expiry.", row.get("unit_code"))
            continue
        if expiry <= now:
            continue
        normalized = dict(row)
        normalized["unit_code"] = str(row["unit_code"]).upper()
        normalized["facility_id"] = str(row["facility_id"]).lower()
        units_by_facility[normalized["facility_id"]].append(normalized)

    assessed = []
    skipped = []
    for facility in facilities:
        facility_id = facility["id"]
        try:
            frame = history_from_demand_logs(logs_by_facility.get(facility_id, []))
            forecast = forecast_seven_day_demand(frame)
        except InsufficientHistory as exc:
            skipped.append(
                {"facility_id": facility_id, "blood_group": blood_group, "reason": exc.message}
            )
            continue
        on_hand = len(units_by_facility.get(facility_id, []))
        cover = days_of_cover(on_hand, forecast["average_daily_demand"])
        assessed.append(
            {
                "facility_id": facility_id,
                "facility": facility,
                "blood_group": blood_group,
                "product_type": product_type,
                "units_on_hand": on_hand,
                "days_of_cover": cover,
                "daily_demand": forecast["average_daily_demand"],
                "forecast": forecast,
            }
        )
    demand_by_facility = {row["facility_id"]: row["daily_demand"] for row in assessed}
    return assessed, skipped, units_by_facility, demand_by_facility


def _load_policies(client, selected: dict, product_type: str) -> tuple[list[dict], str | None]:
    facility = selected["facility"]
    text = build_shortage_context(
        facility_name=facility.get("name") or facility["id"],
        county=facility.get("county") or "unknown county",
        keph_level=facility.get("keph_level") or "unknown",
        blood_group=selected["blood_group"],
        units_on_hand=selected["units_on_hand"],
        days_of_cover=selected["days_of_cover"],
        product_type=product_type,
    )
    try:
        return retrieve_policies(text, facility_id=selected["facility_id"], client=client), None
    except (CaelumError, APIError) as exc:
        message = exc.message if isinstance(exc, CaelumError) else "Policy search failed."
        logger.warning("Policy retrieval skipped: %s", message)
        return [], message


def _citation(policies: list[dict]) -> tuple[str, str | None]:
    if not policies:
        return "No matching Ministry of Health SOP was retrieved.", None
    top = policies[0]
    source = top.get("source") or "Ministry of Health"
    ref = top.get("section_ref") or top.get("title") or "untitled SOP"
    return f"{source} {ref}".strip(), top.get("id")


def _model_context(selected, corridors: list[Corridor], policies, requested_units: int, product_type: str) -> dict:
    facility = selected["facility"]
    return {
        "blood_group": selected["blood_group"],
        "product_type": product_type,
        "requested_units": requested_units,
        "region": {
            "code": facility.get("region_code"),
            "name": facility.get("region_name"),
        },
        "recipient": {
            "facility_id": selected["facility_id"],
            "name": facility.get("name"),
            "county": facility.get("county"),
            "keph_level": facility.get("keph_level"),
            "units_on_hand": selected["units_on_hand"],
            "average_daily_demand": selected["daily_demand"],
            "days_of_cover": _json_days(selected["days_of_cover"]),
        },
        "corridors": [
            {
                "rank": index,
                "donor_facility_id": corridor.donor_facility_id,
                "donor_name": corridor.donor_name,
                "recipient_facility_id": corridor.recipient_facility_id,
                "distance_km": round(corridor.distance_km, 2),
                "road_minutes": corridor.road_minutes,
                "handling_minutes": corridor.handling_minutes,
                "elapsed_minutes": corridor.elapsed_minutes,
                "post_transfer_units": corridor.post_transfer_units,
                "post_transfer_cover_days": _json_days(corridor.post_transfer_cover_days),
                "unit_codes": [str(code).upper() for code in corridor.unit_codes],
            }
            for index, corridor in enumerate(corridors, start=1)
        ],
        "policies": policies,
    }


def _candidate_pool(selected: dict, corridors: list[Corridor], product_type: str) -> CandidatePool:
    mapping = {
        frozenset(str(code).upper() for code in corridor.unit_codes): corridor.donor_facility_id
        for corridor in corridors
    }
    return CandidatePool(
        recipient_facility_id=selected["facility_id"],
        blood_group=selected["blood_group"],
        product_type=product_type,
        donor_by_unit_set=mapping,
    )


def _deterministic_proposal(corridor: Corridor, selected: dict, citation: str) -> TransferProposal:
    cover = _cover_phrase(corridor.post_transfer_cover_days)
    region_name = selected["facility"].get("region_name") or "the selected region"
    rationale = (
        "Deterministic fallback. The language-model proposal was not used. "
        f"{corridor.donor_name} can release {len(corridor.units)} unit(s) of {selected['blood_group']} "
        f"over {corridor.distance_km:.1f} km with {corridor.elapsed_minutes} minutes elapsed, "
        f"leaving {cover} at the donor. The corridor stays inside {region_name}. "
        f"Policy context: {citation}."
    )
    return TransferProposal(
        donor_facility_id=corridor.donor_facility_id,
        recipient_facility_id=corridor.recipient_facility_id,
        blood_group=selected["blood_group"],
        proposed_unit_codes=[str(code).upper() for code in corridor.unit_codes],
        ai_rationale=rationale[:2000],
    )


def _matching_corridor(proposal: TransferProposal, corridors: list[Corridor]) -> Corridor:
    chosen = frozenset(proposal.proposed_unit_codes)
    for corridor in corridors:
        if frozenset(str(code).upper() for code in corridor.unit_codes) == chosen:
            return corridor
    raise CaelumError(
        "The shield accepted a unit list that is not one of the logistics corridors.",
        status_code=500,
        code="shield_inconsistent",
    )


def _success_payload(
    *,
    accepted: TransferProposal,
    corridor: Corridor,
    selected: dict,
    policies: list[dict],
    citation: str,
    verification,
    source: str,
    llm_error: str | None,
    rag_warning: str | None,
    proposal_code: str,
    manifest_code: str,
    product_type: str,
    now: datetime,
    skipped: list[dict],
) -> dict:
    facility = selected["facility"]
    donor_days = corridor.post_transfer_cover_days
    recipient_rate = selected["daily_demand"]
    cover_lift = None if recipient_rate <= 0 else round(len(accepted.proposed_unit_codes) / recipient_rate, 1)
    by_code = {str(row["unit_code"]).upper(): row for row in verification.units}
    ordered = [by_code[code] for code in accepted.proposed_unit_codes]
    soonest_hours = min(
        (parse_timestamp(row["expiry_date"]) - now).total_seconds() / 3600 for row in ordered
    )
    return {
        "verified": True,
        "rationale_source": source,
        "llm_error": llm_error,
        "rag_warning": rag_warning,
        "llm_proposal": accepted.model_dump(),
        "forecast": _forecast_summary(selected),
        "skipped": skipped,
        "proposal": {
            "id": proposal_code,
            "manifestId": manifest_code,
            "status": "PENDING_APPROVAL",
            "donor": {
                "id": corridor.donor_facility_id,
                "name": corridor.donor_name,
                "tier": corridor.donor_level_label,
                "distance": f"{corridor.distance_km:.1f} km",
                "transitTime": f"{corridor.elapsed_minutes} mins",
                "postTransferCoverDays": _json_days(donor_days),
            },
            "recipient": {
                "id": selected["facility_id"],
                "name": facility.get("name"),
                "tier": facility.get("level_label"),
                "urgency": _urgency(selected["days_of_cover"]),
                "coverLiftDays": cover_lift,
            },
            "allocatedUnits": [
                {
                    "id": row["unit_code"],
                    "group": selected["blood_group"],
                    "bloodType": PRODUCT_LABELS.get(product_type, product_type),
                    "coldChain": _temp_label(row.get("storage_temp_c")),
                    "expiresAt": _expires_label(parse_timestamp(row["expiry_date"]), now),
                    "lotNumber": row.get("lot_number"),
                }
                for row in ordered
            ],
            "aiRationale": accepted.ai_rationale,
            "policyCitation": citation,
            "verificationHash": verification.verification_hash,
            "deterministicMetrics": {
                "distanceKm": round(corridor.distance_km, 2),
                "roadMinutes": corridor.road_minutes,
                "handlingMinutes": corridor.handling_minutes,
                "elapsedMinutes": corridor.elapsed_minutes,
                "donorReserveDays": _json_days(donor_days),
                "donorReserveUnbounded": math.isinf(donor_days),
                "shelfLifeHours": round(soonest_hours, 2),
                "coldChainViable": True,
                "donorReserveSafe": True,
                "recipientCoverLiftDays": cover_lift,
            },
            "policies": [
                {
                    "id": policy.get("id"),
                    "source": policy.get("source"),
                    "sectionRef": policy.get("section_ref"),
                    "similarity": policy.get("similarity"),
                }
                for policy in policies
            ],
        },
    }


def _persist(client, payload, accepted, corridor, verification, policy_id, context, source) -> tuple[dict | None, str | None]:
    metrics = payload["proposal"]["deterministicMetrics"]
    reserve_days = metrics["donorReserveDays"]
    if reserve_days is None:
        reserve_days = 9999.99
    row = {
        "proposal_code": payload["proposal"]["id"],
        "manifest_code": payload["proposal"]["manifestId"],
        "status": "pending_approval",
        "donor_facility_id": accepted.donor_facility_id,
        "recipient_facility_id": accepted.recipient_facility_id,
        "blood_group": accepted.blood_group,
        "product_type": payload["forecast"]["product_type"],
        "quantity": len(verification.units),
        "distance_km": metrics["distanceKm"],
        "transit_minutes": metrics["elapsedMinutes"],
        "donor_reserve_days": reserve_days,
        "shelf_life_hours": metrics["shelfLifeHours"],
        "cold_chain_viable": True,
        "donor_reserve_safe": True,
        "ai_rationale": accepted.ai_rationale,
        "policy_citation": payload["proposal"]["policyCitation"],
        "policy_id": policy_id,
        "verification_hash": verification.verification_hash,
        "worker_context": {
            "rationale_source": source,
            "forecast": payload["forecast"],
            "corridor_rank_unit_codes": [unit["unit_code"] for unit in corridor.units],
            "measurements": metrics,
        },
    }
    try:
        saved = insert_proposal(
            client,
            row,
            [str(unit["id"]) for unit in verification.units],
        )
    except CaelumError as exc:
        logger.warning("Verified proposal was not persisted: %s", exc.message)
        return None, exc.message
    return saved, None


def _forecast_summary(selected: dict) -> dict:
    forecast = selected["forecast"]
    return {
        "facility_id": selected["facility_id"],
        "facility_name": selected["facility"].get("name"),
        "blood_group": selected["blood_group"],
        "product_type": selected["product_type"],
        "method": forecast["method"],
        "history_points": forecast["history_points"],
        "average_daily_demand": forecast["average_daily_demand"],
        "total_seven_day": forecast["total_seven_day"],
        "daily_demand": forecast["daily_demand"],
        "units_on_hand": selected["units_on_hand"],
        "days_of_cover": _json_days(selected["days_of_cover"]),
        "urgency": _urgency(selected["days_of_cover"]),
    }


def _stop(code: str, message: str, **extra) -> tuple[dict, int]:
    body = {"verified": False, "code": code, "message": message}
    for key, value in extra.items():
        if value is not None:
            body[key] = value
    return body, 200


def _new_codes(now: datetime) -> tuple[str, str]:
    suffix = uuid4().hex[:4].upper()
    return f"TR-{now.year}-{suffix}", f"MF-{suffix}"


def _json_days(value: float) -> float | None:
    if math.isinf(value):
        return None
    return round(value, 2)


def _cover_phrase(days: float) -> str:
    if math.isinf(days):
        return "unbounded cover because forecast demand is zero"
    return f"{days:.1f} days of cover"


def _urgency(days: float) -> str:
    if math.isinf(days) or days >= 3:
        return "SAFE"
    if days < 1:
        return "CRITICAL"
    if days < 2:
        return "URGENT"
    return "MODERATE"


def _expires_label(expiry: datetime, now: datetime) -> str:
    hours = (expiry - now).total_seconds() / 3600
    if hours < 48:
        return f"{max(hours, 0):.0f}h remaining"
    return f"{hours / 24:.1f}d remaining"


def _temp_label(value) -> str:
    if value is None:
        return "Not logged"
    return f"{float(value):.1f}°C"
