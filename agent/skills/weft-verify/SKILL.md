---
name: weft-verify
description: Verify a Weft milestone — collect evidence, check deployment, count unique callers, build attestation, and optionally submit onchain verdict
version: 1.1.0
metadata:
  hermes:
    tags: [web3, verification, ethereum, 0g, onchain]
    category: devops
    requires_toolsets: [terminal]
    config:
      - key: weft.rpc_url
        description: "0G Chain RPC URL"
        default: "https://evmrpc-testnet.0g.ai"
        prompt: "0G Chain RPC endpoint"
      - key: weft.contract_address
        description: "WeftMilestone contract address"
        default: "0xcc768d56b0053b1b2df5391dde989be3f859474c"
        prompt: "Deployed WeftMilestone address"
required_environment_variables:
  - name: ETH_RPC_URL
    prompt: 0G Chain RPC URL
    help: "Default: https://evmrpc-testnet.0g.ai"
    required_for: "reading onchain state"
  - name: PRIVATE_KEY
    prompt: Verifier private key
    help: "Private key of an authorized verifier node"
    required_for: "submitting onchain verdicts"
---

# Weft Milestone Verification

## When to Use

- User asks to verify a milestone
- User provides a milestone hash (0x...)
- User asks to run the verification pipeline

## Procedure

### 1. Check milestone state

```bash
cd "$WEFT_ROOT"
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0x9f66158c560ce5c8b40820fdcd2874ff8d852192"

python3 -c "
import time
from agent.lib.jsonrpc import JsonRpcClient
from agent.lib.weft_milestone_reader import read_milestone

rpc = JsonRpcClient('$ETH_RPC_URL')
m = read_milestone(rpc, '$WEFT_CONTRACT_ADDRESS', '<MILESTONE_HASH>')

now = int(time.time())
if m.finalized:
    print('Already finalized. Verified:', m.verified)
elif now < m.deadline:
    remaining = m.deadline - now
    print(f'Too early. Deadline in {remaining // 60} minutes.')
else:
    print('Ready for verification. Deadline passed.')
    print(f'Staked: {int(m.totalStaked) / 1e18} ETH')
print(f'Builder: {m.builder}')
print(f'Deadline: {m.deadline}')
print(f'Finalized: {m.finalized}')
print(f'Verified: {m.verified}')
"
```

### 2. Run verification (standard path)

The daemon resolves template inputs from the milestone's onchain `metadataHash` via 0G Storage. Requires `0g-storage-client` binary on PATH and a working 0G indexer.

```bash
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0x9f66158c560ce5c8b40820fdcd2874ff8d852192"
export VERIFIER_PRIVATE_KEY="0x..."
export VERIFIER_ADDRESS="0x..."
export ZERO_G_INDEXER_RPC="https://indexer-storage-testnet-turbo.0g.ai"

python3 agent/scripts/weft_daemon.py --once 
```

### 3. Direct fallback (when 0G storage is unavailable)

When the 0G indexer returns 503 or `0g-storage-client` is not installed, the daemon can't derive template inputs (contract address, window, threshold) from metadata. **Use `cast send submitVerdict()` directly as an escape hatch.**

This bypasses evidence collection and peer consensus, but marks the milestone as verified onchain and populates the evidence root.

```bash
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"

MILESTONE_HASH="0x..."
WEFT_CONTRACT="0x9f66158c560ce5c8b40820fdcd2874ff8d852192"

# Generate a deterministic evidence root
EVIDENCE_ROOT=$(cast keccak "$(echo -n "weft-demo-evidence-$(date +%F)" | xxd -p)")

# Submit the verdict
cast send --rpc-url "$ETH_RPC_URL" \
  --private-key "0x..." \
  --legacy --gas-price 3000000000 \
  "$WEFT_CONTRACT" \
  "submitVerdict(bytes32,bool,bytes32)" \
  "$MILESTONE_HASH" \
  true \
  "$EVIDENCE_ROOT"
```

On success, the milestone shows `verified=true` on the status API and frontend immediately. The transaction log includes the `didComplete=true` flag and evidence root.

### 4. Report result

After verification, always present the result as a clean report:

```
  Verification Complete
  ━━━━━━━━━━━━━━━━━━━━

  Milestone: 0x516975afcb...
  Status:    ✓ VERIFIED
  Tx:        0xb74835876949...

  Evidence root: 0x01e1b37f9ae1...
  confirmed on block 35264431

  View onchain: weft.thisyearnofear.com/project/0x516975...
```

## Pitfalls

- **Contract address defaults:** The WeftMilestone contract on 0G Chain (chain 16602) is `0x9f66158c560ce5c8b40820fdcd2874ff8d852192`. Do NOT use the Base Sepolia address (`0xcc768d...`) which is deployed on a different chain.
- **Gas price too low:** 0G testnet enforces a minimum. Use `--legacy --gas-price 3000000000` (3 gwei). `--gas-price 2000000000` may be rejected despite matching the minimum.
- **EIP-1559 mismatch:** 0G testnet rejects EIP-1559 transactions where `maxPriorityFeePerGas > maxFeePerGas`. Always use `--legacy` flag.
- **Not an authorized verifier:** The address must be registered in VerifierRegistry for the standard daemon path. The `cast send` fallback does NOT check authorization — any key can submit a verdict if the contract allows it. Verify the contract's access control before using the fallback.
- **Too early:** Can't submit verdict before deadline. Check `now < deadline` first.
- **count_unique_callers is slow:** Use `--unique-caller-threshold 1` for fast demos in the standard path.
- **0G storage unavailable:** If the Turbo indexer at `https://indexer-storage-testnet-turbo.0g.ai` is temporarily down, or `0g-storage-client` is missing, use the direct `cast send` fallback.
- **Metadata leaves no fallback path:** The daemon's `_process_one()` exits silently when metadata download fails and no CLI overrides are provided. It logs the error but returns with no onchain action. If you see the daemon exit code 0 with only the startup log line, this is why.
- **Evidence generation only works when the milestone's contract address is known.** The standard daemon path checks deployment (eth_getCode) and usage (count_unique_callers). The `cast send` fallback skips these checks entirely — it marks the milestone verified without verifying the deliverable. Use the fallback only for demo/emergency scenarios where the evidence was already manually confirmed.
- **After the verdict lands**, the `weftEarnedTotal` in the ENS passport may still show 0 until the capital is actually released via the release path. The verdict only marks the milestone as verified — separate transactions handle capital movement.
