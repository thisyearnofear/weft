# Hackathon Submission Strategy — 0G APAC Hackathon

Maps Weft's existing work to the 0G APAC Hackathon tracks with specific gaps to close.

> **Deadline**: May 16, 2026, 23:59 UTC+8
> **Prize Pool**: $150,000 (Grand: $45k/$35k/$20k, Excellence: 10×$3,700, Community: 10×$1,300)
> **Submission**: GitHub repo + contract/explorer links + demo video (<3 min) + README + X post

---

## Brand Story — The Weaving Metaphor

**Weft** is the horizontal thread that interlaces with the vertical warp to create woven fabric. This isn't just a name — it's the product philosophy:

- **Warp threads** = technology infrastructure (0G Chain, optional 0G Storage KV/file publishing, peer consensus, KeeperHub execution)
- **Weft threads** = the liberal arts layer (Hermes Agent, Kimi narratives, Builder Journey chronicles, milestone cards, ENS identity)
- **The fabric** = a verified, meaningful, shareable project story

Raw data threads (onchain events, GitHub commits, peer verdicts) are woven by the **Hermes Agent** into meaningful fabric (narratives, achievement cards, ENS profiles).

**Technology provides the warp. Liberal arts provide the weft.**

This positions Weft uniquely: every other project is either pure infrastructure or pure application. Weft is **autonomous agent infrastructure that produces creative non-fiction** — real onchain events, real builder journeys, real stakes, told beautifully by an AI agent that knows your history and stores it in 0G's persistent memory layer.

---

## Target Tracks

| Priority | Track | Prize Pool | Fit |
|---|---|---|---|
| **Primary** | **Track 3 — Agentic Economy & Autonomous Applications** | $45k/1st, $35k/2nd, $20k/3rd + Excellence/Community | ✅ **Strongest fit** — Weft is an autonomous capital-release system for AI agents, exactly matching "financial rails for autonomous agents" |
| **Secondary** | **Track 4 — Web 4.0 Open Innovation (The Wildcard)** | $45k/1st, $35k/2nd, $20k/3rd + Excellence/Community | ✅ **Strong fit** — 0G Storage-backed evidence memory and innovative infrastructure |
| Honorary | **Track 1 — Agentic Infrastructure** | Same as above | ⚠️ Requires OpenClaw — Weft uses Hermes instead |

**Total addressable**: Up to $45k per track for 1st prize.

---

## Why Weft Wins on Judging Criteria

| Criterion | How Weft Delivers |
|---|---|
| **0G Technical Integration Depth & Innovation** | Uses 0G Chain for milestones plus optional 0G Storage KV pointers, uploaded evidence bundles, and 0G Indexer metadata lookup |
| **Implementation Completeness** | Deployed contracts on Galileo testnet, autonomous Python daemon, 7 Hermes skills, Next.js frontend, live AXL node, MCP server |
| **Product Value / Market Potential** | Replaces managers/lawyers/escrow for milestone-based funding — a real $10B+ market |
| **UX / Demo Quality** | 5+ demo surfaces: CLI daemon, Hermes Agent chat, web frontend, AskWeft widget, MCP tools |
| **Team Capability / Docs** | Comprehensive README, AGENTS.md, architecture docs, FEEDBACK.md, deployment guides |

---

## Per-Track Analysis

### Track 3 — Agentic Economy & Autonomous Applications (PRIMARY)

**Track description:** "Financial/service layer for AI agents — includes financial rails, AI commerce/social, and operational tools for autonomous agents."

**Why Weft fits:**
- **Autonomous capital-release gate** — Weft's core mechanism is: agent verifies milestone → contract allows release/refund. This is a financial primitive for AI agents.
- **Agents as economic actors** — Weft treats Hermes Agents as first-class participants that can earn, hold reputation, and participate in capital allocation
- **Multi-node-ready verifier path** — autonomous agents can coordinate via AXL before voting
- **Persistent evidence memory via 0G Storage** — KV pointers and uploaded evidence artifacts when configured

**What we have:**
- [x] Hermes Agent with 7 auto-loaded skills (chronicle, verify, narrate, demo, manim, status, ens)
- [x] `weft_daemon.py` autonomous verification loop (poll → collect evidence → peer consensus → onchain vote)
- [x] `keeperhub_client.py` for reliable onchain execution
- [x] `zero_storage.py` for 0G Storage KV pointers and file uploads
- [x] ENS identity for portable agent/builder reputation
- [x] Multi-node AXL peer consensus (offchain safety gate before onchain vote)

**Demo angle for judges:**
> "Weft is an autonomous verifier for milestone-based capital release. A builder creates a milestone, stakes capital, and works toward the objective. When the deadline passes, Weft polls 0G Chain, collects evidence from onchain usage and GitHub, can corroborate with peer nodes via AXL, can persist evidence artifacts to 0G Storage, and submits the onchain verdict. The agent tells the story of what happened in human-readable narrative — creative non-fiction from the blockchain."

---

### Track 4 — Web 4.0 Open Innovation (SECONDARY)

**Track description:** "Scaling for SocialFi, Gaming, and DePIN using 0G decentralized storage — the wildcard track for innovative infrastructure."

**Why Weft fits:**
- **0G Storage as evidence memory** — Weft uses 0G Storage for optional real-time KV pointers and uploaded evidence/consensus bundles
- **Innovative architecture** — deterministic agent verification with storage-backed evidence and optional multi-node corroboration
- **Web4 principle: agent-owned data** — Builders' milestone history lives on 0G, not on Weft's servers. Portable, verifiable, permanent

**What we have:**
- [x] `zero_storage.py` — best-effort KV read/write + file upload
- [x] KV keys: `weft:milestone:<hash>:state`, `weft:milestone:<hash>:consensus`, `weft:milestone:<hash>:bundle`
- [x] Chronicle and bundle pointers: `weft:milestone:<hash>:chronicle`, `weft:milestone:<hash>:bundle`
- [x] `bundle_manifest.json` + `bundle.tar.gz` for verifiable evidence bundles
- [x] `indexer_client.py` — unified indexer that tries 0G KV first, falls back to onchain events

**Demo angle:**
> "Weft uses 0G Storage as a persistent evidence layer for autonomous verification. Each milestone can publish verification state, peer consensus proofs, chronicle narratives, and evidence bundles as KV pointers and content-addressed artifacts. When you resolve `weft.thisyearnofear.eth`, you find a builder with a portable, verifiable track record."

---

## Demo Script (3-minute video)

### 0:00–0:30 — Problem & Solution (Track 3 pitch)
"Milestone funding still depends on manual trust: managers, screenshots, Telegram checklists. Weft replaces that with an autonomous agent that releases capital based on verifiable outcomes. **This is a financial primitive for the agentic economy.** "

### 0:30–1:00 — The Hermes Agent in Action
- Show the Hermes prompt: `"verify milestone 0x5169..."` 
- Agent responds with evidence collection, peer consensus, onchain verdict
- "The agent does what a manager would do — but autonomously, transparently, and with a permanent record on 0G."

### 1:00–1:30 — 0G Storage as Agent Memory
- Show the 0G Storage integration deep dive
- "0G Storage KV can hold the agent's real-time state pointers, and uploaded bundles can hold the verifiable evidence artifacts. The public demo degrades gracefully when storage credentials are absent."
- Show `curl` to status API showing milestone data from 0G

### 1:30–2:00 — Multi-Node Autonomy
- Show AXL peer status and explain the local 3-node consensus path: signed envelopes, threshold agreement
- "The verification path no longer depends on one human reviewer. Agents can coordinate through AXL before the onchain vote."

### 2:00–2:30 — The Creative Layer (What Makes Weft Unique)
- Show `chronicle.html` — Kimi-generated Builder Journey narrative
- Show `milestone_card.html` — fal.ai milestone swatch
- Show ENS profile with accumulated track record
- "Every verified milestone becomes a shareable story. Weft doesn't just verify — it tells the story of what happened."

### 2:30–3:00 — Close
"Weft gives the agentic economy a capital release mechanism that's autonomous, verifiable, and beautiful. **0G provides the memory. Hermes provides the mind. AXL provides the consensus. The builder keeps the story.** "

---

## Submission Checklist

### Required by 0G APAC
- [ ] GitHub repo link (public)
- [ ] 0G contract/explorer link (WeftMilestone: `0x9f66158c560ce5c8b40820fdcd2874ff8d852192`)
- [ ] Demo video (<3 minutes)
- [ ] Detailed README with setup + architecture
- [ ] Public X post with @0G_labs mention

### Weft-specific
- [ ] Contract addresses in README
- [ ] Architecture diagram showing 0G integration depth
- [ ] Demo video recorded and uploaded
- [ ] FEEDBACK.md present
- [ ] Team/contact block in repo

---

## 0G Component Mapping

| 0G Component | Weft Usage | Depth |
|---|---|---|
| **0G Chain** | WeftMilestone + VerifierRegistry deployed on Galileo | Onchain (smart contracts) |
| **0G Storage KV** | Optional agent memory: `weft:milestone:<hash>:state`, `weft:milestone:<hash>:consensus`, `weft:milestone:<hash>:bundle`, `weft:milestone:<hash>:chronicle` | Evidence pointers and cache |
| **0G Storage files** | Optional `attestation.json`, `consensus.json`, `bundle.tar.gz` uploads | Content-addressed evidence artifacts |
| **0G Indexer** | Milestone metadata lookup from 0G Storage | Integration |

> Weft does **not** use 0G Compute, 0G DA, or OpenClaw. It uses Hermes Agent instead of OpenClaw for the agentic layer, which is a more natural fit for a Hermes-native project.
