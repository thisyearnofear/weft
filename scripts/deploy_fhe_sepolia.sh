#!/usr/bin/env bash
# Deploy WeftMilestoneConfidential + VerifierRegistry to Sepolia and fund verifiers.
#
# Prereqs: source .env.fhe.local, deployer funded with >= 0.25 Sepolia ETH.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; source .env.fhe.local; set +a

FORGE="${FORGE:-$HOME/.foundry/bin/forge}"
CAST="${CAST:-$HOME/.foundry/bin/cast}"

echo "Deployer: $DEPLOYER_ADDRESS"
BALANCE=$($CAST balance "$DEPLOYER_ADDRESS" --rpc-url "$SEPOLIA_RPC_URL")
echo "Balance:  $($CAST from-wei "$BALANCE") ETH"
if [ "$BALANCE" = "0" ]; then
  echo "Deployer is unfunded — send Sepolia ETH to $DEPLOYER_ADDRESS first." >&2
  exit 1
fi

echo "── Deploying contracts ──"
FOUNDRY_PROFILE=fhe $FORGE script contracts/script-fhe/DeployConfidential.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" --broadcast -vvv

RUN_JSON="broadcast/DeployConfidential.s.sol/11155111/run-latest.json"
REGISTRY=$(python3 -c "import json;txs=json.load(open('$RUN_JSON'))['transactions'];print(next(t['contractAddress'] for t in txs if t.get('contractName')=='VerifierRegistry'))")
WEFT=$(python3 -c "import json;txs=json.load(open('$RUN_JSON'))['transactions'];print(next(t['contractAddress'] for t in txs if t.get('contractName')=='WeftMilestoneConfidential'))")

echo "VerifierRegistry:          $REGISTRY"
echo "WeftMilestoneConfidential: $WEFT"

echo "── Funding verifiers (0.03 ETH each for FHE gas) ──"
for V in "$VERIFIER_1" "$VERIFIER_2" "$VERIFIER_3"; do
  $CAST send "$V" --value 0.03ether --private-key "$DEPLOYER_KEY" --rpc-url "$SEPOLIA_RPC_URL" > /dev/null
  echo "funded $V"
done

echo
echo "Add to .env.fhe.local and frontend/.env.local:"
echo "  WEFT_MILESTONE_CONFIDENTIAL=$WEFT"
echo "  VERIFIER_REGISTRY_SEPOLIA=$REGISTRY"
echo "  NEXT_PUBLIC_WEFT_MILESTONE_CONFIDENTIAL_SEPOLIA=$WEFT"
