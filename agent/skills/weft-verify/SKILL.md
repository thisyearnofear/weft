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
cd ~/weft
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0xcc768d56b0053b1b2df5391dde989be3f859474c"

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
"
```

### 2. Run verification

```bash
export PRIVATE_KEY="<verifier_private_key>"
export VERIFIER_ADDRESS="<verifier_address>"

python3 agent/scripts/weft_daemon.py --once \
  --contract-address <CONTRACT_ADDRESS> \
  --measurement-window-seconds <WINDOW> \
  --unique-caller-threshold <THRESHOLD>
```

### 3. Report result

After verification, always present the result as a clean report:

```
  Verification Complete
  ━━━━━━━━━━━━━━━━━━━━

  Milestone: 0x0f93e22d...
  Status:    ✓ VERIFIED

  Evidence collected:
  • Contract deployed at 0x1234...5678
  • 147 unique callers in measurement window
  • 3/3 verifiers agreed
  • Evidence root: 0xabc123...

  Onchain vote submitted.
  View: weft.build/project/0x0f93e22d...
```

## Pitfalls

- **Gas price too low:** 0G testnet requires minimum 2 gwei tip. Use `--gas-price 10gwei --priority-gas-price 5gwei`.
- **Not an authorized verifier:** The address must be registered in VerifierRegistry.
- **Too early:** Can't submit verdict before deadline.
- **count_unique_callers is slow:** Use `--unique-caller-threshold 1` for fast demos.
