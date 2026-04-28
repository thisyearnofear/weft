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