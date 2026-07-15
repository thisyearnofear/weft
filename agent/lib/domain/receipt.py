# SPDX-License-Identifier: MIT
"""Verification receipt — GMS writeback shape (SoR-first).

Mirrors what a program office needs on the grant record after checklist evaluation.
Settlement fields are optional; the receipt is useful even when capital is off-ledger.
"""

from __future__ import annotations

import time
from typing import Any, Dict, Optional


def build_verification_receipt(
    *,
    milestone: Dict[str, Any],
    external_ref: str = "",
    attestation: Optional[Dict[str, Any]] = None,
    writeback_destination: str = "gms",
) -> Dict[str, Any]:
    """Build a stable receipt JSON for GMS / CRM writeback."""
    parties = milestone.get("parties") or {}
    verified = bool(milestone.get("verified"))
    finalized = bool(milestone.get("finalized"))
    released = bool(milestone.get("released"))
    status = str(milestone.get("status") or "pending")

    votes = int(milestone.get("verifiedVotes") or 0)
    quorum = int(milestone.get("quorum") or 2)
    evidence = (
        milestone.get("finalEvidenceRoot")
        or (attestation or {}).get("evidence", {}).get("document_hash")
        or (attestation or {}).get("evidence", {}).get("documentHash")
        or ""
    )

    verdict = (attestation or {}).get("verdict") or {}
    attested_at = (
        ((attestation or {}).get("timestamps") or {}).get("attestedAt")
        or int(time.time())
    )

    return {
        "schemaVersion": 1,
        "receiptType": "weft.verification_receipt.v1",
        "externalRef": external_ref or str(milestone.get("externalRef") or ""),
        "milestoneId": str(milestone.get("milestoneId") or ""),
        "projectId": str(milestone.get("projectId") or ""),
        "templateId": str(
            milestone.get("templateId") or "canton.institutional_checklist.v1"
        ),
        "rail": str(milestone.get("rail") or "canton"),
        "status": status,
        "finalized": finalized,
        "verified": verified,
        "released": released,
        "evidenceHash": evidence,
        "quorum": {"votes": votes, "required": quorum},
        "settlementRef": str(milestone.get("lastTransferRef") or ""),
        "settlement": milestone.get("settlement") or None,
        "parties": {
            "issuer": parties.get("issuer") or "",
            "builder": parties.get("builder") or "",
        },
        "verdictReason": verdict.get("reason") or "",
        "attestedAt": int(attested_at),
        "writeback": {
            "destination": writeback_destination,
            "suggestedFields": {
                "weft_status": status,
                "weft_verified": verified,
                "weft_evidence_hash": evidence,
                "weft_settlement_ref": str(milestone.get("lastTransferRef") or ""),
                "weft_attested_at": int(attested_at),
                "weft_milestone_id": str(milestone.get("milestoneId") or ""),
            },
        },
    }
