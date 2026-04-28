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
| `keeperhub_client.py` | KeeperHub reliable onchain execution (env: `KEEPERHUB_API_KEY`, retry + gas opt + audit trail) |
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
keeperhub_client.execute_verdict()  → KeeperHub (preferred)
        │   └─ fallback: cast send submitVerdict()  (onchain vote)
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
| `weft_verify_bundle.py` | Verify bundles via bundle_manifest.json (hashes + sizes) |
| `weft_download_and_verify_bundle.py` | Download bundle.tar.gz from 0G by root and verify |
| `weft_status_api.py` | Minimal read-only HTTP API for builders (milestone status, optional metadata) |

## Builder onboarding (first cohort)

Builders can create milestones and stake using:
- `scripts/weft_builder.py` (alpha)

This keeps the initial onboarding simple without requiring a frontend.

Recommended flow:
1) `init-metadata --upload-0g` to get a `metadata_hash` (0G root)
2) `verify-metadata --root <metadata_hash>` to sanity-check the uploaded JSON
3) `create-milestone --metadata-root <metadata_hash> --indexer <...>` (auto-derives deadline/template)

Tip: append `--dry-run` to `create-milestone` to print the computed `milestoneHash` and the exact
`createMilestone(...)` calldata for copy/paste debugging.

### Builder status API (recommended)

Run a lightweight HTTP status endpoint for builders:

```bash
export ETH_RPC_URL="https://..."
export WEFT_CONTRACT_ADDRESS="0x..."
export ZERO_G_INDEXER_RPC="https://..."   # optional (enables includeMetadata=1)

python3 agent/scripts/weft_status_api.py --port 9010
```

Then builders can fetch:

```bash
curl "http://localhost:9010/milestone/0x...?"
curl "http://localhost:9010/milestone/0x...?includeMetadata=1"
```

Or open the landing page in a browser (paste milestone hash + click Fetch):
`http://localhost:9010/`

### `weft_collect_attestation.py`

```bash
python agent/scripts/weft_collect_attestation.py \
  --rpc-url "$ETH_RPC_URL" \
  --weft-milestone "$WEFT_CONTRACT_ADDRESS" \
  --milestone-hash "0x..." \
  --contract-address "0x..." \
  --out agent/.attestations/attestation.json
```

Optional flags: `--no-cache` and (emergency overrides) `--contract-address`, `--unique-caller-threshold`, `--measurement-window-seconds`.

### `weft_daemon.py`

Runs a continuous verifier loop:

```bash
export ETH_RPC_URL="http://127.0.0.1:8545"
export WEFT_CONTRACT_ADDRESS="0x..."
export PRIVATE_KEY="0x..."          # verifier node key
export VERIFIER_ADDRESS="0x..."     # optional metadata
export ZERO_G_INDEXER_RPC="https://..."  # required: daemon derives template inputs from milestone.metadataHash (0G root)

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

Require signed envelopes (recommended):

```bash
AXL_REQUIRE_SIGNATURE=1 AXL_PORT=9002 python3 agent/scripts/weft_peer_server.py
```

Then set peers on verifier nodes:

```bash
export AXL_BROADCAST=1
export AXL_PEERS="http://node-a:9002,http://node-b:9002,http://node-c:9002"
```

#### Signed broadcast mode

Broadcasts are signed by default (if a key is available) using:
`cast wallet sign <canonical-json-message>` and verified by peers via `cast wallet verify`.

Env vars:

```bash
AXL_SIGN=1                  # default (set 0 to disable)
AXL_SIGNING_KEY=0x...        # optional; otherwise uses PRIVATE_KEY
AXL_REQUIRE_SIGNATURE=1      # on the receiving peer server
```

#### Authorized-peers mode (recommended)

When using peer corroboration, you can require that each peer envelope is from an
onchain-authorized verifier address in `VerifierRegistry`:

```bash
AXL_REQUIRE_AUTHORIZED=1
# optional override; otherwise derived from WeftMilestone.verifierRegistry()
VERIFIER_REGISTRY_ADDRESS=0x...
```

### Peer-corroboration mode (recommended for demos)

To make the multi-node behavior more legible, a node can be configured to **wait**
until it observes a threshold of matching peer envelopes in `agent/.inbox/` before
it submits its own onchain vote.

This does **not** change the onchain quorum logic (the contract still enforces
2-of-3). It simply adds an offchain safety gate so a node won’t vote if peers
disagree on `(verified, evidenceRoot)`.

```bash
export AXL_WAIT_FOR_PEERS=1
export AXL_PEER_THRESHOLD=2   # number of unique node addresses required
export WEFT_INBOX_DIR=agent/.inbox
```

#### Consensus-root mode (recommended)

When `AXL_USE_CONSENSUS_ROOT=1`, the daemon will:
1) compute a deterministic `baseEvidenceRoot` for the local attestation bundle
2) wait for `AXL_PEER_THRESHOLD` signed peer envelopes that agree on `(verified, baseEvidenceRoot)`
3) compute a deterministic `consensusRoot = keccak(canonical_json(consensus.json))`
4) submit `consensusRoot` onchain as the `evidenceRoot`

This keeps the contract unchanged while making the onchain `evidenceRoot` prove the
offchain signer set (signatures over `baseEvidenceRoot`).

```bash
export AXL_USE_CONSENSUS_ROOT=1
```

#### Publishing consensus.json to 0G (recommended)

If you also enable `PUBLISH_0G=1` and have `0g-storage-client` configured, the daemon
can upload `consensus.json` to 0G Storage and write KV pointers so the onchain
`consensusRoot` can be resolved to the actual 0G merkle root:

```bash
export PUBLISH_0G=1
export PUBLISH_0G_CONSENSUS=1

export ZERO_G_EVM_RPC_URL="https://..."
export ZERO_G_INDEXER_RPC="https://..."
export ZERO_G_PRIVATE_KEY="0x..."
export ZERO_G_STREAM_ID="0x..."   # required for KV pointers
```

Written KV keys:
- `weft:milestone:<milestoneHash>:consensus` -> `<0g_root_of_consensus.json>`
- `weft:consensus:<consensusRoot>` -> `<0g_root_of_consensus.json>`

#### Publishing the full attestation bundle to 0G (recommended)

If `PUBLISH_0G_BUNDLE=1`, the daemon will create a deterministic `bundle.tar.gz`
containing the entire attestation output directory (including `attestation.json`,
`consensus.json`, and any other artifacts written there), upload it to 0G Storage,
and write KV pointers:

```bash
export PUBLISH_0G=1
export PUBLISH_0G_BUNDLE=1
```

Written KV keys:
- `weft:milestone:<milestoneHash>:bundle` -> `<0g_root_of_bundle.tar.gz>`
- `weft:consensus:<consensusRoot>:bundle` -> `<0g_root_of_bundle.tar.gz>`

#### bundle_manifest.json

Whenever consensus-root mode runs, the daemon writes `bundle_manifest.json` into the
attestation output directory before packing `bundle.tar.gz`.

The manifest includes:
- `milestoneHash`, `verified`, `baseEvidenceRoot`, `consensusRoot`, `signers`
- a deterministic list of files with `{path, bytes, keccak256}` for each file in the directory

This makes it easy to quickly validate bundle integrity after download (before unpacking).

#### Verifying a downloaded bundle

Use `weft_verify_bundle.py` to verify a downloaded bundle against `bundle_manifest.json`.

Verify a tarball (extracts to a temp dir and checks hashes/sizes):

```bash
python3 agent/scripts/weft_verify_bundle.py --bundle ./bundle.tar.gz
```

Verify an extracted directory:

```bash
python3 agent/scripts/weft_verify_bundle.py --dir ./extracted_bundle_dir
```

Strict mode (fails if extra files exist beyond the manifest list):

```bash
python3 agent/scripts/weft_verify_bundle.py --bundle ./bundle.tar.gz --strict
```

#### Download + verify in one command (0G)

If you have a `bundle.tar.gz` merkle root from 0G Storage, you can download and verify it:

```bash
export ZERO_G_INDEXER_RPC="https://..."
python3 agent/scripts/weft_download_and_verify_bundle.py --root 0x... --strict
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

KeeperHub (optional — reliable onchain execution with retry, gas optimization, and audit trails):
```bash
KEEPERHUB_API_KEY        # API key from app.keeperhub.com (enables KeeperHub execution)
KEEPERHUB_API_URL        # Optional API URL override (default: https://app.keeperhub.com)
KEEPERHUB_TIMEOUT        # Seconds to wait for tx confirmation (default: 120)
KEEPERHUB_ENABLED        # Set to "0" to disable even if API key is set (default: "1")
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
| KeeperHub capital release | KeeperHub `scheduleRelease()` not deployed (contract-level integration) |
| ENS text record updates | Requires deployed .eth names |
| Uniswap revenue routing | No revenue flow yet |
| 0G Storage in production | No indexer endpoint available yet |
| Kimi narrative synthesis | No `KIMI_API_KEY` configured yet |

## Config

See `agent/hermes.config.yml` for full environment variable documentation.
