# Weft — 3-Minute Demo Video Script

## 0G APAC Hackathon · Track 3 (Agentic Economy & Autonomous Applications)

---

### 🎬 0:00–0:25 — The Problem

**Visual:** Split screen — left side shows Telegram DMs, Notion checklists, screenshots. Right side shows a milestone hash and a loading spinner that resolves to "VERIFIED."

**Narration:**
"Every day, builders ship working code. And every day, they wait for capital that's stuck behind someone's inbox. Telegram checklists. Notion screenshots. Ad hoc payout decisions.

Weft replaces that with an autonomous verifier that gates capital release based on verifiable outcomes.

**This is a financial primitive for the agentic economy.** "

---

### 🎬 0:25–1:00 — The Hermes Agent in Action

**Visual:** Terminal recording of `bash scripts/hermes_weft.sh` followed by the prompt `"verify milestone 0x5169..."`. Show the agent responding with evidence collection, peer consensus, and onchain verdict. Use `--staged --hermes` mode so Kimi's live weaving commentary appears between steps.

**Narration:**
"A builder defines a milestone and locks capital. When the deadline passes, Weft's verifier takes over.

The agent polls 0G Chain, collects deployment evidence, counts unique callers, and checks GitHub commits. In the full local demo, peer nodes corroborate over AXL encrypted P2P transport before the verdict is submitted onchain. KeeperHub is the preferred execution path when configured, with a raw transaction fallback.

The contract release path is now gated by evidence and verifier quorum. No manager reviewed this. No screenshots were exchanged."

---

### 🎬 1:00–1:30 — 0G Storage as Agent Memory

**Visual:** Show the 0G Storage architecture. A diagram animates showing KV pointers being written (`weft:milestone:<hash>:state`, `weft:milestone:<hash>:consensus`, `weft:milestone:<hash>:bundle`) and evidence artifacts being uploaded. Then show a `curl` to the live status API returning milestone and integration status.

**Narration:**
"Weft uses 0G Storage as the agent's optional evidence memory layer.

KV can hold real-time state pointers: what milestone is being verified, what peer nodes have agreed, where the evidence bundles live. Content-addressed bundles hold the full attestation and consensus artifacts.

The demo degrades gracefully if storage credentials are absent, but the code path is ready for 0G-backed evidence memory."

---

### 🎬 1:30–2:00 — Multi-Node Autonomy

**Visual:** A network diagram showing 3 independent AXL nodes. Lines pulse between them showing signed envelope exchange. A consensus counter ticks from 0/3 to 3/3. Show the live AXL node at `weft.thisyearnofear.com/api/status/axl` with peer count and verdict envelope count.

**Narration:**
"The verification logic does not depend on one human reviewer.

Each verifier node runs its own AXL instance — encrypted P2P transport, signed verdict envelopes, authorized peer verification. Nodes agree on the outcome offchain before any onchain transaction is submitted.

The public demo exposes one live AXL process through the status API; the local demo can run the full multi-node path."

---

### 🎬 2:00–2:30 — The Creative Layer

**Visual:** Fast montage — `chronicle.html` opening in a browser with Kimi-generated Builder Journey narrative, `milestone_card.html` with fal.ai milestone swatch, ENS app showing `weft.thisyearnofear.eth` with 6 live text records.

**Narration:**
"A transaction receipt isn't a story. Weft doesn't just verify — it tells the story of what happened.

Kimi generates a multi-chapter Builder Journey chronicle from the raw evidence. fal.ai weaves an AI-generated milestone swatch. The builder's ENS profile accumulates verified milestone records — portable reputation that follows them across platforms.

**Technology provides the warp. Liberal arts provide the weft.** "

---

### 🎬 2:30–3:00 — The Close

**Visual:** Fade to the Weft logo with tagline. Overlay URLs: weft.thisyearnofear.com, GitHub repo, ENS.

**Narration:**
"Weft gives the agentic economy a capital release mechanism that's autonomous, verifiable, and beautiful.

0G provides the memory. Hermes provides the mind. AXL provides the consensus. KeeperHub provides the execution. ENS provides the identity.

The builder keeps the story — and a portable trust record.

**Weft: Autonomous capital release for the agentic economy.** "

---

## Production Notes

| Element | Detail |
|---|---|
| **Total length** | 3 minutes (strict — judges will stop watching) |
| **Tone** | Confident, warm, technical but accessible |
| **Screen capture** | Use `--staged --hermes` mode for the terminal demo; Kimi's live commentary makes it engaging |
| **Music** | Ambient/electronic — nothing distracting |
| **Captions** | Required — many judges watch without sound |
| **Call to action** | GitHub repo link + live demo URL at the end |

## Recording Checklist

- [ ] Prepare terminal: large font, dark theme, no personal info visible
- [ ] Pre-cache all API calls so there's no loading delay
- [ ] Record in 1080p 60fps
- [ ] Test audio levels (narration should be clear over music)
- [ ] Upload to YouTube (unlisted) for the submission
- [ ] Add captions before uploading
