#!/bin/bash
# Weft + Hermes Agent setup script
# Run this after opening the Codespace:
#   bash setup-hermes.sh

set -e

echo "=== Installing Hermes Agent ==="
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

echo ""
echo "=== Configuring Weft skills ==="
# Add Weft skills as external directory
mkdir -p ~/.hermes
cat > ~/.hermes/config.yaml << 'EOF'
skills:
  external_dirs:
    - ~/weft/agent/skills
EOF

echo ""
echo "=== Done ==="
echo "Run: source ~/.bashrc && hermes setup"
echo "Then: hermes"
