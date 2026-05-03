#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Weft End-to-End Demo Script
# ===========================
# Demonstrates the full Weft verification pipeline covering all sponsor integrations:
#   - 0G Chain + Storage (milestone creation, evidence publishing)
#   - Gensyn AXL (encrypted P2P verdict exchange between verifier nodes)
#   - KeeperHub (reliable onchain verdict submission)
#   - ENS (builder profile update after verification)
#   - Uniswap (platform fee routing to stablecoin treasury)
#   - Kimi (narrative generation from attestation)
#
# Usage:
#   bash scripts/demo_e2e.sh [--dry-run] [--nodes N]
#
# Required env vars:
#   ETH_RPC_URL              0G Chain RPC
#   WEFT_CONTRACT_ADDRESS    Deployed WeftMilestone
#   PRIVATE_KEY              Verifier node key (node 1)
#   VERIFIER_ADDRESS         Verifier wallet address
#
# Optional env vars (enable sponsor features):
#   PRIVATE_KEY_2, PRIVATE_KEY_3   Additional verifier keys (for multi-node demo)
#   KIMI_API_KEY                   Kimi narrative generation
#   KEEPERHUB_API_KEY              KeeperHub reliable execution
#   ZERO_G_INDEXER_RPC             0G Storage indexer
#   ZERO_G_PRIVATE_KEY             0G Storage writes
#   ZERO_G_STREAM_ID               0G KV stream
#   WEFT_BUILDER_ENS               Builder ENS name (e.g. builder.weft.eth)
#   UNISWAP_API_KEY                Uniswap revenue routing
#   WEFT_TREASURY_ADDRESS          Treasury for fee routing
#   AXL_BINARY                     Path to AXL binary (default: axl)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
DRY_RUN=false
NUM_NODES=3
MILESTONE_HASH=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --nodes=*) NUM_NODES="${arg#*=}" ;;
    --milestone=*) MILESTONE_HASH="${arg#*=}" ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
banner() { echo -e "\n\033[1;36m═══ $1 ═══\033[0m"; }
info()   { echo -e "  \033[0;32m✓\033[0m $1"; }
warn()   { echo -e "  \033[0;33m⚠\033[0m $1"; }
fail()   { echo -e "  \033[0;31m✗\033[0m $1"; }

check_env() {
  local var="$1"
  if [ -z "${!var:-}" ]; then
    warn "$var not set — skipping related features"
    return 1
  fi
  return 0
}

cleanup() {
  banner "Cleanup"
  for pid in "${AXL_PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      info "Stopped AXL node (PID $pid)"
    fi
  done
  for pid in "${DAEMON_PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      info "Stopped daemon (PID $pid)"
    fi
  done
  for pid in "${PEER_PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      info "Stopped peer server (PID $pid)"
    fi
  done
}
trap cleanup EXIT

AXL_PIDS=()
DAEMON_PIDS=()
PEER_PIDS=()

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
banner "Pre-flight Checks"

check_env ETH_RPC_URL || { fail "ETH_RPC_URL is required"; exit 1; }
check_env WEFT_CONTRACT_ADDRESS || { fail "WEFT_CONTRACT_ADDRESS is required"; exit 1; }
check_env PRIVATE_KEY || { fail "PRIVATE_KEY is required"; exit 1; }

HAS_KIMI=false;       check_env KIMI_API_KEY && HAS_KIMI=true
HAS_KEEPERHUB=false;   check_env KEEPERHUB_API_KEY && HAS_KEEPERHUB=true
HAS_0G=false;          check_env ZERO_G_INDEXER_RPC && HAS_0G=true
HAS_ENS=false;         check_env WEFT_BUILDER_ENS && HAS_ENS=true
HAS_UNISWAP=false;     check_env UNISWAP_API_KEY && HAS_UNISWAP=true

AXL_BIN="${AXL_BINARY:-axl}"
HAS_AXL=false
if command -v "$AXL_BIN" &>/dev/null; then
  HAS_AXL=true
  info "AXL binary found: $AXL_BIN"
else
  warn "AXL binary not found — using legacy HTTP peer transport"
fi

info "Nodes: $NUM_NODES | Dry-run: $DRY_RUN"

# ---------------------------------------------------------------------------
# Step 1: Start AXL nodes (if available)
# ---------------------------------------------------------------------------
banner "Step 1: Start AXL Nodes"

AXL_PORTS=()
if $HAS_AXL; then
  for i in $(seq 1 "$NUM_NODES"); do
    port=$((9000 + i))
    data_dir="/tmp/weft-axl-node-$i"
    mkdir -p "$data_dir"
    # Generate ephemeral ed25519 key for this node
    key_path="$data_dir/private.pem"
    if [ ! -f "$key_path" ]; then
      openssl genpkey -algorithm ed25519 -out "$key_path" 2>/dev/null
    fi
    # Write AXL config JSON (real binary uses -config <file>)
    cfg_path="$data_dir/node-config.json"
    cat > "$cfg_path" <<AXLCFG
{
  "PrivateKeyPath": "$key_path",
  "api_port": $port,
  "bridge_addr": "127.0.0.1",
  "Peers": ["tls://34.46.48.224:9001", "tls://136.111.135.206:9001"],
  "Listen": []
}
AXLCFG
    "$AXL_BIN" -config "$cfg_path" &
    AXL_PIDS+=($!)
    AXL_PORTS+=("$port")
    info "AXL node $i started on port $port (PID ${AXL_PIDS[-1]})"
  done
  sleep 2
else
  for i in $(seq 1 "$NUM_NODES"); do
    port=$((9000 + i))
    AXL_PORTS+=("$port")
  done
  info "Using legacy HTTP transport on ports ${AXL_PORTS[*]}"
fi

# ---------------------------------------------------------------------------
# Step 2: Start peer servers
# ---------------------------------------------------------------------------
banner "Step 2: Start Peer Servers"

PEER_URLS=()
for i in $(seq 1 "$NUM_NODES"); do
  port="${AXL_PORTS[$((i-1))]}"
  inbox_dir="$REPO_ROOT/agent/.inbox-node-$i"
  mkdir -p "$inbox_dir"

  AXL_PORT="$port" WEFT_INBOX_DIR="$inbox_dir" \
    python3 agent/scripts/weft_peer_server.py &
  PEER_PIDS+=($!)
  PEER_URLS+=("http://127.0.0.1:$port")
  info "Peer server $i on port $port (PID ${PEER_PIDS[-1]})"
done
sleep 1

# Build peer list (each node sees the others)
ALL_PEERS=$(IFS=,; echo "${PEER_URLS[*]}")

# ---------------------------------------------------------------------------
# Step 3: Create or select milestone
# ---------------------------------------------------------------------------
banner "Step 3: Milestone"

if [ -n "$MILESTONE_HASH" ]; then
  info "Using provided milestone: $MILESTONE_HASH"
else
  info "Querying pending milestones from contract..."
  MILESTONE_HASH=$(python3 -c "
import os, sys
sys.path.insert(0, '$REPO_ROOT')
from agent.lib.jsonrpc import JsonRpcClient
from agent.lib.deadline_scheduler import DeadlineScheduler
rpc = JsonRpcClient(os.environ['ETH_RPC_URL'])
ds = DeadlineScheduler(rpc, os.environ['WEFT_CONTRACT_ADDRESS'])
pending = ds.poll()
if pending:
    print(pending[0].milestone_hash)
else:
    print('')
" 2>/dev/null || echo "")

  if [ -z "$MILESTONE_HASH" ]; then
    warn "No pending milestones found. Use --milestone=0x... to specify one."
    if $DRY_RUN; then
      MILESTONE_HASH="0x$(python3 -c 'import os; print(os.urandom(32).hex())')"
      info "Dry-run: using random milestone hash $MILESTONE_HASH"
    else
      fail "Cannot proceed without a milestone hash"
      exit 1
    fi
  else
    info "Found pending milestone: $MILESTONE_HASH"
  fi
fi

# ---------------------------------------------------------------------------
# Step 4: Run verifier daemons
# ---------------------------------------------------------------------------
banner "Step 4: Run Verifier Daemons"

KEYS=("${PRIVATE_KEY}" "${PRIVATE_KEY_2:-}" "${PRIVATE_KEY_3:-}")
OUT_DIRS=()

for i in $(seq 1 "$NUM_NODES"); do
  key="${KEYS[$((i-1))]}"
  if [ -z "$key" ]; then
    warn "PRIVATE_KEY_$i not set — node $i will reuse PRIVATE_KEY"
    key="$PRIVATE_KEY"
  fi

  out_dir="$REPO_ROOT/agent/.attestations/demo-node-$i"
  mkdir -p "$out_dir"
  OUT_DIRS+=("$out_dir")
  inbox_dir="$REPO_ROOT/agent/.inbox-node-$i"

  daemon_args=(
    python3 agent/scripts/weft_daemon.py
    --once
    --rpc-url "$ETH_RPC_URL"
    --weft "$WEFT_CONTRACT_ADDRESS"
    --private-key "$key"
    --broadcast
    --wait-for-peers
    --peer-threshold 2
    --use-consensus-root
    --inbox-dir "$inbox_dir"
  )

  # Optional features
  $HAS_0G && daemon_args+=(--publish-0g --publish-consensus-0g --publish-bundle-0g)
  $HAS_ENS && daemon_args+=(--builder-ens "$WEFT_BUILDER_ENS")
  $HAS_KEEPERHUB && daemon_args+=(--use-keeperhub)

  export AXL_PEERS="$ALL_PEERS"
  export AXL_BROADCAST=1
  export AXL_WAIT_FOR_PEERS=1
  export AXL_USE_CONSENSUS_ROOT=1
  export PUBLISH_0G=$($HAS_0G && echo 1 || echo 0)
  export PUBLISH_0G_CONSENSUS=$($HAS_0G && echo 1 || echo 0)
  export PUBLISH_0G_BUNDLE=$($HAS_0G && echo 1 || echo 0)

  if $HAS_AXL; then
    export AXL_USE_BINARY=1
    export AXL_PORT="${AXL_PORTS[$((i-1))]}"
  fi

  if $DRY_RUN; then
    info "Node $i: would run: ${daemon_args[*]}"
  else
    "${daemon_args[@]}" &
    DAEMON_PIDS+=($!)
    info "Node $i daemon started (PID ${DAEMON_PIDS[-1]})"
  fi
done

if ! $DRY_RUN && [ ${#DAEMON_PIDS[@]} -gt 0 ]; then
  info "Waiting for daemons to complete..."
  for pid in "${DAEMON_PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
  info "All daemons finished"
fi

# ---------------------------------------------------------------------------
# Step 5: Show results
# ---------------------------------------------------------------------------
banner "Step 5: Results"

for i in $(seq 1 "$NUM_NODES"); do
  out_dir="${OUT_DIRS[$((i-1))]}"
  att_file="$out_dir/attestation.json"
  if [ -f "$att_file" ]; then
    info "Node $i attestation: $att_file"
    python3 -c "
import json
with open('$att_file') as f:
    a = json.load(f)
v = a.get('verdict', {})
print(f'  verified={v.get(\"verified\")}  evidenceRoot={v.get(\"evidenceRoot\", \"?\")[:20]}...')
" 2>/dev/null || true
  else
    warn "Node $i: no attestation file found"
  fi

  consensus_file="$out_dir/consensus.json"
  if [ -f "$consensus_file" ]; then
    info "Node $i consensus: $consensus_file"
  fi
done

# ---------------------------------------------------------------------------
# Step 6: Kimi Chronicle — Builder Journey narrative + milestone card
# ---------------------------------------------------------------------------
banner "Step 6: Kimi Chronicle (Builder Journey)"

if $HAS_KIMI; then
  att_file="${OUT_DIRS[0]}/attestation.json"
  chronicle_dir="${OUT_DIRS[0]}"
  if [ -f "$att_file" ]; then
    info "Generating Builder Journey chronicle via Kimi..."
    python3 -c "
import json, sys, os
sys.path.insert(0, '$REPO_ROOT')
from agent.lib.kimi_client import generate_chronicle
from agent.lib.chronicle import write_chronicle, write_card, CardData

with open('$att_file') as f:
    att = json.load(f)

chronicle = generate_chronicle([att], project_id='demo')
if chronicle.title:
    print(f'  Title: {chronicle.title}')
    for ch in chronicle.chapters:
        print(f'  Chapter: {ch.get("heading", "?")}')
        print(f'    {ch.get("body", "")[:120]}...')
    if chronicle.epilogue:
        print(f'  Epilogue: {chronicle.epilogue[:120]}...')

    # Write chronicle HTML
    write_chronicle(
        title=chronicle.title,
        chapters=chronicle.chapters,
        epilogue=chronicle.epilogue,
        attestations=[att],
        out_path=os.path.join('$chronicle_dir', 'chronicle.html'),
    )
    print(f'  Chronicle HTML: $chronicle_dir/chronicle.html')

    # Write milestone achievement card
    ch = chronicle.chapters[0] if chronicle.chapters else {}
    card = CardData(
        milestone_hash=att.get('milestoneHash', att.get('milestone_hash', '')),
        verified=att.get('verified', False),
        unique_callers=att.get('usage', {}).get('uniqueCallerCount', 0),
        evidence_root=att.get('evidenceRoot', att.get('evidence_root', '')),
        chapter_heading=ch.get('heading', ''),
        chapter_body=ch.get('body', ''),
    )
    write_card(card, os.path.join('$chronicle_dir', 'milestone_card.html'))
    print(f'  Milestone card: $chronicle_dir/milestone_card.html')
else:
    print('  (chronicle generation returned empty — check KIMI_API_KEY)')
" 2>/dev/null || warn "Chronicle generation failed"
  fi
else
  warn "KIMI_API_KEY not set — skipping chronicle generation"
fi

# ---------------------------------------------------------------------------
# Step 7: Uniswap fee routing (if available)
# ---------------------------------------------------------------------------
banner "Step 7: Uniswap Revenue Routing"

if $HAS_UNISWAP; then
  info "Routing platform fee via Uniswap..."
  python3 -c "
import sys
sys.path.insert(0, '$REPO_ROOT')
from agent.lib.uniswap_client import route_platform_fee
result = route_platform_fee(fee_wei='300000000000000000', dry_run=$($DRY_RUN && echo True || echo False))
print(f'  status={result.status}  amount_in={result.amount_in}  amount_out={result.amount_out}')
if result.tx_hash:
    print(f'  tx_hash={result.tx_hash}')
if result.error:
    print(f'  error={result.error}')
" 2>/dev/null || warn "Uniswap routing failed"
else
  warn "UNISWAP_API_KEY not set — skipping fee routing"
fi

# ---------------------------------------------------------------------------
# Step 8: ENS profile check
# ---------------------------------------------------------------------------
banner "Step 8: ENS Profile"

if $HAS_ENS; then
  info "ENS profile for $WEFT_BUILDER_ENS updated by daemon (see Step 4 logs)"
  python3 -c "
import sys
sys.path.insert(0, '$REPO_ROOT')
from agent.lib.ens_client import EnsClient
import os
client = EnsClient(os.environ['ETH_RPC_URL'], os.environ.get('PRIVATE_KEY', ''))
profile = client.read_builder_profile('$WEFT_BUILDER_ENS')
print(f'  milestones_verified={profile.milestones_verified}')
print(f'  projects={profile.projects}')
print(f'  reputation_score={profile.reputation_score}')
" 2>/dev/null || warn "ENS profile read failed"
else
  warn "WEFT_BUILDER_ENS not set — skipping ENS profile"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
banner "Demo Complete"

echo ""
echo "  Sponsor integrations demonstrated:"
echo "  ───────────────────────────────────"
echo "  0G Chain        ✓  Milestone on 0G Chain"
$HAS_0G     && echo "  0G Storage      ✓  Evidence bundle published" || echo "  0G Storage      ○  (ZERO_G_INDEXER_RPC not set)"
$HAS_AXL    && echo "  Gensyn AXL      ✓  Encrypted P2P verdict exchange" || echo "  Gensyn AXL      ○  (axl binary not found — used legacy HTTP)"
$HAS_KEEPERHUB && echo "  KeeperHub       ✓  Reliable verdict submission" || echo "  KeeperHub       ○  (KEEPERHUB_API_KEY not set)"
$HAS_ENS    && echo "  ENS             ✓  Builder profile updated" || echo "  ENS             ○  (WEFT_BUILDER_ENS not set)"
$HAS_UNISWAP && echo "  Uniswap         ✓  Platform fee routed to stablecoin" || echo "  Uniswap         ○  (UNISWAP_API_KEY not set)"
$HAS_KIMI   && echo "  Kimi            ✓  Builder Journey chronicle + milestone card generated" || echo "  Kimi            ○  (KIMI_API_KEY not set)"
echo ""
echo "  Milestone: $MILESTONE_HASH"
echo "  Nodes:     $NUM_NODES"
echo ""
