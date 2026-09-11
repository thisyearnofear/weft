#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# DEPRECATED — the Weft frontend is deployed by Vercel, not this VPS.
#
# Frontend deploys now work by pushing to the tracked git branch; Vercel
# builds and serves weft.persidian.com. The backend on snel-bot (status API
# :9010 + AXL :9002) is deployed by ./scripts/deploy-snel-bot.sh.
#
# This stub remains so older docs/aliases fail loudly instead of rsyncing a
# frontend tree onto a disk-constrained box.

cat <<'EOF'
deploy-frontend.sh is deprecated.

  frontend  → Vercel (git push; serves https://weft.persidian.com)
  backend   → ./scripts/deploy-snel-bot.sh  (status API + AXL on snel-bot)

EOF
exit 1
