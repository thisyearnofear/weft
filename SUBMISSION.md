# Weft Confidential — Zama Developer Program Mainnet Season 3 (Builder Track)

**Sealed-ballot consensus between autonomous AI agents — a primitive that only exists because of Zama FHE.**

`WeftMilestoneConfidential` is an FHEVM escrow live on Sepolia where autonomous
verifier agents vote by **sealed ballot**: each agent encrypts its verdict in its
own process, the contract tallies votes **homomorphically** (`FHE.add`), checks
quorum **on ciphertext** (`FHE.ge`), and branches **on ciphertext** (`FHE.select`) —
all without ever decrypting a single vote. Only the final verified/rejected boolean
is ever made decryptable, and only after every ballot is cast. Settlement is
trustless: anyone can submit the Zama KMS decryption proof and the contract verifies
the signers itself (`FHE.checkSignatures`).

This is **consensus you cannot build without FHE** — the contract does arithmetic,
comparison, and control flow on data it is structurally incapable of reading.

> **Why this problem is real, not invented for the hackathon.** We already run the
> *public*, plaintext version of this escrow on another testnet. Running it in
> production is exactly how we discovered the flaw FHE fixes: **verifier herding** —
> when votes are public, the last agent watches the first two and free-rides instead
> of independently checking the work. The public deployment isn't a competing
> product; it's the field evidence that motivated the confidential contract below.

| Field | Value |
|---|---|
| **Live site** | https://weft.thisyearnofear.com |
| **Confidential demo milestone** | [`0xc351d244...0fc58574`](https://weft.thisyearnofear.com/project/0xc351d2446c4e245d3baa0fc206a05d61010589dd8635c844c17955d50fc58574?confidential=1) — verified, finalized, released |
| **Source** | https://github.com/thisyearnofear/weft |
| **Chain** | Sepolia (Zama FHEVM) — chain ID 11155111 |
| **WeftMilestoneConfidential** | [`0xcd1a64733a7b58efc8914dde45fe6af22381368f`](https://sepolia.etherscan.io/address/0xcd1a64733a7b58efc8914dde45fe6af22381368f) |
| **VerifierRegistry (Sepolia)** | [`0x910df85e44cc30171614a3fc89188b8ce21becb2`](https://sepolia.etherscan.io/address/0x910df85e44cc30171614a3fc89188b8ce21becb2) |
| **Sealed ballot txs** | [1](https://sepolia.etherscan.io/tx/0x1a1b80407c5c1400aeb83e35902d786a30feaba94c5fa45acc2253de3b9f4210) · [2](https://sepolia.etherscan.io/tx/0xbf48fe5b3ccf4594f21a16b291e44677e38cdad398d2439943525f963b130ef0) · [3](https://sepolia.etherscan.io/tx/0x6965ef21f04cc7ffcaa59790cfdc11f0b09b05cba720ff5b5db4bd78d61a1c99) — no readable vote in any calldata |
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

| Value | Public contract | Confidential contract |
|---|---|---|
| Individual verifier votes | Visible immediately | **Encrypted forever (sealed ballot)** |
| Running tally | Visible | **Encrypted (`euint8`)** |
| Final verified result | Visible | Encrypted until all ballots cast, then publicly decryptable |
| Stake amounts | Visible | Visible (native ETH; staking privacy is future work via cERC-20 shielding) |

We deliberately do not claim stake-amount privacy — `msg.value` is inherently
public. The FHE win here is the sealed ballot, and we kept the claim honest.

## FHE design notes — depth over breadth (deliberate)

A reasonable reviewer will notice the encrypted state is compact: one `euint8`
tally and one `ebool` result. That is a **design decision, not a limitation**, and
we want to be explicit about the reasoning:

- **The value of FHE here is computation, not surface area.** The contract performs
  *arithmetic* (`FHE.add` on the tally), *comparison* (`FHE.ge` against quorum), and
  *conditional control flow* (`FHE.select` on an `ebool`) — on data it can never
  read. A single ciphertext that is genuinely computed over is a stronger FHE claim
  than a dozen values that are merely stored encrypted. We optimized for the former.
- **We considered — and rejected — encrypting more just to look impressive.**
  Encrypting `msg.value` would be theater: the ETH transfer amount is observable on
  the base layer regardless, so an "encrypted stake" field would leak via the trace.
  Claiming that privacy would be dishonest, so we don't.
- **The one expansion that is *not* theater is confidence-weighted voting.** Our
  agents already produce a confidence score (see `AGENTS.md`: "if confidence < 0.6,
  return verified=false"). Casting an encrypted `euint32` confidence instead of a
  binary ballot — and thresholding the encrypted weighted sum — is a natural next
  step that deepens the homomorphic computation without adding theater. It is on the
  roadmap below, not claimed as done.
- **Real confidentiality of value transfer belongs in a confidential token, not
  bolted onto native ETH.** Staking in a confidential ERC-20 (OpenZeppelin
  `ConfidentialFungibleToken` + the Testnet Confidential Token Registry, e.g. cUSDT)
  is the correct way to make amounts private. That's roadmap, and we'd rather ship a
  narrow honest claim than a broad hand-wavy one.

The through-line: **every encrypted value in this contract is computed over, and we
refuse to claim privacy we don't actually deliver.**

## Roadmap (post-submission)

| Next | FHE surface it adds |
|---|---|
| Confidence-weighted ballots (`euint32` per agent, encrypted weighted-sum threshold) | Richer homomorphic aggregation than binary counting |
| Confidential-token staking (cUSDT via OZ `ConfidentialFungibleToken`) | Encrypted balances + transfers — genuinely private stake amounts |
| Encrypted per-agent reputation accrual | Homomorphic running state across milestones |

## Architecture

**Additive by design.** The public escrow (`WeftMilestone.sol`) is the plaintext
control that revealed the herding flaw; the confidential contract is the fix and the
star of this submission. Both run side by side and the frontend handles both:

- `contracts/src-fhe/WeftMilestoneConfidential.sol` — FHEVM escrow, sealed-ballot
  consensus, `ZamaEthereumConfig` (auto-configures mainnet/Sepolia coprocessor)
- `contracts/test-fhe/` — Foundry tests via `forge-fhevm` (encrypted quorum
  reached with 2-of-3 sealed votes, stake accumulation, creation)
- `frontend/src/app/project/[hash]/ConfidentialMilestoneView.tsx` — confidential
  milestone page: sealed-ballot progress, relayer-backed "decrypt it yourself" panel
- `frontend/src/lib/fhe.ts` — Zama relayer SDK, lazy singleton (WASM loads only
  when a confidential milestone needs decryption)
- `agent/scripts/fhe_encrypt_vote.mjs` — verifier daemon's encryption helper:
  `createEncryptedInput → add32 → encrypt → submitVerdict`
- The same milestone URL serves both worlds: `/project/<hash>` falls back to the
  Sepolia confidential contract when the hash isn't a public milestone.

**The verifiers are autonomous agents, not humans clicking buttons.** The same
Python daemon that verifies public milestones (onchain evidence, GitHub commits,
LLM-reasoned verdicts) detects confidential milestones and routes its verdict
through the Zama encryption path. FHE consensus between AI agents — each agent's
judgment stays private, only the collective outcome is revealed.

## Demo flow (reproducible)

1. **Create** a confidential milestone at `/create-milestone` (check "Make this
   milestone confidential" — 10-minute demo deadline available). The tx lands on
   Sepolia.
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

## Zama Builder Track requirements

| Requirement | Where |
|---|---|
| Functioning dApp using Zama Protocol | Sealed-ballot escrow on Sepolia + live frontend |
| Smart contract + frontend code base | This repo (`contracts/src-fhe/`, `frontend/`) |
| Working demo deployed on a website | https://weft.thisyearnofear.com |
| 3-minute real-person video pitch | _(link filled at submission)_ |
| X thread | _(link filled at submission)_ |
| Sepolia or mainnet deployment | Sepolia — addresses above |

## Run it locally

```bash
# Contracts
FOUNDRY_PROFILE=fhe forge test          # forge-fhevm mock, 3 tests

# Frontend
cd frontend && npm install --legacy-peer-deps && npm run dev

# Encrypt a ballot (no funds needed)
cd agent && npm install
node scripts/fhe_encrypt_vote.mjs --rpc-url <sepolia-rpc> \
  --private-key <verifier-key> --contract <address> \
  --milestone-hash 0x... --did-complete true --evidence-root 0x... --encrypt-only
```

---

*Previous hackathon submission (NVIDIA × Stripe × NousResearch):
[docs/submissions/hermes-hackathon.md](docs/submissions/hermes-hackathon.md)*
