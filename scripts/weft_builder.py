#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Weft Builder CLI (alpha).

This script is intended to onboard a *builder cohort* quickly:
- create deterministic milestone metadata for the MVP template
- upload metadata to 0G (optional but recommended)
- compute a deterministic milestoneHash
- call createMilestone(...) onchain
- stake into a milestone
- read milestone status

It intentionally keeps dependencies minimal by using:
- `cast` for ABI encoding + hashing + tx sending
- `0g-storage-client` (optional) via agent/lib/zero_storage.py
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from dataclasses import asdict
from typing import Any, Dict, Optional


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.jsonrpc import JsonRpcClient, default_cache  # noqa: E402
from agent.lib.weft_milestone_reader import read_milestone  # noqa: E402
from agent.lib.zero_storage import upload_file_to_storage  # noqa: E402


TEMPLATE_ID_STR = "DEPLOYED_AND_100_UNIQUE_CALLERS_7D"


def main() -> int:
    p = argparse.ArgumentParser(description="Weft builder CLI (alpha)")
    sub = p.add_subparsers(dest="cmd", required=True)

    # init-metadata
    m = sub.add_parser("init-metadata", help="Create metadata JSON for the MVP template (optionally upload to 0G).")
    m.add_argument("--chain-id", type=int, required=True)
    m.add_argument("--contract-address", required=True, help="Target contract to verify (must be deployed for MVP tests).")
    m.add_argument("--deadline", type=int, required=True, help="Unix timestamp (seconds) for milestone deadline.")
    m.add_argument("--measurement-window-seconds", type=int, default=7 * 24 * 60 * 60)
    m.add_argument("--unique-caller-threshold", type=int, default=100)
    m.add_argument("--notes", default="")
    m.add_argument("--out", default="scripts/.tmp/metadata.json")
    m.add_argument("--upload-0g", action="store_true", default=False)

    # create-milestone
    c = sub.add_parser("create-milestone", help="Create a milestone onchain using metadataHash (0G root).")
    c.add_argument("--rpc-url", default=os.environ.get("ETH_RPC_URL") or os.environ.get("RPC_URL") or "")
    c.add_argument("--weft", default=os.environ.get("WEFT_CONTRACT_ADDRESS") or os.environ.get("WEFT_MILESTONE_ADDRESS") or "")
    c.add_argument("--private-key", default=os.environ.get("PRIVATE_KEY") or "")
    c.add_argument("--project", required=True, help="Project slug/name (hashed to bytes32).")
    mh = c.add_mutually_exclusive_group(required=True)
    mh.add_argument("--metadata-hash", help="bytes32; typically 0G root of metadata.json")
    mh.add_argument("--metadata-root", help="0G root of metadata.json; will download+verify and use as metadataHash")
    c.add_argument(
        "--indexer",
        default=os.environ.get("ZERO_G_INDEXER_RPC") or os.environ.get("ZERO_G_INDEXER_URL") or "",
        help="0G indexer endpoint (used with --metadata-root)",
    )
    c.add_argument("--deadline", type=int, default=0, help="Optional override (otherwise derived from metadata when using --metadata-root)")
    c.add_argument("--template", default="", help="Optional override (otherwise derived from metadata when using --metadata-root)")
    c.add_argument("--allow-past-deadline", action="store_true", help="Allow deadline <= now when deriving from metadata (default: fail)")
    c.add_argument("--dry-run", action="store_true")

    # stake
    s = sub.add_parser("stake", help="Stake ETH into a milestone.")
    s.add_argument("--rpc-url", default=os.environ.get("ETH_RPC_URL") or os.environ.get("RPC_URL") or "")
    s.add_argument("--weft", default=os.environ.get("WEFT_CONTRACT_ADDRESS") or os.environ.get("WEFT_MILESTONE_ADDRESS") or "")
    s.add_argument("--private-key", default=os.environ.get("PRIVATE_KEY") or "")
    s.add_argument("--milestone-hash", required=True)
    s.add_argument("--value-eth", required=True, help="e.g. 0.05")
    s.add_argument("--dry-run", action="store_true")

    # status
    st = sub.add_parser("status", help="Read milestone status from chain.")
    st.add_argument("--rpc-url", default=os.environ.get("ETH_RPC_URL") or os.environ.get("RPC_URL") or "")
    st.add_argument("--weft", default=os.environ.get("WEFT_CONTRACT_ADDRESS") or os.environ.get("WEFT_MILESTONE_ADDRESS") or "")
    st.add_argument("--milestone-hash", required=True)
    st.add_argument("--no-cache", action="store_true")

    # verify-metadata
    vm = sub.add_parser(
        "verify-metadata",
        help="Download MVP metadata by 0G root and sanity-check required fields before creating a milestone.",
    )
    vm.add_argument("--root", required=True, help="0G merkle root (0x...) for metadata.json")
    vm.add_argument(
        "--indexer",
        default=os.environ.get("ZERO_G_INDEXER_RPC") or os.environ.get("ZERO_G_INDEXER_URL") or "",
        help="0G indexer endpoint (default: ZERO_G_INDEXER_RPC or ZERO_G_INDEXER_URL)",
    )
    vm.add_argument("--out", default="", help="Optional path to write downloaded metadata.json")
    vm.add_argument("--expect-chain-id", type=int, default=0)
    vm.add_argument("--expect-contract-address", default="")
    vm.add_argument("--expect-deadline", type=int, default=0)
    vm.add_argument("--allow-past-deadline", action="store_true", help="Allow deadline <= now (default: fail)")

    args = p.parse_args()

    if args.cmd == "init-metadata":
        return cmd_init_metadata(args)
    if args.cmd == "create-milestone":
        return cmd_create_milestone(args)
    if args.cmd == "stake":
        return cmd_stake(args)
    if args.cmd == "status":
        return cmd_status(args)
    if args.cmd == "verify-metadata":
        return cmd_verify_metadata(args)
    return 1


def cmd_init_metadata(args) -> int:
    meta: Dict[str, Any] = {
        "templateId": TEMPLATE_ID_STR,
        "chainId": int(args.chain_id),
        "contractAddress": args.contract_address,
        "deadline": int(args.deadline),
        "measurementWindowSeconds": int(args.measurement_window_seconds),
        "uniqueCallerThreshold": int(args.unique_caller_threshold),
        "notes": args.notes,
    }

    out_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, sort_keys=True)
        f.write("\n")

    print(f"metadata_file={out_path}")

    if args.upload_0g:
        root = upload_file_to_storage(out_path)
        if not root:
            print("metadata_0g_root= (upload failed or not configured)", file=sys.stderr)
            return 3
        print(f"metadata_0g_root={root}")
        print(f"metadata_hash={root}")
    else:
        print("metadata_0g_root=")
        print("metadata_hash= (upload disabled; you may upload and use the returned 0G root)")

    return 0


def cmd_create_milestone(args) -> int:
    _require(args.rpc_url, "--rpc-url / ETH_RPC_URL")
    _require(args.weft, "--weft / WEFT_CONTRACT_ADDRESS")
    _require(args.private_key, "--private-key / PRIVATE_KEY")

    builder_addr = _cast(["cast", "wallet", "address", "--private-key", args.private_key]).strip()
    project_id = _cast(["cast", "keccak", args.project]).strip()

    # Resolve metadataHash + deadline + template string
    metadata_hash = args.metadata_hash
    deadline = int(args.deadline) if int(args.deadline or 0) else 0
    template_str = args.template or ""

    if args.metadata_root:
        if not args.indexer:
            raise SystemExit("Missing --indexer (or ZERO_G_INDEXER_RPC / ZERO_G_INDEXER_URL) for --metadata-root")
        # Download + validate metadata JSON
        with tempfile.TemporaryDirectory(prefix="weft_meta_create_") as td:
            meta_path = os.path.join(td, "metadata.json")
            rc = _download_0g_root_to_file(root=args.metadata_root, indexer=args.indexer, out=meta_path)
            if rc != 0:
                return 3
            meta = _load_metadata_json(meta_path)
            rc = _validate_metadata_dict(
                meta,
                root=args.metadata_root,
                expect_chain_id=0,
                expect_contract_address="",
                expect_deadline=0,
                allow_past_deadline=bool(args.allow_past_deadline),
                quiet=True,
            )
            if rc != 0:
                return rc

            metadata_hash = args.metadata_root
            if not deadline:
                deadline = int(meta["deadline"])
            if not template_str:
                template_str = str(meta["templateId"])

    if not metadata_hash:
        raise SystemExit("Missing metadata hash/root")
    if not deadline:
        raise SystemExit("Missing deadline (provide --deadline or use --metadata-root with deadline in metadata)")
    if not template_str:
        template_str = TEMPLATE_ID_STR

    template_id = _cast(["cast", "keccak", template_str]).strip()

    # milestoneHash = keccak256(abi.encodePacked(projectId, templateId, metadataHash, builder, deadline))
    encoded = _cast(
        [
            "cast",
            "abi-encode",
            "f(bytes32,bytes32,bytes32,address,uint64)",
            project_id,
            template_id,
            metadata_hash,
            builder_addr,
            str(int(deadline)),
        ]
    ).strip()
    milestone_hash = _cast(["cast", "keccak", encoded]).strip()

    print(f"builder={builder_addr}")
    print(f"projectId={project_id}")
    print(f"template={template_str}")
    print(f"templateId={template_id}")
    print(f"deadline={deadline}")
    print(f"metadataHash={metadata_hash}")
    print(f"milestoneHash={milestone_hash}")

    # Pre-compute calldata for debugging and support requests.
    calldata = _cast(
        [
            "cast",
            "calldata",
            "createMilestone(bytes32,bytes32,bytes32,uint64,bytes32,(address,uint16)[])",
            milestone_hash,
            project_id,
            template_id,
            str(int(deadline)),
            metadata_hash,
            "[]",
        ]
    ).strip()
    print(f"calldata_createMilestone={calldata}")

    if args.dry_run:
        print("dry_run=true (skipping cast send)")
        return 0

    cmd = [
        "cast",
        "send",
        "--rpc-url",
        args.rpc_url,
        "--private-key",
        args.private_key,
        args.weft,
        "createMilestone(bytes32,bytes32,bytes32,uint64,bytes32,(address,uint16)[])",
        milestone_hash,
        project_id,
        template_id,
        str(int(deadline)),
        metadata_hash,
        "[]",  # empty splits => defaults to builder 100%
    ]
    print("tx:", " ".join(cmd))
    out = _cast(cmd)
    print(out.strip())
    return 0


def cmd_stake(args) -> int:
    _require(args.rpc_url, "--rpc-url / ETH_RPC_URL")
    _require(args.weft, "--weft / WEFT_CONTRACT_ADDRESS")
    _require(args.private_key, "--private-key / PRIVATE_KEY")

    if args.dry_run:
        print("dry_run=true (skipping cast send)")
        return 0

    cmd = [
        "cast",
        "send",
        "--rpc-url",
        args.rpc_url,
        "--private-key",
        args.private_key,
        "--value",
        f"{args.value_eth}ether",
        args.weft,
        "stake(bytes32)",
        args.milestone_hash,
    ]
    print("tx:", " ".join(cmd))
    out = _cast(cmd)
    print(out.strip())
    return 0


def cmd_status(args) -> int:
    _require(args.rpc_url, "--rpc-url / ETH_RPC_URL")
    _require(args.weft, "--weft / WEFT_CONTRACT_ADDRESS")

    cache = None if args.no_cache else default_cache()
    rpc = JsonRpcClient(args.rpc_url, cache=cache)
    m = read_milestone(rpc, args.weft, args.milestone_hash)

    # Print compact status
    d = {
        "projectId": m.projectId,
        "templateId": m.templateId,
        "metadataHash": m.metadataHash,
        "builder": m.builder,
        "createdAt": m.createdAt,
        "deadline": m.deadline,
        "totalStaked": str(m.totalStaked),
        "finalized": m.finalized,
        "verified": m.verified,
        "released": m.released,
        "verifierCount": int(m.verifierCount),
        "verifiedVotes": int(m.verifiedVotes),
        "finalEvidenceRoot": m.finalEvidenceRoot,
    }
    print(json.dumps(d, indent=2, sort_keys=False))
    return 0


def cmd_verify_metadata(args) -> int:
    if not args.indexer:
        print("error: missing --indexer (or ZERO_G_INDEXER_RPC / ZERO_G_INDEXER_URL)", file=sys.stderr)
        return 3
    if not str(args.root).startswith("0x"):
        print("error: --root must be 0x-prefixed", file=sys.stderr)
        return 3

    # Download to either a user-specified path or a temp file.
    if args.out:
        out_path = os.path.abspath(args.out)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        dl_path = out_path
        rc = _download_0g_root_to_file(root=args.root, indexer=args.indexer, out=dl_path)
        if rc != 0:
            return 3
        meta_path = dl_path
    else:
        with tempfile.TemporaryDirectory(prefix="weft_meta_") as td:
            meta_path = os.path.join(td, "metadata.json")
            rc = _download_0g_root_to_file(root=args.root, indexer=args.indexer, out=meta_path)
            if rc != 0:
                return 3
            return _validate_metadata_file(
                meta_path,
                expect_chain_id=args.expect_chain_id,
                expect_contract_address=args.expect_contract_address,
                expect_deadline=args.expect_deadline,
                allow_past_deadline=bool(args.allow_past_deadline),
                root=args.root,
            )

    return _validate_metadata_file(
        meta_path,
        expect_chain_id=args.expect_chain_id,
        expect_contract_address=args.expect_contract_address,
        expect_deadline=args.expect_deadline,
        allow_past_deadline=bool(args.allow_past_deadline),
        root=args.root,
    )


def _download_0g_root_to_file(*, root: str, indexer: str, out: str) -> int:
    cmd = ["0g-storage-client", "download", "--indexer", indexer, "--root", root, "--file", out]
    print("download:", " ".join(cmd))
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False)
    except FileNotFoundError:
        print("error: 0g-storage-client not found on PATH", file=sys.stderr)
        return 3
    if proc.returncode != 0:
        print("download failed:\n" + proc.stdout, file=sys.stderr)
        return 3
    print(f"downloaded_metadata={os.path.abspath(out)}")
    return 0


def _validate_metadata_file(
    path: str,
    *,
    expect_chain_id: int,
    expect_contract_address: str,
    expect_deadline: int,
    allow_past_deadline: bool,
    root: str,
) -> int:
    try:
        meta = _load_metadata_json(path)
    except Exception as e:
        print(f"error: invalid json: {e}", file=sys.stderr)
        return 3

    rc = _validate_metadata_dict(
        meta,
        root=root,
        expect_chain_id=expect_chain_id,
        expect_contract_address=expect_contract_address,
        expect_deadline=expect_deadline,
        allow_past_deadline=allow_past_deadline,
        quiet=False,
    )
    if rc != 0:
        return rc

    print("metadata verification: OK")
    print(f"metadata_root={root}")
    print(json.dumps(meta, indent=2, sort_keys=True))
    return 0


def _load_metadata_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _validate_metadata_dict(
    meta: Dict[str, Any],
    *,
    root: str,
    expect_chain_id: int,
    expect_contract_address: str,
    expect_deadline: int,
    allow_past_deadline: bool,
    quiet: bool,
) -> int:
    failures = []
    tid = meta.get("templateId")
    if tid != TEMPLATE_ID_STR:
        failures.append(f"templateId mismatch: expected={TEMPLATE_ID_STR} got={tid}")

    chain_id = meta.get("chainId")
    if not isinstance(chain_id, int):
        failures.append("chainId must be an int")
    elif expect_chain_id and chain_id != expect_chain_id:
        failures.append(f"chainId mismatch: expected={expect_chain_id} got={chain_id}")

    ca = meta.get("contractAddress")
    if not (isinstance(ca, str) and ca.startswith("0x") and len(ca) == 42):
        failures.append("contractAddress must be a 0x-prefixed 20-byte address string")
    elif expect_contract_address and ca.lower() != expect_contract_address.lower():
        failures.append(f"contractAddress mismatch: expected={expect_contract_address} got={ca}")

    dl = meta.get("deadline")
    now = int(time.time())
    if not isinstance(dl, int):
        failures.append("deadline must be an int (unix seconds)")
    else:
        if expect_deadline and dl != expect_deadline:
            failures.append(f"deadline mismatch: expected={expect_deadline} got={dl}")
        if not allow_past_deadline and dl <= now:
            failures.append(f"deadline must be in the future (deadline={dl} now={now})")

    mws = meta.get("measurementWindowSeconds")
    if not (isinstance(mws, int) and mws > 0):
        failures.append("measurementWindowSeconds must be a positive int")

    uct = meta.get("uniqueCallerThreshold")
    if not (isinstance(uct, int) and uct > 0):
        failures.append("uniqueCallerThreshold must be a positive int")

    if failures:
        if not quiet:
            print("metadata verification: FAIL")
            print(f"metadata_root={root}")
            for f in failures:
                print(" - " + f)
        return 2
    return 0


def _cast(cmd: list[str]) -> str:
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(proc.stdout)
    return proc.stdout


def _require(val: str, name: str) -> None:
    if not val:
        raise SystemExit(f"Missing required value for {name}")


if __name__ == "__main__":
    raise SystemExit(main())
