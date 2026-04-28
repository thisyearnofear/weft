# Weft

**The verifiable reputation and milestone-funding layer for fluid builder teams.**

## What It Does

Weft replaces four things that currently require corporations, lawyers, and managers:

| Primitive | Replaced by |
|---|---|
| Identity / CV | ENS text records (portable, machine-readable) |
| Funding / equity | `WeftMilestone.sol` — milestone-staked ETH |
| Verification / managers | Hermes Agent verification loop |
| Settlement / payroll | KeeperHub + Uniswap revenue routing (planned) |

## Architecture

```
weft/
├── contracts/              # Solidity contracts + tests (Foundry)
│   ├── src/               # WeftMilestone, VerifierRegistry, interfaces/
│   ├── script/            # Deployment scripts
│   └── test/              # Test suite (3 tests passing)
├── agent/                 # Hermes agent layer
│   ├── lib/               # Single source of truth (jsonrpc, abi, github, kimi, ...)
│   ├── scripts/          # CLI entry points
│   └── hermes.config.yml # Agent configuration
├── scripts/              # deploy.sh, register-verifier.sh
├── docs/                 # mvp.md, architecture.md
└── AGENTS.md             # Agent workflow reference
```

## Core Components

### Contracts (`contracts/src/`)

- **WeftMilestone.sol** — milestone-based escrow with 2-of-3 verifier quorum
- **VerifierRegistry.sol** — authorized Hermes node registry
- **interfaces/** — `IKeeperHub.sol`, `IWeftMilestone.sol` (pluggable interfaces)

### Agent (`agent/lib/`)

- **jsonrpc.py** — JSON-RPC client with file caching
- **github_client.py** — GitHub commits/PRs in milestone window
- **kimi_client.py** — Kimi API for narrative generation (stubbed)
- **zero_storage.py** — 0G Storage read/write (env var config)
- **deadline_scheduler.py** — polls for milestones past deadline
- **indexer_client.py** — unified indexer with KV fallback

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
#
# 1) Create milestone metadata (optionally upload to 0G for a metadataHash root)
# 2) Create milestone onchain (deterministically computes milestoneHash)
# 3) Stake into milestone
python3 scripts/weft_builder.py init-metadata \
  --chain-id 16600 \
  --contract-address 0x0000000000000000000000000000000000000000 \
  --deadline 1710000000 \
  --upload-0g

# Optional (recommended): verify the uploaded metadata before creating a milestone
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

# Tip: add --dry-run to print computed milestoneHash + exact calldata for debugging/support.

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
| `ZERO_G_INDEXER_RPC` | Yes (verifier) | Needed so verifier can download milestone metadata by `metadataHash` |
| `ZERO_G_*` | No | 0G Storage config (publish evidence/bundles) |

## Links

- [MVP Spec](docs/mvp.md)
- [Agent Workflow](AGENTS.md)
- [Technical Architecture](docs/architecture.md)

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
