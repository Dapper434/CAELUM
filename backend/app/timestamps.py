"""Timestamp parsing for ledger columns. Workers compare these; the LLM does not."""

from __future__ import annotations

from datetime import datetime, timezone


def parse_timestamp(value: datetime | str) -> datetime:
    """Return an aware UTC datetime from a Supabase timestamptz value."""
    if isinstance(value, datetime):
        parsed = value
    else:
        text = str(value).strip().replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
