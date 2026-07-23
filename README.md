# andrewshiau.com

AI-forward personal site. Astro static site, hand-set in the Müller-Brockmann
grid system (`/muller` house style). Served from a DigitalOcean droplet over
HTTPS (nginx + certbot / Let's Encrypt, auto-renew).

**Design + voice spec: [`STYLE.md`](STYLE.md).** Read it before editing — it's the
source of truth for tokens, the type ramp, the link system, motion, voice, and the
`/design-critique` panel.

## Develop

Repo lives in `workplace/andrewshiau` so Unison syncs the **source** to the Mac.
`node_modules/` and `dist/` are intentionally NOT synced (native binaries differ
per-OS) — run `npm install` once on whichever machine you build from.

```bash
npm install
npm run build          # → dist/
npm run dev            # local dev server on 127.0.0.1 (run on the MAC, not the devbox)
```

Devbox rule: never run `npm run dev`/preview bound to all interfaces on the Amazon
devbox. Build on the devbox and view via the synced `file://` copy, or run `npm run
dev` on the Mac (where 127.0.0.1 is fine).

## Structure

```
src/pages/index.astro       landing — bio + numbered experiment index
src/pages/work/*.astro       one case study per experiment
src/data/experiments.ts      the experiment list (edit here to add entries)
src/layouts/Layout.astro     shared shell (nav, footer, `g`-to-show-grid)
src/styles/global.css        the Müller-Brockmann system (tokens + grid)
Caddyfile                    droplet HTTPS + vhosts
deploy.sh                    rsync dist/ → droplet
```

To add an experiment: append to `src/data/experiments.ts`; add a page under
`src/pages/work/` if it needs a case study.

---

## One-time droplet setup (run from your Mac)

The droplet (`104.236.237.122`, Ubuntu) currently runs nginx serving the old
React site. These steps put **Caddy** in front for HTTPS, archive the old site
to `2018.andrewshiau.com`, and publish this site at the apex.

**1. DNS** — in the DigitalOcean control panel, add an A record:
   `2018.andrewshiau.com → 104.236.237.122`. (Apex `andrewshiau.com` and `www`
   already point there.)

**2. SSH in and archive the old site + free ports 80/443:**
   ```bash
   ssh root@104.236.237.122
   # Preserve the current nginx webroot as the 2018 archive
   sudo cp -r /var/www/html /var/www/andrewshiau-2018   # adjust src if nginx root differs
   # Stop nginx so Caddy can take 80/443 (or reconfigure nginx to proxy — see note)
   sudo systemctl stop nginx && sudo systemctl disable nginx
   sudo mkdir -p /var/www/andrewshiau
   ```
   > Find the real nginx root first: `grep -R "root " /etc/nginx/sites-enabled/`.

**3. Install Caddy:**
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update && sudo apt install -y caddy
   ```

**4. Install the Caddyfile** (copy this repo's `Caddyfile` to the droplet):
   ```bash
   # from your Mac, in this repo:
   scp Caddyfile root@104.236.237.122:/etc/caddy/Caddyfile
   ssh root@104.236.237.122 'sudo systemctl reload caddy'
   ```
   Caddy fetches Let's Encrypt certs automatically on first request to each host.

**5. Deploy the site:**
   ```bash
   npm run build
   ./deploy.sh
   ```

**6. Verify:**
   ```bash
   curl -I https://andrewshiau.com          # 200, valid cert
   curl -I http://andrewshiau.com           # 308 redirect → https (Caddy default)
   curl -I https://2018.andrewshiau.com     # old React app
   ```

## Update workflow

```bash
# edit content, then:
git commit -am "…" && git push
npm run build && ./deploy.sh
```
