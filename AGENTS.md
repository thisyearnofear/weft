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
                                      ┌──────────────────────────────┐
                                      │         Builder / Team       │
                                      │   ENS identity + milestone   │
                                      └──────────────┬───────────────┘
                                                     │
                                      createMilestone│ stake
                                                     ▼
                              ┌──────────────────────────────────────────┐
                              │        WeftMilestone on 0G Chain         │
                              │ milestone escrow + verifier quorum       │
                              └──────────────────┬───────────────────────┘
                                                 │
                                       deadline passed / pending
                                                 ▼
                   ┌─────────────────────────────────────────────────────────────┐
                   │                    Weft Verifier Swarm                     │
                   │                                                             │
                   │  Verifier A       Verifier B        Verifier C              │
                   │  ──────────       ──────────        ──────────              │
                   │  poll             poll              poll                    │
                   │  verify           verify            verify                  │
                   │  narrate          narrate           narrate                 │
                   │  vote             vote              vote                    │
                   └──────────────┬───────────────┬───────────────┬─────────────┘
                                  │               │               │
                                  └──── signed peer verdict envelopes ──────────┐
                                                                                 │
                                                                                 ▼
                                                  ┌──────────────────────────────┐
                                                  │       Gensyn AXL layer       │
                                                  │ peer messaging / corroboration│
                                                  └──────────────┬───────────────┘
                                                                 │
                                                         consensus on
                                                   (verified, evidenceRoot)
                                                                 │
                         ┌───────────────────────────────────────┴──────────────────────────────────────┐
                         │                                                                              │
                         ▼                                                                              ▼
        ┌────────────────────────────────┐                                   ┌────────────────────────────────────┐
        │        0G Storage / Indexer    │                                   │            KeeperHub                │
        │ metadata, evidence, bundles,   │                                   │ reliable submitVerdict() execution │
        │ consensus artifacts, KV roots  │                                   │ retry + gas optimization + audit   │
        └────────────────┬───────────────┘                                   └────────────────┬───────────────────┘
                         │                                                                    │
                         └─────────────────────────────── evidenceRoot / bundle pointers ─────┘
                                                                                               │
                                                                                               ▼
                                                            ┌────────────────────────────────────────┐
                                                            │      Onchain verdict / release path    │
                                                            │ finalized milestone + capital movement │
                                                            └────────────────────────────────────────┘
```

**Reading the diagram:** 0G anchors the contract, metadata lookup, and evidence artifacts. AXL coordinates the verifier swarm across separate nodes. KeeperHub is the preferred execution path once the swarm reaches confidence. ENS gives builders and verifier agents human-readable identity at the edge of the system.

> Weft takes milestone funding from manual trust to agentic execution: verifiers gather evidence, corroborate it over AXL, persist proofs on 0G, and execute verdicts reliably with KeeperHub.

## Agent Tiers

Weft has two agent tiers:

| Tier | Runtime | Interface | Fee |
|---|---|---|---|
| **Free (Daemon)** | `weft_daemon.py` — self-hosted Python loop | CLI only | 0% |
| **Hermes Agent** | Hermes Agent with Weft skills — managed | Telegram/Discord/CLI | 2-3% of released capital |

The **free daemon** reads onchain + offchain signals to produce milestone attestations.
It runs deterministically (no AI judgment required for MVP) and can optionally call
Kimi for human-readable narrative summaries.

The **Hermes Agent** wraps the same verification logic as Hermes skills, adding persistent
memory, auto-generated skills, anomaly detection, and a messaging interface. It runs as
a managed service — builders text the bot, the agent handles everything.

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

## Canton institutional rail (primary market)

Private milestone capital for issuers and funders who need **need-to-know** visibility.
Daml contracts live under [`canton/`](canton/). This is the front-door GTM; the public
EVM builder rail (0G Testnet) is the crypto-native wedge.

- Agent: `WEFT_SETTLEMENT_RAIL=canton` (daemon polls Canton ledger; institutional checklist).
  Optional: `CANTON_EVIDENCE_DIR`, `CANTON_DEMO_EVIDENCE=1` (pilot only).
- API: `weft_canton_api.py` (:9020) — shared handlers in `agent/lib/canton_http.py`.
- UI: `/canton`. Docs: [`canton/README.md`](canton/README.md), [`canton/BUSINESS_BRIEF.md`](canton/BUSINESS_BRIEF.md), [`canton/DEMO.md`](canton/DEMO.md).
- **Machine-specific layout** (SSH hosts, paths, ports): copy [`OPS.local.md.example`](OPS.local.md.example) → `OPS.local.md` (gitignored). Do not put IPs or aliases in tracked docs.

## Library (`agent/lib/`)

The single source of truth for all shared agent logic. All scripts import from here.

| Module | Purpose |
|---|---|
| `jsonrpc.py` | JSON-RPC client with file-based cache for idempotent reads |
| `abi.py` | Pure ABI encoding/decoding helpers |
| `weft_milestone_reader.py` | Reads `Milestones(bytes32)` from WeftMilestone |
| `mvp_verifier.py` | Deterministic evidence: deployment check + unique callers + attestation |
| `settlement.py` | Settlement rail protocol + `get_settlement_rail()` (`WEFT_SETTLEMENT_RAIL=evm\|canton`) |
| `evm_settlement.py` | EVM SettlementRail adapter (KeeperHub / cast) |
| `canton_http.py` | Shared `/canton/*` HTTP handlers + `pending_milestone_ids()` (DRY for APIs + daemon) |
| `canton_client.py` | Canton SettlementRail adapter + ledger mirror (institutional primary market) |
| `domain/` | Rail-agnostic milestone DTOs + institutional evidence template |
| `domain/models.py` | `MilestoneViewModel.to_status_dict()` — SSOT for status JSON (frontend: `frontend/src/lib/milestone-view.ts`) |
| `github_client.py` | GitHub commits/PRs in milestone window (env: `GITHUB_TOKEN`) |
| `kimi_client.py` | Kimi API for narrative + chronicle generation (env: `KIMI_API_KEY`) |
| `chronicle.py` | HTML milestone achievement cards and chronicle pages (woven-fabric motif) |
| `zero_storage.py` | 0G Storage read/write (env: `ZERO_G_*`, falls back gracefully) |
| `deadline_scheduler.py` | Polls for milestones past deadline awaiting finalization |
| `indexer_client.py` | Unified indexer: tries 0G KV, falls back to onchain events |
| `axl_client.py` | AXL binary P2P transport for peer verdict broadcast (env: `AXL_PORT`, auto-starts node) |
| `keeperhub_client.py` | KeeperHub reliable onchain execution (env: `KEEPERHUB_API_KEY`, retry + gas opt + audit trail) |
| `fal_client.py` | fal.ai text-to-image client for AI-woven milestone swatch + chronicle cover images (env: `FAL_KEY`) |
| `stripe_skills_client.py` | Stripe Skills autonomous spend layer — agent pays for its own services + sweeps earned revenue (env: `STRIPE_SKILLS_KEY`) |
| `llm_backend.py` | Pluggable LLM backend selector: Nemotron 3 Ultra (NVIDIA/NemoClaw), Kimi, NousResearch (env: `LLM_BACKEND`) |
| `fhe_client.py` | Zama FHE sealed-ballot votes — encrypts the verdict via `scripts/fhe_encrypt_vote.mjs` and submits to `WeftMilestoneConfidential` on Sepolia (env: `WEFT_MILESTONE_CONFIDENTIAL`, `FHE_SEPOLIA_RPC`); also supports v2 weighted ballots via `fhe_encrypt_weighted_vote.mjs` (env: `WEFT_MILESTONE_CONFIDENTIAL_WEIGHTED`) |
| `eth_rpc.py` | Low-level Ethereum RPC helpers |
| `weft_topics.py` | Event topic constants for WeftMilestone |
| `verifier_registry_reader.py` | Reads verifier list from VerifierRegistry |
| `ens_client.py` | ENS text record updates |
| `peer_inbox.py` | Filesystem-based peer verdict aggregation |
| `verdict_envelope.py` | Signed envelope construction/verification |
| `metadata_reader.py` | Reads milestone metadata from 0G Storage |
| `bundle_manifest.py` | Deterministic bundle manifest (hashes + sizes) |
| `bundle_pack.py` | Packs attestation directory into `bundle.tar.gz` |
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
        ├─ [optional] kimi_client.generate_chronicle()  (Builder Journey)
        ├─ [optional] chronicle.write_card()             (milestone card HTML)
        ├─ [optional] zero_storage.write_evidence_to_storage()
        │
        ▼
mvp_verifier.build_attestation()  → attestation JSON
        │
        ▼
keeperhub_client.execute_verdict()  → KeeperHub (preferred)
        │   ├─ fallback: cast send submitVerdict()  (onchain vote)
        │   ├─ v1 confidential: fhe_client.submit_encrypted_verdict()
        │   │    (Zama FHE sealed ballot — FHE.add, vote encrypted, never decrypted)
        │   └─ v2 confidential: fhe_client.submit_encrypted_weighted_verdict()
        │        (Zama FHE weighted ballot — FHE.mul, ballot × confidence, never decrypted)
        │        confidence = deterministic score from evidence strength (1-100)
        │
        ▼
indexer_client.get_milestone() reads final state
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

> **KV key namespace**: Weft uses the `weft:` prefix for all 0G KV keys to avoid
> collisions with other teams writing to the same stream. The full convention is
> `weft:<entity>:<id>:<artifact>`. Do not write keys outside this namespace.

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
KEEPERHUB_API_URL        # Optional API URL override (default: https://app.keeperhub.com)
                         # Use this to point at a testnet/staging KeeperHub instance,
                         # e.g. export KEEPERHUB_API_URL="https://staging.keeperhub.com"
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
When `WEFT_MILESTONE_CONFIDENTIAL_WEIGHTED` is set, the daemon computes a deterministic
confidence score (1-100) from evidence strength and submits a weighted encrypted ballot
via `FHE.mul`. When only `WEFT_MILESTONE_CONFIDENTIAL` is set, it submits a boolean
encrypted ballot via `FHE.add`.

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

| Component | Reason |
|---|---|
| AXL multi-node consensus | ✅ Implemented — real AXL binary with encrypted P2P transport; live node at `/api/status/axl` |
| KeeperHub capital release | KeeperHub `scheduleRelease()` not deployed (contract-level integration) |
| ENS text record updates | ✅ Implemented — `weft.thisyearnofear.eth` live with 6 records; subname issuance wired into daemon |
| 0G Storage in production | ✅ Public testnet indexer available: `https://indexer-storage-testnet-standard.0g.ai` |
| Kimi narrative synthesis | ✅ Implemented — `generate_chronicle()` + `generate_narrative()` via `api.moonshot.ai/v1` |
| Hermes skills auto-load | ✅ Implemented — `external_dirs` wired, `SOUL.md` identity written, `hermes_weft.sh` launcher |
| MCP server | ✅ Implemented — `GET /mcp/tools`, `POST /mcp/invoke` on `weft_status_api.py`; exposes chronicle, status, verify tools to any MCP client |
| Chat / conversational interface | ✅ Implemented — `POST /chat` on status API + `AskWeft` widget on frontend landing page; intent-routes to chronicle/status/verify |
| ComfyUI milestone swatches | ✅ Implemented — `generate_milestone_image_comfyui()` in `fal_client.py` as supplement to fal.ai; submits workflow to local ComfyUI REST API |
| Manim weaving animation | ✅ Implemented — `weft-manim` Hermes skill generates animated verification flow (warp→weft→fabric) as MP4; served at `/manim/<name>` on status API |
| Chronicle on frontend | ✅ Implemented — `/milestone/<hash>/story` page with `localStorage` cache; `ChronicleShowcase` on landing page; `POST /chronicle/generate` API endpoint |

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

After finishing a feature or fix in a TestSprite-tested repo, use the `testsprite`
CLI to run the relevant TestSprite tests against the change and inspect any failure
artifacts before reporting the work as done. Use whenever code has changed outside
docs/config and is about to be reported complete.

## When to run

Run after a feature or fix lands. Skip only for: docs-only edits, pure
build/config changes, or when the repo has no TestSprite project linked.

## Core loop

### 1. Preflight

```bash
testsprite --version          # CLI installed?
testsprite auth whoami        # credentials valid?
```

If `--version` fails, tell the user to install the CLI and stop.
If `auth whoami` fails, tell the user to run `testsprite auth configure` and stop.

### 2. Find the project

In order: `$TESTSPRITE_PROJECT_ID` → `.testsprite/config.json` → `testsprite project list --output json`.

### 3. Run

```bash
# New frontend test from plan (most common)
testsprite test create --plan-from plan.json --run --wait \
  --target-url https://staging.example.com --timeout 600 --output json

# Existing test
testsprite test run <test-id> --target-url https://staging.example.com \
  --wait --timeout 600 --output json

# New backend test from Python assertion file
testsprite test create --type backend --name "Login rejects empty password" \
  --project <id> --code-file /tmp/test.py --run --wait --timeout 600

# Replay (cheaper than a fresh run — reuses saved test code)
testsprite test rerun <test-id> --wait --output json

# Backend tests sharing state: declare the dependency graph at create time;
# the wave engine orders runs (producers → consumers → teardown last)
testsprite test create --type backend --project <id> --code-file /tmp/login.py \
  --name "login issues an auth token" --produces auth_token
testsprite test create --type backend --project <id> --code-file /tmp/profile.py \
  --name "profile update accepts the token" --needs auth_token
testsprite test create --type backend --project <id> --code-file /tmp/cleanup.py \
  --name "fixture user is deleted" --category teardown

# Wave-ordered batch fresh run (BE tests, all or filtered)
testsprite test run --all --project <id> [--filter <substr>] \
  --wait --max-concurrency 4 --output json
```

**Key behaviors:**

- `--target-url` must be publicly reachable (no localhost / RFC1918) and must
  already have the change deployed (e.g. a CI preview deploy) — the CLI tests a
  deployed URL, it doesn't host your environment. Running earlier verifies the
  previous build.
- Backend `--code-file`: the runner executes the file top-to-bottom (not `pytest`), so **call your `test_*` function(s) at the end of the file** — a defined-but-uncalled test silently passes.
- Backend sandbox has only stdlib + `requests` + `pytest` + `numpy` + `scipy`. Test the API over HTTP with `requests`; do **not** `import` the project's own source modules or other packages (e.g. `torch`) — they aren't installed and the test won't run.
- `--wait` long-polls until terminal. Do not wrap it in a retry loop.
- Exit `0` = passed; `1` = failed/blocked; `7` = timeout (resume with `test wait <run-id>`).
- BE dependency flags (`--produces`/`--needs`/`--category`) are backend-only and
  **create-only** — they can't be read back or edited later (delete + recreate to
  change the graph). Don't hand-sequence `test run` calls to fake ordering; use
  `test run --all` so the engine passes captured variables between waves.
- A BE `test rerun` dispatches the whole producer/teardown closure, side effects
  included; `--skip-dependencies` reruns only the named test. If a producer failed
  in the same closure, the consumer's failure is starvation (missing token/fixture)
  — triage the producer first; it does not implicate your change.
- `create` and `--wait` output include a `dashboardUrl` — if the user wants to
  inspect a test or run themselves, point them there.

### 4. On failure — download the artifact

```bash
testsprite test artifact get <run-id> --out ./.testsprite/runs/<run-id>/
```

Inspect the bundle (failing step, screenshots, root-cause hypothesis) before
deciding whether your change caused the failure.

### 5. One more tool — dry-run for learning

Every command works without credentials under `--dry-run`:

```bash
testsprite test run <test-id> --dry-run --output json
testsprite test create --plan-from plan.json --dry-run --output json
```

## Exit-code quick reference

| Code | Meaning                                           |
| ---- | ------------------------------------------------- |
| 0    | Success (passed)                                  |
| 1    | Failed / blocked / cancelled                      |
| 3    | Auth error                                        |
| 4    | Not found                                         |
| 5    | Validation error                                  |
| 6    | Conflict (already running)                        |
| 7    | Timeout — resume: `testsprite test wait <run-id>` |
| 11   | Rate limited (retriable)                          |
| 12   | Insufficient credits                              |

## Bootstrap (first-time setup)

```bash
npm install -g @testsprite/testsprite-cli
testsprite setup         # configure + verify + install agent skill in one shot
```

Verify your setup anytime: `testsprite auth status`.

**First-time setup:** if this repo has no TestSprite tests yet, seed a *broad* first suite across its main user flows — not just one test — each with a concrete, observable assertion, before reporting setup as done.
<!-- END TESTSPRITE AGENT SECTION -->
