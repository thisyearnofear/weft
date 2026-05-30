#!/usr/bin/env bash
# Setup Hermes Agent with Weft skills
# Run once after cloning the repo

set -e

echo "🧵 Setting up Weft Hermes Agent..."

# Determine WEFT_ROOT from script location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEFT_ROOT="$SCRIPT_DIR"
export WEFT_ROOT

# 1. Install Hermes if not present
if ! command -v hermes &>/dev/null; then
  echo "Installing Hermes Agent..."
  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
  export PATH="$HOME/.local/bin:$PATH"
fi

HERMES_VER=$(hermes --version 2>&1 | head -1)
echo "✓ Hermes $HERMES_VER"

# 2. Wire Weft skills into Hermes config
SKILLS_DIR="$WEFT_ROOT/agent/skills"
CONFIG="$HOME/.hermes/config.yaml"

mkdir -p "$HOME/.hermes"

if [ ! -f "$CONFIG" ]; then
  cat > "$CONFIG" << HERMES_CONFIG
# Hermes Agent configuration
skills:
  external_dirs:
    - $SKILLS_DIR
HERMES_CONFIG
  echo "✓ Created Hermes config with Weft skills"
elif grep -q "external_dirs: \[\]" "$CONFIG" 2>/dev/null; then
  sed -i.bak "s|  external_dirs: \[\]|  external_dirs:\n    - $SKILLS_DIR|" "$CONFIG"
  echo "✓ Weft skills wired into Hermes config"
elif ! grep -q "$SKILLS_DIR" "$CONFIG" 2>/dev/null; then
  echo "⚠ Please add to ~/.hermes/config.yaml under skills:"
  echo "    external_dirs:"
  echo "      - $SKILLS_DIR"
  echo ""
  echo "  Example:"
  echo "    skills:"
  echo "      external_dirs:"
  echo "        - $SKILLS_DIR"
else
  echo "✓ Weft skills already in Hermes config"
fi

# 3. Copy Weft SOUL.md (identity)
if [ -f "$WEFT_ROOT/agent/skills/SOUL.md" ]; then
  cp "$WEFT_ROOT/agent/skills/SOUL.md" "$HOME/.hermes/SOUL.md"
  echo "✓ Weft identity written to ~/.hermes/SOUL.md"
else
  echo "⚠ SOUL.md not found at $WEFT_ROOT/agent/skills/SOUL.md"
fi

echo ""
echo "✓ Setup complete. 8 skills loaded:"
echo "   - weft-workflow   (multi-step verification with reasoning)"
echo "   - weft-verify     (evidence collection + attestation)"
echo "   - weft-narrate    (Kimi narrative generation)"
echo "   - weft-chronicle  (Builder Journey HTML chronicle)"
echo "   - weft-status     (milestone state check)"
echo "   - weft-ens        (ENS reputation records)"
echo "   - weft-manim      (verification weaving animation)"
echo "   - weft-demo       (coordinated end-to-end demo)"
echo ""
echo "Launch with:  bash scripts/hermes_weft.sh"
echo ""
echo "Example prompts:"
echo "  > verify milestone 0x..."
echo "  > run the demo"
echo "  > tell me the story of the Weft Protocol"
echo "  > what is the status of weft.thisyearnofear.eth?"
