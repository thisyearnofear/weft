# Weft

**Weft is a Hermes Agent-powered Digital Twin for onchain builders: a long-running autonomous agent that maintains persistent memory of every milestone, commit, and user interaction — weaving raw data threads into meaningful fabric and releasing capital when outcomes are verified.**

> *In weaving, the **weft** is the horizontal thread that interlaces with the vertical warp to create fabric. In Weft, raw data threads — onchain events, GitHub commits, peer verdicts — are woven by the Hermes Agent into meaningful fabric: narratives, achievement cards, ENS profiles. Technology provides the warp. Liberal arts provide the weft.*

Weft helps internet-native teams release capital based on verifiable outcomes instead of manual trust.

## The wedge

Most early teams still coordinate funding with some broken combination of:
- Telegram chats
- Notion checklists
- screenshots in DMs
- multisig payout politics
- contractor ambiguity
- no portable reputation

Weft replaces that with a capital coordination system built for **fluid human-agent teams**:
1. a founder, sponsor, or DAO defines a milestone and escrows capital,
2. builders and agents work toward the objective,
3. verifier agents gather evidence when the milestone window closes,
4. peer nodes corroborate the outcome,
5. funds release only when the system reaches execution-grade confidence,
6. the builder and agent identities retain portable reputation tied to funded outcomes.

## Why this matters

Weft replaces four things that normally require corporations, lawyers, and managers:

| Primitive | Replaced by |
|---|---|
| Identity / CV | ENS text records and portable Weft reputation |
| Funding / equity | `WeftMilestone.sol` milestone escrow |
| Verification / managers | autonomous verifier swarm |
| Settlement / payroll | KeeperHub-backed capital release |

## Who it is for

### Founders, sponsors, and DAOs
- release capital without manual payout review
- reduce milestone disputes
- fund faster with more confidence
- keep auditable evidence trails

### Contributors
- earn portable reputation from funded outcomes
- work pseudonymously or agentically
- prove impact without relying on a résumé or screenshots
- participate in teams that form and dissolve quickly

### Internet-native teams
- coordinate without requiring formal company structure first
- mix human and agent contributors in the same trust graph
- turn shipped work into reusable trust for future funding

## Sponsor fit at a glance

| Sponsor | What Weft uses | Why it is essential |
|---|---|---|
| **0G** | 0G Chain, metadata lookup via indexer, 0G Storage bundle/evidence publishing | Milestones, metadata, evidence roots, and downloadable attestation artifacts live in the same workflow |
| **Gensyn / AXL** | Peer broadcast, signed verdict envelopes, offchain corroboration | Separate verifier nodes coordinate before voting; no central coordinator |
| **KeeperHub** | Reliable `submitVerdict()` execution with retry/audit trail | Agents can reason about a verdict and still need a robust path to execute it onchain |
| **ENS** | Builder / verifier profile records and discoverability | Human-readable identity and portable reputation for builders and agents |
| **Hermes + Kimi** | Managed agent layer, narrative generation, Builder Journey chronicles | Weaves raw data threads into meaningful fabric — creative non-fiction from the blockchain |

## What is different about Weft

### 1. Capital moves on evidence, not vibes
Weft is not task tracking. It is a **capital release system**. Money stays gated until evidence clears a threshold.

### 2. Humans and agents are first-class contributors in the same system
Most tools still treat agents as assistants. Weft treats them as economic actors that can contribute to outcomes and accumulate track record.

### 3. Reputation is tied to funded outcomes
A milestone completing is useful. A milestone completing and unlocking real capital is a much stronger signal.

### 4. Flexible verification, onchain consequences
Weft sits between rigid smart contracts and messy manual review: offchain evidence gathering with onchain finality.

## For judges: 3-minute demo flow

### Story in one sentence
**Weft lets internet-native teams release capital based on verifiable outcomes instead of manual trust.**

### Demo sequence
1. **Show the old world**
   - explain the pain: screenshots, chats, payout ambiguity, no reusable reputation
2. **Create / inspect a milestone**
   - show the milestone hash and metadata root on 0G
3. **Open the Weft status API / app**
   - show the milestone payload and product surface
4. **Explain the verifier swarm**
   - signed peer envelopes land in `agent/.inbox/`
   - corroborating peers agree on `(verified, evidenceRoot)`
5. **Explain the capital release decision**
   - KeeperHub is the preferred execution path for `submitVerdict()`
6. **Close with reputation**
   - the builder and collaborators retain portable trust tied to funded outcomes

### What to highlight verbally
- **0G:** metadata + evidence persistence
- **AXL:** separate verifier nodes, shared corroboration
- **KeeperHub:** reliable execution, not a raw one-off tx
- **ENS:** discoverable agent / builder identity
- **Weft:** trust graph for fluid teams, not just a milestone dashboard

## Hermes Agent architecture

Weft's verification layer is a **multi-node autonomous Hermes Agent system** — a specialist agent swarm where each node acts as an independent Digital Twin for the builder's project. Each node maintains **persistent memory via 0G Storage** and runs a continuous goal-driven loop:

1. **Polls** onchain milestones past their deadline via `DeadlineScheduler`
2. **Collects** deterministic evidence (deployment check + unique caller count + GitHub commits)
3. **Persists** real-time state to **0G Storage KV** and appends to the **0G Storage Log** (immutable history)
4. **Generates** a human-readable narrative from raw attestation data using **Kimi** (`moonshot-v1-128k`)
5. **Weaves** a Builder Journey chronicle — multi-chapter narrative with fal.ai milestone achievement cards
6. **Broadcasts** signed verdict envelopes to peer nodes via **AXL** encrypted P2P transport
7. **Waits** for peer consensus threshold before submitting (offchain safety gate)
8. **Submits** onchain votes via **KeeperHub** (with `cast send` fallback)
9. **Updates** builder's **ENS** text records with verified achievement summary
10. **Publishes** evidence bundles + consensus proofs + chronicle to **0G Storage**

### 0G Storage memory architecture

The Hermes Agent uses both 0G Storage primitives as the 0G judges describe:

| Layer | Key pattern | Purpose |
|---|---|---|
| **KV (real-time state)** | `weft:milestone:<hash>:state` | Current verification state — fast lookup for the agent's working memory |
| **KV (latest evidence)** | `weft:milestone:<hash>:latest` | Pointer to the most recent evidence root in 0G Log |
| **KV (consensus)** | `weft:milestone:<hash>:consensus` | Consensus proof root — which peer nodes agreed |
| **KV (bundle)** | `weft:milestone:<hash>:bundle` | Full attestation bundle root (attestation.json + chronicle + cards) |
| **Log (history)** | `weft:milestone:<hash>:history` | Append-only event log — every state change, verdict, and narrative update |
| **Log (chronicle)** | `weft:milestone:<hash>:chronicle` | Builder Journey narrative — the creative layer woven from onchain threads |

This mirrors the exact architecture 0G describes: **KV for real-time state, Log for conversation/history**.

```text
┌──────────────────────────────────────────────────────────────────┐
│                      0G Galileo Testnet                         │
│  WeftMilestone: 0xcc76...474c  VerifierRegistry: 0x599e...3169  │
└──────────┬───────────────────────────────────────┬──────────────┘
           │  poll deadlines                       │  submitVerdict
           ▼                                       ▼
┌──────────────────────┐              ┌────────────────────────┐
│   Hermes Agent Node  │◄─── AXL ────►│  Hermes Agent Node 2   │
│   (Digital Twin)     │  encrypted   │  (peer corroboration)  │
│                      │  P2P mesh    │                        │
│  DeadlineScheduler   │              │  DeadlineScheduler     │
│  mvp_verifier        │              │  mvp_verifier          │
│  github_client       │              │  github_client         │
│  kimi_client ────────┼──────────────┼──► Kimi narrative      │
│  fal_client ─────────┼──────────────┼──► fal.ai swatch       │
│  chronicle ──────────┼──────────────┼──► Builder Journey     │
│  ens_client ─────────┼──────────────┼──► ENS text records    │
│  keeperhub_client ───┼──────────────┼──► KeeperHub verdict   │
└──────────┬───────────┘              └────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      0G Storage                                 │
│  KV: weft:milestone:<hash>:state    ← real-time agent memory    │
│  KV: weft:milestone:<hash>:latest   ← evidence root pointer     │
│  KV: weft:milestone:<hash>:consensus← peer consensus proof      │
│  Log: weft:milestone:<hash>:history ← immutable event log       │
│  Log: weft:milestone:<hash>:chronicle← Builder Journey narrative│
└──────────────────────────────────────────────────────────────────┘
```

## Demo surfaces

### 1. Status API / landing page

Run:
```bash
ETH_RPC_URL="http://127.0.0.1:8545" \
WEFT_CONTRACT_ADDRESS="0x..." \
ZERO_G_INDEXER_RPC="https://..." \
WEFT_BUILDER_ENS="builder.eth" \
WEFT_AGENT_ENS="verifier.eth" \
python3 agent/scripts/weft_status_api.py --port 9010
```

Open:
- `http://localhost:9010/`
- `http://localhost:9010/demo`
- `http://localhost:9010/milestone/<hash>?includeMetadata=1`

The milestone payload includes a `demo` section that surfaces:
- **0G** metadata and evidence-root context
- **Gensyn / AXL** peer corroboration state from `agent/.inbox/`
- **KeeperHub** execution-path configuration
- **ENS** builder / agent profile visibility

### 2. Hermes skills

Open in Codespaces if you want the managed-agent flow:
**[Open in GitHub Codespaces](https://codespaces.new/thisyearnofear/weft)**

Then:
```bash
bash setup-hermes.sh && source ~/.bashrc && hermes setup
hermes
```

Useful prompts:
```text
Load ~/weft/agent/skills/weft-status/SKILL.md and check the status of milestone 0x0f93e22d852f346d633f5bd0f61d38e011661ee09a74b0a7dd2856181fe9266f
```

```text
Load ~/weft/agent/skills/weft-narrate/SKILL.md and generate a narrative for milestone 0x0f93e22d852f346d633f5bd0f61d38e011661ee09a74b0a7dd2856181fe9266f
```

```text
Load ~/weft/agent/skills/weft-verify/SKILL.md and verify milestone 0x0f93e22d852f346d633f5bd0f61d38e011661ee09a74b0a7dd2856181fe9266f
```

```text
Load ~/weft/agent/skills/weft-chronicle/SKILL.md and tell me my project's story
```

## Quick start

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Init dependencies (one-time)
git submodule update --init --recursive

# Solidity tests
forge test

# Python agent tests
python -m pytest agent/test/ -v
```

## End-to-end demo

Run the full pipeline covering all sponsor integrations:

```bash
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0xcc768d56b0053b1b2df5391dde989be3f859474c"
export PRIVATE_KEY="0x..."

# Optional sponsor features
export KIMI_API_KEY="..."           # Kimi narrative generation
export KEEPERHUB_API_KEY="..."      # KeeperHub reliable execution
export ZERO_G_INDEXER_RPC="..."     # 0G Storage publishing
export WEFT_BUILDER_ENS="builder.weft.eth"  # ENS profile updates
export FAL_KEY="..."                # fal.ai — AI-woven swatch + chronicle cover imagery

bash scripts/demo_e2e.sh --nodes=3
```

Dry-run (no onchain transactions):
```bash
bash scripts/demo_e2e.sh --dry-run --nodes=3
```

See [Hackathon Strategy](docs/hackathon-strategy.md) for per-track analysis.

## Sponsor SDKs and protocols used

| Sponsor | SDK / Protocol | Module |
|---|---|---|
| 0G | 0G Chain (EVM RPC), 0G Storage (CLI + KV), 0G Indexer | `agent/lib/jsonrpc.py`, `agent/lib/zero_storage.py`, `agent/lib/indexer_client.py` |
| Gensyn | AXL binary (`axl send`/`axl recv`), AXL HTTP API, legacy HTTP fallback | `agent/lib/axl_client.py` |
| KeeperHub | KeeperHub REST API (execute, poll, logs) | `agent/lib/keeperhub_client.py` |
| ENS | ENS Registry + Public Resolver via `cast` (namehash, setText, text) | `agent/lib/ens_client.py` |
| Uniswap | Uniswap Routing API (`/v2/quote`), Universal Router | `agent/lib/uniswap_client.py` |
| Kimi / Moonshot | `moonshot-v1-128k` via OpenAI-compatible API | `agent/lib/kimi_client.py` |
| Hermes | Hermes Agent skills (`agent/skills/weft-verify/`) | `setup-hermes.sh` |

## Links

- [Hackathon Strategy](docs/hackathon-strategy.md)
- [Hackathon Submission Pack](docs/hackathon-submission.md)
- [Judge-Friendly Architecture Diagram](docs/architecture-diagram.md)
- [Product Plan & Monetization](docs/product-plan.md)
- [Technical Architecture](docs/architecture.md)
- [MVP Spec](docs/mvp.md)
- [Agent Workflow](AGENTS.md)
- [Builder Feedback for Uniswap](FEEDBACK.md)

## Deployed contracts

**0G Galileo Testnet (Chain ID: 16602)**

| Contract | Address |
|---|---|
| WeftMilestone | `0xcc768d56b0053b1b2df5391dde989be3f859474c` |
| VerifierRegistry | `0x599e34de50379c584787e0b7ba616ac9b6723169` |

**RPC**: `https://evmrpc-testnet.0g.ai`

**Explorer**: `https://explorer-testnet.0g.ai`

## License

MIT
