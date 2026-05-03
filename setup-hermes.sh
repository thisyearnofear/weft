#!/usr/bin/env bash
# Setup Hermes Agent with Weft skills
# Run once after cloning the repo

set -e

echo "🧵 Setting up Weft Hermes Agent..."

# 1. Install Hermes if not present
if ! command -v hermes &>/dev/null; then
  echo "Installing Hermes Agent..."
  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
  export PATH="$HOME/.local/bin:$PATH"
fi

echo "✓ Hermes $(hermes --version 2>&1 | head -1)"

# 2. Wire Weft skills into Hermes config
SKILLS_DIR="$(cd "$(dirname "$0")" && pwd)/agent/skills"
CONFIG="$HOME/.hermes/config.yaml"

if grep -q "external_dirs: \[\]" "$CONFIG" 2>/dev/null; then
  sed -i.bak "s|  external_dirs: \[\]|  external_dirs:\n    - $SKILLS_DIR|" "$CONFIG"
  echo "✓ Weft skills wired into Hermes config"
elif ! grep -q "$SKILLS_DIR" "$CONFIG" 2>/dev/null; then
  echo "⚠ Please add to ~/.hermes/config.yaml under skills:"
  echo "    external_dirs:"
  echo "      - $SKILLS_DIR"
else
  echo "✓ Weft skills already in Hermes config"
fi

# 3. Copy Weft SOUL.md
cp "$(dirname "$0")/agent/skills/SOUL.md" "$HOME/.hermes/SOUL.md" 2>/dev/null || true

echo ""
echo "✓ Setup complete. Launch with:"
echo "  bash scripts/hermes_weft.sh"
echo ""
echo "  Or set env vars manually and run: hermes"
echo ""
echo "  Example prompts:"
echo "  > tell me the story of the Weft Protocol"
echo "  > verify milestone <milestoneHash>"
echo "  > what is the status of weft.thisyearnofear.eth?"
