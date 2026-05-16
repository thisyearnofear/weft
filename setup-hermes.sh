#!/usr/bin/env bash
# Setup Hermes Agent with Weft skills for 0G APAC Hackathon
# Run once after cloning the repo

set -e

echo "🧵 Setting up Weft Hermes Agent..."

# 1. Install Hermes if not present
if ! command -v hermes &>/dev/null; then
  echo "Installing Hermes Agent..."
  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
  export PATH="$HOME/.local/bin:$PATH"
fi

HERMES_VER=$(hermes --version 2>&1 | head -1)
echo "✓ Hermes $HERMES_VER"

# 2. Wire Weft skills into Hermes config
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/agent/skills" 2>/dev/null && pwd || echo "$SCRIPT_DIR/agent/skills")"
CONFIG="$HOME/.hermes/config.yaml"

mkdir -p "$HOME/.hermes"

if [ ! -f "$CONFIG" ]; then
  cat > "$CONFIG" << 'HERMES_CONFIG'
# Hermes Agent configuration
skills:
  external_dirs:
HERMES_CONFIG
  echo "  external_dirs:" >> "$CONFIG"
  echo "    - $SKILLS_DIR" >> "$CONFIG"
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
if [ -f "$SCRIPT_DIR/agent/skills/SOUL.md" ]; then
  cp "$SCRIPT_DIR/agent/skills/SOUL.md" "$HOME/.hermes/SOUL.md"
  echo "✓ Weft identity written to ~/.hermes/SOUL.md"
else
  echo "⚠ SOUL.md not found at agent/skills/SOUL.md"
fi

echo ""
echo "✓ Setup complete. Launch with:"
echo "  bash scripts/hermes_weft.sh"
echo ""
echo "  Or set env vars manually and run: hermes"
echo ""
echo "  Example prompts:"
echo "  > run the demo"
echo "  > tell me the story of the Weft Protocol"
echo "  > verify milestone <milestoneHash>"
echo "  > what is the status of weft.thisyearnofear.eth?"
echo ""
echo "  0G APAC Hackathon — Track 3 (Agentic Economy) & Track 4 (Open Innovation)"
echo "  Deadline: May 16, 2026"
