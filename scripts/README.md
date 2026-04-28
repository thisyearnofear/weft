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

## Addresses

Never hardcode deployed addresses. After deployment, read from `deployed-addresses.json`:

```bash
WEFT_ADDRESS=$(grep -oP '"weft":"[^"]*"' deployed-addresses.json | head -1 | cut -d'"' -f4)
```