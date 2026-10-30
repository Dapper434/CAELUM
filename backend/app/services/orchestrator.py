"""Single-shot Llama 3.1 orchestrator.

The model selects one precomputed corridor and writes the clinical rationale.
It is instructed not to calculate distance, transit, stock, cover, or expiry.
Pydantic rejects any payload that is not the five-field schema.
"""

from __future__ import annotations

import json
import logging
import os
import re

from openai import APIConnectionError, APIError, OpenAI
from pydantic import ValidationError

from app.db.supabase_client import load_env
from app.errors import CaelumError
from app.schemas import PROPOSAL_RESPONSE_FORMAT, TransferProposal

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
_DEFAULT_BASE = "https://openrouter.ai/api/v1"

_SYSTEM_PROMPT = """You are the CAELUM clinical orchestrator for a human blood-bank officer.
You do not calculate distances, transit times, stock reserves, days of cover, or expiry dates.
Those values are already computed and are authoritative. Do not change them and do not invent new ones.

Choose exactly one corridor from the payload. Every corridor is already inside one operating region. Do not name a facility outside that region.
Copy donor_facility_id, recipient_facility_id, and proposed_unit_codes from that corridor.
proposed_unit_codes must be that corridor's unit_codes list, unchanged, with no extras and no omissions.
blood_group must be the payload blood_group.
ai_rationale is a short clinical explanation for the human officer. Mention only policy section_ref values that appear in the payload. If policies is empty, say that no SOP chunk was retrieved.
Return one JSON object and nothing else."""


def generate_transfer_proposal(context: dict) -> TransferProposal:
    """Send the worker payload to Llama 3.1 8B and parse a TransferProposal.

    ``context`` must already contain the forecast, the feasible corridors, and
    any retrieved SOP chunks. This function adds no measurements of its own.
    """
    if not context.get("corridors"):
        raise CaelumError(
            "The orchestrator was called with no feasible corridors.",
            status_code=422,
            code="no_feasible_corridor",
        )

    client, model = _llm_client()
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {
            "role": "user",
            "content": json.dumps(context, default=str, separators=(",", ":")),
        },
    ]
    completion = _complete(client, model, messages)
    content = completion.choices[0].message.content if completion.choices else None
    if not content:
        raise CaelumError(
            "The orchestrator returned an empty response.",
            status_code=502,
            code="llm_empty_response",
        )
    try:
        return TransferProposal.model_validate_json(_strip_fence(content))
    except ValidationError as exc:
        logger.warning("Orchestrator JSON failed schema validation: %s", exc)
        raise CaelumError(
            "The orchestrator response did not match the transfer proposal schema.",
            status_code=502,
            code="llm_schema_rejected",
        ) from exc


def _llm_client() -> tuple[OpenAI, str]:
    load_env()
    nim_base = _real(os.getenv("NIM_BASE_URL"))
    if nim_base:
        key = _real(os.getenv("NIM_API_KEY")) or _real(os.getenv("OPENROUTER_API_KEY"))
        if key is None:
            raise CaelumError(
                "Set NIM_API_KEY or OPENROUTER_API_KEY when NIM_BASE_URL is set.",
                status_code=503,
                code="llm_not_configured",
            )
        model = os.getenv("ORCHESTRATOR_MODEL", "meta-llama/llama-3.1-8b-instruct").strip()
        return OpenAI(base_url=nim_base, api_key=key, timeout=45), model

    key = _real(os.getenv("OPENROUTER_API_KEY"))
    if key is None:
        raise CaelumError(
            "OPENROUTER_API_KEY is not configured.",
            status_code=503,
            code="llm_not_configured",
        )
    base = os.getenv("OPENROUTER_BASE_URL", _DEFAULT_BASE).strip() or _DEFAULT_BASE
    model = os.getenv("ORCHESTRATOR_MODEL", _DEFAULT_MODEL).strip() or _DEFAULT_MODEL
    return (
        OpenAI(
            base_url=base,
            api_key=key,
            timeout=45,
            default_headers={
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "CAELUM",
            },
        ),
        model,
    )


def _complete(client: OpenAI, model: str, messages: list[dict]):
    try:
        return client.chat.completions.create(
            model=model,
            temperature=0,
            max_tokens=350,
            messages=messages,
            response_format=PROPOSAL_RESPONSE_FORMAT,
        )
    except (APIError, APIConnectionError) as exc:
        logger.warning("json_schema response_format was rejected (%s); retrying.", exc)
    try:
        return client.chat.completions.create(
            model=model,
            temperature=0,
            max_tokens=350,
            messages=messages,
        )
    except (APIError, APIConnectionError) as exc:
        raise CaelumError(
            "The orchestrator endpoint could not be reached.",
            status_code=502,
            code="llm_unreachable",
        ) from exc


def _strip_fence(text: str) -> str:
    body = text.strip()
    if body.startswith("```"):
        body = re.sub(r"^```(?:json)?\s*", "", body)
        body = re.sub(r"\s*```$", "", body)
    return body.strip()


def _real(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    if not text or text.startswith("your-"):
        return None
    return text
