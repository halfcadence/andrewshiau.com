#!/usr/bin/env bash
# Deploy the built site to the DigitalOcean droplet.
# Runs from the devbox via the `droplet` SSH config alias (HostName 104.236.237.122).
#
#   npm run build && ./deploy.sh
#
# The droplet serves the static dist/ over HTTPS with nginx + certbot (Let's Encrypt,
# auto-renew). Static files need no service reload — nginx picks them up on next request.
set -euo pipefail

DROPLET="${DROPLET:-droplet}"          # SSH config alias; override: DROPLET=user@host ./deploy.sh
WEBROOT="/var/www/andrewshiau"

if [[ ! -d dist ]]; then
	echo "dist/ not found — run 'npm run build' first." >&2
	exit 1
fi

echo "▶ Syncing dist/ → ${DROPLET}:${WEBROOT}"
# --delete removes files on the server that no longer exist locally.
rsync -avz --delete dist/ "${DROPLET}:${WEBROOT}/"

echo "✓ Deployed. Verify: curl -I https://andrewshiau.com"
