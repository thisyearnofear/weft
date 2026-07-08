# Weft Confidential — Zama Developer Program Mainnet Season 3 (Builder Track)

**Sealed-ballot consensus between autonomous AI agents — a primitive that only exists because of Zama FHE.**

Weft deploys **two FHEVM contracts** on Sepolia:

**v1 — `WeftMilestoneConfidential`** (addition-class FHE): each verifier agent
encrypts its verdict in its own process, the contract tallies votes
**homomorphically** (`FHE.add`), checks quorum **on ciphertext** (`FHE.ge`), and
branches **on ciphertext** (`FHE.select`) — all without ever decrypting a single
vote.

**v2 — `WeftMilestoneConfidentialWeighted`** (multiplication-class FHE): each
verifier encrypts **both** a ballot (0/1) **and** a confidence score (1–100). The
contract multiplies them on ciphertext (`FHE.mul`), accumulates a weighted tally
(`FHE.add`), and requires **both** binary quorum (≥2 of 3) **and** weighted quorum
(≥100), combined with `FHE.and`. No vote, no confidence score, and no weighted
tally is ever decrypted.

In both contracts, only the final verified/rejected boolean is ever made
decryptable, and only after every ballot is cast. Settlement is trustless: anyone
can submit the Zama KMS decryption proof and the contract verifies the signers
itself (`FHE.checkSignatures`).

This is **consensus you cannot build without FHE** — the contract does arithmetic,
comparison, control flow, **and multiplication** on data it is structurally
incapable of reading.

> **Why this problem is real, not invented for the hackathon.** We already run the
> *public*, plaintext version of this escrow on another testnet. Running it in
> production is exactly how we discovered the flaw FHE fixes: **verifier herding** —
> when votes are public, the last agent watches the first two and free-rides instead
> of independently checking the work. The public deployment isn't a competing
> product; it's the field evidence that motivated the confidential contract below.

| Field | Value |
|---|---|
| **Live site** | https://weft.thisyearnofear.com |
| **v1 demo (FHE.add)** | [`0xa22c4a43...a99af40d`](https://weft.thisyearnofear.com/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1) — verified, finalized, released |
| **v2 demo (FHE.mul)** | [`0xbd5c85db...d3b071722`](https://weft.thisyearnofear.com/project/0xbd5c85db97cd5a8f30779da9311651e549f702b6ce72ebd03dcb816d3b071722?weighted=1) — verified, finalized, result confirmed |
| **Source** | https://github.com/thisyearnofear/weft |
| **Chain** | Sepolia (Zama FHEVM) — chain ID 11155111 |
| **WeftMilestoneConfidential (v1)** | [`0x152d758d496db7444a00a6b2c7fe254b9aced212`](https://sepolia.etherscan.io/address/0x152d758d496db7444a00a6b2c7fe254b9aced212) |
| **WeftMilestoneConfidentialWeighted (v2)** | [`0xcc2395ac3f70ace0c1828cb0a18b00da823760f8`](https://sepolia.etherscan.io/address/0xcc2395ac3f70ace0c1828cb0a18b00da823760f8) |
| **VerifierRegistry (Sepolia, v1)** | [`0xb65c2fb7572096bc367c78eee2cceace67dd9636`](https://sepolia.etherscan.io/address/0xb65c2fb7572096bc367c78eee2cceace67dd9636) |
| **VerifierRegistry (Sepolia, v2)** | [`0xa7e74abb5c4c4fc70aff99bc4ac0b9f9bf6b5a66`](https://sepolia.etherscan.io/address/0xa7e74abb5c4c4fc70aff99bc4ac0b9f9bf6b5a66) |
| **v1 sealed ballot txs** | [1](https://sepolia.etherscan.io/tx/0x6f5ac704017896404791143b8539009f40f16ccd7809871ea9ec71f66144a2cc) · [2](https://sepolia.etherscan.io/tx/0xec08880a0f141a9b8bfbd6b1fd33f55357b963b5d689fe8b50e99c9642762710) · [3](https://sepolia.etherscan.io/tx/0x8a3ca353655eb3757107cb713d8fdb204d157bfb678a34ebb9447ffdf97dabb8) — no readable vote in any calldata |
| **v2 weighted ballot txs (FHE.mul)** | [1](https://sepolia.etherscan.io/tx/0xe5a94fd2632c06b5837e39b14c83c0a5e1406eae9be78b295a5de038ef04b462) · [2](https://sepolia.etherscan.io/tx/0x7f5d16833a0923d88aff8d6518bc872fc4bf5476a2e2932fa2c6a682a9adb055) · [3](https://sepolia.etherscan.io/tx/0x0127aae91718a9292332d559f93fe31b2d38809df607cc0831a25fd3ff78fb5a) — two encrypted handles per vote, no readable values |
| **v2 result confirmation tx** | [`0x3dc5b03b...`](https://sepolia.etherscan.io/tx/0x3dc5b03b5247a870867a2da6abf4bbd9433b9b23bb185b6f160bacfdd20a122f) — KMS decryption proof, result = VERIFIED |
| **Contracts** | `contracts/src-fhe/` (Foundry, `@fhevm/solidity` 0.11) |
| **Frontend** | Next.js + wagmi + `@zama-fhe/relayer-sdk` (lazy-loaded) |
| **Agent** | Python daemon + Node.js Zama encryption helper |

---

## The problem FHE actually solves here

**Verifier herding.** When votes are public the moment they land, the third verifier
can watch the first two and free-ride on their judgment instead of independently
checking the evidence. In any consensus system where votes are plaintext, late voters
are structurally lazy voters. You can't fix this with incentives — you can only fix it
with cryptography.

The confidential contract makes herding **cryptographically impossible**:

```
── v1: addition-class FHE ──────────────────────────────────

verifier encrypts vote in its own process (Zama relayer SDK)
        │
        ▼
submitVerdict(hash, externalEuint32 ballot, bytes proof, bytes32 evidenceRoot)
        │
        ▼
verifiedVotes = FHE.add(verifiedVotes, ballot)          // encrypted tally
verified     = FHE.select(FHE.ge(verifiedVotes, 2), true, verified)
        │
        ▼   only after ALL 3 ballots are cast:
FHE.makePubliclyDecryptable(verified)                    // result — not the votes

── v2: multiplication-class FHE ────────────────────────────

verifier encrypts ballot AND confidence in its own process
        │
        ▼
submitWeightedVerdict(hash, extEuint32 ballot, extEuint32 confidence, bytes proof, bytes32 evidenceRoot)
        │
        ▼
ballot       = FHE.select(FHE.eq(didComplete, 1), 1, 0)  // clamp to {0,1} on ciphertext
weightedVote = FHE.mul(FHE.asEuint32(ballot), confidence) // FHE MULTIPLICATION
weightedTally = FHE.add(weightedTally, weightedVote)      // encrypted weighted tally
        │
        ▼   both quorum gates, combined on ciphertext:
binaryQuorum  = FHE.ge(verifiedVotes, 2)
weightedQuorum = FHE.ge(weightedTally, 100)
verified = FHE.select(FHE.and(binaryQuorum, weightedQuorum), true, verified)
        │
        ▼   only after ALL 3 ballots are cast:
FHE.makePubliclyDecryptable(verified)                    // result — not the votes
        │
        ▼   trustless settlement — anyone may call:
confirmResult(hash, cleartext, kmsProof)
FHE.checkSignatures(...)   // contract verifies the KMS signers' proof itself
```

Individual ballots stay encrypted onchain permanently. The relayer refuses to
decrypt the result until the contract finalizes — you can try it yourself on the
demo page ("Decrypt sealed result" before finalization fails, by design). And
settlement is trustless: no owner attests the result. Whoever fetches the public
decryption from the relayer submits its KMS proof, and `FHE.checkSignatures`
reverts unless real KMS signers produced it — our demo confirm tx was sent by a
verifier key, not the deployer, to prove the point.

## What's confidential, precisely

| Value | Public contract | v1 (FHE.add) | v2 (FHE.mul) |
|---|---|---|---|
| Individual verifier votes | Visible immediately | **Encrypted forever** | **Encrypted forever** |
| Confidence scores | N/A | N/A | **Encrypted forever** |
| Running tally | Visible | **Encrypted (`euint8`)** | **Encrypted (`euint8` + `euint32`)** |
| Weighted tally | N/A | N/A | **Encrypted (`euint32`)** |
| Final verified result | Visible | Encrypted until all ballots cast, then decryptable | Same |
| Stake amounts | Visible | Visible (native ETH) | Visible (native ETH) |

We deliberately do not claim stake-amount privacy — `msg.value` is inherently
public. The FHE win here is the sealed ballot and the homomorphic computation,
and we kept the claim honest.

## FHE design notes — depth over breadth (deliberate)

A reasonable reviewer will notice the encrypted state is compact. That is a
**design decision, not a limitation**, and we want to be explicit about the
reasoning:

- **The value of FHE here is computation, not surface area.** v1 performs
  *arithmetic* (`FHE.add`), *comparison* (`FHE.ge`), and *conditional control flow*
  (`FHE.select`) on ciphertext. v2 adds *multiplication* (`FHE.mul`) and *boolean
  logic* (`FHE.and`, `FHE.eq`) — every encrypted value is computed over, not merely
  stored encrypted.
- **We shipped the v1 → v2 progression deliberately.** v1 proves the core claim:
  sealed-ballot consensus with addition-class FHE. v2 deepens it: each verifier
  encrypts a confidence score alongside the ballot, and the contract multiplies
  them on ciphertext (`FHE.mul`), accumulates a weighted tally, and requires both
  binary and weighted quorum — all without decrypting anything. This is the single
  highest-impact FHE upgrade: multiplication is meaningfully harder than addition,
  and it changes the claim from "we do FHE arithmetic" to "we do FHE arithmetic
  **and multiplication** for weighted consensus."
- **We considered — and rejected — encrypting more just to look impressive.**
  Encrypting `msg.value` would be theater: the ETH transfer amount is observable on
  the base layer regardless, so an "encrypted stake" field would leak via the trace.
  Claiming that privacy would be dishonest, so we don't.
- **Real confidentiality of value transfer belongs in a confidential token, not
  bolted onto native ETH.** Staking in a confidential ERC-20 (OpenZeppelin
  `ConfidentialFungibleToken` + the Testnet Confidential Token Registry, e.g. cUSDT)
  is the correct way to make amounts private. That's roadmap, and we'd rather ship a
  narrow honest claim than a broad hand-wavy one.

The through-line: **every encrypted value in both contracts is computed over, and we
refuse to claim privacy we don't actually deliver.**

## Roadmap (post-submission)

| Next | FHE surface it adds |
|---|---|
| Confidential-token staking (cUSDT via OZ `ConfidentialFungibleToken`) | Encrypted balances + transfers — genuinely private stake amounts |
| Encrypted per-agent reputation accrual | Homomorphic running state across milestones |
| Verifier set > 3 (dynamic encrypted quorum) | `FHE.shr` / encrypted comparison against a dynamic threshold |

## Architecture

**Additive by design.** The public escrow (`WeftMilestone.sol`) is the plaintext
control that revealed the herding flaw; the two confidential contracts are the fix
and the star of this submission. All three run side by side and the frontend
handles all three — the same `/project/<hash>` URL tries the public contract,
then v1 (`?confidential=1`), then v2 (`?weighted=1`).

**The verifiers are autonomous agents, not humans clicking buttons.** The same
Python daemon that verifies public milestones (onchain evidence, GitHub commits,
LLM-reasoned verdicts) detects confidential milestones and routes its verdict
through the Zama encryption path. FHE consensus between AI agents — each agent's
judgment stays private, only the collective outcome is revealed.

See [AGENTS.md](AGENTS.md) for the full technical reference (contracts, library
modules, data model, scripts).

## Demo flow (reproducible)

### v1 — Sealed-ballot quorum (FHE.add)

1. **Create** a confidential milestone at `/create-milestone` — choose
   "Confidential" when asked about privacy. The tx lands on Sepolia.
2. **Stake** Sepolia ETH behind it.
3. After the deadline, the **three verifier agents** each encrypt a ballot and
   submit `submitVerdict` — watch three `VerdictSubmitted` events on Etherscan
   with no readable vote anywhere in the calldata.
4. On the third ballot the contract **finalizes** and makes the result publicly
   decryptable.
5. On the milestone page, click **"Decrypt sealed result"** — your browser asks
   the Zama relayer to decrypt the `ebool`. Individual ballots remain ciphertext.
6. Anyone submits the relayer's KMS decryption proof onchain (`confirmResult` —
   the contract verifies the signatures via `FHE.checkSignatures`) and capital
   **releases** to the builder's split.

### v2 — Confidence-weighted ballots (FHE.mul)

1. **Create** a weighted milestone (the v2 contract is live on Sepolia).
2. **Stake** Sepolia ETH behind it.
3. After the deadline, the **three verifier agents** each encrypt **both** a
   ballot (0/1) and a confidence score (1–100) and submit `submitWeightedVerdict`
   — each tx carries two encrypted handles, no readable values anywhere.
4. The contract computes `weightedVote = FHE.mul(ballot, confidence)` on
   ciphertext, accumulates the weighted tally, and checks both binary quorum
   (≥2 of 3) and weighted quorum (≥100) — combined with `FHE.and`.
5. On the milestone page (`?weighted=1`), click **"Decrypt sealed result"** —
   the SealedReveal animation plays and the verdict appears.
6. The result confirmation tx is already onchain: [`0x3dc5b03b…`](https://sepolia.etherscan.io/tx/0x3dc5b03b5247a870867a2da6abf4bbd9433b9b23bb185b6f160bacfdd20a122f)

**Or just try the live demos now:**
- v1: [weft.thisyearnofear.com/project/0xa22c…?confidential=1](https://weft.thisyearnofear.com/project/0xa22c4a43e1ded5d10cb6b46b801c0385a5107a013ae263d3fb04c807a99af40d?confidential=1)
- v2: [weft.thisyearnofear.com/project/0xbd5c…?weighted=1](https://weft.thisyearnofear.com/project/0xbd5c85db97cd5a8f30779da9311651e549f702b6ce72ebd03dcb816d3b071722?weighted=1)

## Zama Builder Track requirements

| Requirement | Where |
|---|---|
| Functioning dApp using Zama Protocol | Two FHEVM contracts on Sepolia + live frontend |
| Smart contract + frontend code base | This repo (`contracts/src-fhe/`, `frontend/`) |
| Working demo deployed on a website | https://weft.thisyearnofear.com |
| 3-minute real-person video pitch | _(link filled at submission)_ |
| X thread | [docs/submissions/zama-s3-x-thread-and-video.md](docs/submissions/zama-s3-x-thread-and-video.md) |
| Sepolia or mainnet deployment | Sepolia — both contracts live (addresses above) |

## Run it locally

```bash
# Contracts — v1 + v2 FHE tests
FOUNDRY_PROFILE=fhe forge test                              # all FHE tests
FOUNDRY_PROFILE=fhe forge test --match-contract WeftMilestoneConfidentialWeightedTest -vvv  # v2 only

# Frontend
cd frontend && npm install --legacy-peer-deps && npm run dev

# Encrypt a v1 ballot (no funds needed)
cd agent && npm install
node scripts/fhe_encrypt_vote.mjs --rpc-url <sepolia-rpc> \
  --private-key <verifier-key> --contract <address> \
  --milestone-hash 0x... --did-complete true --evidence-root 0x... --encrypt-only

# Encrypt a v2 weighted ballot (ballot + confidence)
node scripts/fhe_encrypt_weighted_vote.mjs --rpc-url <sepolia-rpc> \
  --private-key <verifier-key> --contract <address> \
  --milestone-hash 0x... --did-complete true --confidence 85 --evidence-root 0x... --encrypt-only
```

---

*Previous hackathon submissions:
[docs/hackathons.md](docs/hackathons.md)*
