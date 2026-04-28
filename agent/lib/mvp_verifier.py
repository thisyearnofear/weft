#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

import json
import os
import subprocess
from dataclasses import asdict, dataclass
from typing import Dict, Optional, Set, Tuple

from .eth_rpc import (
    chain_id as eth_chain_id,
    find_first_block_at_or_after,
    find_last_block_at_or_before,
    get_block as eth_get_block,
    get_code as eth_get_code,
    get_tx_receipt as eth_get_transaction_receipt,
    latest_timestamp,
    to_int as _to_int,
)
from .jsonrpc import JsonRpcClient


def _strip_0x(s: str) -> str:
    return s[2:] if s.startswith("0x") else s


def _cast_keccak_from_stdin(data: bytes) -> str:
    # Use foundry's `cast keccak` for Keccak-256 (not SHA3-256).
    # This avoids adding python crypto dependencies.
    p = subprocess.run(
        ["cast", "keccak"],
        input=data,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )
    return p.stdout.decode("utf-8").strip()


def keccak_bytes(data: bytes) -> str:
    return _cast_keccak_from_stdin(data)


def keccak_hex(hex_data: str) -> str:
    raw = bytes.fromhex(_strip_0x(hex_data))
    return _cast_keccak_from_stdin(raw)


def keccak_text(text: str) -> str:
    return _cast_keccak_from_stdin(text.encode("utf-8"))


@dataclass(frozen=True)
class UsageEvidence:
    windowStart: int
    windowEnd: int
    uniqueCallerCount: int


@dataclass(frozen=True)
class DeploymentEvidence:
    contractAddress: str
    codeHash: str
    blockNumber: int


def count_unique_callers(
    rpc: JsonRpcClient,
    contract_address: str,
    window_start_ts: int,
    window_end_ts: int,
    *,
    stop_at: Optional[int] = None,
) -> Tuple[int, int, int]:
    """
    Deterministic “unique callers” approximation for MVP:
    - iterates blocks by timestamp window
    - counts unique `tx.from` for successful transactions where `tx.to == contract`
    """
    contract = contract_address.lower()
    start_block = find_first_block_at_or_after(rpc, window_start_ts)
    end_block = find_last_block_at_or_before(rpc, window_end_ts)

    unique: Set[str] = set()

    for n in range(start_block, end_block + 1):
        block = eth_get_block(rpc, n, full=True)
        txs = block.get("transactions", [])
        for tx in txs:
            to = (tx.get("to") or "").lower()
            if to != contract:
                continue

            receipt = eth_get_transaction_receipt(rpc, tx["hash"])
            # status is hex string '0x1'/'0x0' (or missing on some chains)
            status = receipt.get("status")
            if status is not None and _to_int(status) != 1:
                continue

            unique.add(tx["from"].lower())
            if stop_at is not None and len(unique) >= stop_at:
                return len(unique), start_block, end_block

    return len(unique), start_block, end_block


def build_attestation(
    *,
    schema_version: int,
    project_id: str,
    milestone_hash: str,
    template_id: str,
    chain_id: int,
    contract_address: str,
    deadline: int,
    measurement_window_seconds: int,
    unique_caller_threshold: int,
    deployment: DeploymentEvidence,
    usage: UsageEvidence,
    node_address: str,
    attested_at: int,
) -> Dict:
    verified = (deployment.codeHash != "0x" + "00" * 32) and (usage.uniqueCallerCount >= unique_caller_threshold)
    reason = "unique callers threshold met" if verified else "threshold not met or contract not deployed"

    return {
        "schemaVersion": schema_version,
        "weft": {
            "projectId": project_id,
            "milestoneHash": milestone_hash,
            "templateId": template_id,
        },
        "inputs": {
            "chainId": chain_id,
            "contractAddress": contract_address,
            "deadline": deadline,
            "measurementWindowSeconds": measurement_window_seconds,
            "uniqueCallerThreshold": unique_caller_threshold,
        },
        "evidence": {
            "deployment": asdict(deployment),
            "usage": asdict(usage),
        },
        "verdict": {
            "verified": verified,
            "reason": reason,
        },
        "narrative": {
            "summary": "",
        },
        "verifier": {
            "nodeAddress": node_address,
            "signature": "",
        },
        "timestamps": {
            "attestedAt": attested_at,
        },
    }


def write_attestation_files(attestation: Dict, out_path: str) -> str:
    """
    Writes:
    - pretty JSON to out_path
    - canonical JSON to out_path + '.canonical'
    Returns canonical path.
    """
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(attestation, f, indent=2, sort_keys=False)
        f.write("\n")

    canonical_path = out_path + ".canonical"
    canonical_bytes = json.dumps(attestation, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    with open(canonical_path, "wb") as f:
        f.write(canonical_bytes)
        f.write(b"\n")

    return canonical_path
