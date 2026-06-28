#!/usr/bin/env bash
# Pre-commit hook — secrets detection
# Blocks commits containing what look like private keys or API tokens.
# Installed via: ln -sf ../../scripts/pre-commit.sh .git/hooks/pre-commit

set -euo pipefail

RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Checking for secrets in staged changes..."

# Use ripgrep if available (supports PCRE on all platforms),
# otherwise fall back to grep -P (Linux only).
if command -v rg &>/dev/null; then
  GREP_CMD="rg -q"
else
  GREP_CMD="grep -Pq"
fi

# Patterns that look like private keys or API tokens
SECRET_PATTERNS=(
  # Private keys (Ethereum / generic hex keys 64+ chars)
  '0x[0-9a-fA-F]{64,}'
  # API keys for known providers
  'sk-[A-Za-z0-9_-]{20,}'       # OpenAI-style
  'kh_[A-Za-z0-9_-]{10,}'       # KeeperHub-style
  'modalresearch_[A-Za-z0-9_-]+' # Modal
  'rc_[A-Za-z0-9_-]{30,}'       # Featherless/other
  'fal_key[=:]\s*["'\'']?[a-f0-9-]+:[a-f0-9-]+'  # fal.ai
  'KIMI_API_KEY[=:]\s*["'\'']?sk-[A-Za-z0-9]+'
  'VERIFIER_PRIVATE_KEY[=:]\s*["'\'']?0x[0-9a-fA-F]{64,}'
)

FOUND=0

# Only check staged files (those about to be committed)
while IFS= read -r -d '' file; do
  # Skip binary files
  if [[ "$(file -b --mime-encoding "$file" 2>/dev/null)" == "binary" ]]; then
    continue
  fi

  # Get staged content for this file
  staged_content=$(git diff --cached -- "$file" 2>/dev/null || true)

  for pattern in "${SECRET_PATTERNS[@]}"; do
    if echo "$staged_content" | $GREP_CMD "$pattern"; then
      echo -e "${RED}⚠️  Possible secret detected in $file${NC}"
      echo "   Matched pattern: $pattern"
      FOUND=1
    fi
  done
done < <(git diff --cached --name-only -z -- . ':!:*.sol' ':!:*.md')

if [ "$FOUND" -eq 1 ]; then
  echo -e "${RED}❌ Commit blocked — remove secrets before committing.${NC}"
  echo "   If this is a false positive, use --no-verify to skip."
  exit 1
fi

echo "✅ No secrets found in staged changes."
exit 0
