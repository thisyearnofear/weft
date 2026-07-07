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

## 3-Minute Video Script

**Target: 2:45-3:00**

### Act 1: The problem (0:00-0:30)

**[Screen recording: landing page hero]**

"Weft is an autonomous AI agent that verifies whether builders shipped what they promised. When a builder creates a milestone, the agent watches for evidence, collects it, reaches consensus with two other verifier nodes, and mints a proof to the builder's ENS name."

"But we discovered a problem running the public version: verifier herding. When votes are public, the last verifier watches the first two and free-rides instead of independently checking the work."

### Act 2: The FHE fix (0:30-1:15)

**[Screen recording: SUBMISSION.md FHE flow diagram or contract code]**

"The fix is Zama FHE sealed-ballot consensus. Each verifier agent encrypts its vote in its own process using the Zama relayer SDK. The contract tallies homomorphically with FHE.add, checks quorum on ciphertext with FHE.ge, and branches on ciphertext with FHE.select — all without ever decrypting a single vote."

"Only the final verified boolean is made decryptable, and only after all three ballots are cast. Settlement is trustless — anyone submits the KMS decryption proof and the contract verifies the signers itself."

### Act 3: The demo (1:15-2:30)

**[Screen recording: walk through the live site]**

"Let me show you. I'll create a confidential milestone using the agent-brief wizard."

**[Record: create-milestone wizard flow — name, deadline, confidential, create]**

"The agent acknowledges my input at each step and shows me its verification plan before I commit."

**[Record: project page — agent status header, verification timeline]**

"After creation, the project page shows the agent's status — it's watching. The verification timeline shows what it will check."

**[Record: Etherscan — 3 VerdictSubmitted events with encrypted calldata]**

"After the deadline, three verifier agents each encrypt a ballot. Look at the calldata — no readable vote anywhere."

**[Record: project page — decrypt sealed result button]**

"On the milestone page, I can decrypt the sealed result myself in the browser. Individual ballots remain ciphertext forever."

### Act 4: The claim (2:30-3:00)

**[Screen recording: landing page or hero shot]**

"This is consensus you cannot build without FHE. The contract does arithmetic, comparison, and control flow on data it is structurally incapable of reading."

"Weft runs on Sepolia today. The agent is autonomous, the verification is encrypted, and the proof is permanent."

"Try it at weft.thisyearnofear.com."

---

## Notes for recording

- Record at 1440x900 or 1920x1080
- Use the live site (https://weft.thisyearnofear.com), not localhost
- For the demo milestone, use the existing verified one: 0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1
- Show the Etherscan txs for the sealed ballots (links in SUBMISSION.md)
- Keep cuts tight — no long pauses, no "umms"
- Add captions for accessibility
