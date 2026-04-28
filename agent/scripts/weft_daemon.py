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
from agent.lib.peer_inbox import consensus_signers_for_base_root, default_inbox_dir
from agent.lib.verdict_envelope import verify_envelope
from agent.lib.verifier_registry_reader import VerifierRegistryClient, read_verifier_registry_address
from agent.lib.metadata_reader import MetadataError, read_metadata_from_0g
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
from agent.lib.zero_storage import kv_put_string, upload_file_to_storage, write_evidence_to_storage
from agent.lib.bundle_pack import create_deterministic_tar_gz
from agent.lib.bundle_manifest import build_manifest


ZERO_HASH = "0x" + "00" * 32
CONSENSUS_SCHEMA_VERSION = 1


def main() -> int:
    p = argparse.ArgumentParser(description="Weft verifier daemon (MVP)")
    p.add_argument("--rpc-url", default=os.environ.get("ETH_RPC_URL") or os.environ.get("RPC_URL") or "")
    p.add_argument("--weft", default=os.environ.get("WEFT_CONTRACT_ADDRESS") or os.environ.get("WEFT_MILESTONE_ADDRESS") or "")
    p.add_argument("--private-key", default=os.environ.get("VERIFIER_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY") or "")
    p.add_argument("--node-address", default=os.environ.get("VERIFIER_ADDRESS") or os.environ.get("NODE_ADDRESS") or "0x0000000000000000000000000000000000000000")

    # MVP template inputs (preferred: derive from milestone.metadataHash via 0G).
    # These are optional overrides for emergency/debug.
    p.add_argument("--contract-address", default=os.environ.get("CONTRACT_ADDRESS") or "", help="Optional override (preferred: metadataHash)")
    p.add_argument("--measurement-window-seconds", type=int, default=int(os.environ.get("MEASUREMENT_WINDOW_SECONDS") or 0), help="Optional override (preferred: metadataHash)")
    p.add_argument("--unique-caller-threshold", type=int, default=int(os.environ.get("UNIQUE_CALLER_THRESHOLD") or 0), help="Optional override (preferred: metadataHash)")
    p.add_argument(
        "--metadata-indexer",
        default=os.environ.get("ZERO_G_INDEXER_RPC") or os.environ.get("ZERO_G_INDEXER_URL") or "",
        help="0G indexer endpoint used to download milestone metadata by metadataHash",
    )

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
        "--use-consensus-root",
        action="store_true",
        default=(os.environ.get("AXL_USE_CONSENSUS_ROOT") == "1"),
        help="If set alongside --wait-for-peers, submit a derived consensusRoot onchain (recommended).",
    )
    p.add_argument(
        "--publish-consensus-0g",
        action="store_true",
        default=(os.environ.get("PUBLISH_0G_CONSENSUS") == "1"),
        help="If set, upload consensus.json to 0G and write KV pointers (requires ZERO_G_* env).",
    )
    p.add_argument(
        "--publish-bundle-0g",
        action="store_true",
        default=(os.environ.get("PUBLISH_0G_BUNDLE") == "1"),
        help="If set, pack the attestation output directory and upload bundle.tar.gz to 0G + KV pointers.",
    )
    p.add_argument(
        "--require-authorized-peers",
        action="store_true",
        default=(os.environ.get("AXL_REQUIRE_AUTHORIZED") == "1"),
        help="If set, only count peer envelopes whose nodeAddress is authorized in VerifierRegistry.",
    )
    p.add_argument(
        "--verifier-registry",
        default=os.environ.get("VERIFIER_REGISTRY_ADDRESS") or "",
        help="Optional override for VerifierRegistry address (otherwise derived from WeftMilestone.verifierRegistry()).",
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

    cache = None if args.no_cache else default_cache()
    rpc = JsonRpcClient(args.rpc_url, cache=cache)
    scheduler = DeadlineScheduler(rpc, args.weft, poll_interval=args.interval)

    registry_client = None
    if args.require_authorized_peers:
        registry_addr = args.verifier_registry.strip()
        if not registry_addr:
            registry_addr = read_verifier_registry_address(rpc, args.weft)
        registry_client = VerifierRegistryClient(rpc, registry_addr)
        print(f"weft_daemon: verifierRegistry={registry_addr} (authorized peer checks enabled)")

    print(f"weft_daemon: rpc={args.rpc_url} weft={args.weft} node={args.node_address}")
    print(f"weft_daemon: publish_0g={bool(args.publish_0g)} broadcast={bool(args.broadcast)} interval={args.interval}s once={bool(args.once)}")
    if args.wait_for_peers:
        print(
            f"weft_daemon: wait_for_peers=true peer_threshold={args.peer_threshold} "
            f"inbox_dir={args.inbox_dir} require_authorized_peers={bool(args.require_authorized_peers)}"
        )

    while True:
        for pm in scheduler.pending_milestones():
            _process_one(
                rpc=rpc,
                rpc_url=args.rpc_url,
                weft=args.weft,
                private_key=args.private_key,
                node_address=args.node_address,
                milestone_hash=pm.milestone_hash,
                contract_address_override=args.contract_address,
                measurement_window_seconds_override=args.measurement_window_seconds,
                unique_caller_threshold_override=args.unique_caller_threshold,
                metadata_indexer=args.metadata_indexer,
                publish_0g=args.publish_0g,
                do_broadcast=args.broadcast,
                wait_for_peers=args.wait_for_peers,
                peer_threshold=args.peer_threshold,
                inbox_dir=args.inbox_dir,
                registry_client=registry_client,
                use_consensus_root=args.use_consensus_root,
                publish_consensus_0g=args.publish_consensus_0g,
                publish_bundle_0g=args.publish_bundle_0g,
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
    contract_address_override: str,
    measurement_window_seconds_override: int,
    unique_caller_threshold_override: int,
    metadata_indexer: str,
    publish_0g: bool,
    do_broadcast: bool,
    wait_for_peers: bool,
    peer_threshold: int,
    inbox_dir: str,
    registry_client: Optional[VerifierRegistryClient],
    use_consensus_root: bool,
    publish_consensus_0g: bool,
    publish_bundle_0g: bool,
) -> None:
    try:
        m = read_milestone(rpc, weft, milestone_hash)
    except Exception as e:
        print(f"[{milestone_hash}] read_milestone failed: {e}")
        return

    # Derive template inputs from metadataHash (preferred).
    try:
        meta = read_metadata_from_0g(m.metadataHash, indexer=metadata_indexer)
    except MetadataError as e:
        # If overrides are present, allow operating without metadata as an emergency path.
        if not (contract_address_override and measurement_window_seconds_override and unique_caller_threshold_override):
            print(f"[{milestone_hash}] metadata download/validation failed: {e}")
            return
        meta = None

    contract_address = contract_address_override or (meta.contractAddress if meta else "")
    measurement_window_seconds = measurement_window_seconds_override or (meta.measurementWindowSeconds if meta else 0)
    unique_caller_threshold = unique_caller_threshold_override or (meta.uniqueCallerThreshold if meta else 0)

    if not contract_address or measurement_window_seconds <= 0 or unique_caller_threshold <= 0:
        print(f"[{milestone_hash}] missing template inputs (contract/window/threshold); cannot verify")
        return

    # Window is defined relative to the onchain milestone deadline (source of truth).
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
    base_evidence_root = keccak_bytes(canonical_bytes)
    evidence_root = base_evidence_root

    if publish_0g:
        receipt = write_evidence_to_storage(milestone_hash, attestation, file_path=canonical_path)
        if receipt and receipt.log_root and receipt.log_root.startswith("0x") and len(receipt.log_root) == 66:
            base_evidence_root = receipt.log_root
            evidence_root = base_evidence_root

    verified_bool = bool(attestation["verdict"]["verified"])
    verified_arg = "true" if verified_bool else "false"

    if do_broadcast:
        br = broadcast_verdict(
            milestone_hash=milestone_hash,
            verified=verified_bool,
            evidence_root=base_evidence_root,
            node_address=node_address,
        )
        print(f"[{milestone_hash}] broadcast: {br.succeeded}/{br.attempted} peers")

    if wait_for_peers:
        # Wait until we observe N signed peer envelopes agreeing on the *base* evidence root.
        # Optionally derive a deterministic consensusRoot from the signer set and submit that onchain.
        deadline = time.time() + 60  # cap wait per cycle (seconds)
        chosen = None
        while time.time() < deadline:
            peers = consensus_signers_for_base_root(
                milestone_hash=milestone_hash,
                verified=verified_bool,
                base_evidence_root=base_evidence_root,
                inbox_dir=inbox_dir,
            )

            # Verify signature + authorization for each peer
            valid = []
            for p in peers:
                envelope = {
                    "type": "weft.verdict",
                    "milestoneHash": p.milestone_hash,
                    "verified": p.verified,
                    "evidenceRoot": p.evidence_root,
                    "nodeAddress": p.node_address,
                    "timestamp": p.timestamp,
                    "signature": p.signature,
                }
                ok_sig, _ = verify_envelope(envelope)
                if not ok_sig:
                    continue
                if registry_client is not None and not registry_client.is_verifier(p.node_address):
                    continue
                valid.append(p)

            # Deterministic signer set: take lowest lexicographic addresses
            signer_set = sorted({p.node_address.lower(): p for p in valid}.values(), key=lambda x: x.node_address.lower())

            # Optionally include self as a signer (if we can sign).
            # This enables threshold=2 to succeed with (self + 1 peer), matching a 2-of-3 demo.
            self_sig = os.environ.get("AXL_SIGNING_KEY") or os.environ.get("PRIVATE_KEY") or ""
            if self_sig:
                from agent.lib.verdict_envelope import build_verdict_envelope, sign_envelope

                self_env = build_verdict_envelope(
                    milestone_hash=milestone_hash,
                    verified=verified_bool,
                    evidence_root=base_evidence_root,
                    node_address=node_address,
                    timestamp=int(time.time()),
                )
                self_env = sign_envelope(self_env, private_key=self_sig)
                if "signature" in self_env:
                    # create a pseudo PeerVerdict record for bundling
                    from agent.lib.peer_inbox import PeerVerdict as _PV

                    signer_set = [p for p in signer_set if p.node_address.lower() != node_address.lower()]
                    signer_set.insert(
                        0,
                        _PV(
                            milestone_hash=milestone_hash,
                            verified=verified_bool,
                            evidence_root=base_evidence_root,
                            node_address=node_address,
                            timestamp=self_env["timestamp"],
                            source_path="local",
                            signature=self_env["signature"],
                        ),
                    )

            if len(signer_set) >= peer_threshold:
                chosen = signer_set[:peer_threshold]
                break
            time.sleep(2)

        if chosen is None:
            print(f"[{milestone_hash}] wait_for_peers: no quorum seen in inbox yet (threshold={peer_threshold}); skipping vote this cycle")
            return

        # Build deterministic consensus bundle and derive consensus root (optional).
        if use_consensus_root:
            consensus = {
                "schemaVersion": CONSENSUS_SCHEMA_VERSION,
                "type": "weft.consensus",
                "milestoneHash": milestone_hash,
                "verified": verified_bool,
                "baseEvidenceRoot": base_evidence_root,
                "signers": [
                    {"nodeAddress": p.node_address, "signature": p.signature}
                    for p in sorted(chosen, key=lambda x: x.node_address.lower())
                ],
            }
            consensus_msg = __import__("json").dumps(consensus, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
            consensus_root = keccak_bytes(consensus_msg.encode("utf-8"))
            evidence_root = consensus_root

            # Persist consensus bundle alongside attestation (so the root is reproducible).
            consensus_path = os.path.join(out_dir, "consensus.json")
            with open(consensus_path, "w", encoding="utf-8") as f:
                __import__("json").dump(consensus, f, indent=2, sort_keys=True)
                f.write("\n")

            # Write bundle_manifest.json before packing/uploading bundles.
            manifest = build_manifest(
                out_dir=out_dir,
                milestone_hash=milestone_hash,
                verified=verified_bool,
                base_evidence_root=base_evidence_root,
                consensus_root=consensus_root,
                signer_addresses=[p.node_address for p in sorted(chosen, key=lambda x: x.node_address.lower())],
            )
            manifest_path = os.path.join(out_dir, "bundle_manifest.json")
            with open(manifest_path, "w", encoding="utf-8") as f:
                __import__("json").dump(manifest, f, indent=2, sort_keys=True)
                f.write("\n")

            # Optional: publish consensus.json to 0G and write KV mappings so the onchain
            # evidenceRoot (consensusRoot) can be resolved to the actual 0G file root.
            if publish_consensus_0g and publish_0g:
                consensus_0g_root = upload_file_to_storage(consensus_path)
                if consensus_0g_root:
                    # Two useful keys:
                    # 1) milestone -> latest consensus object root
                    # 2) consensusRoot -> consensus object root (content addressable lookup)
                    kv_put_string(
                        key=f"weft:milestone:{milestone_hash}:consensus",
                        value=consensus_0g_root,
                    )
                    kv_put_string(
                        key=f"weft:consensus:{consensus_root}",
                        value=consensus_0g_root,
                    )
                    print(f"[{milestone_hash}] published consensus.json to 0G root={consensus_0g_root}")
                else:
                    print(f"[{milestone_hash}] publish_consensus_0g enabled but upload failed or not configured")

            print(f"[{milestone_hash}] consensusRoot={consensus_root} (baseEvidenceRoot={base_evidence_root}) signers={len(chosen)}")

            # Optional: publish a full bundle tarball containing attestation + consensus + any artifacts.
            # This gives a single 0G root for the entire decision context.
            if publish_bundle_0g and publish_0g:
                bundle_path = os.path.join(out_dir, "bundle.tar.gz")
                create_deterministic_tar_gz(out_dir, bundle_path)
                bundle_root = upload_file_to_storage(bundle_path)
                if bundle_root:
                    # milestone -> latest bundle
                    kv_put_string(
                        key=f"weft:milestone:{milestone_hash}:bundle",
                        value=bundle_root,
                    )
                    # consensusRoot -> bundle
                    kv_put_string(
                        key=f"weft:consensus:{consensus_root}:bundle",
                        value=bundle_root,
                    )
                    print(f"[{milestone_hash}] published bundle.tar.gz to 0G root={bundle_root}")
                else:
                    print(f"[{milestone_hash}] publish_bundle_0g enabled but upload failed or not configured")

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
