# Weft — Technical Reference

Single source of truth for Weft's architecture, agent layer, and data model.

## System Overview

Weft is an autonomous coordination layer that replaces four institutional primitives:

| Primitive | Replaced by |
|---|---|
| Identity / CV | ENS text records (portable, machine-readable) |
| Funding / equity | `WeftMilestone.sol` — milestone-staked ETH |
| Verification / managers | Deterministic verifier daemon + optional Hermes/AXL surfaces |
| Settlement / payroll | Contract release/refund path; KeeperHub preferred verdict execution when configured |

### Architecture Diagram

```text
Builder/Team ──createMilestone──▶ WeftMilestone (0G Chain)
                                      │ deadline passed
                                      ▼
Verifier A ──poll/verify/narrate/vote──▶ AXL peer messaging
Verifier B ──poll/verify/narrate/vote──▶ AXL peer messaging
Verifier C ──poll/verify/narrate/vote──▶ AXL peer messaging
                                      │ consensus(verified, evidenceRoot)
                                      ▼
                    ┌─────────────────┴─────────────────┐
                    ▼                                    ▼
            0G Storage/Indexer                    KeeperHub
            (metadata, evidence,                   (reliable submitVerdict)
             bundles, KV roots)                         │
                    └──────── evidenceRoot / bundle ────┘
                                      │
                                      ▼
                              Onchain verdict/release
```

**Reading the diagram:** 0G anchors the contract, metadata lookup, and evidence artifacts. AXL coordinates the verifier swarm. KeeperHub is the preferred execution path once the swarm reaches confidence. ENS gives builders and verifier agents human-readable identity at the edge of the system.

> Weft takes milestone funding from manual trust to agentic execution: verifiers gather evidence, corroborate it over AXL, persist proofs on 0G, and execute verdicts reliably with KeeperHub.

## Agent Tiers

Weft has two agent tiers:

| Tier | Runtime | Interface | Fee |
|---|---|---|---|
| **Free (Daemon)** | `weft_daemon.py` — self-hosted Python loop | CLI only | 0% |
| **Hermes Agent** | Hermes Agent with Weft skills — managed | Telegram/Discord/CLI | 2-3% of released capital |

The **free daemon** reads onchain + offchain signals to produce milestone attestations. It runs deterministically (no AI judgment required for MVP) and can optionally call Kimi for human-readable narrative summaries.

The **Hermes Agent** wraps the same verification logic as Hermes skills, adding persistent memory, auto-generated skills, anomaly detection, and a messaging interface. It runs as a managed service — builders text the bot, the agent handles everything.

See [Product Plan](docs/product-plan.md) for the full tier structure and monetization.

## Contracts (`contracts/src/`)

| Contract | Purpose |
|---|---|
| `WeftMilestone.sol` | Milestone staking + 2-of-3 verifier quorum (0G Chain) |
| `VerifierRegistry.sol` | Authorized verifier node registry |
| `interfaces/IKeeperHub.sol` | KeeperHub interface (stub) |
| `interfaces/IWeftMilestone.sol` | ABI interface for external callers |
| `src-fhe/WeftMilestoneConfidential.sol` | v1 FHEVM escrow — addition-class sealed-ballot consensus (Sepolia) |
| `src-fhe/WeftMilestoneConfidentialWeighted.sol` | v2 FHEVM escrow — multiplication-class weighted consensus (Sepolia) |

See [SUBMISSION.md](SUBMISSION.md) for deployed addresses and FHE details.

## Canton / post-award rail (primary commercial)

Agent sits **beside** the buyer’s grant management SoR; Canton is private settlement for pilots.
See [`canton/BUSINESS_BRIEF.md`](canton/BUSINESS_BRIEF.md) and [`canton/PILOT_PLAN.md`](canton/PILOT_PLAN.md).

- Agent: `WEFT_SETTLEMENT_RAIL=canton` (daemon polls ledger; institutional checklist).
  Ingest: `POST /canton/ingest` · Receipt: `GET /canton/receipt/<id>`.
- API: `weft_canton_api.py` (:9020) — shared handlers in `agent/lib/canton_http.py`.
- UI: `/canton` (program ops). Machine layout: [`OPS.local.md.example`](OPS.local.md.example) → `OPS.local.md`.

## Library (`agent/lib/`)

The single source of truth for all shared agent logic. All scripts import from here.

| Module | Purpose |
|---|---|
| `canton_http.py` | Shared `/canton/*` HTTP handlers + `pending_milestone_ids()` |
| `canton_client.py` | Canton SettlementRail adapter + ledger mirror |
| `domain/` | Rail-agnostic milestone DTOs + institutional evidence template |
| `domain/receipt.py` | GMS verification receipt / writeback JSON |
| `github_client.py` | GitHub commits/PRs in milestone window |
| `kimi_client.py` | Kimi API for narrative + chronicle generation |
| `chronicle.py` | HTML milestone achievement cards and chronicle pages |
| `zero_storage.py` | 0G Storage read/write (falls back gracefully) |
| `deadline_scheduler.py` | Polls for milestones past deadline awaiting finalization |
| `indexer_client.py` | Unified indexer: 0G KV → onchain events fallback |
| `axl_client.py` | AXL binary P2P transport for peer verdict broadcast |
| `keeperhub_client.py` | KeeperHub reliable onchain execution |
| `fal_client.py` | fal.ai text-to-image for milestone swatch + chronicle covers |
| `stripe_skills_client.py` | Stripe Skills autonomous spend + revenue sweep |
| `llm_backend.py` | Pluggable LLM backend: Nemotron / Kimi / NousResearch |
| `fhe_client.py` | Zama FHE sealed-ballot votes (v1 FHE.add / v2 FHE.mul) |
| `eth_rpc.py` | Low-level Ethereum RPC helpers |
| `weft_topics.py` | Event topic constants for WeftMilestone |
| `verifier_registry_reader.py` | Reads verifier list from VerifierRegistry |
| `ens_client.py` | ENS text record updates |
| `peer_inbox.py` | Filesystem-based peer verdict aggregation |
| `verdict_envelope.py` | Signed envelope construction/verification |
| `metadata_reader.py` | Reads milestone metadata from 0G Storage |
| `bundle_manifest.py` | Deterministic bundle manifest (hashes + sizes) |
| `bundle_pack.py` | Packs attestation dir into `bundle.tar.gz` |
| `__init__.py` | Re-exports all public symbols |

## Verification Flow

```
milestone deadline passes
        │
        ▼
deadline_scheduler.poll_pending_milestones()
        │
        ├─ github_client.collect_github_evidence()
        ├─ mvp_verifier.count_unique_callers()
        ├─ mvp_verifier.eth_get_code()
        │
        ├─ [optional] kimi_client.generate_narrative()
        ├─ [optional] kimi_client.generate_chronicle()
        ├─ [optional] chronicle.write_card()
        ├─ [optional] zero_storage.write_evidence_to_storage()
        │
        ▼
mvp_verifier.build_attestation()
        │
        ▼
keeperhub_client.execute_verdict()  → KeeperHub (preferred)
        │   ├─ fallback: cast send submitVerdict()
        │   ├─ v1: fhe_client.submit_encrypted_verdict() (FHE.add)
        │   └─ v2: fhe_client.submit_encrypted_weighted_verdict() (FHE.mul)
        │
        ▼
indexer_client.get_milestone()
```

## Scripts

|| Script | Purpose |
|---|---|---|
|| `weft_collect_attestation.py` | Collect evidence + build attestation JSON |
|| `weft_verify_and_vote.sh` | E2E: collect evidence + submit onchain verdict |
|| `weft_sync_from_indexer.py` | Sync milestone state from indexer to local cache |
|| `weft_daemon.py` | Poll deadlines and automatically attest + vote (optional 0G publish + peer broadcast) |
|| `weft_builder.py` | Create milestones and stake from CLI (alpha) |
|| `weft_peer_server.py` | Receive peer broadcasts (POST /send) and persist to `agent/.inbox/` |
|| `weft_verify_bundle.py` | Verify bundles via bundle_manifest.json (hashes + sizes) |
|| `weft_download_and_verify_bundle.py` | Download bundle.tar.gz from 0G by root and verify |
|| `weft_status_api.py` | Minimal read-only HTTP API for builders (milestone status, optional metadata) |

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

To make the multi-node behavior more legible, a node can wait until it observes a threshold of matching peer envelopes in `agent/.inbox/` before submitting its own onchain vote. This does **not** change the onchain quorum logic (2-of-3). It adds an offchain safety gate so a node won't vote if peers disagree on `(verified, evidenceRoot)`.

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

This keeps the contract unchanged while making the onchain `evidenceRoot` prove the offchain signer set (signatures over `baseEvidenceRoot`).

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

> **KV key namespace**: Weft uses the `weft:` prefix for all 0G KV keys to avoid collisions. Convention: `weft:<entity>:<id>:<artifact>`.

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

The verdict is deliberately deterministic — payment decisions are made by
auditable evidence rules, not LLM judgment. The LLM produces a narrative
summary with a confidence score (`kimi_client.py`), which attaches to the
attestation as context. For v2 confidential milestones, the daemon also
computes a deterministic confidence score (1-100) from evidence strength
(deployment + usage signals) and encrypts it alongside the ballot via
`FHE.mul` — see `_compute_confidence_score()` in `weft_daemon.py`.

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
KIMI_API_KEY             # Kimi/Moonshot API key (used when LLM_BACKEND=kimi, the default)
FAL_KEY                  # fal.ai API key (get one at fal.ai) — AI-woven milestone swatches + chronicle covers
POLL_INTERVAL           # Seconds between poll cycles (default: 3600)
```

Stripe Skills (optional — autonomous spend loop: agent earns 3% and pays its own bills):
```bash
STRIPE_SKILLS_KEY        # Stripe Skills API key (enables autonomous earn→spend loop)
STRIPE_SKILLS_API_URL    # Optional API URL override (default: https://api.stripe.com/v1)
ETH_PRICE_USD            # ETH price for revenue sweep calculation (default: 2500)
WEFT_FEE_BPS             # Platform fee in basis points (default: 300 = 3%)
WEFT_SWEEP_PCT           # Fraction of fee swept to Stripe (default: 1.0 = 100%)
```

LLM Backend (optional — pluggable inference: Nemotron / Kimi / NousResearch):
```bash
LLM_BACKEND              # nemotron | kimi | nous (default: kimi)
NVIDIA_API_KEY           # NVIDIA API key for Nemotron 3 Ultra (when LLM_BACKEND=nemotron)
NEMOTRON_MODEL           # Model name (default: nvidia/nemotron-3-ultra-8b)
NEMOTRON_API_BASE        # NVIDIA API base URL (default: https://integrate.api.nvidia.com/v1)
NEMOCLAW_GUARD           # Set "1" to wrap LLM calls in NemoClaw safe-execution guard
NOUS_API_KEY             # NousResearch API key (when LLM_BACKEND=nous)
NOUS_BASE_URL            # NousResearch API base URL (default: https://api.nousresearch.com/v1)
NOUS_MODEL               # NousResearch model name (default: NousResearch/Hermes-3-Llama-3.1-70B)
```

KeeperHub (optional — reliable onchain execution with retry, gas optimization, and audit trails):
```bash
KEEPERHUB_API_KEY        # API key from app.keeperhub.com (enables KeeperHub execution)
KEEPERHUB_TRANSPORT      # rest (default) or mcp — mcp uses hosted MCP tools at /mcp
KEEPERHUB_API_URL        # Optional override (default: https://app.keeperhub.com)
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

FHE Confidential milestones (optional — Zama FHEVM on Sepolia):
```bash
FHE_SEPOLIA_RPC                        # Sepolia RPC for FHE transactions
WEFT_MILESTONE_CONFIDENTIAL            # v1 contract address (FHE.add sealed ballots)
WEFT_MILESTONE_CONFIDENTIAL_WEIGHTED   # v2 contract address (FHE.mul weighted ballots)
```
When `WEFT_MILESTONE_CONFIDENTIAL_WEIGHTED` is set, the daemon computes a deterministic confidence score (1-100) from evidence strength and submits a weighted encrypted ballot via `FHE.mul`. When only `WEFT_MILESTONE_CONFIDENTIAL` is set, it submits a boolean encrypted ballot via `FHE.add`.

Frontend observability demo (`frontend/src/app/api/observability/demo/route.ts`):
```bash
# Required
WEFT_REPO_ROOT            # Absolute path to the Weft repo root so the demo route can locate agent/scripts/weft_signoz_smoke.py
OTEL_EXPORTER_OTLP_HEADERS # SigNoz ingest token / headers (must be set on the frontend host for the demo to emit traces)

# Optional
WEFT_SIGNOZ_PYTHON        # Path to the Python binary to run weft_signoz_smoke.py (default: python3)
OTEL_SERVICE_NAME         # Service name for demo traces (default: weft-daemon)
OTEL_RESOURCE_ATTRIBUTES  # Comma-separated resource attributes (default: service.name=weft-daemon,deployment.environment=demo,weft.demo.batch=winning-position)
OTEL_EXPORTER_OTLP_ENDPOINT # SigNoz OTLP endpoint (default: https://ingest.us2.signoz.cloud:443)
OTEL_EXPORTER_OTLP_PROTOCOL # OTLP protocol: grpc or http/protobuf (default: http/protobuf)
WEFT_OTEL_EXPORT_TIMEOUT  # Trace export timeout in seconds (default: 10)
```

> **Security note:** This route is intended for trusted/local demo environments. `WEFT_REPO_ROOT` determines which Python script is executed; never expose the route publicly without authenticating callers. Keep `OTEL_EXPORTER_OTLP_HEADERS` (which contains your SigNoz ingest token) in a secret store or `.env` file — do not commit it.

## Hermes Agent Setup

Weft ships 7 Hermes skills that auto-load via `external_dirs` — no manual `Load` prompts needed.

```bash
# One-time: install Hermes, wire skills into ~/.hermes/config.yaml, write SOUL.md
bash scripts/setup-hermes.sh

# Launch Hermes with all Weft env vars pre-loaded (KIMI, FAL, KeeperHub, 0G, ENS)
bash scripts/hermes_weft.sh
```

### Skills (`agent/skills/`)

| Skill | Trigger phrase | What it does |
|---|---|---|
| `weft-chronicle` | "tell me my project's story" | Loads all attestations, calls Kimi, returns multi-chapter Builder Journey narrative + HTML card; auto-opens `chronicle.html` + `milestone_card.html` in browser |
| `weft-demo` | "run the demo" | Story-first coordinator (Problem→Stakes→Solution→Proof→Meaning): starts AXL nodes, collects evidence, calls Kimi chronicle, generates fal.ai/ComfyUI swatch, reads ENS records, prints sponsor summary |
| `weft-manim` | "animate the verification" | Generates a Manim animation of the verification flow as a literal weaving — warp threads (evidence) → weft interlacing (peer consensus) → fabric (milestone card) → MP4 output |
| `weft-verify` | "verify milestone 0x..." | Runs `mvp_verifier` + `github_client`, builds attestation JSON |
|| `weft-narrate` | "narrate milestone 0x..." | Calls `kimi_client.generate_narrative()` for a single milestone |
| `weft-status` | "status of weft.thisyearnofear.eth" | Queries `weft_status_api` and returns human-readable milestone state |
| `weft-ens` | "update ENS profile" | Calls `ens_client.update_builder_profile()` to write text records |
| `weft-treasury` | "show me the agent's books" | Reads Stripe Skills charge history + balance, returns P&L report (earned vs spent) |

### Identity (`~/.hermes/SOUL.md`)

Written by `scripts/setup-hermes.sh`. Defines Weft's weaving identity — warp/weft metaphor, skill
descriptions, contract context, and demo milestone hash. Edit to customise the agent's
personality for your deployment.

### How skills are wired

`scripts/setup-hermes.sh` writes the following to `~/.hermes/config.yaml`:

```yaml
skills:
  external_dirs:
    - /path/to/weft/agent/skills
```

Hermes loads all `SKILL.md` files from that directory on startup. No restart needed after
adding a new skill — just create a new subdirectory with a `SKILL.md`.

## What's Planned But Not Yet

| Component | Status |
|---|---|
| AXL multi-node consensus | ✅ Implemented — encrypted P2P transport; live node at `/api/status/axl` |
| KeeperHub capital release | `scheduleRelease()` not deployed (contract-level) |
| ENS text record updates | ✅ Implemented — `weft.thisyearnofear.eth` live with 6 records |
| 0G Storage in production | ✅ Public testnet indexer at `https://indexer-storage-testnet-turbo.0g.ai` |
| Kimi narrative synthesis | ✅ Implemented — `generate_chronicle()` + `generate_narrative()` |
| Hermes skills auto-load | ✅ Implemented — `external_dirs` wired, `SOUL.md`, `hermes_weft.sh` |
| MCP server | ✅ Implemented — `GET /mcp/tools`, `POST /mcp/invoke` on status API |
| Chat / conversational | ✅ Implemented — `POST /chat` + `AskWeft` widget on landing page |
| ComfyUI swatches | ✅ Implemented — `generate_milestone_image_comfyui()` in `fal_client.py` |
| Manim weaving animation | ✅ Implemented — `weft-manim` skill; served at `/manim/<name>` |
| Chronicle on frontend | ✅ Implemented — `/milestone/<hash>/story` page + `ChronicleShowcase` |

## Config

See `agent/hermes.config.yml` for full environment variable documentation.

## Data Model

### ENS Text Record Schema

Each builder's ENS name serves as their portable reputation profile.

**Root level:**

| Record Key | Type | Description |
|---|---|---|
| `weft.projects` | Array | List of project IDs the builder has participated in |
| `weft.milestones.verified` | Integer | Total count of verified milestones completed |
| `weft.earned.total` | Integer | Cumulative earnings in wei |
| `weft.cobuilders` | Array | List of ENS subnames for agent co-builders |
| `weft.reputation.score` | Integer | Composite score (0-1000) based on completed work |

**Per-project** (`weft.project.{projectId}.*`): `role`, `joined`, `earnings`, `milestones`

**Per-milestone** (`weft.milestone.{milestoneHash}.*`): `project`, `status`, `evidence`, `released`, `timestamp`

**Agent co-builders** (ENS subnames `{agent-name}.{project}.weft.eth`): `weft.agent.contributions`, `weft.agent.earnings`, `weft.agent.projects`

### Smart Contract Data Model

**WeftMilestone structs:**

```solidity
struct MilestoneCore {
    bytes32 projectId;         // Parent project identifier
    bytes32 templateId;        // Deterministic verification template ID
    bytes32 metadataHash;      // Pointer to project/milestone metadata (0G/IPFS/etc)
    address builder;           // Project builder address
    uint64  createdAt;         // When the milestone was created
    uint64  deadline;          // Unix timestamp deadline
    uint256 totalStaked;       // Total ETH staked by backers
    bool    finalized;         // Resolved by verifier quorum (success/fail)
    bool    verified;          // True iff quorum reached with didComplete=true
    bool    released;          // True once capital has been released
    uint8   verifierCount;     // How many verifier votes were submitted
    uint8   verifiedVotes;     // How many votes were didComplete=true
    bytes32 finalEvidenceRoot; // Content hash / 0G root of the evidence bundle
}

struct Split {
    address wallet;   // Recipient wallet (builder or co-builder)
    uint16  shareBps; // Basis points (10000 = 100%)
}
```

**Storage mappings:**

| Mapping | Key | Value | Description |
|---|---|---|---|
| `milestones` | `bytes32` (milestoneHash) | `MilestoneCore` | All milestone core data |
| `stakes` | `bytes32` → `address` → `uint256` | Amount | Individual backer stakes |
| `splits` | `bytes32` → `Split[]` | Array | Capital recipients for a verified milestone |
| `verifierVoted` | `bytes32` → `address` → `bool` | Flag | Prevents double-voting |
| `evidenceByVerifier` | `bytes32` → `address` → `bytes32` | Root | Each verifier's evidence pointer |

**Functions:** `createMilestone(...)`, `stake(bytes32)`, `submitVerdict(bytes32,bool,bytes32)`, `release(bytes32)`, `refund(bytes32)`

**VerifierRegistry:** `addVerifier(address)`, `removeVerifier(address)`

### 0G Storage Schema

**KV layer** (fast lookup): `milestoneHash` → JSON with `projectId`, `templateId`, `builder`, `totalStaked`, `deadline`, `finalized`, `verified`, `released`, `finalEvidenceRoot`, `verifierNodes`, `verifiedVotes`, `consensusBlock`

**Log layer** (permanent evidence archive): `evidenceHash` → JSON with `milestoneHash`, `evidenceType` ("github" | "deployment" | "usage" | "synthesis"), `rawData`, `kimisummary`, `timestamp`, `nodeSignature`

### Hash Calculations

- **Milestone hash:** `keccak256(abi.encodePacked(projectId, milestoneIndex, builderAddress, deadline))`
- **Project hash:** `keccak256(abi.encodePacked(projectName, builderAddress, timestamp))`
- **Evidence hash:** `keccak256(abi.encodePacked(milestoneHash, evidenceType, rawDataHash, kimisummaryHash))`

## Frontend (`frontend/`)

Next.js 16 app with wagmi 3, RainbowKit 2, and a self-hosted Zama Relayer SDK bundle for
confidential milestone decryption on Sepolia.

### Install and verify

```bash
cd frontend
npm ci --cache .npm-cache   # uses .npmrc (legacy-peer-deps for RainbowKit/wagmi peers)
npm run lint
npm run build
npm run dev
```

### Zama SDK asset sync

The Relayer SDK ships multiple WASM/worker files that SSR bundlers mishandle. Weft copies them
from `@zama-fhe/relayer-sdk` into `public/zama/` via `scripts/sync-zama-sdk.mjs`:

- Runs on `predev` and `prebuild` (`npm run sync-zama-sdk`)
- Copies from `node_modules` when installed
- Falls back to existing `public/zama/` when offline or before first install
- Loaded client-side from `/zama/*` in `src/lib/fhe.ts`

`public/zama/` is gitignored; CI and fresh clones rely on the sync script during build.

### Dependency note

`frontend/.npmrc` sets `legacy-peer-deps=true` because `@rainbow-me/rainbowkit@2.x` peers on
wagmi 2 while Weft uses wagmi 3. Remove `.npmrc` after upgrading to RainbowKit 3 on npm.

### SigNoz observability links

After provisioning SigNoz assets, `/observability` deep-links to the live dashboard and winning
trace filter. Run [`agent/scripts/weft_signoz_provision.sh`](../agent/scripts/weft_signoz_provision.sh)
(OpenTofu/Terraform) — it writes `NEXT_PUBLIC_SIGNOZ_*` into `frontend/.env.local` (gitignored).
See [`signoz/README.md`](../signoz/README.md).

## Dependencies

- **0G Chain** — Deployment target (EVM-compatible)
- **Sepolia** — FHEVM confidential contracts (Zama FHE)
- **Foundry** — Smart contract development + testing
- **Python 3** — Agent scripts (no external pip dependencies)
- **Next.js 16** — Frontend

## Security

- Multi-sig verification (2-of-3 Hermes nodes)
- Time-locked release mechanism
- Evidence immutability via 0G Storage
- Reentrancy guards on release/refund
- KeeperHub audit trail for all onchain executions
- Signed AXL envelopes with authorized-peer verification
- FHE sealed ballots — individual votes encrypted forever, only final result decryptable

<!-- BEGIN TESTSPRITE AGENT SECTION (testsprite agent install codex) -->
# TestSprite Verification Loop

Run `testsprite` after a feature/fix lands (skip docs-only or build-only changes).

## Quickstart

```bash
# Preflight
testsprite --version && testsprite auth whoami

# Find project: $TESTSPRITE_PROJECT_ID → .testsprite/config.json → testsprite project list
# Run new frontend test
testsprite test create --plan-from plan.json --run --wait \
  --target-url https://staging.example.com --timeout 600 --output json

# Run existing test or replay
testsprite test run <test-id> --target-url https://staging.example.com --wait --timeout 600
testsprite test rerun <test-id> --wait

# Backend: wave-ordered batch
testsprite test run --all --project <id> [--filter <substr>] \
  --wait --max-concurrency 4 --output json

# On failure
testsprite test artifact get <run-id> --out ./.testsprite/runs/<run-id>/

# Dry-run (no credentials needed)
testsprite test run <test-id> --dry-run
```

**Rules:** `--target-url` must be publicly reachable. BE `--code-file` runs top-to-bottom (call `test_*` at end). Sandbox has stdlib+requests+pytest+numpy+scipy only. `--wait` long-polls; exit 0=pass, 1=fail, 7=timeout. BE deps (`--produces`/`--needs`/`--category`) are create-only.

## Bootstrap

```bash
npm install -g @testsprite/testsprite-cli && testsprite setup
```

Seed a broad suite across main user flows, not just one test.
<!-- END TESTSPRITE AGENT SECTION -->
