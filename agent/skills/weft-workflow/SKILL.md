---
name: weft-workflow
description: Autonomous multi-step milestone verification workflow. Hermes plans, executes, reasons, and reports across evidence collection, peer consensus, onchain verdict, narrative generation, and ENS reputation — with failure recovery at every step.
version: 1.0.0
metadata:
  hermes:
    tags: [web3, verification, workflow, autonomous, planning, reasoning, 0g, ens, kimi]
    category: workflow
    requires_toolsets: [terminal]
required_environment_variables:
  - name: ETH_RPC_URL
    prompt: 0G Chain RPC URL
    help: "Default: https://evmrpc-testnet.0g.ai"
    required_for: "reading and writing onchain state"
  - name: WEFT_CONTRACT_ADDRESS
    prompt: WeftMilestone contract address
    help: "Deployed on 0G Galileo"
    required_for: "milestone verification"
  - name: GITHUB_TOKEN
    prompt: GitHub personal access token
    help: "Optional — for GitHub evidence collection"
    required_for: "GitHub commit/PR evidence"
  - name: KIMI_API_KEY
    prompt: Kimi/Moonshot API key
    required_for: "narrative and chronicle generation"
required_for: "narrative generation"
---

# Weft Autonomous Verification Workflow

## When to Use

- User says "verify milestone 0x..." or "run verification on 0x..."
- User asks for a comprehensive milestone verification from evidence to narrative
- You need to autonomously run the full Weft pipeline with reasoning
- User says "is my project verified?" or "check milestone 0x..."

## Core Directive

You are an autonomous verification agent. At each phase of the workflow:

1. **REASON** — In the chat, explain what you're about to do and why. State what you expect to find.
2. **EXECUTE** — Run the verification command. Capture the output.
3. **EVALUATE** — Check the result against the criteria in the phase. Decide whether to proceed, retry, skip, or abort.
4. **REPORT** — Summarise what happened in plain language. Explain what it means for the builder.

**Do not** just dump script output. The builder needs to understand *what* you did, *why*, and *what it means*.

---

## Phase 0 — Preflight

Before starting, determine:
- `$WEFT_ROOT` — the absolute path to the weft repo
- `$MILESTONE_HASH` — the milestone hash the user provided
- `$WEFT_CONTRACT` — the WeftMilestone address (from env)

Set up the working environment:

```bash
WEFT_ROOT="$(cd "$(dirname "$(which python3)")/.." 2>/dev/null && pwd)"
cd "$WEFT_ROOT"
```

---

## Phase 1 — Plan

**Reason in chat:** Read the milestone state. Determine:
- Is the deadline past? If not, report remaining time and stop.
- Is it already finalized? If yes, report the outcome and stop.
- What contract address should we check? (Derive from milestone metadata or user input.)
- What unique-caller threshold applies? (Default: 10, or derive from metadata.)

**Execute:**

```bash
python3 -c "
import os, sys, time
sys.path.insert(0, '.')
from agent.lib.jsonrpc import JsonRpcClient
from agent.lib.weft_milestone_reader import read_milestone

rpc = JsonRpcClient(os.environ['ETH_RPC_URL'])
m = read_milestone(rpc, os.environ['WEFT_CONTRACT_ADDRESS'], '$MILESTONE_HASH')

now = int(time.time())
print(f'Builder:     {m.builder}')
print(f'Deadline:    {m.deadline} ({time.strftime(\"%b %d %Y %H:%M UTC\", time.gmtime(m.deadline))})')
print(f'Staked:      {int(m.totalStaked) / 1e18:.4f} ETH')
print(f'Finalized:   {m.finalized}')
print(f'Verified:    {m.verified}')
print(f'Released:    {m.released}')
print(f'Verifiers:   {m.verifiedVotes}/{m.verifierCount} voted')

if m.finalized:
    print(f'\\nOutcome: {\"VERIFIED\" if m.verified else \"FAILED\"}')
    print('Already finalized. Nothing to do.')
    sys.exit(2 if not m.verified else 0)

if now < m.deadline:
    remaining = m.deadline - now
    print(f'\\nDeadline in {remaining // 3600}h {(remaining % 3600) // 60}m. Too early to verify.')
    sys.exit(3)

print('\\nDeadline passed. Ready to verify.')
print(f'Final evidence root: {m.finalEvidenceRoot}')
"
```

**Evaluate:**
- Exit code 2 — already finalized as failed. Report to user.
- Exit code 3 — too early. Report remaining time.
- Exit code 0 — ready to verify. Proceed to Phase 2.

---

## Phase 2 — Collect Evidence

**Reason in chat:** Explain what evidence you're collecting and why. Three signals: contract deployment (code exists onchain), usage (unique wallets interacting), GitHub activity (commits/PRs in the milestone window).

**Execute:**

```bash
python3 agent/scripts/weft_collect_attestation.py \
  --rpc-url "$ETH_RPC_URL" \
  --weft-milestone "$WEFT_CONTRACT_ADDRESS" \
  --milestone-hash "$MILESTONE_HASH" \
  --contract-address "$CONTRACT_ADDRESS" \
  --out "agent/.attestations/$MILESTONE_HASH/attestation.json" \
  --unique-caller-threshold "$CALLER_THRESHOLD" \
  --measurement-window-seconds "$WINDOW_SECONDS" 2>&1
```

**Evaluate:**
- If the command succeeds and produces an attestation JSON, read it to extract the evidence values.
- If evidence collection fails (e.g., RPC timeout), reason about the cause and retry once with `--no-cache`.
- If the 0G indexer is unavailable (503), note this and collect evidence directly from the RPC.

**Read the attestation data:**

```bash
python3 -c "
import json
with open('agent/.attestations/$MILESTONE_HASH/attestation.json') as f:
    d = json.load(f)
e = d.get('evidence', {})
print('Deployment code exists:', e.get('deployment', {}).get('codeExists', 'unknown'))
print('Unique callers:', e.get('usage', {}).get('uniqueCallerCount', 'unknown'))
print('Caller threshold:', e.get('usage', {}).get('threshold', 'unknown'))
print('GitHub commits:', len(e.get('github', {}).get('commits', [])))
print('GitHub PRs:', len(e.get('github', {}).get('pull_requests', [])))
print('Verified:', d.get('verdict', {}).get('verified', 'unknown'))
"
```

**Reason in chat:** Interpret the evidence.
- If code exists AND callers >= threshold, the milestone should be VERIFIED.
- If code is missing OR callers below threshold, the milestone should be NOT VERIFIED.
- GitHub evidence is informational — it does not gate the verdict.

---

## Phase 3 — Seek Peer Consensus

**Reason in chat:** Check if peer verifier nodes have voted. If AXL peers are configured, broadcast your verdict and collect theirs. If no peers are configured, you'll proceed independently.

**Check if AXL is available:**

```bash
python3 -c "
import os
from agent.lib.axl_client import axl_available, start_axl_node, broadcast_verdict, tally_consensus

peers = os.environ.get('AXL_PEERS', '')
if not peers:
    print('NO_PEERS — no AXL peers configured, proceeding independently')
elif axl_available():
    print('AXL_NODE_RUNNING')
else:
    print('NO_AXL_NODE')
"
```

**Reason in chat:**
- If no peers: "No peer verifiers configured. I'll verify independently and submit the verdict directly."
- If peers available: "Broadcasting my verdict and waiting for peer responses."

**If peers available, broadcast and poll:**

```bash
python3 -c "
import json, os
from agent.lib.axl_client import broadcast_verdict, receive_verdicts, tally_consensus

with open('agent/.attestations/$MILESTONE_HASH/attestation.json') as f:
    d = json.load(f)
verified = d.get('verdict', {}).get('verified', False)

result = broadcast_verdict(
    milestone_hash='$MILESTONE_HASH',
    verified=verified,
    evidence_root=d.get('evidenceRoot', ''),
)
print('Broadcast result:', result)

import time
time.sleep(3)
peers = receive_verdicts('$MILESTONE_HASH')
print(f'Peer responses: {len(peers)}')
for p in peers:
    print(f'  {p.verifier_address}: verified={p.verified}')
"
```

**Reason in chat:** If peer consensus is reached (2 of 3 agree), report it. If not, note the disagreement. The onchain quorum is enforced by the contract — your single vote is sufficient to trigger the verification window.

---

## Phase 4 — Submit Verdict

**Reason in chat:** Explain the verdict and how it will be submitted. If KeeperHub is configured, it handles retry + gas optimization. Otherwise, direct `cast send`.

**Check KeeperHub:**

```bash
python3 -c "
from agent.lib.keeperhub_client import keeperhub_configured
print('KEEPERHUB_CONFIGURED' if keeperhub_configured() else 'NO_KEEPERHUB')
"
```

**Submit via KeeperHub (preferred):**

```bash
python3 -c "
import json, os
from agent.lib.keeperhub_client import execute_verdict

with open('agent/.attestations/$MILESTONE_HASH/attestation.json') as f:
    d = json.load(f)

result = execute_verdict(
    milestone_hash='$MILESTONE_HASH',
    verified=d['verdict']['verified'],
    evidence_root=d.get('evidenceRoot', ''),
)
print(f'Execution ID: {result.execution_id}')
print(f'Status:       {result.status}')
print(f'Transaction:  {result.transaction_hash or \"pending\"}')
"
```

**OR submit via cast (fallback):**

```bash
cast send --rpc-url "$ETH_RPC_URL" \
  --private-key "$VERIFIER_PRIVATE_KEY" \
  --legacy --gas-price 3000000000 \
  "$WEFT_CONTRACT" \
  "submitVerdict(bytes32,bool,bytes32)" \
  "$MILESTONE_HASH" \
  true \
  "$EVIDENCE_ROOT"
```

**Reason in chat:** After submission, wait for confirmation and read the result. Explain the transaction outcome.

---

## Phase 5 — Generate Narrative

**Reason in chat:** Explain that the onchain verdict is submitted, but builders need human-readable context. Kimi (moonshot-v1-128k) will convert the raw attestation data into a narrative.

**Execute:**

```bash
python3 -c "
import json, os, sys
sys.path.insert(0, '.')
from agent.lib.kimi_client import generate_narrative

with open('agent/.attestations/$MILESTONE_HASH/attestation.json') as f:
    d = json.load(f)

narrative = generate_narrative(d)
print(narrative)
"
```

**Evaluate:**
- If Kimi is unavailable (no API key or rate limit), explain this to the user and offer the raw attestation data instead.
- If narrative is generated, present it clearly in the chat output.

---

## Phase 6 — Update ENS (optional)

**Reason in chat:** If a builder ENS name is known, update their reputation records with the verified milestone.

**Execute:**

```bash
python3 -c "
import json, os, sys
sys.path.insert(0, '.')
from agent.lib.ens_client import EnsClient

with open('agent/.attestations/$MILESTONE_HASH/attestation.json') as f:
    d = json.load(f)

client = EnsClient(
    rpc_url=os.environ['ETH_RPC_URL'],
    wallet_key=os.environ.get('VERIFIER_PRIVATE_KEY', ''),
)

# Update the builder's profile
client.update_ens_after_verification(
    builder_ens='$BUILDER_ENS',
    milestone_hash='$MILESTONE_HASH',
    verified=d['verdict']['verified'],
    earnings=int(d.get('verdict', {}).get('stakedAmount', '0')),
)
print('ENS records updated.')
"
```

---

## Phase 7 — Report

**Reason in chat:** Present a comprehensive summary. Cover every phase:

```
  Verification Complete
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Milestone:  $MILESTONE_HASH (first 14 chars...)
  Status:     ✓ VERIFIED (or ✗ FAILED)

  Evidence
    Contract deployed:  ✓ (codeHash verified)
    Unique callers:     147 (threshold: 10)
    GitHub commits:     23 in window
    Peer consensus:     3/3 nodes

  Onchain
    Verdict submitted:  ✓ (block 35264431)
    Transaction:        0xb74835876949...
    Evidence root:      0x01e1b37f9ae1...

  What This Means
    The builder shipped working code. Users came. Peers confirmed.
    Capital will release automatically after the challenge period.

  View: weft.thisyearnofear.com/project/$MILESTONE_HASH
```

---

## Failure Recovery

The workflow can fail at any phase. Use this table to decide what to do:

| Failure | Response |
|---|---|
| RPC timeout | Retry once with `--no-cache`. If still fails, report RPC issue. |
| 0G indexer 503 | Fall back to direct RPC reads. Bypass 0G storage publishing. |
| Kimi API unavailable | Skip narrative. Offer raw attestation JSON. |
| KeeperHub unavailable | Fall back to `cast send` direct submission. |
| cast send fails (gas) | Wait 30s and retry. If still fails, report the error. |
| ENS ownership mismatch | Skip ENS update. Report that builder ENS isn't controllable. |
| Verifier not authorized | Report that this address isn't in VerifierRegistry. Cannot submit. |

If you can't proceed past a critical failure, explain exactly what went wrong and what the user needs to fix.

## Rules

- **Reason at every phase** — Never execute without first explaining what you're doing and why.
- **Evaluate after every execution** — Read the output, check for errors, decide next step.
- **Be transparent** — If evidence fails, tell the user. If KeeperHub is down, show the cast fallback.
- **Use $WEFT_ROOT** — Always set the working directory from the environment, not a hardcoded path.
- **No demo data** — If real evidence collection fails, report the failure. Never substitute demo data.
- **Explain the weaving metaphor** — The warp is the blockchain (structural, immutable). The weft is the evidence (woven through the structure). Technology provides the warp. Liberal arts provide the weft.
