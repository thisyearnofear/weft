#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Weft verifier daemon (MVP).

Enhancement-first + DRY:
- Reuses agent/lib modules (deadline_scheduler, mvp_verifier, zero_storage, axl_client)
- Keeps deterministic verification logic in mvp_verifier (this file orchestrates only)

Behavior:
1) Poll for milestones past deadline and not finalized
2) Collect deterministic evidence + build attestation
3) Compute evidenceRoot (keccak of canonical attestation JSON)
4) Optionally publish to 0G (official CLI if available; see agent/lib/zero_storage.py)
5) Submit onchain vote via `cast send submitVerdict(...)`
6) Optionally broadcast verdict to peers (AXL shim) for multi-node coordination
"""

import argparse
import os
import subprocess
import sys
import time
from typing import Optional

# Allow running directly from repo root without installing.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.axl_client import broadcast_verdict
from agent.lib.jsonrpc import JsonRpcClient, default_cache
from agent.lib.peer_inbox import best_group, default_inbox_dir
from agent.lib.mvp_verifier import (
    DeploymentEvidence,
    UsageEvidence,
    build_attestation,
    count_unique_callers,
    keccak_bytes,
    keccak_hex,
    write_attestation_files,
)
from agent.lib.eth_rpc import block_number as eth_block_number, chain_id as eth_chain_id, get_code as eth_get_code
from agent.lib.deadline_scheduler import DeadlineScheduler
from agent.lib.weft_milestone_reader import read_milestone
from agent.lib.zero_storage import write_evidence_to_storage


ZERO_HASH = "0x" + "00" * 32


def main() -> int:
    p = argparse.ArgumentParser(description="Weft verifier daemon (MVP)")
    p.add_argument("--rpc-url", default=os.environ.get("ETH_RPC_URL") or os.environ.get("RPC_URL") or "")
    p.add_argument("--weft", default=os.environ.get("WEFT_CONTRACT_ADDRESS") or os.environ.get("WEFT_MILESTONE_ADDRESS") or "")
    p.add_argument("--private-key", default=os.environ.get("VERIFIER_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY") or "")
    p.add_argument("--node-address", default=os.environ.get("VERIFIER_ADDRESS") or os.environ.get("NODE_ADDRESS") or "0x0000000000000000000000000000000000000000")

    # MVP template input (global default until metadata is wired): target contract to measure usage on.
    p.add_argument("--contract-address", default=os.environ.get("CONTRACT_ADDRESS") or "")
    p.add_argument("--measurement-window-seconds", type=int, default=int(os.environ.get("MEASUREMENT_WINDOW_SECONDS") or 7 * 24 * 60 * 60))
    p.add_argument("--unique-caller-threshold", type=int, default=int(os.environ.get("UNIQUE_CALLER_THRESHOLD") or 100))

    p.add_argument("--publish-0g", action="store_true", default=(os.environ.get("PUBLISH_0G") == "1"))
    p.add_argument("--broadcast", action="store_true", default=(os.environ.get("AXL_BROADCAST") == "1"))
    p.add_argument(
        "--wait-for-peers",
        action="store_true",
        default=(os.environ.get("AXL_WAIT_FOR_PEERS") == "1"),
        help="If set, delay onchain vote until at least --peer-threshold peers agree on (verified,evidenceRoot).",
    )
    p.add_argument(
        "--peer-threshold",
        type=int,
        default=int(os.environ.get("AXL_PEER_THRESHOLD") or 2),
        help="How many unique peer node addresses must agree before voting (default: 2).",
    )
    p.add_argument(
        "--inbox-dir",
        default=os.environ.get("WEFT_INBOX_DIR") or default_inbox_dir(),
        help="Where the peer server persists received messages (default: agent/.inbox).",
    )
    p.add_argument("--interval", type=int, default=int(os.environ.get("POLL_INTERVAL") or 60))
    p.add_argument("--once", action="store_true")
    p.add_argument("--no-cache", action="store_true")
    args = p.parse_args()

    if not args.rpc_url:
        raise SystemExit("Missing --rpc-url (or ETH_RPC_URL/RPC_URL env var)")
    if not args.weft:
        raise SystemExit("Missing --weft (or WEFT_CONTRACT_ADDRESS/WEFT_MILESTONE_ADDRESS env var)")
    if not args.private_key:
        raise SystemExit("Missing --private-key (or VERIFIER_PRIVATE_KEY/PRIVATE_KEY env var)")
    if not args.contract_address:
        raise SystemExit("Missing --contract-address (or CONTRACT_ADDRESS env var) for MVP template")

    cache = None if args.no_cache else default_cache()
    rpc = JsonRpcClient(args.rpc_url, cache=cache)
    scheduler = DeadlineScheduler(rpc, args.weft, poll_interval=args.interval)

    print(f"weft_daemon: rpc={args.rpc_url} weft={args.weft} node={args.node_address}")
    print(f"weft_daemon: publish_0g={bool(args.publish_0g)} broadcast={bool(args.broadcast)} interval={args.interval}s once={bool(args.once)}")
    if args.wait_for_peers:
        print(f"weft_daemon: wait_for_peers=true peer_threshold={args.peer_threshold} inbox_dir={args.inbox_dir}")

    while True:
        for pm in scheduler.pending_milestones():
            _process_one(
                rpc=rpc,
                rpc_url=args.rpc_url,
                weft=args.weft,
                private_key=args.private_key,
                node_address=args.node_address,
                milestone_hash=pm.milestone_hash,
                contract_address=args.contract_address,
                measurement_window_seconds=args.measurement_window_seconds,
                unique_caller_threshold=args.unique_caller_threshold,
                publish_0g=args.publish_0g,
                do_broadcast=args.broadcast,
                wait_for_peers=args.wait_for_peers,
                peer_threshold=args.peer_threshold,
                inbox_dir=args.inbox_dir,
            )

        if args.once:
            return 0
        time.sleep(args.interval)


def _process_one(
    *,
    rpc: JsonRpcClient,
    rpc_url: str,
    weft: str,
    private_key: str,
    node_address: str,
    milestone_hash: str,
    contract_address: str,
    measurement_window_seconds: int,
    unique_caller_threshold: int,
    publish_0g: bool,
    do_broadcast: bool,
    wait_for_peers: bool,
    peer_threshold: int,
    inbox_dir: str,
) -> None:
    try:
        m = read_milestone(rpc, weft, milestone_hash)
    except Exception as e:
        print(f"[{milestone_hash}] read_milestone failed: {e}")
        return

    # Window is defined relative to deadline (MVP spec).
    window_start = int(m.deadline)
    window_end = int(m.deadline) + int(measurement_window_seconds)

    # Deployment evidence
    code = eth_get_code(rpc, contract_address, "latest")
    code_hash = ZERO_HASH if code == "0x" else keccak_hex(code)
    deployment = DeploymentEvidence(
        contractAddress=contract_address,
        codeHash=code_hash,
        blockNumber=eth_block_number(rpc),
    )

    unique_count, start_block, end_block = count_unique_callers(
        rpc,
        contract_address,
        window_start,
        window_end,
        stop_at=unique_caller_threshold,
    )
    usage = UsageEvidence(windowStart=window_start, windowEnd=window_end, uniqueCallerCount=unique_count)

    attestation = build_attestation(
        schema_version=1,
        project_id=m.projectId,
        milestone_hash=milestone_hash,
        template_id=m.templateId,
        chain_id=eth_chain_id(rpc),
        contract_address=contract_address,
        deadline=m.deadline,
        measurement_window_seconds=measurement_window_seconds,
        unique_caller_threshold=unique_caller_threshold,
        deployment=deployment,
        usage=usage,
        node_address=node_address,
        attested_at=int(time.time()),
    )

    ts = int(time.time())
    out_dir = os.path.join("agent", ".attestations", milestone_hash, str(ts))
    out_json = os.path.join(out_dir, "attestation.json")
    canonical_path = write_attestation_files(attestation, out_json)

    with open(canonical_path, "rb") as f:
        canonical_bytes = f.read()
    evidence_root = keccak_bytes(canonical_bytes)

    if publish_0g:
        receipt = write_evidence_to_storage(milestone_hash, attestation, file_path=canonical_path)
        if receipt and receipt.log_root and receipt.log_root.startswith("0x") and len(receipt.log_root) == 66:
            evidence_root = receipt.log_root

    verified_bool = bool(attestation["verdict"]["verified"])
    verified_arg = "true" if verified_bool else "false"

    if do_broadcast:
        br = broadcast_verdict(
            milestone_hash=milestone_hash,
            verified=verified_bool,
            evidence_root=evidence_root,
            node_address=node_address,
        )
        print(f"[{milestone_hash}] broadcast: {br.succeeded}/{br.attempted} peers")

    if wait_for_peers:
        # Wait until we observe a peer group meeting threshold.
        # This improves "multi-node consensus" UX for demos, without making the contract dependent on it.
        deadline = time.time() + 60  # cap wait per cycle (seconds)
        chosen = None
        while time.time() < deadline:
            g = best_group(milestone_hash, inbox_dir=inbox_dir)
            if g and g.count >= peer_threshold:
                chosen = g
                break
            time.sleep(2)

        if chosen is None:
            print(f"[{milestone_hash}] wait_for_peers: no quorum seen in inbox yet (threshold={peer_threshold}); skipping vote this cycle")
            return

        # If peers agreed on a different root/verdict than our local computation, prefer the peer group
        # (MVP: evidence roots should converge if deterministically computed; divergence is a signal to stop).
        if chosen.verified != verified_bool or chosen.evidence_root.lower() != evidence_root.lower():
            print(
                f"[{milestone_hash}] wait_for_peers: peer group differs from local computation; "
                f"local=(verified={verified_bool},root={evidence_root}) "
                f"peers=(verified={chosen.verified},root={chosen.evidence_root},count={chosen.count}). "
                f"Skipping vote for safety."
            )
            return

    print(
        f"[{milestone_hash}] window blocks {start_block}-{end_block} uniqueCallers={unique_count} "
        f"verified={verified_arg} evidenceRoot={evidence_root}"
    )

    # Submit onchain vote
    try:
        proc = subprocess.run(
            [
                "cast",
                "send",
                "--rpc-url",
                rpc_url,
                "--private-key",
                private_key,
                weft,
                "submitVerdict(bytes32,bool,bytes32)",
                milestone_hash,
                verified_arg,
                evidence_root,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            print(f"[{milestone_hash}] cast send failed:\n{proc.stdout}")
        else:
            print(f"[{milestone_hash}] vote submitted")
    except Exception as e:
        print(f"[{milestone_hash}] cast send error: {e}")


if __name__ == "__main__":
    raise SystemExit(main())
