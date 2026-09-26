#!/bin/bash
# Runs a command with NPM_TOKEN set for Docker builds (passed to BuildKit as the
# `npm_token` secret, see deploy/docker-compose.yml). An explicit NPM_TOKEN wins;
# otherwise falls back to the GitHub CLI's token (needs `read:packages`).
set -e
if [ -z "$NPM_TOKEN" ]; then
    NPM_TOKEN="$(gh auth token 2>/dev/null || true)"
fi
if [ -z "$NPM_TOKEN" ]; then
    echo "[ERROR] NPM_TOKEN is not set and 'gh auth token' returned nothing." >&2
    echo "        Set NPM_TOKEN or run: gh auth login (then: gh auth refresh -s read:packages)" >&2
    exit 1
fi
export NPM_TOKEN
exec "$@"
