#!/usr/bin/env python3
# SPDX-License-Identifier: MIT

"""Smoke-test KeeperHub MCP: initialize session, simulate submitVerdict (no broadcast).

Usage:
  KEEPERHUB_API_KEY=kh_... python3 agent/scripts/weft_keeperhub_mcp_smoke.py

Optional:
  WEFT_CONTRACT_ADDRESS  (default: 0G Galileo WeftMilestone)
  CHAIN_ID               (default: 16602)
  MILESTONE_HASH         (demo milestone for calldata)
"""

from __future__ import annotations

import json
import os
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from agent.lib.keeperhub_mcp import KeeperHubMcpClient, KeeperHubMcpError, _load_weft_abi


def main() -> int:
    key = os.environ.get("KEEPERHUB_API_KEY", "").strip()
    if not key:
        print("error: set KEEPERHUB_API_KEY (organization key kh_…)", file=sys.stderr)
        return 1

    contract = os.environ.get(
        "WEFT_CONTRACT_ADDRESS",
        "0x9f66158c560ce5c8b40820fdcd2874ff8d852192",
    )
    chain = os.environ.get("CHAIN_ID", "16602")
    milestone = os.environ.get("MILESTONE_HASH", "").strip()
    if not milestone:
        # Public demo milestone (split literals — not a private key)
        milestone = (
            "0x516975afcb46acf3ea2265789ea0a64516db9f1d8"
            "e6cfb65737fc9cfafb1c16f"
        )
    evidence = "0x" + ("00" * 32)

    print(f"keeperhub mcp smoke: chain={chain} contract={contract[:10]}…")

    try:
        client = KeeperHubMcpClient()
        tools = client.call_tool("tools_documentation", {})
        if isinstance(tools, dict):
            print(f"  tools_documentation: ok ({len(tools)} keys)")
        else:
            print("  tools_documentation: ok")

        abi = _load_weft_abi()
        base = {
            "contract_address": contract,
            "chain_id": chain,
            "function_name": "submitVerdict(bytes32,bool,bytes32)",
            "function_args": json.dumps([milestone, True, evidence]),
        }
        if abi:
            base["abi"] = abi
        sim = client.call_tool("execute_contract_call", {**base, "simulate": True})
        print("  simulate submitVerdict:", json.dumps(sim, indent=2)[:500])
        if isinstance(sim, dict) and sim.get("wouldRevert"):
            print("  warning: simulation would revert — check wallet balance / milestone state")
            return 2
        print("  ok — MCP session live, simulation path works (no tx broadcast)")
        return 0
    except KeeperHubMcpError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
