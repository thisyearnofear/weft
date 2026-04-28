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

# Install forge-std (one-time)
cd contracts && forge install foundry-rs/forge-std && cd ..

# Run tests
forge test

# Deploy locally
DEPLOYER_KEY=0x... ETH_RPC_URL=http://127.0.0.1:8545 ./scripts/deploy.sh

# Collect attestation (MVP)
python agent/scripts/weft_collect_attestation.py \
  --rpc-url "http://127.0.0.1:8545" \
  --weft-milestone "0x..." \
  --milestone-hash "0x..." \
  --contract-address "0x..." \
  --out agent/.attestations/attestation.json
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ETH_RPC_URL` | Yes | 0G Chain RPC |
| `WEFT_CONTRACT_ADDRESS` | Yes | Deployed WeftMilestone |
| `GITHUB_TOKEN` | No | GitHub API for commits/PRs |
| `KIMI_API_KEY` | No | Kimi API for narrative |
| `ZERO_G_*` | No | 0G Storage config |

## Links

- [MVP Spec](docs/mvp.md)
- [Agent Workflow](AGENTS.md)
- [Technical Architecture](docs/architecture.md)

## License

MIT