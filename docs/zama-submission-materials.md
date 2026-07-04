# Zama Builder Track — submission materials

Working drafts for the two human deliverables: the X thread and the 3-minute
real-person video. Fill the `[..]` placeholders after the Sepolia demo run.

---

## X thread draft

**Tweet 1 (hook)**
Every onchain voting system has the same quiet bug: votes are public the moment
they land, so the last voter just copies the first two.

We made that impossible. Verifier votes on @weft are now sealed ballots — encrypted
with @zama_fhe, tallied without ever being decrypted. 🧵

**Tweet 2 (what Weft is)**
Weft is escrow that releases itself. A sponsor locks ETH behind a deliverable.
Autonomous AI agents verify the work onchain — evidence, commits, usage — and if
2 of 3 agree, capital releases instantly. Live at weft.thisyearnofear.com

**Tweet 3 (the herding problem)**
The flaw in v1: our verifier votes were plaintext. Agent 3 could watch agents 1–2
vote and free-ride instead of doing its own verification. In any consensus system
with public votes, late voters are structurally lazy voters.

**Tweet 4 (the FHE fix, concrete)**
Now each agent encrypts its ballot in its own process. Onchain:

verifiedVotes = FHE.add(verifiedVotes, ballot)
verified = FHE.select(FHE.ge(verifiedVotes, 2), true, verified)

The contract computes "did quorum pass?" on ciphertext. No vote is ever decrypted.

**Tweet 5 (the reveal moment)**
Only after ALL 3 ballots are in does the contract make the final boolean publicly
decryptable. Try clicking "Decrypt sealed result" before that — the Zama relayer
refuses. That refusal is the feature.

[screenshot of the decrypt panel]

**Tweet 6 (agents, not humans)**
The voters here aren't humans with wallets — they're autonomous verifier agents
(the same daemons that collect evidence and reason about it with an LLM). FHE
consensus between AI agents: private judgment, public outcome.

**Tweet 7 (receipts)**
Live on Sepolia:
▸ Contract: https://sepolia.etherscan.io/address/0xaf29c8954c01bb39e370021b52da0685089fadc3
▸ Demo milestone: https://weft.thisyearnofear.com/project/0x40dd25aab4400b120c0d44870e851ff661a93af5454a4d175e44fb89a7bc4490?confidential=1
▸ Code: github.com/thisyearnofear/weft
▸ A sealed ballot tx with zero readable vote in the calldata: https://sepolia.etherscan.io/tx/0xb94346eedfd7ed29ac7708714939d8de1aeafb07c2ebc9ebbacd46d3e9d1de2b

Built for the @zama_fhe Developer Program S3.

---

## 3-minute video script (real person, on camera)

Target: 2:45–3:00. One take of you talking + screen recording cutaways.
Structure: problem (40s) → live demo (90s) → why FHE / close (30s).

### 0:00–0:20 — Cold open (face to camera)
"Hi, I'm [name]. I built Weft — escrow that releases itself. A sponsor locks ETH
behind a deliverable, autonomous agents verify the work, and if two out of three
agree, the money moves. No invoices, no chasing, no payment politics."

### 0:20–0:50 — The problem (face, cut to explorer showing public votes)
"Weft has been live on a public testnet for months, and it has a flaw I could see
in my own data: votes are public. My third verifier agent could watch the first
two vote and just... agree. It's called herding, and every onchain voting system
has it. You can't fix it with incentives. You can only fix it with cryptography."

### 0:50–2:20 — Live demo (screen recording, voiceover)
1. *(create-milestone page)* "I'm creating a milestone and checking 'confidential'.
   This deploys the escrow to Sepolia, where the Zama Protocol runs." — show the
   MetaMask chain switch + tx.
2. *(stake)* "I stake half an ETH behind it."
3. *(terminal, daemon logs)* "Here are my three verifier agents. Each one collects
   evidence, decides, and encrypts its ballot locally with Zama's SDK — watch:
   the ballot leaves the agent already encrypted." — show the
   `submitting encrypted verdict (FHE)` log line + ciphertext handle.
4. *(Etherscan)* "Three VerdictSubmitted transactions. Look at the calldata — you
   cannot tell how anyone voted. Neither can the other agents. Neither can I, and
   I own the contract."
5. *(milestone page, the money shot)* "Before the last ballot: I click 'Decrypt
   sealed result' — the relayer refuses. The result doesn't exist in decryptable
   form yet. After the third ballot: same click — VERIFIED. Quorum was computed
   on encrypted votes. The individual ballots stay sealed forever."
6. *(release)* "Result confirmed onchain, capital releases to the builder."

### 2:20–2:50 — Why FHE / close (face to camera)
"The interesting thing isn't that the votes are hidden — it's that the contract
did arithmetic on them while they were hidden. FHE.add on the tally, FHE.ge for
quorum. That's a consensus primitive you simply cannot build any other way, and
it matters more as more of these voters become AI agents whose judgment you want
independent, not correlated. Weft is live at weft dot thisyearnofear dot com,
code's on GitHub. Thanks."

### Shot checklist
- [ ] Face-to-camera intro/outro (well lit, clean audio — the "real person" requirement)
- [ ] Screen: create-milestone with confidential toggle + chain switch
- [ ] Screen: daemon logs showing encryption + submission
- [ ] Screen: Etherscan calldata of a sealed ballot
- [ ] Screen: decrypt refusal BEFORE finalization (this is the differentiator — don't cut it)
- [ ] Screen: decrypt success AFTER finalization
- [ ] Screen: release tx

---

## Submission checklist

- [x] Sepolia deployment (contract addresses in SUBMISSION.md) — 2026-07-04
- [x] E2E demo milestone finalized + released on Sepolia — `0x40dd25aa...4490`
- [x] Frontend env var `NEXT_PUBLIC_WEFT_MILESTONE_CONFIDENTIAL_SEPOLIA` set in production deploy
- [x] Production decrypt flow verified in-browser (relayer publicDecrypt → VERIFIED)
- [ ] Video recorded, uploaded (YouTube unlisted or similar), linked in SUBMISSION.md
- [ ] X thread posted, linked in SUBMISSION.md
- [ ] Submit via Zama Developer Program portal (Guild.xyz) before the monthly deadline
