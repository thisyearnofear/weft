# Weft Confidential — Zama Developer Program Mainnet Season 3 (Builder Track)

**Sealed-ballot milestone verification by autonomous agents, powered by Zama FHE.**

Weft is escrow that releases itself: a sponsor locks ETH behind a deliverable, and
autonomous verifier agents check the work onchain — 2-of-3 consensus releases the
capital. This submission adds a **confidential mode** built on the Zama Protocol:
verifier votes become **sealed ballots**. Each agent encrypts its vote client-side,
the contract tallies votes homomorphically (`FHE.add`), checks quorum on ciphertext
(`FHE.ge`), and **no individual vote is ever decrypted — by anyone, ever**. Only the
final verified/rejected boolean becomes publicly decryptable, and only after every
ballot is in.

| Field | Value |
|---|---|
| **Live site** | https://weft.thisyearnofear.com |
| **Confidential demo milestone** | [`0x40dd25aa...a7bc4490`](https://weft.thisyearnofear.com/project/0x40dd25aab4400b120c0d44870e851ff661a93af5454a4d175e44fb89a7bc4490?confidential=1) — verified, finalized, released |
| **Source** | https://github.com/thisyearnofear/weft |
| **Chain** | Sepolia (Zama FHEVM) — chain ID 11155111 |
| **WeftMilestoneConfidential** | [`0xaf29c8954c01bb39e370021b52da0685089fadc3`](https://sepolia.etherscan.io/address/0xaf29c8954c01bb39e370021b52da0685089fadc3) |
| **VerifierRegistry (Sepolia)** | [`0x4621743b127978b0c4c9950c1d2696954c27610b`](https://sepolia.etherscan.io/address/0x4621743b127978b0c4c9950c1d2696954c27610b) |
| **Sealed ballot txs** | [1](https://sepolia.etherscan.io/tx/0xb94346eedfd7ed29ac7708714939d8de1aeafb07c2ebc9ebbacd46d3e9d1de2b) · [2](https://sepolia.etherscan.io/tx/0xbad9aee10fbccc77c24834b5104158af609f5838ca83dea64c78ce9111540872) · [3](https://sepolia.etherscan.io/tx/0x00f36ce41e75587e7688cb3c6729dbcb77e16189a7bcbf170abc0e7214386dff) — no readable vote in any calldata |
| **Contracts** | `contracts/src-fhe/` (Foundry, `@fhevm/solidity` 0.11) |
| **Frontend** | Next.js + wagmi + `@zama-fhe/relayer-sdk` (lazy-loaded) |
| **Agent** | Python daemon + Node.js Zama encryption helper |

---

## The problem FHE actually solves here

Weft's public contract (live on 0G testnet since May 2026) has a real, observable
flaw: **verifier herding**. Votes are public the moment they land, so the third
verifier can watch the first two vote and free-ride on their judgment instead of
independently checking the evidence. In any consensus system where votes are
plaintext, late voters are structurally lazy voters.

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
```

Individual ballots stay encrypted onchain permanently. The relayer refuses to
decrypt the result until the contract finalizes — you can try it yourself on the
demo page ("Decrypt sealed result" before finalization fails, by design).

## What's confidential, precisely

| Value | Public contract | Confidential contract |
|---|---|---|
| Individual verifier votes | Visible immediately | **Encrypted forever (sealed ballot)** |
| Running tally | Visible | **Encrypted (`euint8`)** |
| Final verified result | Visible | Encrypted until all ballots cast, then publicly decryptable |
| Stake amounts | Visible | Visible (native ETH; staking privacy is future work via cERC-20 shielding) |

We deliberately do not claim stake-amount privacy — `msg.value` is inherently
public. The FHE win here is the sealed ballot, and we kept the claim honest.

## Architecture

**Additive, not a migration.** `WeftMilestone.sol` (public, 0G) is untouched. The
confidential contract runs alongside it and the frontend handles both:

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
6. The owner confirms the decrypted result onchain (`confirmResult`) and capital
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
