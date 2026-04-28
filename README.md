# Weft

**The verifiable reputation and milestone-funding layer for fluid builder teams.**

## What It Does

Weft replaces four things that currently require corporations, lawyers, and managers:

| Primitive | Replaced by |
|---|---|
| Identity / CV | ENS text records (portable, machine-readable) |
| Funding / equity | `WeftMilestone.sol` — milestone-staked ETH |
| Verification / managers | Hermes Agent verification loop |
| Settlement / payroll | KeeperHub reliable execution (ETH-only; Uniswap routing deferred) |

## Hermes Agent Architecture

Weft's verification layer is a **multi-node autonomous Hermes Agent system**. Each node runs an independent Python daemon that:

1. **Polls** onchain milestones past their deadline via `DeadlineScheduler`
2. **Collects** deterministic evidence (deployment check + unique caller count)
3. **Generates** a human-readable narrative from raw attestation data using **Kimi** (`moonshot-v1-128k`)
4. **Broadcasts** verdicts to peer nodes for offchain consensus
5. **Submits** onchain votes via KeeperHub (with `cast send` fallback)
6. **Publishes** evidence bundles + consensus proofs to 0G Storage

```
┌─────────────────────────────────────────────────────────┐
│                    0G Galileo Testnet                    │
│  WeftMilestone: 0xcc76...474c                           │
│  VerifierRegistry: 0x599e...3169                        │
└──────────┬──────────────┬──────────────┬────────────────┘
           │              │              │
     ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
     │ Verifier 1│ │ Verifier 2│ │ Verifier 3│
     │ (daemon)  │ │ (daemon)  │ │ (daemon)  │
     │           │ │           │ │           │
     │ • poll    │ │ • poll    │ │ • poll    │
     │ • verify  │ │ • verify  │ │ • verify  │
     │ • narrate │ │ • narrate │ │ • narrate │  ← Kimi narrative generation
     │ • vote    │ │ • vote    │ │ • vote    │
     └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
           │              │              │
           └──── peer inbox broadcast ──┘
                  (consensus root)
```

### Kimi Integration

Each verification cycle optionally calls Kimi to transform raw attestation JSON into a builder-facing narrative:

```python
from agent.lib.kimi_client import generate_narrative

narrative = generate_narrative(attestation)
# → "Your milestone was verified: 147 unique callers interacted with
#    the contract within the measurement window. Deployment confirmed
#    at block 12,345,678. Evidence root: 0xabc..."
```

This runs **autonomously** within the daemon — no human-in-the-loop. The narrative is persisted alongside the attestation and published to 0G Storage as part of the evidence bundle.

## Quick Start

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Init dependencies (one-time)
git submodule update --init --recursive

# Run tests
forge test

# Deploy locally
DEPLOYER_KEY=0x... ETH_RPC_URL=http://127.0.0.1:8545 ./scripts/deploy.sh

# Builder onboarding (alpha)
python3 scripts/weft_builder.py init-metadata \
  --chain-id 16600 \
  --contract-address 0x0000000000000000000000000000000000000000 \
  --deadline 1710000000 \
  --upload-0g

python3 scripts/weft_builder.py verify-metadata \
  --root 0x... \
  --expect-chain-id 16600 \
  --expect-contract-address 0x0000000000000000000000000000000000000000 \
  --expect-deadline 1710000000

python3 scripts/weft_builder.py create-milestone \
  --rpc-url "$ETH_RPC_URL" \
  --weft "$WEFT_CONTRACT_ADDRESS" \
  --private-key 0x... \
  --project "my-project" \
  --metadata-root 0x... \
  --indexer "$ZERO_G_INDEXER_RPC"

# Tip: add --dry-run to create-milestone to print computed milestoneHash + calldata

python3 scripts/weft_builder.py stake \
  --rpc-url "$ETH_RPC_URL" \
  --weft "$WEFT_CONTRACT_ADDRESS" \
  --private-key 0x... \
  --milestone-hash 0x... \
  --value-eth 0.05

python3 scripts/weft_builder.py status \
  --rpc-url "$ETH_RPC_URL" \
  --weft "$WEFT_CONTRACT_ADDRESS" \
  --milestone-hash 0x...

# Collect attestation (MVP)
python agent/scripts/weft_collect_attestation.py \
  --rpc-url "http://127.0.0.1:8545" \
  --weft-milestone "0x..." \
  --milestone-hash "0x..." \
  --contract-address "0x..." \
  --out agent/.attestations/attestation.json

# Run verifier daemon (MVP)
ETH_RPC_URL="http://127.0.0.1:8545" \
WEFT_CONTRACT_ADDRESS="0x..." \
PRIVATE_KEY="0x..." \
ZERO_G_INDEXER_RPC="https://..." \
python3 agent/scripts/weft_daemon.py --once

# Run builder status API (read-only)
ETH_RPC_URL="http://127.0.0.1:8545" \
WEFT_CONTRACT_ADDRESS="0x..." \
ZERO_G_INDEXER_RPC="https://..." \
python3 agent/scripts/weft_status_api.py --port 9010
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ETH_RPC_URL` | Yes | 0G Chain RPC |
| `WEFT_CONTRACT_ADDRESS` | Yes | Deployed WeftMilestone |
| `GITHUB_TOKEN` | No | GitHub API for commits/PRs |
| `KIMI_API_KEY` | No | Kimi API for narrative |
| `KEEPERHUB_API_KEY` | No | KeeperHub reliable execution (fallback: `cast send`) |
| `ZERO_G_INDEXER_RPC` | Yes (verifier) | Milestone metadata lookup |
| `ZERO_G_*` | No | 0G Storage config (publish evidence/bundles) |

See [AGENTS.md](AGENTS.md) for the full environment variable reference.

## Links

- [Technical Architecture](docs/architecture.md)
- [MVP Spec](docs/mvp.md)
- [Agent Workflow](AGENTS.md)

## Deployed Contracts

**0G Galileo Testnet (Chain ID: 16602)**

| Contract | Address |
|---|---|
| WeftMilestone | `0xcc768d56b0053b1b2df5391dde989be3f859474c` |
| VerifierRegistry | `0x599e34de50379c584787e0b7ba616ac9b6723169` |

**RPC**: `https://evmrpc-testnet.0g.ai`

**Explorer**: `https://explorer-testnet.0g.ai`

## License

MIT