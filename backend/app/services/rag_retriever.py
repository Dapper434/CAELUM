"""Policy retrieval. Nemotron embeds the shortage text; Postgres does the cosine search.

The embedding is a lookup key. It is not a distance, a stock figure, or an expiry.
"""

from __future__ import annotations

import logging
import os

from openai import APIError, OpenAI

from app.db.supabase_client import load_env
from app.errors import CaelumError

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = "nvidia/nemotron-3.5-embed-1b"
_DEFAULT_BASE = "https://integrate.api.nvidia.com/v1"
_DEFAULT_DIM = 1024


def retrieve_policies(
    shortage_context: str,
    *,
    facility_id: str | None = None,
    match_count: int = 5,
    client=None,
) -> list[dict]:
    """Embed ``shortage_context`` and call the ``match_policies`` RPC.

    ``facility_id`` keeps national SOPs (null facility) plus that hospital's
    own agreements. Returns an empty list only when the RPC itself returns none.
    Configuration and dimension errors raise ``CaelumError``.
    """
    text = shortage_context.strip()
    if not text:
        raise ValueError("shortage_context is empty")
    if match_count < 1:
        raise ValueError("match_count must be at least 1")

    embedding = embed_shortage_context(text, input_type="query")
    supabase = client
    if supabase is None:
        from app.db.supabase_client import require_service_client

        supabase = require_service_client()

    response = supabase.rpc(
        "match_policies",
        {
            "query_embedding": embedding,
            "match_count": match_count,
            "similarity_threshold": 0.50,
            "facility_filter": facility_id,
        },
    ).execute()
    rows = list(getattr(response, "data", None) or [])
    policies = [_public_policy(row) for row in rows]
    policies.sort(key=lambda row: row["similarity"], reverse=True)
    return policies


def embed_shortage_context(text: str, *, input_type: str = "query") -> list[float]:
    """Call the Nemotron embeddings endpoint and require the schema width.

    Asymmetric Nemotron models require ``input_type``. A shortage scan is a
    ``query``. A stored SOP is a ``passage``.
    """
    load_env()
    api_key = _real(os.getenv("NEMOTRON_API_KEY"))
    if api_key is None:
        raise CaelumError(
            "NEMOTRON_API_KEY is not configured.",
            status_code=503,
            code="embed_not_configured",
        )
    if input_type not in {"query", "passage"}:
        raise ValueError("input_type must be 'query' or 'passage'")
    base_url = os.getenv("NEMOTRON_BASE_URL", _DEFAULT_BASE).strip() or _DEFAULT_BASE
    model = os.getenv("NEMOTRON_EMBED_MODEL", _DEFAULT_MODEL).strip() or _DEFAULT_MODEL
    dimensions = int(os.getenv("NEMOTRON_EMBED_DIM", str(_DEFAULT_DIM)))

    client = OpenAI(base_url=base_url, api_key=api_key, timeout=30)
    extra = {"input_type": input_type, "truncate": "END"}
    try:
        response = client.embeddings.create(
            model=model,
            input=text,
            dimensions=dimensions,
            extra_body=extra,
        )
    except TypeError:
        response = client.embeddings.create(model=model, input=text, extra_body=extra)
    except APIError as exc:
        logger.warning("Nemotron rejected the dimensions argument (%s); retrying.", exc)
        try:
            response = client.embeddings.create(model=model, input=text, extra_body=extra)
        except APIError as retry_exc:
            raise CaelumError(
                "The Nemotron embedding endpoint rejected the request.",
                status_code=502,
                code="embed_failed",
            ) from retry_exc

    vector = [float(value) for value in response.data[0].embedding]
    if len(vector) != dimensions:
        raise CaelumError(
            f"Nemotron returned {len(vector)} dimensions; hospital_policies.embedding is vector({dimensions}).",
            status_code=502,
            code="embedding_dimension_mismatch",
        )
    return vector


def build_shortage_context(
    *,
    facility_name: str,
    county: str,
    keph_level: int | str,
    blood_group: str,
    units_on_hand: int,
    days_of_cover: float,
    product_type: str,
) -> str:
    """Plain-language shortage description. No patient identifiers."""
    cover = "unbounded" if days_of_cover == float("inf") else f"{days_of_cover:.2f} days"
    return (
        f"Emergency inter-facility blood transfer. Recipient {facility_name} "
        f"in {county}, KEPH level {keph_level}, needs {blood_group} {product_type}. "
        f"Units on hand: {units_on_hand}. Forecast days of cover: {cover}. "
        "Retrieve Ministry of Health transfer SOPs and any bilateral redistribution agreement."
    )


def _public_policy(row: dict) -> dict:
    similarity = row.get("similarity")
    content = str(row.get("content") or "")
    return {
        "id": row.get("id"),
        "facility_id": row.get("facility_id"),
        "title": row.get("title"),
        "source": row.get("source"),
        "section_ref": row.get("section_ref"),
        "content": content[:1200],
        "similarity": float(similarity) if similarity is not None else 0.0,
    }


def _real(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    if not text or text.startswith("your-"):
        return None
    return text
