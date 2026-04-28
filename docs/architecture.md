# Weft Architecture

## System Overview

Weft is an autonomous coordination layer that replaces four institutional primitives:
1. **Identity** → ENS with text records
2. **Funding** → Milestone staking contracts
3. **Verification** → Hermes Agent + AXL consensus
4. **Settlement** → KeeperHub + Uniswap

## Component Diagram

```
Builder (ENS)
    │
    ▼ createMilestone()
WeftMilestone.sol (0G Chain)
    │ stake()
    ▼ deadline triggers
Hermes Agent / agent/lib/
    │
    ├─ github_client.py   (git commits/PRs)
    ├─ mvp_verifier.py     (deployment + usage)
    ├─ kimi_client.py     (narrative synthesis)
    ├─ zero_storage.py    (0G Storage write)
    ├─ ens_client.py      (ENS profile update)
    ├─ axl_client.py     (peer broadcast)
    └─ peer_inbox.py     (peer verdict tally)
    │
    ▼ submitVerdict()
AXL consensus ──2-of-3──► onchain
                                   │
                                   ▼ release/refund
```

## Implemented Structure

### Contracts (`contracts/src/`)

| Contract | Purpose |
|---|---|
| `WeftMilestone.sol` | Milestone staking + 2-of-3 verifier quorum |
| `VerifierRegistry.sol` | Authorized verifier node registry |
| `interfaces/IKeeperHub.sol` | KeeperHub interface (stub) |
| `interfaces/IWeftMilestone.sol` | ABI interface for external callers |

### Agent Library (`agent/lib/`)

Single source of truth — all Python modules:

| Module | Purpose |
|---|---|
| `jsonrpc.py` | RPC client with file caching |
| `abi.py` | Pure ABI encoding/decoding |
| `weft_milestone_reader.py` | Reads milestone from contract |
| `mvp_verifier.py` | Build attestation (deployment + usage) |
| `github_client.py` | GitHub commits/PRs evidence |
| `kimi_client.py` | Narrative synthesis |
| `zero_storage.py` | 0G Storage write (with fallback) |
| `ens_client.py` | ENS text record updates |
| `axl_client.py` | Peer broadcast + receive + tally |
| `peer_inbox.py` | Filesystem-based verdict aggregation |
| `indexer_client.py` | Unified indexer (KV fallback) |
| `deadline_scheduler.py` | Poll for pending milestones |

### Agent Scripts (`agent/scripts/`)

| Script | Purpose |
|---|---|
| `weft_collect_attestation.py` | Full verification pipeline |
| `weft_daemon.py` | Autonomous verification loop |
| `weft_peer_server.py` | Receive peer broadcasts |
| `weft_sync_from_indexer.py` | Sync milestone state |
| `weft_verify_and_vote.sh` | Shell wrapper |

### Tests

- **Forge**: `contracts/test/` — 10 passing tests
- **Pytest**: `agent/test/` — 29 passing tests

## What Was Consolidated

The original `agent/skills/` SKILL.md files were deleted — the functionality was consolidated into the Python library:

- `mvp_verifier.py` replaces `weft-verify` skill
- `ens_client.py` replaces `weft-ens` skill
- `mvp_verifier.build_attestation()` replaces `weft-attest` skill

## Dependencies

- **0G Chain** — Deployment target
- **Foundry** — Smart contract development
- **Python 3** — Agent scripts
- **Next.js** — Frontend scaffold

## Security

- Multi-sig verification (2-of-3 Hermes nodes)
- Time-locked release mechanism
- Evidence immutability via 0G Storage
- Reentrancy guards on release/refund
- Pre-commit secrets hook (`.git/hooks/pre-commit`)