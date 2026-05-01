# Weft — Hackathon Submission Pack

## One-line pitch
**Weft is a decentralized verifier swarm for milestone-based capital release.**

## Short description
Weft helps builders unlock milestone-based funding with an autonomous verifier network. Agents monitor milestone deadlines, gather deterministic evidence, corroborate verdicts across verifier nodes, persist artifacts to 0G, and submit final onchain verdicts through KeeperHub. ENS gives builders and verifier agents portable identity and discoverability.

## Best-fit tracks
Primary:
- **0G — Best Autonomous Agents, Swarms & iNFT Innovations**
- **Gensyn — Best Application of Agent eXchange Layer (AXL)**
- **KeeperHub — Best Use of KeeperHub**

Secondary:
- **ENS — Best ENS Integration for AI Agents**
- **0G — Best Agent Framework, Tooling & Core Extensions**

## What to submit
- Project name: **Weft**
- Repo: public GitHub repo with README + setup
- Demo video: under 3 minutes
- Live demo link: status API or hosted walkthrough surface
- Contract addresses
- Team member names + Telegram + X
- Short write-up mapping sponsor usage

## Sponsor mapping

### 0G
**Used for:**
- WeftMilestone deployment on 0G Chain
- milestone metadata lookup through 0G indexer/storage
- evidence, consensus artifacts, and bundle pointers via 0G Storage

**Judge takeaway:**
Weft is not just deployed on 0G; its storage and chain primitives are part of the verification lifecycle.

### Gensyn / AXL
**Used for:**
- signed peer-to-peer verifier broadcasts
- cross-node corroboration before vote submission
- visible peer consensus state via inbox aggregation

**Judge takeaway:**
AXL is the coordination layer between separate verifier nodes, not a cosmetic transport.

### KeeperHub
**Used for:**
- preferred execution path for `submitVerdict()`
- retry logic, gas optimization, and execution audit trail

**Judge takeaway:**
Weft solves a real agent problem: correct reasoning still needs reliable onchain execution.

### ENS
**Used for:**
- builder profile records
- verifier agent identity / discoverability
- portable human-readable reputation context

**Judge takeaway:**
ENS is functional identity and metadata for agents/builders, not just a vanity label.

## 3-minute demo script

### 0:00–0:20 — Problem
"Milestone finance still depends on manual trust: managers, screenshots, and ad hoc payout decisions. Weft replaces that with a decentralized verifier swarm."

### 0:20–0:50 — Milestone and status surface
- show milestone hash
- open `http://localhost:9010/`
- fetch `/milestone/<hash>?includeMetadata=1`
- point out the `demo` section in JSON

### 0:50–1:25 — 0G
- show metadata root / evidence root
- explain that milestone metadata and attestation artifacts resolve via 0G

### 1:25–2:00 — Gensyn / AXL
- explain that verifier nodes broadcast signed envelopes to peers
- show peer group / consensus signer state in the payload
- emphasize separate verifier nodes and corroboration threshold

### 2:00–2:25 — KeeperHub
- explain KeeperHub is the preferred path for `submitVerdict()`
- mention retry, audit trail, and more reliable execution than raw tx submission

### 2:25–2:45 — ENS
- show builder or verifier ENS names if configured
- explain portable identity and discoverability

### 2:45–3:00 — Close
"Weft gives milestone funding a verifiable execution path: evidence, consensus, identity, and reliable settlement."

## Live demo checklist
- [ ] milestone hash prepared in advance
- [ ] status API running locally or hosted
- [ ] `ZERO_G_INDEXER_RPC` configured
- [ ] `WEFT_BUILDER_ENS` / `WEFT_AGENT_ENS` configured if using ENS in demo
- [ ] sample peer inbox present if demonstrating corroboration
- [ ] KeeperHub env set if demonstrating execution path

## Repo checklist
- [x] README with setup + sponsor mapping
- [x] contract addresses in repo
- [x] FEEDBACK.md present
- [x] architecture doc present
- [ ] final video added
- [ ] final architecture image/screenshot added to submission materials
- [ ] team/contact block finalized

## Demo commands

### Start the status API
```bash
ETH_RPC_URL="http://127.0.0.1:8545" 
WEFT_CONTRACT_ADDRESS="0x..." 
ZERO_G_INDEXER_RPC="https://..." 
WEFT_BUILDER_ENS="builder.eth" 
WEFT_AGENT_ENS="verifier.eth" 
python3 agent/scripts/weft_status_api.py --port 9010
```

### Open demo endpoints
```bash
open http://localhost:9010/
curl http://localhost:9010/demo
curl "http://localhost:9010/milestone/0x...?includeMetadata=1"
```

## Final submission notes
- Prioritize **clarity over breadth**.
- Judges should understand Weft in under 20 seconds.
- Lead with the visible user problem and only then explain the infrastructure.
- If time is tight, optimize the main demo for **0G + Gensyn + KeeperHub** first.
