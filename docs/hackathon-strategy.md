# Hackathon Submission Strategy

Maps Weft's existing work to each prize track with specific gaps to close.

## Target Prizes

| Sponsor | Track | Prize | Status |
|---|---|---|---|
| 0G | Best Agent Framework | $7,500 | ✅ Strong fit — Weft is a modular agent framework on 0G Chain + Storage |
| 0G | Best Autonomous Agents | $7,500 | ✅ Strong fit — multi-node verifier swarm with persistent 0G Storage memory |
| Gensyn | Best Application of AXL | $5,000 | ✅ Real AXL binary integration — encrypted P2P verdict exchange |
| KeeperHub | Best Use of KeeperHub | $5,000 | ✅ Deep integration — retry, gas opt, audit trail, fallback |
| ENS | Best ENS Integration for AI Agents | $2,500 | ✅ Fixed namehash bug, wired into daemon |
| ENS | Most Creative Use of ENS | $2,500 | ✅ Portable reputation via text records |
| Uniswap | Best Uniswap API Integration | $5,000 | ✅ `uniswap_client.py` — platform fee → stablecoin treasury swap |
| Hermes/Kimi | Creative Hackathon — Kimi Track | $5,000 | ✅ Kimi narrative generation in verification pipeline |

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

### Uniswap — Best Uniswap API Integration ($5,000)

**What we have:**
- Revenue model defined in `product-plan.md` (2-3% platform fee on released capital)
- Treasury address concept

**What judges want:** "Integrate the Uniswap API to give your agent the ability to swap and settle value onchain."

**Gaps to close:**
- [x] Create `agent/lib/uniswap_client.py` — swap released ETH to stablecoin for treasury
- [x] Add Uniswap feedback to FEEDBACK.md
- [ ] Demo showing fee collection → Uniswap swap → stablecoin in treasury

**Demo angle:** Milestone verified → capital released → platform fee collected → agent swaps ETH to USDC via Uniswap API → treasury receives stablecoin.

---

### Hermes Creative Hackathon — Kimi Track ($5,000)

**What we have:**
- `kimi_client.py` — attestation-to-narrative conversion via moonshot-v1-128k
- Integrated into daemon pipeline (called after evidence collection, before vote)
- Narrative persisted alongside attestation JSON and published to 0G Storage
- Graceful fallback when KIMI_API_KEY unset

**What judges want:** "Prove your use of Kimi models… creativity, usefulness, presentation."

**Gaps to close:**
- [ ] Demo video showing Kimi narrative generation in real-time
- [ ] Highlight that Kimi is a first-class pipeline participant, not a post-hoc summarizer

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

### Uniswap Specific
- [ ] FEEDBACK.md with Uniswap API builder experience

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
4. **Kimi narrative** generated from attestation
5. **Peer corroboration** via AXL (signed envelopes exchanged)
6. **Consensus bundle** published to 0G Storage
7. **KeeperHub** executes `submitVerdict()` onchain
8. **ENS profile** updated with milestone record
9. **Uniswap swap** routes platform fee to stablecoin treasury
10. **Status API** shows final milestone state

This single demo qualifies for all 7+ prize tracks simultaneously.
