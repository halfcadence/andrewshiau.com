#!/usr/bin/env bash
# Deploy the built site to the DigitalOcean droplet.
# Run from your Mac (which can reach the droplet), NOT the Amazon devbox.
#
#   ./deploy.sh
#
# Requires: SSH access to the droplet, and `npm run build` already run so ./dist exists.
set -euo pipefail

DROPLET="${DROPLET:-root@104.236.237.122}"   # override: DROPLET=user@host ./deploy.sh
WEBROOT="/var/www/andrewshiau"

if [[ ! -d dist ]]; then
	echo "dist/ not found — run 'npm run build' first." >&2
	exit 1
fi

echo "▶ Syncing dist/ → ${DROPLET}:${WEBROOT}"
# --delete removes files on the server that no longer exist locally.
rsync -avz --delete dist/ "${DROPLET}:${WEBROOT}/"

echo "▶ Reloading Caddy"
ssh "${DROPLET}" 'sudo systemctl reload caddy'

echo "✓ Deployed. Verify: curl -I https://andrewshiau.com"
