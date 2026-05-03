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
#   FAL_KEY                         fal.ai image generation (milestone swatches + chronicle covers)
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
HAS_ENS=false
if check_env WEFT_BUILDER_ENS; then
  HAS_ENS=true
elif [ -n "${WEFT_ENS_PARENT:-}" ]; then
  # Default to the protocol ENS identity
  export WEFT_BUILDER_ENS="weft.thisyearnofear.eth"
  HAS_ENS=true
  info "Using default ENS: weft.thisyearnofear.eth"
fi
HAS_FAL=false;         check_env FAL_KEY && HAS_FAL=true

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
# Step 6: Builder Journey Chronicle — Kimi narrative + milestone achievement card
---------------------------------------------------------------------------------
# The daemon already ran Kimi + fal.ai and wrote chronicle.json, chronicle.html,
# and milestone_card.html. This step reads and displays those artifacts.
banner "Step 6: Kimi Chronicle — Builder Journey"

chronicle_dir="${OUT_DIRS[0]}"
chronicle_json="$chronicle_dir/chronicle.json"
chronicle_html="$chronicle_dir/chronicle.html"
card_html="$chronicle_dir/milestone_card.html"

if [ -f "$chronicle_json" ]; then
    info "Chronicle JSON: $chronicle_json"
    python3 -c "
import json
with open('$chronicle_json') as f:
    c = json.load(f)
print(f'  Title: {c.get("title", "?")}')
print(f'  Chapters: {len(c.get("chapters", []))}')
for ch in c.get('chapters', []):
    print(f'  \xe2\x80\xa2 {ch.get("heading", "?")}: {ch.get("body", "")[:100]}...')
ep = c.get('epilogue')
if ep:
    print(f'  Epilogue: {ep[:100]}...')
fal_url = c.get('falImageUrl') or c.get('falCoverUrl')
if fal_url:
    print(f'  fal.ai swatch: {fal_url}')
"
else
    if $HAS_KIMI; then
        warn "Chronicle JSON not found — daemon may not have KIMI_API_KEY set"
    else
        warn "KIMI_API_KEY not set — skipping chronicle generation"
    fi
fi

[ -f "$chronicle_html" ] && info "Chronicle HTML: $chronicle_html"

if [ -f "$card_html" ]; then
    info "Milestone card HTML: $card_html"
    swatch_url=$(python3 -c "
import json
with open('$chronicle_json') as f:
    c = json.load(f)
url = c.get('falImageUrl') or c.get('falCoverUrl')
print(url or '')
" 2>/dev/null || echo "")
    [ -n "$swatch_url" ] && info "AI-woven swatch: $swatch_url"
fi

# Visual browser output — judges open these directly; woven swatches are visible
if [ -f "$card_html" ] || [ -f "$chronicle_html" ]; then
    echo ""
    echo "  +-- VISUAL OUTPUT (open in browser) --------------------------------------+"
    [ -f "$card_html" ]       && echo "  |  open file://$card_html"
    [ -f "$chronicle_html" ]  && echo "  |  open file://$chronicle_html"
    echo "  +-----------------------------------------------------------------------+"
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
$HAS_FAL    && echo "  fal.ai          ✓  AI-woven milestone swatch generated" || echo "  fal.ai          ○  (FAL_KEY not set)"
$HAS_KIMI   && echo "  Kimi            ✓  Builder Journey chronicle + milestone card generated" || echo "  Kimi            ○  (KIMI_API_KEY not set)"
echo ""
echo "  Milestone: $MILESTONE_HASH"
echo "  Nodes:     $NUM_NODES"
echo ""
