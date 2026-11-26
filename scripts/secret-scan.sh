#!/bin/sh
# Blocks Telegram bot tokens and Google API keys in staged changes. Install: scripts/install-hooks.sh
git diff --cached --no-color -U0 --diff-filter=ACMR | grep -E '^\+' | grep -Ev '^\+\+\+' | grep -E '[0-9]{8,10}:[A-Za-z0-9_-]{35}|AIza[0-9A-Za-z_-]{35}' >/dev/null && { echo "secret-scan: BLOCKED (token-like string in staged changes)" >&2; exit 1; }
git diff --cached --name-only | grep -E '(^|/)\.env(\..+)?$' | grep -v '\.env\.example$' >/dev/null && { echo "secret-scan: a .env file is staged" >&2; exit 1; }
exit 0
