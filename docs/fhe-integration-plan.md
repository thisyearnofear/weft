# Zama FHE Integration Plan — Confidential Milestones

## Overview

Additive integration of Zama's FHEVM protocol to Weft, enabling **confidential
milestones** alongside the existing public milestone flow. The milestone creator
chooses at creation time: public (current behavior, full transparency) or
confidential (sealed-ballot verifier consensus, encrypted stake amounts).

**This is additive, not a migration.** `WeftMilestone.sol` is not modified. A new
`WeftMilestoneConfidential.sol` contract runs alongside it, sharing the existing
`VerifierRegistry`. The frontend, agent, and explorer handle both types.

## Why FHE adds value (user-facing)

| User | Today (public) | With FHE (confidential option) |
|---|---|---|
| **Sponsors** | Stake amounts visible to competitors on the explorer | Amounts encrypted — competitors see a milestone exists but not the capital behind it |
| **Verifiers** | Can see other verifiers' votes before submitting their own (herd-following bias) | Sealed-ballot: all votes encrypted, contract computes quorum on encrypted booleans without decrypting individual votes |
| **Builders** | Earnings public on the explorer | Release amounts confidential |
| **Weft** | Fee (3% of released capital) is public | Fee computed on encrypted release amount — pricing not visible to competitors |

## Core Principles Applied

### ENHANCEMENT FIRST
- `WeftMilestone.sol` — **not modified**, stays deployed on 0G Chain
- `MilestoneCard.tsx` — **enhanced** with a `confidential` prop (redacted display)
- `CreateMilestoneForm.tsx` — **enhanced** with a confidential toggle
- Explorer — **enhanced** to handle both milestone types
- Verifier daemon — **enhanced** with a confidential vote path (existing public path unchanged)

### CONSOLIDATION
- No duplicate contract logic — shared errors extracted to a common library
- No duplicate frontend components — single `MilestoneCard` handles both types via prop
- No duplicate agent code — evidence collection is shared; only vote encryption differs

### PREVENT BLOAT
- Zama SDK is **lazy-loaded** only when a confidential milestone is encountered (code splitting)
- FHE operations are gas-heavy — confidential contract minimizes on-chain computation
- No new UI framework or state management — uses existing wagmi + TanStack Query stack

### DRY
- `VerifierRegistry.sol` — shared by both contracts (already separate)
- Error definitions — extracted to `WeftErrors.sol` library, imported by both contracts
- Frontend milestone display — single `MilestoneCard` component, `confidential` prop controls display
- Agent evidence collection — shared `mvp_verifier.py` + `github_client.py`; only `fhe_client.py` is new

### CLEAN
- `WeftMilestoneConfidential.sol` — clear dependency on FHEVM library + `VerifierRegistry`
- `fhe-config.ts` — isolated Zama SDK configuration, separate from existing wagmi config
- `fhe_client.py` — isolated FHE encryption helper, called only for confidential milestones

### MODULAR
- Each new file is independently testable
- `WeftMilestoneConfidential.sol` can be deployed/removed without affecting the public contract
- Frontend confidential support can be feature-flagged off without breaking public milestones
- Agent FHE path is a separate module that the daemon calls conditionally

### PERFORMANT
- Zama SDK loaded via dynamic `import()` only on confidential milestone pages
- Encrypted vote count stored as `euint8` (smallest sufficient type) to minimize gas
- Frontend cache: decrypted values cached in TanStack Query (same pattern as existing hooks)

### ORGANIZED

New files follow existing directory conventions:

```
contracts/src/
├── WeftMilestone.sol                     (unchanged)
├── WeftMilestoneConfidential.sol          (new — FHEVM confidential escrow)
├── VerifierRegistry.sol                   (shared, unchanged)
├── utils/
│   ├── Ownable.sol                        (unchanged)
│   ├── ReentrancyGuard.sol                (unchanged)
│   └── WeftErrors.sol                     (new — shared error definitions)
└── interfaces/
    ├── IWeftMilestone.sol                 (unchanged)
    └── IWeftMilestoneConfidential.sol      (new — confidential ABI)

contracts/test/
└── WeftMilestoneConfidential.t.sol        (new — FHEVM tests)


## Contract Architecture

### `WeftMilestoneConfidential.sol`

Based on the FHEVM patterns from Zama's hardhat template (`FHECounter.sol`):

```solidity
import {FHE, euint256, euint8, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
```

| Field | Public contract type | Confidential contract type | Notes |
|---|---|---|---|
| `totalStaked` | `uint256` | `euint256` | Stake amounts encrypted |
| `verifiedVotes` | `uint8` | `euint8` | Encrypted vote count |
| `verified` | `bool` | `ebool` | Encrypted result (ACL-decryptable) |
| Individual vote | `bool didComplete` | `ebool` (via `externalEuint32` + `FHE.fromExternal`) | Sealed ballot — never decrypted |
| Quorum check | `if (m.verifiedVotes >= quorum)` | `FHE.ge(verifiedVotes, quorum)` | FHE comparison on encrypted values |
| `release()` | Public ETH transfer | Release to encrypted balance (shield pattern) | Amount confidential |

### Quorum logic (the FHE differentiator)

```
verifier submits ebool vote -> FHE.add(verifiedVotes, voteAsEuint8)
                           -> FHE.ge(verifiedVotes, quorum) -> ebool result
                           -> if result is true: finalize, allow ACL decryption of verified
                           -> individual votes stay encrypted permanently
```

The contract determines whether quorum was reached **without decrypting any
individual vote**. This is the sealed-ballot consensus that's impossible without FHE.

### `WeftErrors.sol` (shared library)

Extracted from both contracts to avoid duplication:

```solidity
library WeftErrors {
    error MilestoneNotFound();
    error AlreadyExists();
    error NotVerifier();
    error NotVerified();
    error AlreadyReleased();
    error MilestoneNotFailed();
    error NothingToRefund();
    error TimeoutNotReached();
    error TooEarly();
    error TransferFailed();
    error NoSplits();
    error DeadlinePassed();
}
```

## Frontend Architecture

### Display: `MilestoneCard` enhancement

The existing `MilestoneCard.tsx` gains a `confidential?: boolean` prop:

- `confidential={false}` (default): current behavior — shows stake amount, vote count, evidence root
- `confidential={true}`: shows "Confidential" badge, redacts stake amount ("Confidential"), shows "Sealed ballot — 2/3 quorum reached" instead of individual vote counts

No new component. No new CSS file. The existing `MilestoneCard.module.css` gets a `.confidentialBadge` class.

## Agent Architecture

### `fhe_client.py`

New module in `agent/lib/`. Called by the daemon **only** when a milestone is
detected as confidential (the daemon reads a `confidential` flag from the
milestone metadata on 0G Storage).

For confidential milestones, instead of
`cast send submitVerdict(hash, true, evidenceRoot)`, the daemon calls:

```python
fhe_client.submit_encrypted_verdict(
    milestone_hash, did_complete=True, evidence_root=...
)
```

Which internally calls the JS helper `fhe_encrypt_vote.mjs` to encrypt the
`didComplete` boolean using the Zama SDK, then submits the encrypted vote
onchain.

### `fhe_encrypt_vote.mjs`

Small Node.js script that uses `@zama-fhe/sdk` to:
1. Encrypt a boolean as `euint32` (0 or 1)
2. Return the encrypted handle + proof
3. Submit the `submitVerdict` transaction with encrypted parameters

Called as a subprocess by `fhe_client.py` (same pattern as the existing `cast`
subprocess calls in `eth_rpc.py`).

## Deployment

| Contract | Chain | Purpose |
|---|---|---|
| `WeftMilestone.sol` | 0G Chain (Galileo testnet) | Existing public milestones — unchanged |
| `WeftMilestoneConfidential.sol` | Sepolia (Zama FHEVM) | New confidential milestones — Zama submission |

Both contracts share the same `VerifierRegistry` (deployed once per chain).

## Zama Developer Program Requirements

| Requirement | Status |
|---|---|
| Functioning dApp demo using Zama Protocol | This plan — `WeftMilestoneConfidential.sol` + frontend |
| Smart contract + Frontend code base | Both in this repo (Foundry + Next.js) |
| Working demo deployed on a website | Deploy to Sepolia + update frontend |
| 3-minute video demo (real person) | Manual — pitch: "confidential escrow with sealed-ballot verifier consensus" |
| Thread/article on X | Manual — narrative: "public and confidential milestones, creator chooses" |
| Deploy on Sepolia or Ethereum mainnet | `WeftMilestoneConfidential.sol` on Sepolia |

## Implementation Phases

### Phase 1: Contract (foundational)
1. Install FHEVM Hardhat plugin / Foundry integration in `contracts/`
2. Extract `WeftErrors.sol` shared library
3. Write `WeftMilestoneConfidential.sol` with FHEVM types
4. Write `WeftMilestoneConfidential.t.sol` tests (using FHEVM mock)
5. Deploy to Sepolia

### Phase 2: Frontend (user-facing)
1. Add `@zama-fhe/react-sdk` + `@zama-fhe/sdk` dependencies
2. Create `fhe-config.ts` (Zama provider config)
3. Enhance `MilestoneCard.tsx` with `confidential` prop
4. Enhance `CreateMilestoneForm.tsx` with confidential toggle
5. Create `useConfidentialMilestone.ts` hook
6. Generate `WeftMilestoneConfidential.json` ABI

### Phase 3: Agent (autonomous verification)
1. Create `fhe_encrypt_vote.mjs` (Zama SDK encryption helper)
2. Create `fhe_client.py` (Python wrapper calling the JS helper)
3. Enhance `weft_daemon.py` to detect confidential milestones and route to FHE path
4. Test end-to-end: daemon collects evidence -> encrypts vote -> submits on Sepolia

### Phase 4: Submission materials
1. Deploy demo milestone on Sepolia
2. Record 3-minute video (manual)
3. Write X thread (manual)


### Creation: `CreateMilestoneForm` enhancement

The existing form gains a toggle: "Make this milestone confidential (sealed-ballot verification, encrypted stake amounts)". When toggled on, the form calls `WeftMilestoneConfidential.createMilestone()` instead of `WeftMilestone.createMilestone()`.

### Zama SDK: `fhe-config.ts`

New file, isolated from the existing wagmi config. The `ZamaProvider` wraps the app alongside the existing `WagmiProvider` — both providers coexist. Public milestones use wagmi directly; confidential milestones use the Zama SDK hooks.

### Hook: `useConfidentialMilestone.ts`

New hook for reading/decrypting confidential milestone data. Uses TanStack Query (same as existing `useStatusApi`, `useExplorer` hooks) for caching decrypted values.

frontend/src/
├── lib/
│   ├── abis/
│   │   ├── WeftMilestone.json             (unchanged)
│   │   └── WeftMilestoneConfidential.json  (new)
│   ├── contracts.ts                       (enhanced — add confidential contract address)
│   └── fhe-config.ts                      (new — Zama SDK provider config)
├── components/
│   ├── MilestoneCard.tsx                  (enhanced — confidential prop)
│   └── CreateMilestoneForm.tsx            (enhanced — confidential toggle)
└── hooks/
    └── useConfidentialMilestone.ts        (new — encrypted read/decrypt hook)

agent/
├── lib/
│   └── fhe_client.py                      (new — calls JS helper for encryption)
└── scripts/
    └── fhe_encrypt_vote.mjs               (new — Zama SDK encryption helper)
```


The key FHE capability: the contract enforces 2-of-3 quorum by computing
`encryptedVerifiedVotes >= encryptedQuorum` — producing an encrypted boolean
result. Individual votes are never decrypted. Only the final `verified` outcome
is decryptable via ACL.
