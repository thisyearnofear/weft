# Weft — Submission for The Hermes Agent Accelerated Business Hackathon

**NVIDIA × Stripe × NousResearch**

**An agent-run company that earns, spends, and runs real operations.**

Weft is an autonomous verification business. It locks capital in smart contracts behind
builder deliverables, verifies the work using a swarm of AI-powered agent nodes, and
releases payment when consensus is reached. The agent earns 3% of every milestone it
verifies — then uses that revenue to pay for its own infrastructure via Stripe Skills,
reason about evidence using NVIDIA Nemotron 3 Ultra, and run as a self-sustaining
company with open books visible on the frontend.

| Field | Value |
|---|---|
| **Live site** | https://weft.thisyearnofear.com |
| **Source** | https://github.com/thisyearnofear/weft |
| **Chain** | 0G Galileo Testnet (chain ID 16602) |
| **WeftMilestone contract** | [`0x9f66158c560ce5c8b40820fdcd2874ff8d852192`](https://explorer-testnet.0g.ai/address/0x9f66158c560ce5c8b40820fdcd2874ff8d852192) |
| **Demo milestone** | `0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f` |
| **ENS identity** | `weft.thisyearnofear.eth` |
| **Treasury API** | `GET /api/treasury` — live P&L |

---

## The Business: Earn → Spend → Run

Weft is not a tool. It is a company that runs itself.

### How it earns

When a sponsor locks ETH behind a builder's milestone, Weft's verifier agents swing into action:

1. **Collect evidence** — onchain deployment checks, usage signals, GitHub commits
2. **Reason about it** — NVIDIA Nemotron 3 Ultra generates verdict justifications and narrative summaries
3. **Reach consensus** — 2-of-3 verifier nodes agree over encrypted P2P channels (AXL)
4. **Submit verdict** — onchain vote via KeeperHub reliable execution
5. **Capital releases** — smart contract auto-releases ETH to the builder
6. **Agent earns 3%** — swept into its Stripe operating balance

### How it spends

The agent uses Stripe Skills to pay for the services it consumes:

| Service | Cost | What it pays for |
|---|---|---|
| Kimi / Moonshot | $0.50 | Narrative generation for milestone chronicles |
| fal.ai | $0.50 | AI-woven tapestry swatches for chronicle cards |
| KeeperHub | $0.50 | Reliable onchain verdict submission with retry + gas optimization |

Every charge is real, logged, and visible in the [treasury widget](https://weft.thisyearnofear.com/api/treasury).

### How it runs

The agent operates autonomously with a self-healing infrastructure stack:

- **RPC layer**: automatic fallback when primary node times out
- **Consensus layer**: encrypted P2P via AXL; reroutes if peers drop
- **AI layer**: Nemotron 3 Ultra for reasoning; Kimi fallback for narratives
- **Execution layer**: KeeperHub with exponential backoff and retry
- **Recovery dashboard**: [/recovery](https://weft.thisyearnofear.com/recovery) — inject failures into all 4 layers and watch the agent recover in real time

---

## Sponsor Integrations

### NVIDIA Nemotron 3 Ultra

The agent's reasoning engine. Nemotron 3 Ultra (550B/55B-active MoE) generates:

- **Verdict justifications** — why the agent verified or rejected a milestone
- **Builder Journey narratives** — multi-chapter story weaving onchain evidence into a human-readable chronicle
- **Chronicle cards** — milestone achievement summaries with AI-generated woven-fabric swatch imagery

**Implementation**: `agent/lib/llm_backend.py` — pluggable backend selector routing to `nvidia/nemotron-3-ultra-550b-a55b` via `https://integrate.api.nvidia.com/v1`. Includes NemoClaw safe-execution guard mode (`NEMOCLAW_GUARD=1`) that wraps financial reasoning in a safety boundary.

```
LLM_BACKEND=nemotron
NVIDIA_API_KEY=nvapi-...
model: nvidia/nemotron-3-ultra-550b-a55b
```

### Stripe Skills

The agent's autonomous spend layer. The earn→spend loop:

1. **Earn**: `fund_wallet_from_revenue()` — sweeps 3% of released capital into Stripe balance
2. **Spend**: `pay_for_service()` — pays for Kimi, fal.ai, KeeperHub before each API call
3. **Provision**: `provision_saas()` — can spin up its own infrastructure
4. **Report**: `get_profit_loss()` — live P&L visible on the frontend

**Implementation**: `agent/lib/stripe_skills_client.py` — stdlib-only Stripe API client. Form-encoded requests, test card tokens (`tok_visa`), metadata-tagged charges for service attribution. Treasury widget polls `/api/treasury` for live P&L.

**Live treasury data** (verified at submission time):
```
activated: true
earned: $1.00 (revenue sweep from milestone verification)
spent: $1.50 (kimi $0.50 + fal $0.50 + keeperhub $0.50)
charges: 4
balance: {available: $0.00, pending: $1.00}
```

### NousResearch

Code-ready via the same pluggable `llm_backend.py`. The agent can route to NousResearch Hermes-3-Llama-3.1-70B for cost-sensitive routine narratives, reserving Nemotron 3 Ultra for speed-critical reasoning paths. Set `LLM_BACKEND=nous` with `NOUS_API_KEY` to activate.

---

## What's verified onchain

The demo milestone `0x516975...` is **verified, finalized, and released** on 0G Galileo Testnet:

- **2 of 3 verifier quorum** reached — two independently registered verifiers voted `didComplete=true`
- **0.01 ETH** capital released from escrow
- **Evidence root** recorded onchain at `0x01e1b3...`
- Full verification flow: submitVerdict → MilestoneFinalized → release → CapitalReleased

---

## Demo walkthrough

1. Go to **[weft.thisyearnofear.com](https://weft.thisyearnofear.com)**
2. **Read the hero** — clear pitch: "Escrow that releases itself" + how it works diagram
3. **Click the demo milestone chip** (`0x516975...b1c16f`) — see live onchain verification data
4. **Scroll to "Agent's Books"** — the treasury widget showing live Stripe P&L (earned vs spent)
5. **Scroll to "The Story"** — Nemotron-powered Builder Journey narrative
6. **Visit [/recovery](https://weft.thisyearnofear.com/recovery)** — inject failures into all 4 infrastructure layers and watch the agent recover
7. **Check the API**: `curl https://weft.thisyearnofear.com/api/treasury` — live Stripe data

---

## Architecture

```
Sponsor locks ETH ──→ WeftMilestone.sol ──→ Builder ships work
                         │
                    deadline passes
                         │
               ┌─────────▼─────────┐
               │  Verifier swarm    │
               │  (Python daemon)   │
               │                    │
               │ 1. Read milestone  │
               │ 2. Download meta   │ ← 0G Storage
               │ 3. Check deploy    │ ← onchain
               │ 4. Count callers   │ ← onchain
               │ 5. Build attest.   │
               │ 6. Peer consensus  │ ← AXL P2P
               │ 7. Submit verdict  │ ← KeeperHub
               │ 8. Earn 3%         │ ← Stripe Skills
               │ 9. Pay for services│ ← Stripe Skills
               │ 10. Generate story │ ← Nemotron 3 Ultra
               └─────────┬─────────┘
                         │
                   release() called
                         │
               ┌─────────▼─────────┐
               │  Capital released  │
               │  ENS reputation    │
               │  Agent P&L updated │ ← Stripe treasury
               └───────────────────┘
```

## Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity (Foundry) — WeftMilestone.sol, VerifierRegistry.sol |
| Agent reasoning | **NVIDIA Nemotron 3 Ultra** (550B/55B MoE) |
| Autonomous spend | **Stripe Skills** (charges, balance, P&L) |
| Alternative LLM | **NousResearch Hermes-3** (code-ready via pluggable backend) |
| Offchain verification | Python daemon — `weft_daemon.py` |
| Peer consensus | AXL encrypted P2P transport |
| Execution | KeeperHub + cast send fallback |
| Metadata storage | 0G Storage (content-addressed) |
| Frontend | Next.js 16 + RainbowKit + wagmi |
| Identity | ENS text records |

## Project structure

```
weft/
├── contracts/          # Solidity (Foundry project)
│   └── src/
│       ├── WeftMilestone.sol      # Core escrow + verification contract
│       └── VerifierRegistry.sol   # Authorized verifier node registry
├── agent/              # Python verifier daemon
│   ├── lib/            # Shared modules
│   │   ├── llm_backend.py          # Pluggable LLM: Nemotron / Kimi / Nous
│   │   ├── stripe_skills_client.py # Autonomous earn→spend loop
│   │   ├── jsonrpc.py              # RPC client with cache bypass
│   │   ├── weft_milestone_reader.py
│   │   ├── kimi_client.py          # Narrative generation
│   │   ├── fal_client.py           # AI-woven swatch images
│   │   ├── keeperhub_client.py     # Reliable onchain execution
│   │   └── axl_client.py           # Encrypted P2P transport
│   └── scripts/
│       ├── weft_daemon.py          # Verifier loop
│       └── weft_status_api.py      # Status + treasury API
├── frontend/           # Next.js 16 app
│   └── src/
│       ├── app/        # Pages (landing, builder, sponsor, recovery, story)
│       └── components/ # UI (TreasuryWidget, ConsensusVisual, HowItWorks, etc.)
└── docs/               # Architecture, product plan
```
