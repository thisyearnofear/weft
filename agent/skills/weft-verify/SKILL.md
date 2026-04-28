---
name: weft-verify
description: Verify a Weft milestone — collect evidence, check deployment, count unique callers, build attestation, and optionally submit onchain verdict
version: 1.0.0
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
      - key: weft.verifier_registry
        description: "VerifierRegistry contract address"
        default: "0x599e34de50379c584787e0b7ba616ac9b6723169"
        prompt: "Deployed VerifierRegistry address"
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
- User asks to check if a milestone is ready for verification
- User asks to submit a verdict onchain

## Context

Weft is a milestone-based escrow protocol on 0G Chain. Builders create milestones with deadlines, backers stake ETH, and authorized verifiers vote on whether the milestone was completed.

**Contract:** WeftMilestone at `0xcc768d56b0053b1b2df5391dde989be3f859474c` on 0G Galileo testnet.

**Verification flow:**
1. Read milestone state from chain (deadline, finalized, verified)
2. Check if deadline has passed (only verifiable after deadline)
3. Collect deployment evidence (contract code exists at address)
4. Count unique callers in measurement window
5. Build attestation JSON
6. Generate narrative via Kimi (optional, see weft-narrate skill)
7. Submit verdict onchain via `submitVerdict(bytes32,bool,bytes32)`

## Procedure

### 1. Check milestone state

```bash
cd ~/weft
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0xcc768d56b0053b1b2df5391dde989be3f859474c"

# Read milestone data
cast call $WEFT_CONTRACT_ADDRESS \
  "milestones(bytes32)(bytes32,bytes32,bytes32,address,uint64,uint64,uint256,bool,bool,bool,uint8,uint8,bytes32)" \
  <MILESTONE_HASH> \
  --rpc-url $ETH_RPC_URL
```

Key fields in order:
- projectId, templateId, metadataHash
- builder address
- createdAt, deadline (unix timestamps)
- totalStaked (wei)
- finalized, verified, released (booleans)
- verifierCount, verifiedVotes
- finalEvidenceRoot

### 2. Check if deadline has passed

```bash
python3 -c "
import time
deadline = <DEADLINE_FROM_STEP_1>
now = int(time.time())
print(f'Deadline: {deadline}, Now: {now}, Passed: {now >= deadline}')
print(f'Remaining: {max(0, deadline - now)}s ({max(0, (deadline - now) // 60)}min)')
"
```

### 3. Run verification

```bash
cd ~/weft
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export WEFT_CONTRACT_ADDRESS="0xcc768d56b0053b1b2df5391dde989be3f859474c"
export PRIVATE_KEY="<verifier_private_key>"
export VERIFIER_ADDRESS="<verifier_address>"

python3 agent/scripts/weft_daemon.py --once \
  --contract-address <CONTRACT_ADDRESS_FROM_METADATA> \
  --measurement-window-seconds <WINDOW_FROM_METADATA> \
  --unique-caller-threshold <THRESHOLD_FROM_METADATA>
```

### 4. Submit verdict manually (if daemon path fails)

```bash
cast send $WEFT_CONTRACT_ADDRESS \
  "submitVerdict(bytes32,bool,bytes32)" \
  <MILESTONE_HASH> \
  true \
  <EVIDENCE_ROOT> \
  --rpc-url $ETH_RPC_URL \
  --private-key $PRIVATE_KEY \
  --gas-price 10gwei --priority-gas-price 5gwei
```

## Pitfalls

- **Gas price too low:** 0G testnet requires minimum 2 gwei tip. Use `--gas-price 10gwei --priority-gas-price 5gwei`.
- **Not an authorized verifier:** The address must be registered in VerifierRegistry via `addVerifier()`.
- **Too early:** Can't submit verdict before deadline. Check `deadline` field first.
- **Already finalized:** Can't vote twice or after quorum is reached.
- **count_unique_callers is slow:** On large block ranges, scanning can take minutes. Use `--unique-caller-threshold 1` for fast demos.

## Verification

After submitting:
```bash
cast call $WEFT_CONTRACT_ADDRESS \
  "milestones(bytes32)(bytes32,bytes32,bytes32,address,uint64,uint64,uint256,bool,bool,bool,uint8,uint8,bytes32)" \
  <MILESTONE_HASH> --rpc-url $ETH_RPC_URL
```

Check that `finalized=true` and `verified=true`.
