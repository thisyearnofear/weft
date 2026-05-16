# Weft — 0G APAC Hackathon Submission Pack

## One-line pitch
**Weft is an autonomous Hermes Agent swarm that releases milestone-based capital using 0G Storage as persistent agent memory.**

## Short description
Weft helps internet-native teams release capital based on verifiable outcomes instead of manual trust. A Hermes Agent swarm monitors onchain milestones on 0G Chain, gathers deterministic evidence (deployment checks, unique caller counts, GitHub commits), corroborates verdicts across peer nodes via AXL encrypted P2P transport, persists every artifact to **0G Storage KV+Log** as the agent's permanent memory, and submits final onchain verdicts through KeeperHub. ENS gives builders and agents portable, human-readable identity.

**Track fit:** Primary → **Track 3 (Agentic Economy & Autonomous Applications)**: Weft provides autonomous financial rails for AI agents — capital release triggered by verifiable outcomes, coordinated by a multi-node Hermes Agent swarm, with all state persisted to 0G Storage.

## Links
- **GitHub**: https://github.com/weft/weft
- **WeftMilestone (0G Galileo)**: `0x9f66158c560ce5c8b40820fdcd2874ff8d852192` ([Explorer](https://explorer-testnet.0g.ai/address/0x9f66158c560ce5c8b40820fdcd2874ff8d852192))
- **VerifierRegistry (0G Galileo)**: `0x1356dd3f28461685ffd81d44f6ae9ae87937e34a`
- **Live demo**: https://weft.thisyearnofear.com
- **ENS identity**: `weft.thisyearnofear.eth`

## Best-fit tracks

**Primary: Track 3 — Agentic Economy & Autonomous Applications**
- Autonomous multi-node agent swarm for milestone verification
- Capital release as a financial primitive for AI agents
- Agents as first-class economic actors with portable reputation

**Secondary: Track 4 — Web 4.0 Open Innovation (The Wildcard)**
- Deepest 0G Storage integration on the platform: KV + Log as agent memory
- Innovative architecture: no central coordinator, no cloud dependency
- Portable, verifiable builder reputation stored on 0G

## 0G Integration Depth

| Component | What We Use | Why It Matters |
|---|---|---|
| **0G Chain** | WeftMilestone + VerifierRegistry deployed on Galileo testnet | Milestone escrow, verifier registration, 2-of-3 quorum voting |
| **0G Storage KV** | Real-time agent memory: `weft:milestone:<hash>:state`, `weft:milestone:<hash>:consensus`, `weft:milestone:<hash>:bundle` | KV holds the agent's working state — current verification status, peer consensus proofs, bundle pointers |
| **0G Storage Log** | Immutable history: `weft:milestone:<hash>:history`, `weft:milestone:<hash>:chronicle` | Log holds the append-only event history and Kimi-generated Builder Journey narratives |
| **0G Indexer** | Unified metadata lookup via `indexer_client.py` | Tries 0G KV first, falls back to onchain events |

**Judge takeaway:**
Weft uses 0G Storage exactly as the 0G team describes — **KV for real-time agent state, Log for conversation/history**. It's not bolted on; it's the memory architecture of the entire system.

## Hermes Agent Integration

Weft ships **7 auto-loaded Hermes skills** via `external_dirs`:

| Skill | Trigger | What It Does |
|---|---|---|
| `weft-verify` | "verify milestone 0x..." | Runs evidence collection, builds attestation JSON |
| `weft-chronicle` | "tell me my project's story" | Loads all attestations, calls Kimi, generates multi-chapter Builder Journey narrative |
| `weft-narrate` | "narrate milestone 0x..." | Single-milestone narrative via Kimi |
| `weft-demo` | "run the demo" | Story-first demo coordinator (Problem→Stakes→Solution→Proof→Meaning) |
| `weft-manim` | "animate the verification" | Generates Manim animation of verification flow as weaving metaphor |
| `weft-status` | "status of weft.thisyearnofear.eth" | Queries onchain milestone state + 0G Storage |
| `weft-ens` | "update ENS profile" | Writes verification records to builder's ENS |

**Setup:**
```bash
bash setup-hermes.sh        # install Hermes, wire skills, write SOUL.md
bash scripts/hermes_weft.sh # launch with Weft env vars
```

## Sponsor Stack

| Technology | Module | Purpose |
|---|---|---|
| **0G** | `zero_storage.py`, `indexer_client.py`, `weft_milestone_reader.py` | Chain + Storage (KV+Log) + Indexer |
| **Hermes Agent** | `agent/skills/*`, `setup-hermes.sh`, `SOUL.md` | Agent runtime, 7 skills, persistent identity |
| **AXL (Gensyn)** | `axl_client.py`, `peer_inbox.py`, `verdict_envelope.py` | Encrypted P2P verdict broadcast across nodes |
| **KeeperHub** | `keeperhub_client.py` | Reliable onchain execution with retry + audit trail |
| **ENS** | `ens_client.py` | Builder/agent identity and portable reputation |
| **Kimi** | `kimi_client.py` | AI narrative + chronicle generation |
| **fal.ai** | `fal_client.py` | AI-woven milestone swatch + chronicle cover images |

## What Makes Weft Different

1. **0G Storage as agent memory, not just file storage** — KV for real-time state, Log for immutable history, bundles for verifiable evidence
2. **Multi-node autonomy** — 3 verifier nodes coordinate via AXL encrypted P2P, reach offchain consensus before onchain vote
3. **Creative non-fiction from the blockchain** — Kimi-generated Builder Journey narratives, fal.ai milestone swatches, ENS reputation — every verified outcome becomes a shareable story
4. **No central coordinator** — no cloud, no API keys, no single point of failure. Just agents, 0G, and peer consensus

## 3-minute Demo Script

### 0:00–0:25 — Problem
"Milestone funding relies on manual trust: managers, screenshots, Telegram checklists. Weft replaces that with an autonomous Hermes Agent swarm that releases capital based on verifiable outcomes. This is a financial primitive for the agentic economy."

### 0:25–0:55 — The Hermes Agent in Action
- Open Hermes prompt: `"verify milestone 0x5169..."`
- Agent collects deployment evidence + unique caller count + GitHub commits
- Agent broadcasts to peer nodes via AXL for corroboration
- "The agent does what a manager would do — but autonomously, transparently, and onchain."

### 0:55–1:25 — 0G Storage as Agent Memory
- Show the 0G stack in action:
  - `weft:milestone:<hash>:state` — current verification state (KV)
  - `weft:milestone:<hash>:history` — every state change (Log)
  - `weft:milestone:<hash>:chronicle` — Kimi narrative (Log)
- "This is 0G Storage KV for real-time state and Log for history — exactly as the 0G architecture describes. The agent's entire memory lives on 0G."

### 1:25–1:55 — Multi-Node Consensus
- Show AXL peer status: `curl weft.thisyearnofear.com/api/status/axl`
- Show peer count, signed verdict envelopes, consensus threshold
- "Separate verifier nodes, encrypted P2P, no central coordinator — just agents agreeing on truth."

### 1:55–2:30 — The Creative Layer
- Show `chronicle.html` — Kimi-generated Builder Journey narrative
- Show `milestone_card.html` — fal.ai milestone achievement card
- Show ENS resolver with accumulated track record
- "Every verified milestone becomes a shareable story. Weft doesn't just verify — it tells the story of what happened."

### 2:30–3:00 — Close
"Weft gives the agentic economy a capital release mechanism that's autonomous, verifiable, and beautiful. **0G provides the memory. Hermes provides the mind. AXL provides the consensus. The builder keeps the story.** "

## Submission Checklist
- [x] Public GitHub repo
- [x] Deployed contracts on 0G Galileo testnet
- [x] Live demo at weft.thisyearnofear.com
- [ ] Demo video (<3 min) — recorded and uploaded
- [ ] X post with @0G_labs mention
- [ ] Team contact info
