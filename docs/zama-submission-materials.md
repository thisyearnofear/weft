# Zama Builder Track — submission materials

Working drafts for the two human deliverables: the X thread and the 3-minute
real-person video. Fill the `[..]` placeholders after the Sepolia demo run.

---

## X thread (final — every claim verified against the code)

**Tweet 1 (hook)**
Ever pay upfront for work and just have to trust it'll get done? Or ship the work
and wait on someone's word to get paid?

That's the core problem in freelancing, grants, bounties, any deal where money and
delivery don't happen at the same moment.

@weft solves it with escrow that releases itself: lock funds, verifier agents check
the actual work, and if they agree, payment releases — no middleman, no waiting on
someone's opinion.

We just found a way agents could fake that check. Here's the fix. 🧵

**Tweet 2 (what Weft is)**
How it works: a sponsor locks ETH behind a deliverable. 3 autonomous agents
independently verify the work — deployment state, real usage, commits. If 2 of 3
agree it's done, funds release.

Live: weft.thisyearnofear.com

**Tweet 3 (the herding bug)**
The bug: agent votes were plaintext, written onchain as they came in.

So the last agent to vote could just watch the first two and copy them — no way to
tell if it actually checked the work or just matched the majority. Same vote, same
outcome, zero verification.

For a system whose entire job is honest verification, that's not a small bug.

**Tweet 4 (generalize)**
This isn't unique to AI agents — it's what plaintext voting makes possible whenever
votes are visible before quorum. Same reason commit-reveal schemes exist in onchain
governance.

We just hadn't built one for agent consensus. Now we have.

**Tweet 5 (the FHE fix, concrete)**
The fix: each agent encrypts its ballot in its own process with @zama_fhe. No one —
not the other agents, not us — can read a vote. Ever.

verifiedVotes = FHE.add(verifiedVotes, ballot)
verified = FHE.select(FHE.ge(verifiedVotes, 2), true, verified)

Quorum gets computed on ciphertext. No vote is ever decrypted to check it.

**Tweet 6 (the reveal moment)**
The part I actually like:

The final yes/no only becomes decryptable once all 3 ballots are in. Try clicking
"Decrypt" early — the Zama relayer refuses.

[screenshot]

Not a UI restriction — there's no early result to leak even if someone tried.

**Tweet 7 (agents, not humans — precise about what they do)**
To be precise: the voters here aren't humans with wallets. They're autonomous
verifier daemons that pull evidence — is the contract deployed, did real users call
it, did commits land — and vote on deterministic rules. An LLM writes the narrative;
the money decision stays auditable.

FHE consensus between AI agents: private ballots in, public outcome out. Nothing
more, nothing less.

**Tweet 8 (honest scope)**
Being straight about scope, because FHE demos tend to oversell:

We encrypted one tally and one result — small surface, but every bit of it is
computed over, not just stored blind.

Each ballot is also clamped to {0,1} *in ciphertext* — a rogue agent can't encrypt
a 2 and fake quorum alone.

We didn't encrypt the ETH stake. Would've been theater — the transfer's public
either way.

One honest FHE claim beats ten hand-wavy ones.

Next: confidence-weighted encrypted votes + cUSDT staking.

**Tweet 9 (receipts)**
Receipts, so you don't have to trust the thread:
▸ Contract (Sepolia): https://sepolia.etherscan.io/address/0x152d758d496db7444a00a6b2c7fe254b9aced212
▸ Live demo: https://weft.thisyearnofear.com/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1
▸ Code: github.com/thisyearnofear/weft
▸ A sealed ballot tx — zero readable vote in the calldata: https://sepolia.etherscan.io/tx/0x6f5ac704017896404791143b8539009f40f16ccd7809871ea9ec71f66144a2cc

Built for @zama_fhe Developer Program S3.

Go try to decrypt it early. I'll wait.

---

## 3-minute video script (real person, on camera)

Target: 2:45–3:00. One take of you talking + screen recording cutaways.
Structure: problem (40s) → live demo (90s) → why FHE / close (30s).

### 0:00–0:20 — Cold open (face to camera)
"Hi, I'm [name]. I built something that shouldn't be possible: a smart contract that
runs a vote, tallies the ballots, and decides the outcome — **without ever being able
to read a single vote.** It's live on Sepolia, it's built on Zama's FHE protocol, and
the voters are autonomous AI agents. Let me show you why that matters."

> **Framing note (Risk-2 hedge — lead with Zama, not 0G):** open on the confidential
> contract as the star. Do NOT say "0G" or "we also have a public version" until the
> 0:20–0:50 problem beat, where the public deployment is introduced only as the
> *evidence* that motivated FHE. The one-liner Weft pitch ("escrow that releases
> itself") can move to the start of the problem beat if you need it for context.

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
6. *(release)* "And settlement is trustless: nobody attests the result — the
   decryption comes with a proof signed by Zama's KMS, and the contract checks
   those signatures itself. Our confirm transaction was sent by one of the
   verifier wallets, not the deployer. Then capital releases to the builder."

### 2:20–2:50 — Why FHE / close (face to camera)
"The interesting thing isn't that the votes are hidden — it's that the contract
did arithmetic on them while they were hidden. FHE.add on the tally, FHE.ge for
quorum, FHE.select to decide the outcome — all on data the contract can never read.
I deliberately kept the encrypted state small and honest: one sealed tally, one
sealed result, every bit of it actually computed over — instead of encrypting things
just to pad the demo. That's a consensus primitive you simply cannot build any other
way, and it matters more as more of these voters become AI agents whose judgment you
want independent, not correlated. Next up: encrypted confidence-weighted votes and
staking in a confidential token like cUSDT. Weft is live at weft dot thisyearnofear
dot com, code's on GitHub. Thanks."

> **Depth-over-breadth note (Risk-1 hedge):** the two sentences starting "I
> deliberately kept the encrypted state small and honest..." pre-empt the "narrow
> FHE surface" critique — say them with conviction, they turn the smallest apparent
> weakness into visible engineering judgment. The "next up" line signals the surface
> can grow without over-claiming today.

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
- [x] E2E demo milestone finalized + released on Sepolia — `0xa22c4a43...f40d`
- [x] Frontend env var `NEXT_PUBLIC_WEFT_MILESTONE_CONFIDENTIAL_SEPOLIA` set in production deploy
- [x] Production decrypt flow verified in-browser (relayer publicDecrypt → VERIFIED)
- [ ] Video recorded, uploaded (YouTube unlisted or similar), linked in SUBMISSION.md
- [ ] X thread posted, linked in SUBMISSION.md
- [ ] Submit via Zama Developer Program portal (Guild.xyz) before the monthly deadline
