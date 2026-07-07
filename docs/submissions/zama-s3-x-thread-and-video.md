# Weft — X Thread + Video Script

## X Thread (post as reply chain)

---

1/ Weft is an autonomous AI agent that verifies whether builders shipped what they promised — and mints portable reputation to their ENS name when they do.

No sponsor required. No manual review. The agent watches, collects evidence, reaches consensus, and releases capital onchain.

Live: https://weft.thisyearnofear.com

---

2/ The problem: when votes are public, the last verifier watches the first two and free-rides instead of independently checking the work.

We discovered this running the public version on another testnet. Verifier herding — you can't fix it with incentives, only with cryptography.

---

3/ The fix: Zama FHE sealed-ballot consensus.

Each verifier agent encrypts its vote in its own process. The contract tallies homomorphically (FHE.add), checks quorum on ciphertext (FHE.ge), and branches on ciphertext (FHE.select) — without ever decrypting a single vote.

Only the final verified/rejected boolean is ever made decryptable.

---

4/ This is consensus you cannot build without FHE.

The contract does arithmetic, comparison, and control flow on data it is structurally incapable of reading. A single ciphertext that is genuinely computed over is a stronger FHE claim than a dozen values that are merely stored encrypted.

---

5/ The agent layer:
- Python daemon reads onchain + offchain signals
- Collects evidence: contract deployment, unique callers, GitHub commits
- 3 verifier nodes reach 2-of-3 consensus
- Confidential milestones route through Zama encryption
- Proof mints to ENS reputation on verification

---

6/ The frontend:
- Guided agent-brief wizard (not a form — you brief the agent)
- Project page shows the agent's verification timeline
- Sealed-ballot decryption panel for confidential milestones
- Woven-fabric design motif throughout

---

7/ Try it:
- Create a confidential milestone: https://weft.thisyearnofear.com/create-milestone
- 10-minute demo deadline for fast sealed ballots
- Watch 3 encrypted verdicts land on Sepolia with no readable vote in calldata
- Decrypt the result yourself in the browser

Repo: https://github.com/thisyearnofear/weft

#Zama #FHE #AI #Onchain

---

## 2-Minute Video Script

**Target: 1:50-2:00 (hard cap: 2:00)**

> Zama S3 Builder Track requires a 3-minute max video. We're targeting
> under 2:00 — tight enough to hold attention, leaves a buffer so a
> retake or slow load doesn't blow the limit.

### Act 1: The problem (0:00-0:20)

**[Screen recording: landing page hero, slow scroll to "For organizations"]**

"Weft is an autonomous agent that verifies whether builders shipped what they promised — and releases escrowed capital when 2 of 3 verifier nodes agree."

"But we found a bug: when votes are public, the last verifier just watches the first two and copies them. No independent check. For a system whose entire job is honest verification, that's fatal."

### Act 2: The FHE fix (0:20-0:55)

**[Screen recording: contract code or FHE flow diagram]**

"The fix is Zama FHE sealed-ballot consensus. Each verifier encrypts its vote in its own process. The contract tallies homomorphically — FHE.add, FHE.ge, FHE.select — quorum computed on ciphertext, no vote ever decrypted."

"Only the final verified boolean becomes decryptable, and only after all three ballots are in. Try to decrypt early — the Zama relayer refuses. There's no early result to leak."

### Act 3: The demo (0:55-1:40)

**[Screen recording: live site — open the verified confidential milestone]**

"Here it is live on Sepolia. Three verifier agents each encrypted a ballot."

**[Record: Etherscan — sealed ballot tx, scroll calldata]**

"Look at the calldata — zero readable vote. Just ciphertext."

**[Record: project page — click Decrypt, result reveals]**

"I decrypt the result myself in the browser. Individual ballots stay ciphertext forever — only the outcome comes out."

**[Record: scroll to Verification Receipt, click Copy JSON]**

"Every finalized milestone exports a verification receipt — milestone hash, encrypted quorum, evidence root, contract. When someone asks why this got paid, the answer is a link, not a meeting."

### Act 4: The claim (1:40-2:00)

**[Screen recording: landing page hero]**

"This is consensus you cannot build without FHE — arithmetic, comparison, and control flow on data the contract is structurally incapable of reading."

"Autonomous agents, encrypted ballots, permanent proof. On Sepolia today."

"Try it at weft.thisyearnofear.com."

---

## Notes for recording

- **Hard cap: 2:00.** Aim for 1:50 so a slow page load doesn't push over.
- Record at 1440x900 or 1920x1080
- Use the live site (https://weft.thisyearnofear.com), not localhost
- **Don't record a live milestone creation** — the 10-minute deadline window
  makes the timing unpredictable. Use the existing verified demo milestone:
  `0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1`
- Demo flow (3 cuts, ~45s total):
  1. Etherscan sealed ballot tx — scroll the calldata, show it's unreadable
  2. Project page — click Decrypt, show the result reveal
  3. Scroll down to the Verification Receipt — click Copy JSON
- Sealed ballot tx for the Etherscan cut:
  `https://sepolia.etherscan.io/tx/0x6f5ac704017896404791143b8539009f40f16ccd7809871ea9ec71f66144a2cc`
- Keep cuts tight — no long pauses, no "umms". If a page takes >2s to load,
  cut the loading frame in editing.
- Add captions for accessibility (Zama requires real-person voice, no AI TTS)
- **Real-person pitch only** — no AI-generated voiceover (Zama S3 rule)
