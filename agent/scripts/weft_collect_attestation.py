#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Collect deterministic MVP attestation for a Weft milestone.
Wires: 0G Storage + ENS profile + AXL consensus.
"""

import argparse
import os
import sys
import time

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
from agent.lib.zero_storage import write_evidence_to_storage, StorageReceipt
from agent.lib.ens_client import update_ens_after_verification
from agent.lib.axl_client import (
    broadcast_verdict,
    receive_verdicts,
    tally_consensus,
    VerdictMessage,
)


ZERO_HASH = "0x" + "00" * 32


def main() -> int:
    p = argparse.ArgumentParser(description="Collect deterministic MVP attestation for a Weft milestone.")
    p.add_argument("--rpc-url", required=True)
    p.add_argument("--weft-milestone", required=True, help="WeftMilestone contract address")
    p.add_argument("--milestone-hash", required=True, help="bytes32 hex")
    p.add_argument("--contract-address", required=True, help="Target contract for the MVP template")
    p.add_argument("--measurement-window-seconds", type=int, default=7 * 24 * 60 * 60)
    p.add_argument("--unique-caller-threshold", type=int, default=100)
    p.add_argument("--out", required=True, help="Path to write attestation JSON")
    p.add_argument("--node-address", default="0x0000000000000000000000000000000000000000")
    p.add_argument("--no-cache", action="store_true")

    # 0G Storage
    p.add_argument(
        "--publish-0g",
        action="store_true",
        help="Write evidence to 0G Storage (auto if ZERO_G_INDEXER_URL set)",
    )

    # ENS
    p.add_argument(
        "--ens-name",
        default="",
        help="Builder ENS name to update after verification (e.g., builder.weft.eth)",
    )
    p.add_argument(
        "--skip-ens",
        action="store_true",
        help="Skip ENS profile update even if --ens-name provided",
    )

    # AXL
    p.add_argument(
        "--axl-quorum",
        type=int,
        default=2,
        help="Quorum threshold for consensus (default: 2)",
    )
    p.add_argument(
        "--axl-poll",
        type=int,
        default=0,
        help="Poll for peer verdicts for N seconds before deciding",
    )

    args = p.parse_args()

    cache = None if args.no_cache else default_cache()
    rpc = JsonRpcClient(args.rpc_url, cache=cache)

    chain_id = eth_chain_id(rpc)
    milestone = read_milestone(rpc, args.weft_milestone, args.milestone_hash)

    window_start = int(milestone.deadline)
    window_end = int(milestone.deadline) + int(args.measurement_window_seconds)

    # Deployment evidence
    code = eth_get_code(rpc, args.contract_address, "latest")
    code_hash = ZERO_HASH if code == "0x" else keccak_hex(code)

    deployment = DeploymentEvidence(
        contractAddress=args.contract_address,
        codeHash=code_hash,
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

    with open(canonical_path, "rb") as f:
        canonical_bytes = f.read()
    local_evidence_root = keccak_bytes(canonical_bytes)

    # 0G Storage (best-effort)
    receipt: StorageReceipt = None
    evidence_root = local_evidence_root
    should_publish = args.publish_0g or bool(os.environ.get("ZERO_G_INDEXER_URL"))
    if should_publish:
        receipt = write_evidence_to_storage(args.milestone_hash, attestation)
        if receipt and receipt.log_root:
            evidence_root = receipt.log_root

    # AXL consensus
    should_axl = bool(os.environ.get("AXL_PEERS"))
    verified = attestation["verdict"]["verified"] if isinstance(attestation, dict) else attestation.verdict.verified

    own_verdict = verified
    peer_verdicts: list[VerdictMessage] = []
    has_quorum = False

    if should_axl and args.axl_poll > 0:
        import time as tm
        poll_end = tm.time() + args.axl_poll
        while tm.time() < poll_end:
            peer_verdicts = receive_verdicts(args.milestone_hash)
            has_quorum, _ = tally_consensus(own_verdict, peer_verdicts, args.axl_quorum)
            if has_quorum:
                break
            tm.sleep(1)

    if not has_quorum and should_axl:
        has_quorum, _ = tally_consensus(own_verdict, peer_verdicts, args.axl_quorum)

    if should_axl and has_quorum:
        broadcast_verdict(
            milestone_hash=args.milestone_hash,
            verified=own_verdict,
            evidence_root=evidence_root,
            node_address=args.node_address,
        )

    # ENS update (after verified + quorum)
    ens_updated = False
    if args.ens_name and not args.skip_ens and verified and (has_quorum or not should_axl):
        try:
            earnings = int(milestone.total_staked) if milestone.total_staked else 0
            tx_hashes = update_ens_after_verification(
                builder_ens=args.ens_name,
                project_id=milestone.projectId,
                milestone_hash=args.milestone_hash,
                storage_receipt=receipt,
                earnings=earnings,
            )
            ens_updated = bool(tx_hashes)
        except Exception:
            pass

    # Output
    print(f"ATTESTATION={os.path.abspath(args.out)}")
    print(f"CANONICAL={os.path.abspath(canonical_path)}")
    print(f"START_BLOCK={start_block}")
    print(f"END_BLOCK={end_block}")
    print(f"VERIFIED={'true' if verified else 'false'}")
    print(f"EVIDENCE_ROOT={evidence_root}")
    print(f"HAS_QUORUM={'true' if has_quorum else 'false'}")
    print(f"ENS_UPDATED={'true' if ens_updated else 'false'}")
    if receipt:
        print(f"STORAGE_LOG_ROOT={receipt.log_root}")
        print(f"STORAGE_KV_KEY={receipt.kv_key}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())