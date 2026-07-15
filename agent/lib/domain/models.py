# SPDX-License-Identifier: MIT
"""Rail-agnostic milestone view model and verdict DTOs."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class MilestoneStatus(str, Enum):
    PENDING = "pending"
    FUNDED = "funded"
    FINALIZED = "finalized"
    VERIFIED = "verified"
    FAILED = "failed"
    RELEASED = "released"
    REFUNDED = "refunded"


@dataclass(frozen=True)
class MilestoneParties:
    issuer: str
    builder: str
    funders: List[str] = field(default_factory=list)
    verifiers: List[str] = field(default_factory=list)
    observers: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class StakeRecord:
    funder: str
    amount: str  # decimal string for rail-agnostic amounts


@dataclass(frozen=True)
class VerdictPayload:
    did_complete: bool
    evidence_hash: str
    verifier: str = ""


@dataclass(frozen=True)
class AttestationVerdict:
    verified: bool
    reason: str
    evidence_hash: str = ""
    template_id: str = ""


@dataclass(frozen=True)
class SettlementReceipt:
    ok: bool
    rail: str
    milestone_id: str
    action: str
    reference: str = ""  # tx hash, contract id, or command id
    error: str = ""
    raw: Optional[Dict[str, Any]] = None


@dataclass
class MilestoneViewModel:
    """Shared status shape for status API + UI (EVM or Canton)."""

    milestone_id: str
    rail: str  # "evm" | "canton"
    project_id: str
    template_id: str
    metadata_hash: str
    deadline: int
    total_staked: str
    status: MilestoneStatus
    finalized: bool
    verified: bool
    released: bool
    verifier_count: int
    verified_votes: int
    quorum: int
    final_evidence_root: str
    parties: MilestoneParties
    stakes: List[StakeRecord] = field(default_factory=list)

    def to_status_dict(self) -> Dict[str, Any]:
        return {
            "milestoneId": self.milestone_id,
            "rail": self.rail,
            "projectId": self.project_id,
            "templateId": self.template_id,
            "metadataHash": self.metadata_hash,
            "deadline": self.deadline,
            "totalStaked": self.total_staked,
            "status": self.status.value,
            "finalized": self.finalized,
            "verified": self.verified,
            "released": self.released,
            "verifierCount": self.verifier_count,
            "verifiedVotes": self.verified_votes,
            "quorum": self.quorum,
            "finalEvidenceRoot": self.final_evidence_root,
            "parties": {
                "issuer": self.parties.issuer,
                "builder": self.parties.builder,
                "funders": list(self.parties.funders),
                "verifiers": list(self.parties.verifiers),
                "observers": list(self.parties.observers),
            },
            "stakes": [asdict(s) for s in self.stakes],
        }
