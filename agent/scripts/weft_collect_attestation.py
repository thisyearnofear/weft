#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

import argparse
import os
import sys
import time

# Allow running this script directly from the repo root without installing a package.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.jsonrpc import JsonRpcClient, default_cache
from agent.lib.eth_rpc import (
    block_number as eth_block_number,
    chain_id as eth_chain_id,
    get_code as eth_get_code,
)
from agent.lib.mvp_verifier import (
    DeploymentEvidence,
    UsageEvidence,
    build_attestation,
    count_unique_callers,
    keccak_bytes,
    keccak_hex,
    write_attestation_files,
)
from agent.lib.weft_milestone_reader import read_milestone
from agent.lib.zero_storage import write_evidence_to_storage


ZERO_HASH = "0x" + "00" * 32


def main() -> int:
    p = argparse.ArgumentParser(description="Collect deterministic MVP attestation for a Weft milestone.")
    p.add_argument("--rpc-url", required=True)
    p.add_argument("--weft-milestone", required=True, help="WeftMilestone contract address")
    p.add_argument("--milestone-hash", required=True, help="bytes32 hex")

    # MVP template inputs (some are read from milestone; contractAddress remains external until 0G metadata is wired in)
    p.add_argument("--contract-address", required=True, help="Target contract for the MVP template")
    p.add_argument("--measurement-window-seconds", type=int, default=7 * 24 * 60 * 60)
    p.add_argument("--unique-caller-threshold", type=int, default=100)

    p.add_argument("--out", required=True, help="Path to write attestation JSON")
    p.add_argument("--node-address", default="0x0000000000000000000000000000000000000000")
    p.add_argument("--no-cache", action="store_true")
    p.add_argument(
        "--publish-0g",
        action="store_true",
        help="If set (or if ZERO_G_INDEXER_URL is configured), attempt to write the attestation to 0G Storage",
    )

    args = p.parse_args()

    cache = None if args.no_cache else default_cache()
    rpc = JsonRpcClient(args.rpc_url, cache=cache)

    chain_id = eth_chain_id(rpc)
    milestone = read_milestone(rpc, args.weft_milestone, args.milestone_hash)

    # Window is defined relative to the milestone deadline (MVP spec).
    window_start = int(milestone.deadline)
    window_end = int(milestone.deadline) + int(args.measurement_window_seconds)

    # Deployment evidence
    code = eth_get_code(rpc, args.contract_address, "latest")
    if code == "0x":
        code_hash = ZERO_HASH
    else:
        code_hash = keccak_hex(code)

    deployment = DeploymentEvidence(
        contractAddress=args.contract_address,
        codeHash=code_hash,
        # For MVP, record “observed at block” (exact deployment block can be added later via indexed proof).
        blockNumber=eth_block_number(rpc),
    )

    unique_count, start_block, end_block = count_unique_callers(
        rpc,
        args.contract_address,
        window_start,
        window_end,
        stop_at=args.unique_caller_threshold,
    )

    usage = UsageEvidence(windowStart=window_start, windowEnd=window_end, uniqueCallerCount=unique_count)

    attestation = build_attestation(
        schema_version=1,
        project_id=milestone.projectId,
        milestone_hash=args.milestone_hash,
        template_id=milestone.templateId,
        chain_id=chain_id,
        contract_address=args.contract_address,
        deadline=milestone.deadline,
        measurement_window_seconds=args.measurement_window_seconds,
        unique_caller_threshold=args.unique_caller_threshold,
        deployment=deployment,
        usage=usage,
        node_address=args.node_address,
        attested_at=int(time.time()),
    )

    canonical_path = write_attestation_files(attestation, args.out)

    # Compute deterministic evidence root from canonical JSON.
    with open(canonical_path, "rb") as f:
        canonical_bytes = f.read()
    local_evidence_root = keccak_bytes(canonical_bytes)

    # Best-effort publish to 0G (when configured). If it returns a bytes32-like root, prefer it.
    receipt = None
    evidence_root = local_evidence_root
    should_publish = args.publish_0g or bool(os.environ.get("ZERO_G_INDEXER_URL"))
    if should_publish:
        receipt = write_evidence_to_storage(args.milestone_hash, attestation)
        if receipt and _is_bytes32(receipt.log_root):
            evidence_root = receipt.log_root

    # Print paths for scripting.
    print(f"ATTESTATION={os.path.abspath(args.out)}")
    print(f"CANONICAL={os.path.abspath(canonical_path)}")
    print(f"START_BLOCK={start_block}")
    print(f"END_BLOCK={end_block}")
    print(f"VERIFIED={'true' if attestation['verdict']['verified'] else 'false'}")
    print(f"EVIDENCE_ROOT={evidence_root}")
    if receipt is not None:
        print(f"STORAGE_LOG_ROOT={receipt.log_root}")
        print(f"STORAGE_KV_KEY={receipt.kv_key}")
    return 0


def _is_bytes32(x: str) -> bool:
    if not isinstance(x, str):
        return False
    if not x.startswith("0x"):
        return False
    return len(x) == 66


if __name__ == "__main__":
    raise SystemExit(main())
