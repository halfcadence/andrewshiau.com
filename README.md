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

## The password gate (nginx cookie gate, not Basic Auth)

**What runs in production is nginx, not Caddy.** `systemctl is-active nginx caddy` on the
droplet returns `active` / `inactive`; the live vhost is
`/etc/nginx/sites-enabled/andrewshiau` (root `/var/www/andrewshiau`, certbot-managed TLS).
The `Caddyfile` in this repo was never installed — the "One-time droplet setup" section
below describes a migration that didn't happen. Edit nginx, not the Caddyfile.

**Read this first: this is a speed bump, not a safety guarantee.** It keeps a page out of
Google and off a casual visitor's screen. It does **not** make the page safe for material
that shouldn't leave Amazon: the password is shared, it can be forwarded in one paste, and
the page still sits unencrypted on a public webroot where any config slip serves it plain.
`/work/stores-designer/` is written to be publishable — no screenshot, no component name,
no metric, no architecture (see the comment in the page). If a change to it would need auth
to be safe, the change doesn't belong on this site.

**This replaced Basic Auth**, which worked but asked in the browser's own credential
dialog: unstylable browser chrome, drawn only because nginx sends `WWW-Authenticate`. So
the mechanism had to change, not the styling. What replaced it is a cookie nginx compares
plus **our** page as the 401 body — a real 401 (crawlers still turned away), no dialog.
The gate the reader sees is `src/components/GateForm.astro` inside the index row itself
(chooser `andrewshiau-gate-options`, option 05).

### The recipe

**1. The map, in `conf.d`, not the vhost.** `/etc/nginx/nginx.conf` includes `conf.d/*.conf`
on line 61 and `sites-enabled/*` on line 62 — in that order, which is why the map is defined
by the time the vhost tests it. It must be at `http` level; `map` inside a `server` block is
a config error. Send the password over **stdin** so the plaintext never reaches the droplet's
shell history or its process list:

```bash
printf '%s' 'thepassword' | ssh droplet "umask 077; cat > /tmp/pw && \
  { printf 'map \$cookie_asc_gate \$asc_gate_ok {\n  default 0;\n  \"%s\" 1;\n}\n' \
    \"\$(cat /tmp/pw)\" > /etc/nginx/conf.d/gate.conf; }; shred -u /tmp/pw; \
  chmod 600 /etc/nginx/conf.d/gate.conf"
```

**`default 0` is load-bearing.** Without it a miss yields the empty string, which is falsy
in `if` but is not the `"0"` the vhost compares — the gate then opens for everyone.

**2. The vhost: return 401, and serve our page as its body.** Back it up first
(`cp … /root/andrewshiau.nginx.bak.$(date +%s)`). Above `location /`:

```nginx
location ^~ /work/stores-designer/ {
  if ($asc_gate_ok = 0) { return 401; }
  try_files $uri $uri/ $uri/index.html =404;
}

error_page 401 /gate/index.html;

location ^~ /gate/ {
  internal;                 # reachable by error_page's internal redirect, 404 from outside
}

location / { try_files $uri $uri/ $uri/index.html /index.html; }
```

Three things here are not interchangeable:

- **`^~`** so the prefix beats any regex location, and a **`=404` fallback, not
  `/index.html`** — the site-wide `try_files … /index.html` would otherwise serve the public
  homepage for a miss under the protected prefix, which reads like the gate failed open.
- **`error_page`, not a redirect.** The address bar keeps reading `/work/stores-designer/`
  and the status stays 401, so the reader gets a page where the dialog used to be while a
  crawler gets exactly the refusal Basic Auth gave it.
- **`location ^~ /gate/ { internal; }`, not `location = /gate/index.html`.** The exact-match
  version was too narrow: a request for `/gate/` fell through to `try_files` → `index` and
  served the gate as a URL of its own. Prefix + `internal` 404s both `/gate/` and
  `/gate/index.html` from outside while the internal redirect still reaches the file.

```bash
ssh droplet 'nginx -t && systemctl reload nginx'
```

**3. Verify. Ten cases, measured — anything less doesn't prove it works:**

```bash
U=https://andrewshiau.com/work/stores-designer/
C() { curl -s -o /dev/null -w "%{http_code}\n" "$@"; }
C $U                                            # 401  no cookie
C --cookie 'asc_gate=wrong' $U                  # 401  wrong password
C --cookie "asc_gate=$PW" $U                    # 200  correct
C --cookie "asc_gate=$PW" ${U}nope/             # 404  the =404 fallback, not the homepage
curl -sI $U | grep -i www-authenticate          # NOTHING — the whole point: no dialog
curl -s $U | grep -c 'Not open yet'             # 1    the 401 body is our page
C https://andrewshiau.com/gate/                 # 404  internal only
C https://andrewshiau.com/gate/index.html       # 404  internal only
C https://andrewshiau.com/                      # 200  public pages unaffected
C https://andrewshiau.com/work/luthier/         # 200
```

**To change the password:** rewrite `conf.d/gate.conf` (step 1) and reload. Nothing else —
the password is never in the bundle. The client sets the cookie and asks the *server*
whether it worked (`fetch(dest, {method:'HEAD'})`, a 401 back = wrong), so there is no copy
in the JS to keep in sync and nothing to leak. Grep `dist/` for the password after a build:
zero hits is the invariant.

**4. The index still links to it,** and the link has to say so before the click. Four edits,
all done for `/work/stores-designer/`:

- `src/data/experiments.ts` → `locked: true`, which renders the row as
  `LockedRow.astro` (lock mark at the title + `Password` in the marker cell) and is what
  `src/pages/gate.astro` looks up.
- `public/robots.txt` → `Disallow:` the gated path. The 401 turns a crawler away, but
  without this the URL is still indexed and surfaces as a result that asks for a password.
  **Do not Disallow `/gate/`** — a Disallow'd URL can still be indexed as a bare link,
  because the crawler is then forbidden from fetching the `noindex` that would stop it.
- `astro.config.mjs` → add both the gated path **and** `/gate/` to the sitemap `filter`. A
  sitemap is a request to index; asking a crawler to index a URL that answers 401 is a
  contradiction.
- `src/pages/gate.astro` → `noindex={true}`, for a crawler that reaches `/gate/` some other
  way.

---

## Regenerating the social card (`public/og.png`)

`tools/og-card.html` is the source. Do this when the claim, the palette, or the mark
changes — the PNG is a fixed raster and can't track the site on its own.

It has to be **served**, not opened as `file://`: the card is set in Graphik and the
woff2 files only load same-origin, so a `file://` copy falls back to Helvetica and the
card stops being cut from the real system. Run it on the **Mac** — never a server on the
devbox (see the top of this file).

```bash
# on the Mac, in the repo
cp tools/og-card.html public/og-card.html   # temporary — it must be under the served root
npm run dev
# then, in the browser at http://127.0.0.1:4321/og-card.html, capture the .card element
# at exactly 1200×630 (deviceScaleFactor 1 — the meta says 1200×630, so don't ship @2x).
rm public/og-card.html                      # do NOT leave it in public/: it would deploy
```

The copy is deliberately temporary. `tools/` is outside `src/pages/`, so the card is not a
route and not in the sitemap — a bare card page is not something a reader should land on.

Then check the result: 1200×630, under ~100KB, and legible at thumbnail size (the ledger's
15px caps are the first thing to go). `Layout.astro` hardcodes the dimensions and the
`og:image:alt` text — if the card's wording changes, change the alt with it.

---

## One-time droplet setup (run from your Mac)

> **Historical — not what production runs.** This describes a planned nginx→Caddy
> migration that was never carried out; the droplet still serves the site with nginx +
> certbot. See "The password gate" above for the live layout.

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
