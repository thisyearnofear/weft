#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
ENS client for Weft portable reputation.
Updates text records on builder ENS names after milestone verification.
"""

from __future__ import annotations

import json
import os
import subprocess
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

ENS_PUBLIC_RESOLVER = "0x231052B08c198b0822486Eb1B6e2F238f7CF528E"


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

    def verify_ownership(self, ens_name: str) -> bool:
        """Pre-flight: verify the configured wallet owns the ENS name.

        Calls owner(bytes32) on the ENS registry. Returns False on any error so
        callers can emit a helpful message instead of letting the tx revert silently.
        """
        node = _namehash(ens_name)
        calldata = _encode_calldata("owner(bytes32)", node)
        try:
            req = urllib.request.Request(
                self.rpc_url,
                data=json.dumps({
                    "jsonrpc": "2.0",
                    "method": "eth_call",
                    "params": [{"to": self.ens_registry, "data": calldata}, "latest"],
                    "id": 1,
                }).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            owner_hex = result.get("result", "")
            if not owner_hex or owner_hex == "0x" + "00" * 32:
                return False
            owner_addr = "0x" + owner_hex[-40:].lower()
            proc = subprocess.run(
                ["cast", "wallet", "address", "--private-key", self.wallet_key],
                capture_output=True, text=True, check=False,
            )
            if proc.returncode != 0:
                return False
            our_addr = proc.stdout.strip().lower()
            return our_addr == owner_addr
        except Exception:
            return False

    def update_agent_record(
        self,
        agent_ens: str,
        contributions: Optional[int] = None,
        earnings: int = 0,
        projects: Optional[List[str]] = None,
    ) -> str:
        """Update co-builder agent subname records per docs/data-model.md:
          weft.agent.contributions, weft.agent.earnings, weft.agent.projects
        """
        updates: Dict[str, str] = {}

        if contributions is not None:
            updates["weft.agent.contributions"] = str(contributions)
        if earnings > 0:
            existing = int(self._get_text(agent_ens, "weft.agent.earnings") or "0")
            updates["weft.agent.earnings"] = str(existing + earnings)
        if projects:
            existing_raw = self._get_text(agent_ens, "weft.agent.projects") or "[]"
            current = json.loads(existing_raw)
            for p in projects:
                if p not in current:
                    current.append(p)
            updates["weft.agent.projects"] = json.dumps(current)

        if not updates:
            return ""
        return self._execute_text_updates(agent_ens, updates)

    def _get_text(self, ens_name: str, key: str) -> Optional[str]:
        """Read text record via eth_call → text(bytes32,string)."""
        node = _namehash(ens_name)
        calldata = _encode_calldata("text(bytes32,string)", node, key)
        try:
            req = urllib.request.Request(
                self.rpc_url,
                data=json.dumps({
                    "jsonrpc": "2.0",
                    "method": "eth_call",
                    "params": [{"to": self.public_resolver, "data": calldata}, "latest"],
                    "id": 1,
                }).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            return result.get("result")
        except Exception:
            return None

    def _execute_text_updates(self, ens_name: str, updates: Dict[str, str]) -> str:
        """Send one cast send setText(bytes32,string,string) per key-value pair.

        Replaces the previous fragile multicall approach. Each setText is a
        separate transaction — no escaping issues, full error propagation.
        Returns the last tx hash on success, or empty string if all fail.
        """
        node = _namehash(ens_name)
        last_tx = ""
        for key, value in updates.items():
            proc = subprocess.run(
                [
                    "cast", "send",
                    "--rpc-url", self.rpc_url,
                    "--private-key", self.wallet_key,
                    self.public_resolver,
                    "setText(bytes32,string,string)",
                    node, key, value,
                ],
                capture_output=True, text=True, check=False,
            )
            if proc.returncode == 0:
                last_tx = proc.stdout.strip()
            else:
                print(f"ens_client: setText failed for key={key}: {proc.stderr.strip()}")
        return last_tx


def _keccak256(data: bytes) -> bytes:
    """Compute keccak256 via `cast keccak` (no extra deps, consistent with mvp_verifier)."""
    proc = subprocess.run(
        ["cast", "keccak"],
        input=data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"cast keccak failed: {proc.stderr.decode().strip()}")
    hex_str = proc.stdout.decode().strip()
    return bytes.fromhex(hex_str[2:] if hex_str.startswith("0x") else hex_str)


def _namehash(name: str) -> str:
    """Compute ENS namehash per EIP-137 using keccak256 (not sha256).

    node = keccak256(namehash(parent) ++ keccak256(label))
    Starting node is 0x00..00 (32 zero bytes).
    """
    node = b"\x00" * 32
    if name:
        for label in reversed(name.split(".")):
            label_hash = _keccak256(label.encode("utf-8"))
            node = _keccak256(node + label_hash)
    return "0x" + node.hex()


def _encode_calldata(selector: str, *args: str) -> str:
    """ABI-encode a function call via `cast calldata`.

    Uses the correct `cast calldata "fn(types)" arg1 arg2` syntax.
    """
    proc = subprocess.run(
        ["cast", "calldata", selector, *args],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"cast calldata failed for {selector}: {proc.stderr.strip()}")
    return proc.stdout.strip()


def issue_verified_subname(
    parent_ens: str,
    label: str,
    owner_address: str,
    resolver: str = ENS_PUBLIC_RESOLVER,
    ttl: int = 0,
) -> str:
    """Issue a subname under a parent ENS name to a verified builder.

    Example: issue_verified_subname("weft.eth", "myproject", "0xABC...")
    creates myproject.weft.eth owned by 0xABC...

    Requires:
    - ETH_RPC_URL pointing to Ethereum mainnet
    - VERIFIER_PRIVATE_KEY (or PRIVATE_KEY) controlling parent_ens
    - foundry `cast` in PATH

    Uses ENS NameWrapper setSubnodeRecord for wrapped names, or
    ENS Registry setSubnodeRecord for legacy names.
    """
    rpc = os.environ.get("ETH_RPC_URL", "")
    key = os.environ.get("VERIFIER_PRIVATE_KEY", "") or os.environ.get("PRIVATE_KEY", "")

    if not rpc or not key:
        print("issue_verified_subname: ETH_RPC_URL or PRIVATE_KEY not set")
        return ""

    # ENS NameWrapper (wraps names for subname issuance)
    name_wrapper = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401"
    # ENS Registry (legacy fallback)
    ens_registry = "0x00000000000C2E706e62F196aA929C3F6a76CF3E"

    parent_node = _namehash(parent_ens)
    label_hash = "0x" + _keccak256(label.encode("utf-8")).hex()

    # Try NameWrapper first (setSubnodeRecord)
    # setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry)
    try:
        calldata = _encode_calldata(
            "setSubnodeRecord(bytes32,string,address,address,uint64,uint32,uint64)",
            parent_node,
            label,
            owner_address,
            resolver,
            str(ttl),
            "0",   # fuses: 0 = no restrictions
            "0",   # expiry: 0 = no expiry
        )
        proc = subprocess.run(
            [
                "cast", "send",
                "--rpc-url", rpc,
                "--private-key", key,
                name_wrapper,
                calldata,
            ],
            capture_output=True, text=True, check=False,
        )
        if proc.returncode == 0:
            tx = proc.stdout.strip()
            print(f"ens_client: issued subname {label}.{parent_ens} → {owner_address} (NameWrapper tx={tx})")
            return tx
        # Fall through to legacy registry
        print(f"ens_client: NameWrapper setSubnodeRecord failed ({proc.stderr.strip()[:120]}), trying legacy registry")
    except Exception as e:
        print(f"ens_client: NameWrapper attempt error: {e}")

    # Legacy ENS Registry fallback: setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)
    try:
        calldata = _encode_calldata(
            "setSubnodeRecord(bytes32,bytes32,address,address,uint64)",
            parent_node,
            label_hash,
            owner_address,
            resolver,
            str(ttl),
        )
        proc = subprocess.run(
            [
                "cast", "send",
                "--rpc-url", rpc,
                "--private-key", key,
                ens_registry,
                calldata,
            ],
            capture_output=True, text=True, check=False,
        )
        if proc.returncode == 0:
            tx = proc.stdout.strip()
            print(f"ens_client: issued subname {label}.{parent_ens} → {owner_address} (Registry tx={tx})")
            return tx
        print(f"ens_client: Registry setSubnodeRecord also failed: {proc.stderr.strip()[:120]}")
    except Exception as e:
        print(f"ens_client: Registry attempt error: {e}")

    return ""


def update_ens_after_verification(
    builder_ens: str,
    project_id: str,
    milestone_hash: str,
    storage_receipt,
    earnings: int,
    role: str = "builder",
    skip_ownership: bool = False,
) -> str:
    """Update all ENS records after milestone verification.

    Pre-flight: checks ownership before writing. Emits a clear error if the
    verifier's key does not control the builder's ENS name so the tx doesn't
    revert silently.

    Set skip_ownership=True to bypass the ownership check (for demos/testing
    when the verifier controls the builder's ENS name via other means).
    """
    rpc = os.environ.get("ETH_RPC_URL", "")
    key = os.environ.get("VERIFIER_PRIVATE_KEY", "") or os.environ.get("PRIVATE_KEY", "")

    if not rpc or not key:
        return ""

    client = EnsClient(rpc, key)

    if not skip_ownership and not client.verify_ownership(builder_ens):
        print(
            f"ens_client: skipping ENS update — verifier key does not own '{builder_ens}'. "
            f"The builder must set the verifier address as owner or approved operator."
        )
        return ""

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