---
name: weft-ens
description: Update ENS text records after milestone verification — portable onchain reputation
version: 1.0.0
metadata:
  hermes:
    tags: [web3, ens, identity, reputation, ethereum]
    category: devops
    requires_toolsets: [terminal]
required_environment_variables:
  - name: ETH_RPC_URL
    prompt: 0G Chain RPC URL
    help: "Default: https://evmrpc-testnet.0g.ai"
    required_for: "writing ENS records"
  - name: PRIVATE_KEY
    prompt: Verifier private key
    help: "Must own or control the target ENS name"
    required_for: "signing ENS transactions"
---

# Weft ENS Reputation Updates

## When to Use

- After a milestone is verified, update the builder's ENS text records
- User asks to update ENS reputation for a builder
- User asks what ENS records Weft writes
- User wants to check a builder's onchain reputation

## What Gets Written

Weft writes these ENS text records to the builder's name:

| Record | Example | Description |
|---|---|---|
| `weft.projects` | `["0xabc..."]` | JSON array of project IDs |
| `weft.milestones.verified` | `3` | Count of verified milestones |
| `weft.earned.total` | `5000000000000000000` | Total earned in wei |
| `weft.cobuilders` | `["alice.eth","bob.eth"]` | JSON array of co-builder ENS names |
| `weft.reputation.score` | `85` | Computed reputation score |
| `weft.milestone.0xabc.status` | `released` | Per-milestone status |
| `weft.milestone.0xabc.evidence` | `0xdef...` | Per-milestone evidence root |
| `weft.milestone.0xabc.timestamp` | `1777408911` | Verification timestamp |

## Procedure

### 1. Update records via daemon (automatic)

When `--builder-ens` is set, the daemon writes ENS records after verification:

```bash
cd ~/weft
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export PRIVATE_KEY="<verifier_key>"

python3 agent/scripts/weft_daemon.py --once \
  --builder-ens "mybuilder.eth" \
  --contract-address 0x0000000000000000000000000000000000000001 \
  --measurement-window-seconds 86400 \
  --unique-caller-threshold 1
```

### 2. Update records manually

```bash
cd ~/weft
export ETH_RPC_URL="https://evmrpc-testnet.0g.ai"
export PRIVATE_KEY="<verifier_key>"

python3 -c "
from agent.lib.ens_client import EnsClient

client = EnsClient(
    rpc_url='$ETH_RPC_URL',
    wallet_key='$PRIVATE_KEY',
)

# Update profile
client.update_builder_profile(
    'mybuilder.eth',
    add_project='0xabc123...',
    increment_verified=True,
    add_earnings=3500000000000000000,  # 3.5 ETH in wei
)
print('ENS records updated')
"
```

### 3. Read builder profile

```bash
python3 -c "
from agent.lib.ens_client import EnsClient

client = EnsClient(
    rpc_url='$ETH_RPC_URL',
    wallet_key='',
)

profile = client.read_builder_profile('mybuilder.eth')
print(f'Projects:    {profile.projects}')
print(f'Verified:    {profile.milestones_verified}')
print(f'Earned:      {profile.earned_total / 1e18} ETH')
print(f'Cobuilders:  {profile.cobuilders}')
print(f'Reputation:  {profile.reputation_score}')
"
```

## Output Format

After updating ENS records, present:

```
  ENS Reputation Updated
  ━━━━━━━━━━━━━━━━━━━━━━

  Builder: mybuilder.eth

  Records written:
  • weft.milestones.verified → 3
  • weft.earned.total → 3.5 ETH
  • weft.projects → ["0xabc..."]
  • weft.milestone.0x0f93... → verified

  View profile: weft.build/builder/mybuilder.eth
  View on ENS: app.ens.domains/name/mybuilder.eth
```

## Pitfalls

- **Ownership required:** The verifier's key must own or control the builder's ENS name. Use `--skip-ownership` for demos.
- **0G testnet:** ENS may not be deployed on 0G. For demos, use Sepolia or mainnet.
- **Gas:** Each `setText` is a separate transaction. Budget gas for multiple writes.
- **Resolver:** The ENS name must have a resolver that supports `setText`. The default public resolver does.

## Verification

After updating, read back the records:
```bash
cast call <resolver> "text(bytes32,string)" <namehash> "weft.milestones.verified" --rpc-url $ETH_RPC_URL
```
