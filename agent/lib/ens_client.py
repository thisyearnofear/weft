#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
ENS client for Weft portable reputation.
Updates text records on builder ENS names after milestone verification.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

ENS_PUBLIC_RESOLVER = "0x231052B08c198b0822486Eb1B6e2F238f7CF528E1"


@dataclass(frozen=True)
class BuilderProfile:
    ens_name: str
    projects: List[str]
    milestones_verified: int
    earned_total: int
    cobuilders: List[str]
    reputation_score: int


class EnsClient:
    """
    Updates ENS text records for Weft portable reputation.
    Uses viem + ENS namehash. Requires ETH_RPC_URL and VERIFIER_PRIVATE_KEY.
    """

    def __init__(
        self,
        rpc_url: str,
        wallet_key: str,
        ens_registry: str = "0x00000000000C2E706e62F196aA929C3F6a76CF3E",
        public_resolver: str = ENS_PUBLIC_RESOLVER,
    ):
        self.rpc_url = rpc_url
        self.wallet_key = wallet_key
        self.ens_registry = ens_registry
        self.public_resolver = public_resolver

    def update_builder_profile(
        self,
        ens_name: str,
        add_project: Optional[str] = None,
        increment_verified: bool = False,
        add_earnings: int = 0,
        add_cobuilder: Optional[str] = None,
        new_reputation_score: Optional[int] = None,
    ) -> str:
        """Update root-level ENS profile after milestone resolution."""
        calls = []

        if add_project:
            existing = self._get_text(ens_name, "weft.projects") or "[]"
            projects = json.loads(existing)
            if add_project not in projects:
                projects.append(add_project)
            calls.append(self._set_text_call(ens_name, "weft.projects", json.dumps(projects)))

        if increment_verified:
            current = self._get_text(ens_name, "weft.milestones.verified") or "0"
            calls.append(self._set_text_call(ens_name, "weft.milestones.verified", str(int(current) + 1)))

        if add_earnings > 0:
            current = self._get_text(ens_name, "weft.earned.total") or "0"
            calls.append(self._set_text_call(ens_name, "weft.earned.total", str(int(current) + add_earnings)))

        if add_cobuilder:
            existing = self._get_text(ens_name, "weft.cobuilders") or "[]"
            cobuilders = json.loads(existing)
            if add_cobuilder not in cobuilders:
                cobuilders.append(add_cobuilder)
            calls.append(self._set_text_call(ens_name, "weft.cobuilders", json.dumps(cobuilders)))

        if new_reputation_score is not None:
            calls.append(self._set_text_call(ens_name, "weft.reputation.score", str(new_reputation_score)))

        if not calls:
            return ""
        return self._execute(calls)

    def update_project_record(
        self,
        ens_name: str,
        project_id: str,
        role: Optional[str] = None,
        joined_at: Optional[int] = None,
        add_earnings: int = 0,
        increment_milestones: bool = False,
    ) -> str:
        """Update per-project records: weft.project.{projectId}.*"""
        prefix = f"weft.project.{project_id}"
        calls = []

        if role:
            calls.append(self._set_text_call(ens_name, f"{prefix}.role", role))
        if joined_at:
            calls.append(self._set_text_call(ens_name, f"{prefix}.joined", str(joined_at)))
        if add_earnings > 0:
            existing = self._get_text(ens_name, f"{prefix}.earnings") or "0"
            calls.append(self._set_text_call(ens_name, f"{prefix}.earnings", str(int(existing) + add_earnings)))
        if increment_milestones:
            existing = self._get_text(ens_name, f"{prefix}.milestones") or "0"
            calls.append(self._set_text_call(ens_name, f"{prefix}.milestones", str(int(existing) + 1)))

        if not calls:
            return ""
        return self._execute(calls)

    def update_milestone_record(
        self,
        ens_name: str,
        milestone_hash: str,
        project_id: str,
        status: Optional[str] = None,
        evidence_root: Optional[str] = None,
        released: int = 0,
        timestamp: Optional[int] = None,
    ) -> str:
        """Update per-milestone records: weft.milestone.{milestoneHash}.*"""
        prefix = f"weft.milestone.{milestone_hash}"
        calls = []

        calls.append(self._set_text_call(ens_name, f"{prefix}.project", project_id))

        if status:
            calls.append(self._set_text_call(ens_name, f"{prefix}.status", status))
        if evidence_root:
            calls.append(self._set_text_call(ens_name, f"{prefix}.evidence", evidence_root))
        if released > 0:
            calls.append(self._set_text_call(ens_name, f"{prefix}.released", str(released)))
        if timestamp:
            calls.append(self._set_text_call(ens_name, f"{prefix}.timestamp", str(timestamp)))

        return self._execute(calls)

    def read_builder_profile(self, ens_name: str) -> BuilderProfile:
        """Read builder profile."""
        return BuilderProfile(
            ens_name=ens_name,
            projects=json.loads(self._get_text(ens_name, "weft.projects") or "[]"),
            milestones_verified=int(self._get_text(ens_name, "weft.milestones.verified") or "0"),
            earned_total=int(self._get_text(ens_name, "weft.earned.total") or "0"),
            cobuilders=json.loads(self._get_text(ens_name, "weft.cobuilders") or "[]"),
            reputation_score=int(self._get_text(ens_name, "weft.reputation.score") or "0"),
        )

    def _get_text(self, ens_name: str, key: str) -> Optional[str]:
        """Read text record via eth_call."""
        node = _namehash(ens_name)
        data = _encode_text("text(bytes32,string)", node, key)

        import urllib.request
        req = urllib.request.Request(
            self.rpc_url,
            data=json.dumps({
                "jsonrpc": "2.0",
                "method": "eth_call",
                "params": [{"to": self.public_resolver, "data": data}, "latest"],
                "id": 1,
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            return result.get("result")
        except Exception:
            return None

    def _set_text_call(self, ens_name: str, key: str, value: str) -> Dict[str, Any]:
        """Build setText calldata."""
        node = _namehash(ens_name)
        encoded = _encode_text("setText(bytes32,string,string)", node, key, value)
        return {"to": self.public_resolver, "data": encoded}

    def _execute(self, calls: List[Dict[str, Any]]) -> str:
        """Execute via cast multicall."""
        multicall = json.dumps(calls).replace('"', '\\"')
        result = subprocess.run([
            "cast", "send", self.public_resolver,
            f"multicall(bytes)",
            multicall,
            "--rpc-url", self.rpc_url,
            "--private-key", self.wallet_key,
        ], capture_output=True, text=True)
        return result.stdout.strip() if result.returncode == 0 else ""


def _namehash(name: str) -> str:
    """Compute ENS namehash."""
    labels = name.split(".")
    node = b"\x00" * 32
    for label in reversed(labels):
        label_hash = hashlib.sha256(label.encode("utf-8")).hexdigest()
        combined = label_hash + node[2:]
        node = "0x" + hashlib.sha256(bytes.fromhex(combined)).hexdigest()
    return node


def _encode_text(selector: str, *args: str) -> str:
    """ABI-encode text record args."""
    args_str = ",".join(f'"{a}"' for a in args)
    result = subprocess.run([
        "cast", "calldata", f"{selector}({args_str})",
    ], capture_output=True, text=True)
    return result.stdout.strip()


def update_ens_after_verification(
    builder_ens: str,
    project_id: str,
    milestone_hash: str,
    storage_receipt,
    earnings: int,
    role: str = "builder",
) -> str:
    """Update all ENS records after milestone verification."""
    rpc = os.environ.get("ETH_RPC_URL", "")
    key = os.environ.get("VERIFIER_PRIVATE_KEY", "")

    if not rpc or not key:
        return ""

    client = EnsClient(rpc, key)
    tx_hashes = []

    tx = client.update_builder_profile(
        builder_ens,
        add_project=project_id,
        increment_verified=True,
        add_earnings=earnings,
    )
    if tx:
        tx_hashes.append(tx)

    tx = client.update_project_record(
        builder_ens,
        project_id,
        role=role,
        joined_at=int(storage_receipt.timestamp or 0),
        add_earnings=earnings,
        increment_milestones=True,
    )
    if tx:
        tx_hashes.append(tx)

    tx = client.update_milestone_record(
        builder_ens,
        milestone_hash,
        project_id,
        status="released",
        evidence_root=storage_receipt.log_root,
        released=earnings,
        timestamp=int(storage_receipt.timestamp or 0),
    )
    if tx:
        tx_hashes.append(tx)

    return ",".join(tx_hashes)