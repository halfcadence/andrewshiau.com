# andrewshiau.com

AI-forward personal site. Astro static site, hand-set in the Müller-Brockmann
grid system (`/muller` house style). Served from a DigitalOcean droplet over
HTTPS (nginx + certbot / Let's Encrypt, auto-renew).

**Design + voice spec: [`STYLE.md`](STYLE.md).** Read it before editing — it's the
source of truth for tokens, the type ramp, the link system, motion, voice, and the
`/design-critique` panel.

**Working with an agent here: [`CLAUDE.md`](CLAUDE.md)** — the devbox/Mac split, the
verify-live rule, and how to read the browser design annotations.

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
Caddyfile                    UNUSED — production is nginx (see below)
deploy.sh                    rsync dist/ → droplet
```

To add an experiment: append to `src/data/experiments.ts`; add a page under
`src/pages/work/` if it needs a case study.

---

## Password-protecting a case study (nginx Basic Auth)

**What runs in production is nginx, not Caddy.** `systemctl is-active nginx caddy` on the
droplet returns `active` / `inactive`; the live vhost is
`/etc/nginx/sites-enabled/andrewshiau` (root `/var/www/andrewshiau`, certbot-managed TLS).
The `Caddyfile` in this repo was never installed — the "One-time droplet setup" section
below describes a migration that didn't happen. Edit nginx, not the Caddyfile.

**Read this first: Basic Auth is a speed bump, not a safety guarantee.** It keeps a page
out of Google and off a casual visitor's screen. It does **not** make the page safe for
material that shouldn't leave Amazon: the credential is shared, it can be forwarded in one
paste, it lands in browser history and password managers, and the page still sits
unencrypted on a public webroot where any config slip serves it plain. `/work/stores-designer/`
is written to be publishable — no screenshot, no component name, no metric, no architecture
(see the comment in the page). If a change to it would need auth to be safe, the change
doesn't belong on this site.

### The recipe

Do these in order; step 3 fails silently-ish (HTTP 500) if step 2's ownership is wrong.

**1. Make the credential.** `htpasswd` is NOT installed on the droplet — use openssl,
locally, so the plaintext never lands in the droplet's shell history:

```bash
PW=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)   # keep this; it's the password
printf '%s' "$PW" | openssl passwd -apr1 -stdin            # → $apr1$…  paste in step 2
```

**2. Install the hash file as `root:www-data 640`.** The worker runs as `www-data`
(`grep ^user /etc/nginx/nginx.conf`), so a `root:root 640` file gives **HTTP 500 on every
authenticated request** — `open() "/etc/nginx/.htpasswd" failed (13: Permission denied)` in
`/var/log/nginx/error.log`. Measured: with 640 root:root the no-creds case still returns a
correct 401, so a test that only checks "does it prompt" passes on a broken config. Test
with real credentials.

```bash
ssh droplet "cat > /etc/nginx/.htpasswd <<'EOF'
andrew:\$apr1\$…the hash…
EOF
chown root:www-data /etc/nginx/.htpasswd && chmod 640 /etc/nginx/.htpasswd"
```

Quote the heredoc (`<<'EOF'`) or the remote shell eats `$apr1` as a variable and writes a
truncated file.

**3. Add one `location` per protected path, above `location /`.** Back the vhost up first:

```nginx
location ^~ /work/stores-designer/ {
  auth_basic "andrewshiau.com";
  auth_basic_user_file /etc/nginx/.htpasswd;
  try_files $uri $uri/ $uri/index.html =404;
}
```

`^~` so the prefix wins over regex locations, and a **`=404` fallback, not `/index.html`** —
the site-wide `try_files … /index.html` would otherwise serve the public homepage for any
miss under the protected prefix, which reads like the auth silently failed.

```bash
ssh droplet 'cp /etc/nginx/sites-enabled/andrewshiau /root/andrewshiau.nginx.bak.$(date +%s)'
# edit, then:
ssh droplet 'nginx -t && systemctl reload nginx'
```

**4. Verify all four cases.** Anything less doesn't prove it works:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://andrewshiau.com/work/stores-designer/            # 401
curl -s -o /dev/null -w "%{http_code}\n" -u andrew:wrong https://andrewshiau.com/work/stores-designer/  # 401
curl -s -o /dev/null -w "%{http_code}\n" -u andrew:"$PW" https://andrewshiau.com/work/stores-designer/  # 200
curl -s -o /dev/null -w "%{http_code}\n" https://andrewshiau.com/                                 # 200 — public page unaffected
```

**5. The index still links to it.** Basic Auth protects the page, not the link — a hiring
manager clicking `01 Stores Designer` gets a browser credential prompt with no explanation.
If a page goes behind auth, its index row needs to say so, and `robots.txt` should
`Disallow:` the path (there is no `public/robots.txt` yet; add one if you protect anything).

---

## One-time droplet setup (run from your Mac)

> **Historical — not what production runs.** This describes a planned nginx→Caddy
> migration that was never carried out; the droplet still serves the site with nginx +
> certbot. See the Basic Auth section above for the live layout.

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
