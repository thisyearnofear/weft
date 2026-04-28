# Weft Agent — Hermes Integration

Single source of truth for Weft's Hermes agent layer behavior.

## Overview

The agent layer reads onchain + offchain signals to produce milestone attestations.
It runs deterministically (no AI judgment required for MVP) and can optionally call
Kimi for human-readable narrative summaries.

## Library (`agent/lib/`)

The single source of truth for all shared agent logic. All scripts import from here.

| Module | Purpose |
|---|---|
| `jsonrpc.py` | JSON-RPC client with file-based cache for idempotent reads |
| `abi.py` | Pure ABI encoding/decoding helpers |
| `weft_milestone_reader.py` | Reads `Milestones(bytes32)` from WeftMilestone |
| `mvp_verifier.py` | Deterministic evidence: deployment check + unique callers + attestation |
| `github_client.py` | GitHub commits/PRs in milestone window (env: `GITHUB_TOKEN`) |
| `kimi_client.py` | Kimi API for narrative generation (env: `KIMI_API_KEY`) |
| `zero_storage.py` | 0G Storage read/write (env: `ZERO_G_*`, falls back gracefully) |
| `deadline_scheduler.py` | Polls for milestones past deadline awaiting finalization |
| `indexer_client.py` | Unified indexer: tries 0G KV, falls back to onchain events |
| `axl_client.py` | Multi-node broadcast shim (env: `AXL_PEERS`, best-effort HTTP POST) |
| `__init__.py` | Re-exports all public symbols |

## Verification Flow

```
milestone deadline passes
        │
        ▼
deadline_scheduler.poll_pending_milestones()
        │
        ├─ github_client.collect_github_evidence()  (commits + PRs)
        ├─ mvp_verifier.count_unique_callers()       (usage signal)
        ├─ mvp_verifier.eth_get_code()              (deployment signal)
        │
        ├─ [optional] kimi_client.generate_narrative()
        ├─ [optional] zero_storage.write_evidence_to_storage()
        │
        ▼
mvp_verifier.build_attestation()  → attestation JSON
        │
        ▼
shell script calls cast send submitVerdict()        (onchain vote)
        │
        ▼
indexer_client.get_milestone() reads final state
```

## Scripts

| Script | Purpose |
|---|---|
| `weft_collect_attestation.py` | Collect evidence + build attestation JSON |
| `weft_verify_and_vote.sh` | E2E: collect evidence + submit onchain verdict |
| `weft_sync_from_indexer.py` | Sync milestone state from indexer to local cache |
| `weft_daemon.py` | Poll deadlines and automatically attest + vote (optional 0G publish + peer broadcast) |
| `weft_peer_server.py` | Receive peer broadcasts (POST /send) and persist to `agent/.inbox/` |

### `weft_collect_attestation.py`

```bash
python agent/scripts/weft_collect_attestation.py \
  --rpc-url "$ETH_RPC_URL" \
  --weft-milestone "$WEFT_CONTRACT_ADDRESS" \
  --milestone-hash "0x..." \
  --contract-address "0x..." \
  --out agent/.attestations/attestation.json
```

Optional flags: `--no-cache`, `--unique-caller-threshold`, `--measurement-window-seconds`.

### `weft_daemon.py`

Runs a continuous verifier loop:

```bash
export ETH_RPC_URL="http://127.0.0.1:8545"
export WEFT_CONTRACT_ADDRESS="0x..."
export PRIVATE_KEY="0x..."          # verifier node key
export VERIFIER_ADDRESS="0x..."     # optional metadata
export CONTRACT_ADDRESS="0x..."     # MVP template target contract

# optional
export PUBLISH_0G=1                 # attempt official 0G publish (requires ZERO_G_* vars)
export AXL_BROADCAST=1              # broadcast verdicts to peers (requires AXL_PEERS)
export POLL_INTERVAL=60

python3 agent/scripts/weft_daemon.py
```

Single pass (cron-friendly):

```bash
python3 agent/scripts/weft_daemon.py --once
```

### `weft_peer_server.py`

Run the peer endpoint that other nodes broadcast to:

```bash
AXL_PORT=9002 python3 agent/scripts/weft_peer_server.py
```

Then set peers on verifier nodes:

```bash
export AXL_BROADCAST=1
export AXL_PEERS="http://node-a:9002,http://node-b:9002,http://node-c:9002"
```

### `weft_sync_from_indexer.py`

```bash
python agent/scripts/weft_sync_from_indexer.py \
  --rpc-url "$ETH_RPC_URL" \
  --contract-address "$WEFT_CONTRACT_ADDRESS" \
  --out-dir agent/.attestations/
```

## Verification Criteria (MVP)

A milestone is `verified=true` when ALL:
- **Deployment**: contract code exists at stated address (`codeHash != bytes32(0)`)
- **Usage**: `uniqueCallerCount >= unique-caller-threshold` in measurement window

GitHub evidence is collected as additional signal but does not gate the verdict.

Override: if Kimi confidence < 0.6, return `verified=false`.

## Environment Variables

Required:
```bash
ETH_RPC_URL             # 0G Chain RPC
WEFT_CONTRACT_ADDRESS   # Deployed WeftMilestone
VERIFIER_ADDRESS        # This node's wallet (for attestation metadata)
```

Optional:
```bash
GITHUB_TOKEN             # GitHub personal access token (repo:read)
KIMI_API_KEY             # Kimi/Moonshot API key
POLL_INTERVAL           # Seconds between poll cycles (default: 3600)
```

0G Storage (optional — falls back to local files):
```bash
ZERO_G_EVM_RPC_URL        # 0G chain EVM RPC (or reuse ETH_RPC_URL)
ZERO_G_INDEXER_RPC        # 0G storage indexer RPC
ZERO_G_PRIVATE_KEY        # signer private key (or reuse PRIVATE_KEY)
ZERO_G_STREAM_ID          # KV stream ID (optional)
```

## What's Planned But Not Yet

| Component | Reason |
|---|---|
| AXL multi-node consensus | Gensyn AXL not deployed; MVP runs single-node |
| KeeperHub capital release | KeeperHub service not deployed |
| ENS text record updates | Requires deployed .eth names |
| Uniswap revenue routing | No revenue flow yet |
| 0G Storage in production | No indexer endpoint available yet |
| Kimi narrative synthesis | No `KIMI_API_KEY` configured yet |

## Config

See `agent/hermes.config.yml` for full environment variable documentation.
