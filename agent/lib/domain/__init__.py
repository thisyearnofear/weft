# SPDX-License-Identifier: MIT
"""Rail-agnostic milestone domain types (EVM + Canton)."""

from .models import (
    AttestationVerdict,
    MilestoneParties,
    MilestoneStatus,
    MilestoneViewModel,
    SettlementReceipt,
    StakeRecord,
    VerdictPayload,
)
from .receipt import build_verification_receipt
from .templates import (
    EvidenceTemplateId,
    InstitutionalChecklistEvidence,
    build_institutional_attestation,
    evaluate_institutional_checklist,
    select_template,
)

__all__ = [
    "AttestationVerdict",
    "EvidenceTemplateId",
    "InstitutionalChecklistEvidence",
    "MilestoneParties",
    "MilestoneStatus",
    "MilestoneViewModel",
    "SettlementReceipt",
    "StakeRecord",
    "VerdictPayload",
    "build_institutional_attestation",
    "build_verification_receipt",
    "evaluate_institutional_checklist",
    "select_template",
]
