# Weft Scripts

Shell scripts for deploying and managing Weft contracts and verifier nodes.

## Scripts

### `deploy.sh`
Deploys `WeftMilestone` + `VerifierRegistry` to the target chain via Foundry.

```bash
export DEPLOYER_KEY=0x...       # required
export OWNER_ADDRESS=0x...     # defaults to DEPLOYER_KEY
export ETH_RPC_URL=https://...  # defaults to http://127.0.0.1:8545
./deploy.sh
```

Writes deployed addresses to `deployed-addresses.json` (gitignored).

### `register-verifier.sh`
Registers a Hermes node address in `VerifierRegistry`.

```bash
export DEPLOYER_KEY=0x...      # owner private key
export ETH_RPC_URL=https://... # defaults to http://127.0.0.1:8545
export VERIFIER_ADDRESS=0x...  # address to register
./register-verifier.sh
```

Reads `VERIFIER_REGISTRY` from `deployed-addresses.json` if not set.

### `deploy_fhe_sepolia.sh`
Deploys `WeftMilestoneConfidential` + `VerifierRegistry` (Zama FHEVM) to Sepolia
and funds the three verifier wallets with gas for encrypted votes.

```bash
# Reads .env.fhe.local at the repo root (DEPLOYER_KEY, VERIFIER_1..3, SEPOLIA_RPC_URL)
./deploy_fhe_sepolia.sh
```

### `demo_fhe_e2e.sh`
Runs the full sealed-ballot lifecycle on Sepolia: create confidential milestone
(short deadline) → stake → wait → three encrypted verifier ballots → public
decryption of the sealed result via the Zama relayer → `confirmResult` → `release`.

```bash
# Requires WEFT_MILESTONE_CONFIDENTIAL in .env.fhe.local (set by deploy_fhe_sepolia.sh)
DEADLINE_SECS=180 STAKE_ETH=0.02ether ./demo_fhe_e2e.sh
```

### `deploy-frontend.sh`
Deploys the frontend to the VPS: builds locally to verify, rsyncs source to the
server, installs + builds there, restarts the `weft-frontend` PM2 process, and
health-checks `https://weft.thisyearnofear.com`.

## Environment Variables

All required and optional env vars are documented in `scripts/.env` (gitignored).

| Variable | Required | Description |
|---|---|---|
| `ETH_RPC_URL` | Yes | Chain RPC |
| `PRIVATE_KEY` | Yes | Verifier wallet key |
| `VERIFIER_ADDRESS` | Yes | Verifier wallet address |
| `WEFT_CONTRACT_ADDRESS` | Yes | Deployed WeftMilestone |
| `VERIFIER_REGISTRY` | Yes | Deployed VerifierRegistry |
| `ZERO_G_INDEXER_RPC` | For 0G | 0G Storage indexer |
| `ZERO_G_PRIVATE_KEY` | For 0G | 0G signer key |
| `ZERO_G_STREAM_ID` | For KV | 0G KV stream |
| `KIMI_API_KEY` | For Kimi | Kimi narrative generation |
| `FAL_KEY` | For fal.ai | fal.ai API key for AI-woven milestone swatches + chronicle covers |
| `KEEPERHUB_API_KEY` | Optional | KeeperHub reliable execution |
| `WEFT_BUILDER_ENS` | Optional | Builder ENS name (e.g. `mybuilder.eth`) |
| `WEFT_ENS_PARENT` | Optional | ENS parent for subname issuance (e.g. `weft.eth`) |

## Addresses

Never hardcode deployed addresses. After deployment, read from `deployed-addresses.json`:

```bash
WEFT_ADDRESS=$(grep -oP '"weft":"[^"]*"' deployed-addresses.json | head -1 | cut -d'"' -f4)
```