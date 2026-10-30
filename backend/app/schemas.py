"""Pydantic contracts for the orchestrator and the /api/orchestrate body.

The language model is allowed to fill TransferProposal and nothing else.
Distances, cover, and expiry stay on the worker payload.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

BLOOD_GROUPS = ("O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+")

BloodGroup = Literal["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
ProductType = Literal["packed_rbc", "platelets", "plasma", "whole_blood"]

PRODUCT_LABELS = {
    "packed_rbc": "Packed RBC",
    "platelets": "Platelets",
    "plasma": "Plasma",
    "whole_blood": "Whole Blood",
}


class OrchestrateRequest(BaseModel):
    """Optional scan filters. An empty body scans every blood group."""

    model_config = ConfigDict(extra="forbid")

    recipient_facility_id: str | None = None
    blood_group: BloodGroup | None = None
    product_type: ProductType = "packed_rbc"
    requested_units: int = Field(default=2, ge=1, le=20)
    region_code: str = "nairobi"

    @field_validator("recipient_facility_id")
    @classmethod
    def _clean_facility_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        text = value.strip().lower()
        if not text:
            raise ValueError("recipient_facility_id is empty")
        return text

    @field_validator("region_code")
    @classmethod
    def _clean_region(cls, value: str) -> str:
        text = value.strip().lower()
        if not text:
            raise ValueError("region_code is empty")
        return text


class TransferProposal(BaseModel):
    """Strict JSON the Llama orchestrator must return."""

    model_config = ConfigDict(extra="forbid")

    donor_facility_id: str = Field(min_length=1)
    recipient_facility_id: str = Field(min_length=1)
    blood_group: BloodGroup
    proposed_unit_codes: list[str] = Field(min_length=1, max_length=20)
    ai_rationale: str = Field(min_length=1, max_length=2000)

    @field_validator("donor_facility_id", "recipient_facility_id")
    @classmethod
    def _strip_id(cls, value: str) -> str:
        text = value.strip().lower()
        if not text:
            raise ValueError("facility id is empty")
        return text

    @field_validator("ai_rationale")
    @classmethod
    def _strip_rationale(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("ai_rationale is empty")
        return text

    @field_validator("proposed_unit_codes")
    @classmethod
    def _clean_codes(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for code in value:
            text = code.strip().lstrip("#").upper()
            if not text:
                raise ValueError("unit code is empty")
            cleaned.append(text)
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("proposed_unit_codes contains duplicates")
        return cleaned

    @model_validator(mode="after")
    def _distinct_facilities(self) -> "TransferProposal":
        if self.donor_facility_id == self.recipient_facility_id:
            raise ValueError("donor_facility_id and recipient_facility_id must differ")
        return self


# Sent as response_format={"type": "json_schema"}. Kept beside the Pydantic
# model so a provider rejection can fall back to instruction-only JSON while
# TransferProposal remains the parser.
PROPOSAL_RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "transfer_proposal",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "donor_facility_id": {"type": "string"},
                "recipient_facility_id": {"type": "string"},
                "blood_group": {"type": "string", "enum": list(BLOOD_GROUPS)},
                "proposed_unit_codes": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "ai_rationale": {"type": "string"},
            },
            "required": [
                "donor_facility_id",
                "recipient_facility_id",
                "blood_group",
                "proposed_unit_codes",
                "ai_rationale",
            ],
        },
    },
}
