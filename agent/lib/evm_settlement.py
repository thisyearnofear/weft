# SPDX-License-Identifier: MIT
"""EVM settlement adapter — wraps existing WeftMilestone / KeeperHub / cast send path."""

from __future__ import annotations

import os
import subprocess
from typing import List, Optional

from .domain.models import (
    MilestoneParties,
    MilestoneStatus,
    MilestoneViewModel,
    SettlementReceipt,
    VerdictPayload,
)
from .keeperhub_client import ExecutionStatus, execute_verdict, keeperhub_configured
from .jsonrpc import JsonRpcClient
from .weft_milestone_reader import read_milestone as read_evm_milestone


class EvmSettlement:
    """SettlementRail implementation for WeftMilestone on EVM (0G / etc.)."""

    name = "evm"

    def __init__(
        self,
        *,
        rpc_url: str,
        contract_address: str,
        private_key: str = "",
        use_keeperhub: bool = True,
        chain_id: Optional[int] = None,
        keeperhub_timeout: int = 120,
        out_dir: Optional[str] = None,
    ) -> None:
        self.rpc_url = rpc_url
        self.contract_address = contract_address
        self.private_key = private_key
        self.use_keeperhub = use_keeperhub
        self.chain_id = chain_id
        self.keeperhub_timeout = keeperhub_timeout
        self.out_dir = out_dir

    @classmethod
    def from_env(cls) -> "EvmSettlement":
        return cls(
            rpc_url=os.environ.get("ETH_RPC_URL", ""),
            contract_address=os.environ.get("WEFT_CONTRACT_ADDRESS", ""),
            private_key=os.environ.get("PRIVATE_KEY", ""),
            use_keeperhub=os.environ.get("KEEPERHUB_ENABLED", "1") != "0",
            chain_id=int(os.environ["CHAIN_ID"]) if os.environ.get("CHAIN_ID") else None,
            keeperhub_timeout=int(os.environ.get("KEEPERHUB_TIMEOUT", "120")),
        )

    def read_milestone(self, milestone_id: str) -> Optional[MilestoneViewModel]:
        if not self.rpc_url or not self.contract_address:
            return None
        rpc = JsonRpcClient(self.rpc_url)
        try:
            m = read_evm_milestone(rpc, self.contract_address, milestone_id)
        except Exception:
            return None
        status = MilestoneStatus.PENDING
        if m.released:
            status = MilestoneStatus.RELEASED
        elif m.finalized and m.verified:
            status = MilestoneStatus.VERIFIED
        elif m.finalized and not m.verified:
            status = MilestoneStatus.FAILED
        elif m.totalStaked and int(m.totalStaked) > 0:
            status = MilestoneStatus.FUNDED

        return MilestoneViewModel(
            milestone_id=milestone_id,
            rail="evm",
            project_id=m.projectId,
            template_id=m.templateId,
            metadata_hash=m.metadataHash,
            deadline=int(m.deadline),
            total_staked=str(m.totalStaked),
            status=status,
            finalized=bool(m.finalized),
            verified=bool(m.verified),
            released=bool(m.released),
            verifier_count=int(m.verifierCount),
            verified_votes=int(m.verifiedVotes),
            quorum=0,
            final_evidence_root=m.finalEvidenceRoot or "",
            parties=MilestoneParties(
                issuer=m.builder or "",
                builder=m.builder or "",
            ),
        )

    def create_milestone(
        self,
        *,
        milestone_id: str,
        project_id: str,
        template_id: str,
        deadline: int,
        metadata_hash: str,
        builder: str,
        verifiers: List[str],
        observers: List[str],
        quorum: int = 2,
    ) -> SettlementReceipt:
        return SettlementReceipt(
            ok=False,
            rail=self.name,
            milestone_id=milestone_id,
            action="create_milestone",
            error="EVM create_milestone is handled by weft_builder / cast; not via EvmSettlement v1",
        )

    def stake(self, milestone_id: str, *, funder: str, amount: str) -> SettlementReceipt:
        return SettlementReceipt(
            ok=False,
            rail=self.name,
            milestone_id=milestone_id,
            action="stake",
            error="EVM stake is payable onchain; not via EvmSettlement v1",
        )

    def submit_verdict(self, milestone_id: str, verdict: VerdictPayload) -> SettlementReceipt:
        verified_arg = "true" if verdict.did_complete else "false"
        evidence_root = verdict.evidence_hash

        if self.use_keeperhub and keeperhub_configured():
            result = execute_verdict(
                contract_address=self.contract_address,
                function_name="submitVerdict(bytes32,bool,bytes32)",
                args=[milestone_id, verified_arg, evidence_root],
                chain_id=self.chain_id,
                timeout=self.keeperhub_timeout,
                out_dir=self.out_dir,
            )
            if result is not None:
                if result.status == ExecutionStatus.CONFIRMED:
                    return SettlementReceipt(
                        ok=True,
                        rail=self.name,
                        milestone_id=milestone_id,
                        action="submit_verdict",
                        reference=result.tx_hash or "",
                        raw={"via": "keeperhub"},
                    )
                # fall through to cast

        if not self.private_key:
            return SettlementReceipt(
                ok=False,
                rail=self.name,
                milestone_id=milestone_id,
                action="submit_verdict",
                error="PRIVATE_KEY required for cast send fallback",
            )

        try:
            proc = subprocess.run(
                [
                    "cast",
                    "send",
                    "--rpc-url",
                    self.rpc_url,
                    "--private-key",
                    self.private_key,
                    self.contract_address,
                    "submitVerdict(bytes32,bool,bytes32)",
                    milestone_id,
                    verified_arg,
                    evidence_root,
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                check=False,
            )
            if proc.returncode != 0:
                return SettlementReceipt(
                    ok=False,
                    rail=self.name,
                    milestone_id=milestone_id,
                    action="submit_verdict",
                    error=proc.stdout or "cast send failed",
                )
            return SettlementReceipt(
                ok=True,
                rail=self.name,
                milestone_id=milestone_id,
                action="submit_verdict",
                reference="",
                raw={"via": "cast_send", "output": proc.stdout},
            )
        except Exception as e:
            return SettlementReceipt(
                ok=False,
                rail=self.name,
                milestone_id=milestone_id,
                action="submit_verdict",
                error=str(e),
            )

    def release(self, milestone_id: str) -> SettlementReceipt:
        return SettlementReceipt(
            ok=False,
            rail=self.name,
            milestone_id=milestone_id,
            action="release",
            error="EVM release uses release_after_verification; not via EvmSettlement v1",
        )

    def refund(self, milestone_id: str) -> SettlementReceipt:
        return SettlementReceipt(
            ok=False,
            rail=self.name,
            milestone_id=milestone_id,
            action="refund",
            error="EVM refund is onchain; not via EvmSettlement v1",
        )
