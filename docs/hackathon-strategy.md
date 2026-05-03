# Hackathon Submission Strategy

Maps Weft's existing work to each prize track with specific gaps to close.

## Brand Story — The Weaving Metaphor

**Weft** is the horizontal thread that interlaces with the vertical warp to create
woven fabric. This isn't just a name — it's the product philosophy:

- **Warp threads** = technology infrastructure (0G Chain, peer consensus, KeeperHub execution, 0G Storage proofs)
- **Weft threads** = the liberal arts layer (Kimi narratives, Builder Journey chronicles, milestone achievement cards, ENS identity)
- **The fabric** = a verified, meaningful, shareable project story

Raw data threads (onchain events, GitHub commits, peer verdicts) are woven by the
Hermes Agent into meaningful fabric (narratives, achievement cards, ENS profiles).
**Technology provides the warp. Liberal arts provide the weft.**

This positions Weft uniquely: every other hackathon project is either pure tech or
pure creative. Weft is **creative non-fiction infrastructure** — real onchain events,
real builder journeys, real stakes, told beautifully by an AI agent that knows your history.

## Target Prizes

| Sponsor | Track | Prize | Status |
|---|---|---|---|
| 0G | Best Agent Framework | $7,500 | ✅ Strong fit — Weft is a modular agent framework on 0G Chain + Storage |
| 0G | Best Autonomous Agents | $7,500 | ✅ Strong fit — multi-node verifier swarm with persistent 0G Storage memory |
| Gensyn | Best Application of AXL | $5,000 | ✅ Real AXL binary integration — encrypted P2P verdict exchange |
| KeeperHub | Best Use of KeeperHub | $5,000 | ✅ Deep integration — retry, gas opt, audit trail, fallback |
| ENS | Best ENS Integration for AI Agents | $2,500 | ✅ Fixed namehash bug, wired into daemon |
| ENS | Most Creative Use of ENS | $2,500 | ✅ Portable reputation via text records |
| fal.ai | Creative imagery layer | — | ✅ `fal_client.py` — AI-woven swatch + chronicle cover images (env: `FAL_KEY`) |
| Hermes/Kimi | Creative Hackathon — Kimi Track | $5,000 | ✅ Builder Journey chronicles + milestone cards via Kimi (weaving metaphor) |

**Total addressable: $40,000**

---

## Per-Track Analysis

### 0G — Best Agent Framework ($7,500)

**What we have:**
- Modular `agent/lib/` with 15+ composable modules (jsonrpc, abi, mvp_verifier, etc.)
- 0G Chain for milestones, 0G Storage for evidence bundles + KV pointers
- Deterministic verification pipeline with pluggable evidence collectors
- Hermes Agent skill (`agent/skills/weft-verify/`) for no-code verification
- `weft_daemon.py` as the autonomous runtime
- `bundle_manifest.json` for deterministic artifact integrity

**What judges want:** "Framework-level work… architectures, developer tooling, and infrastructure primitives that other builders will use."

**Gaps to close:**
- [x] Architecture diagram in README
- [ ] Highlight the skill auto-generation angle (Hermes skills from verification templates)
- [ ] Emphasize 0G Storage KV as persistent agent memory layer

**Demo angle:** Show a new milestone template being added → daemon auto-verifies → evidence published to 0G → skill available in Hermes.

---

### 0G — Best Autonomous Agents ($7,500)

**What we have:**
- Multi-node verifier swarm (3 independent daemon nodes)
- Peer corroboration via signed envelopes + inbox persistence
- Consensus-root derivation (deterministic `consensusRoot = keccak(consensus.json)`)
- 0G Storage for persistent evidence (KV for real-time state, file upload for bundles)
- Kimi narrative generation (agent explains its reasoning in prose)

**What judges want:** "Long-running goal-driven agents, emergent collaboration."

**Gaps to close:**
- [ ] Emphasize the "swarm coordination" narrative (planner=scheduler, verifier=evidence, reporter=Kimi)
- [ ] Show agents communicating via shared 0G Storage memory

**Demo angle:** 3 verifier nodes independently verify → peer-corroborate → consensus bundle published to 0G → Kimi generates human-readable report.

---

### Gensyn — Best Application of AXL ($5,000)

**What we have:**
- `axl_client.py` with broadcast/receive/tally/register
- Signed verdict envelopes (`verdict_envelope.py`)
- Peer inbox persistence (`peer_inbox.py`)
- `weft_peer_server.py` for receiving broadcasts
- Authorized-peers mode via `VerifierRegistry`

**What judges want:** "Must use AXL for inter-agent communication… demonstrate communication across separate AXL nodes."

**Gaps to close:**
- [x] Replace HTTP stub with real AXL binary routing (localhost → AXL node → peer)
- [ ] Demo showing 2-3 separate AXL nodes exchanging signed verdicts
- [ ] Document AXL integration depth in README

**Demo angle:** Start 3 AXL nodes → each verifier daemon routes through its local AXL → encrypted P2P verdict exchange → consensus reached without central coordinator.

---

### KeeperHub — Best Use of KeeperHub ($5,000)

**What we have:**
- `keeperhub_client.py` with full integration: execute_verdict, poll status, retry logic
- Gas optimization, audit trail, fallback to cast send
- Environment-based configuration (API key, URL override, timeout)
- Documented in AGENTS.md and FEEDBACK.md

**What judges want:** "Does it work? Would someone actually use it? Depth of integration."

**Gaps to close:**
- [x] FEEDBACK.md covers KeeperHub builder feedback (3 items)
- [ ] Ensure demo shows KeeperHub execution path clearly

**Demo angle:** Verdict ready → KeeperHub executes `submitVerdict()` with retry + gas optimization → tx confirmed → audit trail logged.

---

### ENS — Best ENS Integration for AI Agents ($2,500)

**What we have:**
- `ens_client.py` with full profile CRUD (builder profile, project records, milestone records, agent records)
- Namehash correctly uses keccak256 (EIP-137 compliant)
- Ownership pre-flight check (`verify_ownership`)
- Wired into `weft_daemon.py` (auto-updates after verified milestone)
- Text record schema: `weft.projects`, `weft.milestones.verified`, `weft.earned.total`, `weft.reputation.score`

**What judges want:** "ENS is the identity mechanism… resolving agent's address, storing metadata, gating access, enabling discovery."

**Gaps to close:**
- [ ] Demo showing ENS profile update after verification
- [ ] Show ENS as discovery mechanism (resolve builder.weft.eth → see track record)

---

### ENS — Most Creative Use of ENS ($2,500)

**What we have:**
- Per-milestone text records (`weft.milestone.<hash>.status`, `.evidence`, `.released`)
- Per-project records (`weft.project.<id>.role`, `.earnings`, `.milestones`)
- Agent subname records (`weft.agent.contributions`, `.earnings`, `.projects`)
- Portable reputation: ENS name carries funded-outcome history across platforms

**What judges want:** "Store verifiable credentials… use subnames as access tokens… surprise us!"

**Demo angle:** Builder's ENS name accumulates verified milestone history → any dApp can resolve it → portable reputation without a centralized platform.

---

### fal.ai — AI-woven imagery layer

**What it does:** Each verified milestone generates a unique AI image (a 'swatch') whose visual character is driven by verification metrics — callers, commits, peer signers. Chronicle covers are generated for multi-milestone builder journeys.

**What's implemented:**
- [x] `agent/lib/fal_client.py` — `generate_milestone_image()` + `generate_chronicle_cover()`
- [x] Wired into `weft_daemon.py` after successful verification (when `FAL_KEY` is set)
- [x] Swatch embedded in `milestone_card.html`; cover embedded in `chronicle.html`

**Demo angle:** Milestone verified → Kimi writes the narrative → fal.ai weaves the visual swatch → HTML card combines both into a shareable creative artifact.

---

### Hermes Creative Hackathon — Kimi Track ($5,000)

**What we have:**
- `kimi_client.py` — `generate_narrative()` for single attestations + `generate_chronicle()` for multi-chapter Builder Journey narratives
- `chronicle.py` — HTML milestone achievement cards (woven-fabric visual motif) and full chronicle pages
- `CHRONICLE_SYSTEM_PROMPT` instructs Kimi to use textile/weaving metaphors naturally (threads, fabric, tapestry, interlacing)
- `weft-chronicle` Hermes skill — "tell me my project's story" loads all attestations and generates the full tapestry
- Integrated into daemon pipeline: chronicle + milestone card generated after each verification, included in 0G bundle
- Graceful fallback when KIMI_API_KEY unset

**What judges want:** "Prove your use of Kimi models… creativity, usefulness, presentation."

**Why we're competitive now:**
- **Creative non-fiction from the blockchain** — no other project has real onchain data feeding creative narrative output
- Each milestone is a thread; peer consensus is the interlacing; the verified story is the fabric
- Shareable HTML milestone cards = visual artifacts judges can see in the demo video
- The weaving metaphor runs through the entire product, not bolted on

**Gaps to close:**
- [x] `generate_chronicle()` with `CHRONICLE_SYSTEM_PROMPT` (weaving metaphors)
- [x] `chronicle.py` with HTML milestone cards (woven-fabric motif)
- [x] `weft-chronicle` Hermes skill
- [x] Daemon integration (chronicle in verification pipeline + 0G bundle)
- [ ] Demo video showing chronicle generation + milestone card in real-time

---

## Submission Checklist

### All Tracks
- [ ] Project name and short description
- [ ] Contract deployment addresses (WeftMilestone on 0G testnet)
- [ ] Public GitHub repo with README + setup instructions
- [ ] Demo video (<3 min) + live demo link
- [ ] Protocol features / SDKs used
- [ ] Team member names + contact (Telegram & X)

### 0G Specific
- [ ] Working example agent (weft-verify skill)
- [ ] Architecture diagram showing 0G Storage/Compute integration

### fal.ai Specific
- [ ] Confirm `FAL_KEY` env var set on snel-bot for live demo

### KeeperHub Specific
- [ ] FEEDBACK.md with KeeperHub builder feedback (already done)

### Gensyn Specific
- [ ] Communication across separate AXL nodes demonstrated
- [ ] Clear documentation of AXL integration

### ENS Specific
- [ ] Functional demo (no hard-coded values)
- [ ] Video or live demo link

---

## Demo Script (scripts/demo_e2e.sh)

Single end-to-end demo covering all sponsors:

1. **Create milestone** on 0G Chain (WeftMilestone contract)
2. **Start 3 verifier daemons** with AXL peer routing
3. **Evidence collection** → deployment check + unique callers
4. **Kimi chronicle** — Builder Journey narrative with weaving metaphors
4b. **Milestone card** — shareable HTML achievement card (woven-fabric motif)
5. **Peer corroboration** via AXL (signed envelopes exchanged)
6. **Consensus bundle** published to 0G Storage
7. **KeeperHub** executes `submitVerdict()` onchain
8. **ENS profile** updated with milestone record
9. **fal.ai** generates AI-woven swatch image for the milestone card
10. **Status API** shows final milestone state

This single demo qualifies for all 7+ prize tracks simultaneously.
