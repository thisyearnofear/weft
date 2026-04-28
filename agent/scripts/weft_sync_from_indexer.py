#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""
Sync milestone state from indexer to local cache.
Reads from IndexerClient and writes to agent/.attestations/ as JSON.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.indexer_client import IndexerClient
from agent.lib.jsonrpc import JsonRpcClient


def main() -> int:
    p = argparse.ArgumentParser(description="Sync Weft milestone state from indexer to local cache.")
    p.add_argument("--rpc-url", required=True)
    p.add_argument("--contract-address", required=True)
    p.add_argument("--indexer-url", default="")
    p.add_argument("--stream-id", default="")
    p.add_argument("--out-dir", default="agent/.attestations/")
    p.add_argument("--milestone-hash", default="")
    args = p.parse_args()

    rpc = JsonRpcClient(args.rpc_url)
    indexer = IndexerClient(
        rpc,
        args.contract_address,
        indexer_url=args.indexer_url or None,
        stream_id=args.stream_id or None,
    )

    print(f"Indexer source: {indexer.source}")

    if args.milestone_hash:
        states = [indexer.get_milestone(args.milestone_hash)]
        states = [s for s in states if s is not None]
    else:
        states = indexer.get_pending_milestones()

    for s in states:
        path = os.path.join(args.out_dir, f"{s.milestone_hash}.json")
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(_state_to_dict(s), f, indent=2)
        print(f"Wrote {path}  (source: {s.source})")

    print(f"Synced {len(states)} milestone(s)")
    return 0


def _state_to_dict(s) -> dict:
    return {
        "milestoneHash": s.milestone_hash,
        "projectId": s.project_id,
        "templateId": s.template_id,
        "builder": s.builder,
        "deadline": s.deadline,
        "totalStaked": s.total_staked,
        "finalized": s.finalized,
        "verified": s.verified,
        "released": s.released,
        "verifierCount": s.verifier_count,
        "verifiedVotes": s.verified_votes,
        "finalEvidenceRoot": s.final_evidence_root,
        "source": s.source,
    }


if __name__ == "__main__":
    raise SystemExit(main())