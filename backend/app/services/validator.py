"""Validation shield.

Every unit code named by the orchestrator is loaded from blood_inventory.
The proposal is returned only when each code exists, is available, is unexpired,
is unreserved, matches the blood group, and is the exact bag list of one
logistics corridor. The default is to reject the whole proposal. Strip mode
drops failed codes and accepts only when what remains is still one corridor.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from typing import Literal

from app.db.supabase_client import fetch_units_by_code, insert_validation_event
from app.schemas import TransferProposal
from app.timestamps import parse_timestamp, utc_now

logger = logging.getLogger(__name__)

HallucinationPolicy = Literal["reject", "strip"]


@dataclass(frozen=True)
class CandidatePool:
    """Corridors the logistics worker already proved. The model may not leave this set."""

    recipient_facility_id: str
    blood_group: str
    product_type: str
    donor_by_unit_set: dict[frozenset[str], str]


@dataclass
class Verification:
    accepted: bool
    detail: str
    units: list[dict] = field(default_factory=list)
    missing_codes: list[str] = field(default_factory=list)
    reserved_codes: list[str] = field(default_factory=list)
    expired_codes: list[str] = field(default_factory=list)
    rejected_codes: list[str] = field(default_factory=list)
    verification_hash: str | None = None
    audit_logged: bool = False
    proposal: TransferProposal | None = None


def verify_llm_proposal(
    proposal_dict: dict,
    candidate_pool: CandidatePool,
    *,
    client,
    proposal_code: str | None = None,
    on_hallucination: HallucinationPolicy = "reject",
) -> Verification:
    """Hard-check ``proposed_unit_codes`` against the live ledger.

    ``on_hallucination="reject"`` fails the proposal if any code is missing,
    reserved, expired, or outside the logistics corridors.
    ``on_hallucination="strip"`` removes those codes and accepts only when the
    remainder is exactly one allowed corridor.
    """
    proposal = TransferProposal.model_validate(proposal_dict)
    claimed = list(proposal.proposed_unit_codes)
    rows = fetch_units_by_code(client, claimed)
    by_code = {str(row["unit_code"]).upper(): row for row in rows}
    now = utc_now()

    missing: list[str] = []
    reserved: list[str] = []
    expired: list[str] = []
    outside: list[str] = []
    kept_rows: list[dict] = []

    allowed_codes: set[str] = set()
    for unit_set in candidate_pool.donor_by_unit_set:
        allowed_codes.update(unit_set)

    for code in claimed:
        row = by_code.get(code)
        if row is None:
            missing.append(code)
            continue
        if code not in allowed_codes:
            outside.append(code)
            continue
        kind = _classify(row, now)
        if kind == "expired":
            expired.append(code)
            continue
        if kind == "reserved":
            reserved.append(code)
            continue
        if str(row.get("blood_group")) != proposal.blood_group:
            outside.append(code)
            continue
        if str(row.get("product_type")) != candidate_pool.product_type:
            outside.append(code)
            continue
        kept_rows.append(row)

    rejected = missing + reserved + expired + outside
    kept_codes = [code for code in claimed if code not in set(rejected)]
    structural = _structural_failures(proposal, candidate_pool, kept_codes, kept_rows)

    if on_hallucination == "strip" and kept_codes and not structural:
        accepted_proposal = proposal.model_copy(update={"proposed_unit_codes": kept_codes})
        digest = _verification_hash(kept_rows)
        detail = _detail(accepted=True, stripped=rejected)
        verification = Verification(
            accepted=True,
            detail=detail,
            units=kept_rows,
            missing_codes=missing,
            reserved_codes=reserved,
            expired_codes=expired,
            rejected_codes=rejected,
            verification_hash=digest,
            proposal=accepted_proposal,
        )
    elif not rejected and not structural:
        digest = _verification_hash(kept_rows)
        verification = Verification(
            accepted=True,
            detail="Every proposed unit exists, is available, and belongs to one logistics corridor.",
            units=kept_rows,
            verification_hash=digest,
            proposal=proposal,
        )
    else:
        reason = structural or _detail(accepted=False, stripped=rejected)
        verification = Verification(
            accepted=False,
            detail=reason,
            units=[],
            missing_codes=missing,
            reserved_codes=reserved,
            expired_codes=expired,
            rejected_codes=rejected or claimed,
            proposal=None,
        )

    verification.audit_logged = insert_validation_event(
        client,
        {
            "proposal_code": proposal_code,
            "accepted": verification.accepted,
            "claimed_codes": claimed,
            "missing_codes": missing,
            "reserved_codes": reserved,
            "expired_codes": expired,
            "detail": verification.detail,
        },
    )
    logger.info(
        "Shield %s proposal %s (%s)",
        "accepted" if verification.accepted else "rejected",
        proposal_code,
        verification.detail,
    )
    return verification


def _classify(row: dict, now) -> str:
    try:
        expiry = parse_timestamp(row["expiry_date"])
    except (TypeError, ValueError):
        return "expired"
    if expiry <= now or row.get("status") == "expired":
        return "expired"
    if row.get("status") != "available" or row.get("reserved_at") is not None:
        return "reserved"
    return "ok"


def _structural_failures(
    proposal: TransferProposal,
    pool: CandidatePool,
    kept_codes: list[str],
    kept_rows: list[dict],
) -> str:
    if proposal.recipient_facility_id != pool.recipient_facility_id:
        return "recipient_facility_id does not match the shortage facility."
    if proposal.blood_group != pool.blood_group:
        return "blood_group does not match the shortage."
    chosen = frozenset(kept_codes)
    donor_id = pool.donor_by_unit_set.get(chosen)
    if donor_id is None:
        return "The unit list is not an exact logistics corridor."
    if proposal.donor_facility_id != donor_id:
        return "donor_facility_id does not own the selected units."
    if any(str(row["facility_id"]).lower() != donor_id for row in kept_rows):
        return "A selected unit is not stocked at the named donor."
    return ""


def _detail(*, accepted: bool, stripped: list[str]) -> str:
    if not stripped:
        return "Proposal rejected."
    codes = ", ".join(stripped)
    if accepted:
        return f"Stripped unit codes that failed the ledger check: {codes}."
    return f"Rejected unit codes that failed the ledger check: {codes}."


def _verification_hash(rows: list[dict]) -> str:
    canonical = [
        {
            "unit_code": row["unit_code"],
            "id": row["id"],
            "status": row["status"],
            "expiry_date": str(row["expiry_date"]),
            "facility_id": row["facility_id"],
        }
        for row in sorted(rows, key=lambda row: str(row["unit_code"]))
    ]
    blob = json.dumps(canonical, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(blob.encode()).hexdigest()
