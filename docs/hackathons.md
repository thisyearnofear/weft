# Hackathon Archive

This document consolidates all past hackathon submission materials for reference.

---

## 1. Agents Under Pressure — Recovery Track (May 2026)

### Submission

**Project:** Weft — Autonomous Milestone Verifier with Self-Healing Infrastructure

**The Vision**
Weft is an autonomous verifier agent for onchain builders. It gates capital release (escrowed on 0G Chain) based on deterministic evidence gathered from across the stack.

In a "normal" world, if a builder's RPC times out or an AI narrative service goes down, the agent crashes or reports a failure. **Weft is built for the "Agents Under Pressure" reality: it treats infrastructure failure as a routing problem, not a crash.**

**How it works (The AI OS Architecture)**
Weft operates like a distributed OS for financial verification:
- **The Kernel (`weft_daemon.py`):** Coordinates multiple worker agents that collect evidence, reach peer consensus, and synthesize narratives.
- **Autonomous Recovery Layers:**
    - **RPC Layer:** Automatically switches to fallback chains (0G Galileo → PublicNode) upon timeout.
    - **Consensus Layer:** Encrypted P2P transport via **AXL**. If a peer drops, the agent reroutes consensus through remaining nodes.
    - **AI Layer:** If Kimi (narrative AI) is unavailable, the agent serves from its local cache or falls back to a deterministic template to ensure the verdict lands.
    - **Execution Layer:** Uses **KeeperHub** with built-in exponential backoff and retry for onchain settlement.

**HydraDB — Operational Memory**
Weft uses **HydraDB** (CortexDB) as its "Operational Memory" layer. Every failure, timeout, and recovery event is captured as an experience.
- **Recall:** The agent uses HydraDB to recall historical failure patterns (e.g., "RPC frequency timeout") to improve its autonomous decision-making.
- **Insights:** The Recovery Dashboard queries HydraDB to provide human-readable insights into system stability.

**Demo: The Recovery Dashboard**
Visit [weft.thisyearnofear.com/recovery](https://weft.thisyearnofear.com/recovery) to see the agent under pressure:
1. **Inject Chaos:** Hit "Kill All" to simulate simultaneous failure of RPC, Peers, AI, and Execution.
2. **Run Demo:** Watch the live event timeline as the agent detects each failure and triggers its autonomous recovery path.
3. **Verdict:** Watch as the onchain verdict lands despite 4 simultaneous infrastructure failures.

**Links**
- **GitHub**: https://github.com/thisyearnofear/weft
- **Live Demo**: https://weft.thisyearnofear.com/recovery
- **Track**: Recovery (Agents that handle failure)

**Team**
- **Team Name**: Weft
- **Contact**: @thisyearnofear

> "Don't build a chatbot. Build an OS that can survive the chaos."

### Build Plan

**Why Recovery**
Weft already runs a multi-agent verification network with:
- RPC fallback chains (publicnode as backup)
- AXL P2P with legacy HTTP fallback
- KeeperHub execution with timeout/retry
- Peer rerouting when nodes drop
- File-based caching for idempotent reads

The hackathon work is **instrumenting, triggering, and visualizing** these recovery paths — not building new infrastructure.

**What We Built**

1. **Recovery Event Log**
Structured event stream from the daemon capturing every failure + recovery:
```python
{
  "timestamp": 1716556800,
  "event": "rpc_timeout",
  "context": {"url": "https://evmrpc-testnet.0g.ai", "method": "eth_call"},
  "action": "fallback_rpc",
  "target": "https://0g-testnet.publicnode.com",
  "outcome": "success",
  "latency_ms": 340
}
```

Events: `rpc_timeout`, `peer_offline`, `peer_reroute`, `keeperhub_503`, `keeperhub_retry`, `kimi_unavailable`, `kimi_cache_hit`, `consensus_degraded`, `consensus_recovered`, `verdict_submitted`

2. **Chaos Mode**
Endpoint that injects real failures into a running verification:

| Chaos Action | What It Does | Recovery Path |
|---|---|---|
| `kill_rpc` | Block primary RPC | Fallback to publicnode |
| `kill_peer` | Drop one AXL peer | Reroute through remaining peers |
| `kill_kimi` | Revoke Kimi API key | Serve from cache / degrade gracefully |
| `kill_keeperhub` | Simulate 503 | Retry with exponential backoff |
| `kill_all` | All of the above | Full recovery cascade |

3. **Recovery Dashboard**
Single frontend page showing:
- Live recovery timeline (event stream)
- **Operational Memory Insights**: AI-generated analysis of frequent failures powered by **HydraDB**
- "Trigger Chaos" button panel
- Milestone verification progress bar
- Final outcome: verdict lands onchain despite failures

**Architecture**
```
agent/
  lib/
    recovery.py              ← RecoveryLog class + event types
    chaos.py                 ← Chaos injection (toggles failure flags)
    hydradb_client.py        ← Operational Memory layer wrapper
  scripts/
    weft_status_api.py       ← +GET /recovery, +POST /chaos
    weft_daemon.py           ← emit recovery events at failure points

frontend/
  src/app/recovery/
    page.tsx                 ← Recovery dashboard + HydraDB insights
```

**Demo Script (3 minutes)**

1. **Setup** (20s) — Show the milestone on 0G Chain. Show 3 verifier nodes running. "This is real infrastructure — contracts deployed, peers connected."

2. **Start Verification** (20s) — Trigger verification. Timeline shows: evidence collected, narrative generated, peers corroborating. Everything green.

3. **Chaos** (60s) — Hit "Kill All." RPC goes down. Peer drops. Kimi key revoked. KeeperHub 503. Timeline goes red. Then: fallback RPC connects. Remaining peer reroutes. Cached narrative served. KeeperHub retries and succeeds. Timeline recovers to green.

4. **The Verdict** (40s) — Despite every failure, the onchain verdict lands. Show the transaction. Show the evidence root. "The agent recovered from 4 simultaneous infrastructure failures and still delivered a correct verdict."

5. **The Point** (40s) — "This isn't a chatbot that says 'sorry, try again.' This is infrastructure that routes around failure autonomously. Every recovery path exists because we've already been running this in production."

---

## 2. 0G APAC Hackathon — Track 3 / Track 4 (May 2026)

### Submission Pack

**One-line pitch**
Weft is an autonomous milestone verifier for onchain builders: 0G Chain escrow, deterministic evidence, optional 0G Storage publishing, AXL peer corroboration, and ENS reputation.

**Short description**
Weft helps internet-native teams release capital based on verifiable outcomes instead of manual trust. The verifier daemon monitors onchain milestones on 0G Chain, gathers deterministic evidence (deployment checks, unique caller counts, GitHub commits), can corroborate verdicts across peer nodes via AXL encrypted P2P transport, and can publish evidence artifacts and KV pointers to 0G Storage when configured. KeeperHub is implemented as the preferred verdict-submission path, with `cast send` fallback. ENS gives builders and agents portable, human-readable identity.

**Track fit:** Primary → **Track 3 (Agentic Economy & Autonomous Applications)**: Weft provides autonomous financial rails for builders and agents — capital release gated by verifiable outcomes, with optional multi-node corroboration and persistent evidence artifacts.

**Links**
- **GitHub**: https://github.com/thisyearnofear/weft
- **WeftMilestone (0G Galileo)**: `0x9f66158c560ce5c8b40820fdcd2874ff8d852192`
- **VerifierRegistry (0G Galileo)**: `0x1356dd3f28461685ffd81d44f6ae9ae87937e34a`
- **Live demo**: https://weft.thisyearnofear.com
- **ENS identity**: `weft.thisyearnofear.eth`

**0G Integration Depth**

| Component | What We Use | Why It Matters |
|---|---|---|
| **0G Chain** | WeftMilestone + VerifierRegistry deployed on Galileo testnet | Milestone escrow, verifier registration, 2-of-3 quorum voting |
| **0G Storage KV** | Optional agent memory: `weft:milestone:<hash>:state`, `weft:milestone:<hash>:consensus`, `weft:milestone:<hash>:bundle`, `weft:milestone:<hash>:chronicle` | KV holds current verification status, peer consensus proofs, bundle pointers, and cached chronicle JSON when configured |
| **0G Storage files** | Optional `attestation.json`, `consensus.json`, and `bundle.tar.gz` uploads | Content-addressed evidence artifacts make the onchain `evidenceRoot` resolvable outside the app |
| **0G Indexer** | Unified metadata lookup via `indexer_client.py` | Tries 0G KV first, falls back to onchain events |

**Hermes Agent Integration**

Weft ships **9 auto-loaded Hermes skills** via `external_dirs`:

| Skill | Trigger | What It Does |
|---|---|---|
| `weft-verify` | "verify milestone 0x..." | Runs evidence collection, builds attestation JSON |
| `weft-chronicle` | "tell me my project's story" | Loads all attestations, calls LLM, generates multi-chapter Builder Journey narrative |
| `weft-narrate` | "narrate milestone 0x..." | Single-milestone narrative via Nemotron/Kimi/Nous |
| `weft-demo` | "run the demo" | Story-first demo coordinator (Problem→Stakes→Solution→Proof→Meaning) |
| `weft-manim` | "animate the verification" | Generates Manim animation of verification flow as weaving metaphor |
| `weft-status` | "status of weft.thisyearnofear.eth" | Queries onchain milestone state + 0G Storage |
| `weft-ens` | "update ENS profile" | Writes verification records to builder's ENS |
| `weft-treasury` | "show me the agent's books" | Reads Stripe Skills charge history + balance, returns P&L (earned vs spent) |
| `weft-workflow` | "verify and narrate" | Autonomous multi-step verification with reasoning gates |

**What Makes Weft Different**

1. **0G Storage as agent memory, not just file storage** — KV for real-time state, Log for immutable history, bundles for verifiable evidence
2. **Multi-node-ready autonomy** — verifier nodes can coordinate via AXL encrypted P2P and reach offchain consensus before onchain vote; the public demo exposes one live AXL process, while the 3-node flow is reproducible locally
3. **Creative non-fiction from the blockchain** — Kimi-generated Builder Journey narratives, fal.ai milestone swatches, ENS reputation — every verified outcome becomes a shareable story
4. **Coordinator-light architecture** — deterministic agents, 0G, and peer consensus paths reduce manual review; optional APIs such as Kimi, fal.ai, KeeperHub, and 0G Storage credentials enhance the managed demo

### Strategy

**Brand Story — The Weaving Metaphor**

**Weft** is the horizontal thread that interlaces with the vertical warp to create woven fabric. This isn't just a name — it's the product philosophy:

- **Warp threads** = technology infrastructure (0G Chain, optional 0G Storage KV/file publishing, peer consensus, KeeperHub execution)
- **Weft threads** = the liberal arts layer (Hermes Agent, Kimi narratives, Builder Journey chronicles, milestone cards, ENS identity)
- **The fabric** = a verified, meaningful, shareable project story

Raw data threads (onchain events, GitHub commits, peer verdicts) are woven by the **Hermes Agent** into meaningful fabric (narratives, achievement cards, ENS profiles).

**Technology provides the warp. Liberal arts provide the weft.**

This positions Weft uniquely: every other project is either pure infrastructure or pure application. Weft is **autonomous agent infrastructure that produces creative non-fiction** — real onchain events, real builder journeys, real stakes, told beautifully by an AI agent that knows your history and stores it in 0G's persistent memory layer.

**Why Weft Wins on Judging Criteria**

| Criterion | How Weft Delivers |
|---|---|
| **0G Technical Integration Depth & Innovation** | Uses 0G Chain for milestones plus optional 0G Storage KV pointers, uploaded evidence bundles, and 0G Indexer metadata lookup |
| **Implementation Completeness** | Deployed contracts on Galileo testnet, autonomous Python daemon, 7 Hermes skills, Next.js frontend, live AXL node, MCP server |
| **Product Value / Market Potential** | Replaces managers/lawyers/escrow for milestone-based funding — a real $10B+ market |
| **UX / Demo Quality** | 5+ demo surfaces: CLI daemon, Hermes Agent chat, web frontend, AskWeft widget, MCP tools |
| **Team Capability / Docs** | Comprehensive README, AGENTS.md, architecture docs, FEEDBACK.md, deployment guides |

### Video Script (3 minutes)

**0:00–0:25 — Problem**
"Milestone funding relies on manual trust: managers, screenshots, Telegram checklists. Weft replaces that with an autonomous verifier that gates capital release based on deterministic evidence. This is a financial primitive for the agentic economy."

**0:25–0:55 — The Hermes Agent in Action**
- Open Hermes prompt: `"verify milestone 0x5169..."`
- Agent collects deployment evidence + unique caller count + GitHub commits
- Agent broadcasts to peer nodes via AXL for corroboration
- "The agent does what a manager would do — but autonomously, transparently, and onchain."

**0:55–1:25 — 0G Storage as Agent Memory**
- Show the 0G stack in action:
  - `weft:milestone:<hash>:state` — current verification state (KV)
  - `weft:milestone:<hash>:history` — every state change (Log)
  - `weft:milestone:<hash>:chronicle` — Kimi narrative (Log)
- "This is 0G Storage KV for real-time state and Log for history — exactly as the 0G architecture describes. The agent's entire memory lives on 0G."

**1:25–1:55 — Multi-Node Consensus**
- Show AXL peer status: `curl weft.thisyearnofear.com/api/status/axl`
- Show peer count, signed verdict envelopes, consensus threshold
- "Separate verifier nodes can use encrypted P2P corroboration before the onchain vote. The public demo shows the status surface; the local demo can run the full multi-node path."

**1:55–2:30 — The Creative Layer**
- Show `chronicle.html` — Kimi-generated Builder Journey narrative
- Show `milestone_card.html` — fal.ai milestone achievement card
- Show ENS resolver with accumulated track record
- "Every verified milestone becomes a shareable story. Weft doesn't just verify — it tells the story of what happened."

**2:30–3:00 — Close**
"Weft gives the agentic economy a capital release mechanism that's autonomous, verifiable, and beautiful.

0G provides the memory. Hermes provides the mind. AXL provides the consensus. KeeperHub provides the execution. ENS provides the identity.

The builder keeps the story — and a portable trust record.

**Weft: Autonomous capital release for the agentic economy.** "

---

## 3. TestSprite S3 — CLI Launch & Loop Engineering (Jul 2026)

**One-line pitch:** Weft is a verification business. We used a verification loop (TestSprite CLI) to build its public audit surface — the Verifier's Ledger — so the verifier itself is verified.

**What we built:**
- `/explorer` — public registry of every milestone Weft verified
- `/operations` — agent operations dashboard (verification log + financial ledger + consensus participation)
- `/builder/[ens]` — builder reputation profiles from ENS text records
- `/sponsor` — sponsor dashboard with capital flow
- `/activity` — chronological timeline of every agent action
- `/verifiers` — verifier network with consensus agreement rates
- `/api/docs` — interactive API reference with 12 documented endpoints
- `/recovery` — chaos engineering demo with fault injection

**The loop:** 28 TestSprite tests across 3 project types (14 frontend, 8 backend, 12 MCP-generated). 25 iterations logged in [LOOP.md](../LOOP.md), backed by commits + TestSprite run history. The loop caught a real bug (iter 19): wei-to-ETH conversion error in the explorer API.

**Links:**
- **Live site**: https://weft.thisyearnofear.com
- **Repo**: https://github.com/thisyearnofear/weft
- **Build log**: [LOOP.md](../LOOP.md)

---

## 4. Hermes Agent Accelerated Business Hackathon — NVIDIA × Stripe × NousResearch (Jun 2026)

**One-line pitch:** An agent-run company that earns, spends, and runs real operations.

Weft is an autonomous verification business. It locks capital in smart contracts behind builder deliverables, verifies the work using a swarm of AI-powered agent nodes, and releases payment when consensus is reached. The agent earns 3% of every milestone it verifies — then uses that revenue to pay for its own infrastructure via Stripe Skills, reason about evidence using NVIDIA Nemotron 3 Ultra, and run as a self-sustaining company with open books visible on the frontend.

| Field | Value |
|---|---|
| **Live site** | https://weft.thisyearnofear.com |
| **Source** | https://github.com/thisyearnofear/weft |
| **Chain** | 0G Galileo Testnet (chain ID 16602) |
| **WeftMilestone contract** | [`0x9f66158c560ce5c8b40820fdcd2874ff8d852192`](https://explorer-testnet.0g.ai/address/0x9f66158c560ce5c8b40820fdcd2874ff8d852192) |
| **Demo milestone** | `0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f` |
| **ENS identity** | `weft.thisyearnofear.eth` |
| **Treasury API** | `GET /api/treasury` — live P&L |

**The Business: Earn → Spend → Run**

- **Earn**: 3% of every milestone verified, swept into Stripe balance
- **Spend**: Pays for Kimi (narratives), fal.ai (images), KeeperHub (execution) via Stripe Skills
- **Run**: Self-healing infrastructure (RPC fallback, AXL rerouting, AI fallback, KeeperHub retry)

**Sponsor integrations:**
- **NVIDIA Nemotron 3 Ultra** — reasoning engine for verdict justifications and narratives (`LLM_BACKEND=nemotron`)
- **Stripe Skills** — autonomous earn→spend loop (`stripe_skills_client.py`)
- **NousResearch** — code-ready alternative LLM via pluggable backend (`LLM_BACKEND=nous`)

**Demo walkthrough:** Landing page → demo milestone chip → treasury widget (live Stripe P&L) → Builder Journey narrative → /recovery (chaos engineering) → `curl /api/treasury`

---

## 5. Zama Developer Program Mainnet Season 3 — Builder Track (Jul 2026)

**One-line pitch:** Sealed-ballot consensus between autonomous AI agents — a primitive that only exists because of Zama FHE.

Two FHEVM contracts on Sepolia:
- **v1 (FHE.add):** Boolean ballots, encrypted quorum check, no vote ever decrypted
- **v2 (FHE.mul):** Ballot × confidence, multiplied on ciphertext, weighted consensus

See [SUBMISSION.md](../SUBMISSION.md) for the full submission and [docs/submissions/zama-s3-x-thread-and-video.md](submissions/zama-s3-x-thread-and-video.md) for the X thread + video script.

**Links:**
- **Live site**: https://weft.thisyearnofear.com
- **Repo**: https://github.com/thisyearnofear/weft
- **v1 demo**: [weft.thisyearnofear.com/project/0xa22c…?confidential=1](https://weft.thisyearnofear.com/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1)
- **v2 demo**: [weft.thisyearnofear.com/project/0xbd5c…?weighted=1](https://weft.thisyearnofear.com/project/0xbd5c85db97cd5a8f30779da9311651e549f702b6ce72ebd03dcb816d3b071722?weighted=1)

---

*Archived: May 2026 (entries 1-2, 4) · Jul 2026 (entries 3, 5)*
