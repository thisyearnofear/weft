# SPDX-License-Identifier: MIT
"""Evidence templates: EVM MVP stays in mvp_verifier; Canton uses institutional checklist."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any, Dict, Optional


class EvidenceTemplateId(str, Enum):
    EVM_DEPLOYMENT_USAGE = "evm.deployment_usage.v1"
    INSTITUTIONAL_CHECKLIST = "canton.institutional_checklist.v1"


@dataclass(frozen=True)
class InstitutionalChecklistEvidence:
    """Off-ledger delivery checklist for Canton institutional milestones."""

    document_hash: str
    delivery_confirmed: bool
    invoice_settled: bool
    checklist_items_passed: int
    checklist_items_required: int
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def evaluate_institutional_checklist(evidence: InstitutionalChecklistEvidence) -> Dict[str, Any]:
    """
    Deterministic Canton gate (no EVM deployment / unique-caller requirement).

    verified when:
    - document_hash is non-empty and not a zero hash
    - delivery_confirmed and invoice_settled are true
    - checklist_items_passed >= checklist_items_required
    """
    zero = "0x" + ("00" * 32)
    has_doc = bool(evidence.document_hash) and evidence.document_hash.lower() != zero
    checklist_ok = evidence.checklist_items_passed >= evidence.checklist_items_required
    verified = (
        has_doc
        and evidence.delivery_confirmed
        and evidence.invoice_settled
        and checklist_ok
    )
    if verified:
        reason = "institutional checklist passed"
    elif not has_doc:
        reason = "missing or zero document_hash"
    elif not evidence.delivery_confirmed:
        reason = "delivery not confirmed"
    elif not evidence.invoice_settled:
        reason = "invoice not settled"
    else:
        reason = "checklist items below required threshold"

    return {
        "schemaVersion": 1,
        "templateId": EvidenceTemplateId.INSTITUTIONAL_CHECKLIST.value,
        "evidence": evidence.to_dict(),
        "verdict": {"verified": verified, "reason": reason},
    }


def select_template(metadata: Optional[Dict[str, Any]] = None, *, rail: str = "evm") -> EvidenceTemplateId:
    """Pick evidence template from metadata or settlement rail."""
    metadata = metadata or {}
    explicit = (metadata.get("evidenceTemplate") or metadata.get("templateId") or "").strip()
    if explicit == EvidenceTemplateId.INSTITUTIONAL_CHECKLIST.value:
        return EvidenceTemplateId.INSTITUTIONAL_CHECKLIST
    if explicit == EvidenceTemplateId.EVM_DEPLOYMENT_USAGE.value:
        return EvidenceTemplateId.EVM_DEPLOYMENT_USAGE
    if rail == "canton":
        return EvidenceTemplateId.INSTITUTIONAL_CHECKLIST
    return EvidenceTemplateId.EVM_DEPLOYMENT_USAGE


def build_institutional_attestation(
    *,
    schema_version: int,
    project_id: str,
    milestone_id: str,
    template_id: str,
    evidence: InstitutionalChecklistEvidence,
    node_address: str,
    attested_at: int,
    deadline: int = 0,
) -> Dict[str, Any]:
    """Attestation envelope for Canton institutional milestones (mirrors mvp_verifier shape)."""
    evaluated = evaluate_institutional_checklist(evidence)
    return {
        "schemaVersion": schema_version,
        "weft": {
            "projectId": project_id,
            "milestoneHash": milestone_id,
            "milestoneId": milestone_id,
            "templateId": template_id or EvidenceTemplateId.INSTITUTIONAL_CHECKLIST.value,
            "rail": "canton",
        },
        "inputs": {
            "deadline": deadline,
            "evidenceTemplate": EvidenceTemplateId.INSTITUTIONAL_CHECKLIST.value,
        },
        "evidence": evaluated["evidence"],
        "verdict": evaluated["verdict"],
        "narrative": {"summary": ""},
        "verifier": {"nodeAddress": node_address, "signature": ""},
        "timestamps": {"attestedAt": attested_at},
    }
