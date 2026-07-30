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

# THE EMPTY-DIST GUARD, and it is not hypothetical: this script wiped the live webroot once.
# `astro build` FAILED (an unterminated CSS comment), which left `dist/` present but empty — the
# `-d dist` check above passed, and `rsync --delete` then faithfully deleted all 21 files on the
# droplet. The site served 403 until it was rebuilt and re-synced.
# `--delete` is correct and stays; what was missing is a reason to believe the source is real.
# The count is a floor, not the exact number: 18 pages ship today, so 15 catches a truncated or
# failed build while leaving room to delete a page on purpose.
MIN_HTML=15
html_count=$(find dist -name '*.html' -type f | wc -l)
if (( html_count < MIN_HTML )); then
	echo "REFUSING TO DEPLOY: dist/ has ${html_count} HTML files, expected at least ${MIN_HTML}." >&2
	echo "A build almost certainly failed. Deploying now would rsync --delete the live site away." >&2
	echo "Run 'npm run build' and read its output before retrying." >&2
	exit 1
fi
echo "▶ dist/ has ${html_count} HTML files (floor ${MIN_HTML}) — proceeding"

echo "▶ Syncing dist/ → ${DROPLET}:${WEBROOT}"
# --delete removes files on the server that no longer exist locally.
rsync -avz --delete dist/ "${DROPLET}:${WEBROOT}/"

echo "✓ Deployed. Verify: curl -I https://andrewshiau.com"
