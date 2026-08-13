# andrewshiau.com

Astro static site, set in IBM Plex Mono on a 12-column grid. Served from a
DigitalOcean droplet over HTTPS (nginx + certbot / Let's Encrypt, auto-renew).

**Design + voice spec: [`STYLE.md`](STYLE.md)** — tokens, the one size, the grid, the
link system, motion, voice, the `/design-critique` panel. Read it before editing
anything visual. It renders at [`/style/`](https://andrewshiau.com/style/) from that
same file, so the page and the spec cannot drift.

**Working with an agent here: [`CLAUDE.md`](CLAUDE.md)** — the devbox/Mac split, the
verify-live rule, and how to read the browser design annotations.

## Develop

```bash
npm install
npm run build          # → dist/
npm run dev            # 127.0.0.1:4321 — run on the MAC, never the devbox
```

The repo lives in `workplace/andrewshiau` so Unison syncs the **source** to the Mac.
`node_modules/` and `dist/` are deliberately not synced (native binaries differ per OS),
so run `npm install` once on whichever machine you build from.

**Devbox rule:** never run a dev server on the Amazon devbox. Build there and view the
synced `file://` copy, or run `npm run dev` on the Mac. A server on `0.0.0.0` here is a
CRITICAL Qualys finding — it has happened twice. The one sanctioned exception is
`scripts/print-check.py`, which binds `127.0.0.1`, runs in the foreground, and closes in
a `finally`.

Dependencies: **nothing ships at runtime** — no `dependencies` block at all, and the seven
devDependencies never leave the build or the test run (`astro`, `@astrojs/sitemap`,
`tailwindcss` + `@tailwindcss/vite`, `basecoat-css`, plus `vitest` and `@playwright/test`).
Tailwind and Basecoat are used by `/system/` alone; `global.css` does the layout by hand.
There is no markdown renderer either — `style.astro` carries its own ~110-line one for the
thirteen constructs `STYLE.md` actually uses. Keep it that way: it must not grow into a
parser. These counts are asserted by `tests/unit/readme.test.ts`.

## Structure

```
src/pages/index.astro        landing — pinned panel, Work + Experiments matrices, colophon
src/pages/work/*.astro       10 case studies
src/pages/writing/*.astro    4 explainers (own layout + quiz engine)
src/pages/style.astro        renders STYLE.md itself, at build time
src/pages/system.astro       every token and device drawn with the real classes
src/pages/method.astro       the method files, with build-time assertions against method/
src/pages/{resume,stories,gate,404}.astro
src/data/experiments.ts      the Work + Experiments rows (edit here to add an entry)
src/data/stories.ts          /stories/ content
src/layouts/Layout.astro     shared shell — head, landmarks, ⌥G grid overlay, favicon swap
src/styles/global.css        the design system (tokens, grid, every block)
src/styles/system.css        /system/ only — connects the system to basecoat-css
method/                      method.md + designer/builder/messaging, rendered by /method/
scripts/print-check.py       print a page for real and assert the PDF
scripts/favicon-ico.py       regenerate the .ico files from MarkFigure.astro's geometry
scripts/mac-preview.py       rewrite dist/ for file:// viewing on the Mac
scripts/                     the only home for generator scripts (choosers, icons, og, checks)
tools/og-card.html           source for public/og.png (not a route)
deploy.sh                    rsync dist/ → droplet, with an empty-dist guard
```

To add an entry: append to `src/data/experiments.ts`, and add a page under
`src/pages/work/` if it needs a case study. `PanelHead.astro` derives each case study's
panel from that same data, so a row and its page cannot disagree — which also means a
page whose `href` is not in the list must write its own panel (`/style/` does).

### Two build-time behaviours worth knowing

- **Comments are stripped from the built HTML** (`stripHtmlComments` in
  `astro.config.mjs`). The source carries long explanatory comments; the shipped page
  doesn't. `<pre>`, `<code>`, `<script>` and `<style>` regions are masked first, so the
  explainers' quiz engine survives.
- **Several pages assert their own content and fail the build if it drifts.** `/method/`
  quotes `method/*.md` and checks the sentences still exist. `/style/` requires 24+ headings
  plus three literal rules by name. `/system/` checks that every token it documents is still
  declared in `global.css` (and that deleted ones stayed deleted), and diffs `favicon.svg`'s
  geometry against `MarkFigure.astro` — the one thing a hand copy can't guarantee. `/stories/`
  and `/gate/` assert their own data. A build error from one of these is the assertion doing
  its job: fix the source of truth, don't loosen the number.

## Ship it

Everything goes out as soon as it works — this is a static personal site and the whole
rollback is one `git revert` plus one `./deploy.sh`.

```bash
npm run build && ./deploy.sh && git push
```

Then **verify against the live site, not the build**: fetch the page and grep for what you
shipped, and look at it rendered in light, dark, and at phone width. Two bugs have shipped
clean-built. `deploy.sh` refuses to sync a `dist/` with fewer than 15 HTML files — a failed
build once left `dist/` empty and `rsync --delete` wiped the live webroot.

When the output is an artifact — a PDF, the social card, an unfurl — produce the artifact
and inspect it:

```bash
npm run build && python3 scripts/print-check.py /resume/
```

That prints the real page with headless Chrome over loopback and reads the PDF back
(page count, wrapped dates, cell collisions). A screen render can't tell you anything
about paper: an iframe has no `@page`, no `break-inside`, and no pagination. Dividing its
height by a page height is not a page count — that mistake shipped `/resume/` as three
pages while the notes claimed 1.90.

---

## The password gate (nginx cookie gate, not Basic Auth)

`/work/stores-designer/` is the one gated page.

**What runs in production is nginx.** The live vhost is
`/etc/nginx/sites-enabled/andrewshiau` (root `/var/www/andrewshiau`, certbot-managed TLS).

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

location / { try_files $uri $uri/ $uri/index.html =404; }

error_page 404 /404.html;
```

Three things here are not interchangeable:

- **`^~`** so the prefix beats any regex location, and a **`=404` fallback** on the gated
  prefix — `/index.html` there would serve the public homepage for a miss under the protected
  prefix, which reads like the gate failed open.
- **`error_page`, not a redirect.** The address bar keeps reading `/work/stores-designer/`
  and the status stays 401, so the reader gets a page where the dialog used to be while a
  crawler gets exactly the refusal Basic Auth gave it.
- **`location ^~ /gate/ { internal; }`, not `location = /gate/index.html`.** The exact-match
  version was too narrow: a request for `/gate/` fell through to `try_files` → `index` and
  served the gate as a URL of its own. Prefix + `internal` 404s both `/gate/` and
  `/gate/index.html` from outside while the internal redirect still reaches the file.

### `location /` ends `=404`, and that is load-bearing

It ended **`/index.html`** until Jul 2026, which served the homepage at status **200** for every
path that does not exist. Two costs, and the second is how it was found:

1. A 200 on a miss tells a crawler the URL is real, so any typo'd or stale inbound link becomes
   an indexable duplicate of the homepage.
2. **Browsers request `/favicon.ico` on their own**, at a fixed path, before any markup says
   where to look. It received 15 kB of HTML typed `text/html`, could not be decoded as an image,
   and the browser drew its own placeholder tile — **a square**. The report was "i swear it has a
   square?", and the square was never in `favicon.svg` (that file has no `rect` and its corners
   measure transparent). Chasing it in the SVG finds nothing; the bug is one line of nginx.

`$uri/index.html` **stays ahead of the fallback** — that is what serves the real pages, which are
all directory-style (`/method/` → `/method/index.html`). Only the final fallback changed.

`error_page 404 /404.html` is required with it: `=404` alone answers with nginx's grey default,
which is worse than the homepage was. The body is `src/pages/404.astro` → `dist/404.html`, and it
is **not** `internal` (unlike `/gate/`) because there is no secret in it. **Deploy the page before
changing the config**, or misses are nginx-grey in the window between.

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
curl -s $U | grep -c '<h1>Not open yet</h1>'    # 1    the 401 body is our page
C https://andrewshiau.com/gate/                 # 404  internal only
C https://andrewshiau.com/gate/index.html       # 404  internal only
C https://andrewshiau.com/                      # 200  public pages unaffected
C https://andrewshiau.com/work/luthier/         # 200
```

The same run covers the `=404` fallback, because the two share `try_files` and a change to one
can break the other:

```bash
C https://andrewshiau.com/zzz-does-not-exist    # 404  NOT 200 — the whole point
curl -s https://andrewshiau.com/zzz | grep -c '<h1>Not found</h1>'  # 1  our page, not nginx grey
curl -sI https://andrewshiau.com/favicon.ico | grep -i content-type   # image/x-icon
C https://andrewshiau.com/method/               # 200  $uri/index.html still ahead of =404
```

`/favicon.ico` returning `text/html` is the regression to watch for: it means the fallback went
back to `/index.html`, and the placeholder square comes with it.

Both body checks match the **`<h1>`**, not the bare phrase. `grep -c` counts matching *lines*,
and the built HTML is minified onto a few very long ones — the page title and the OG tags put
"Not found" on a second line, so the loose version of that check reported `2` and looked like a
failure. Anchor the assertion to the one element that can only appear once.

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

```bash
npm run build && python3 scripts/og-shoot.py
```

`tools/og-card.html` is the source; the script serves `dist/` on 127.0.0.1, shoots the card
through Playwright, and **asserts it still matches the site**. Run it when the index's h1, the
`Currently` line, the palette or the mark changes — the PNG is a fixed raster and cannot track
the site on its own.

What it checks, and why each one exists:

- **The claim is `index.astro`'s `<h1 class="statement">` verbatim**, and the foot is the index
  panel's `Currently` value. The card quotes the page; it does not paraphrase it.
- **The figure's geometry matches `MarkFigure.astro`** — the card is a third hand copy of the
  mark (with `favicon.svg`), so it gets the same guard `/system/` gives the favicon.
- **Graphik and the retired olive appear nowhere** in the live CSS. Both were in this card for
  months after the mono pass.
- **Ink per band in the produced PNG.** This is the one that matters most: the first fixed
  version passed every source assertion above and painted the **foot row blank**, because
  `chrome --headless --screenshot --virtual-time-budget` fires before the webfont settles the
  final layout. The capture waits on `document.fonts.ready` now, and the band check is what
  proves it did.

The card is copied into `dist/` under a temporary name for the length of one capture and removed
in a `finally` — `tools/` is outside `src/pages/`, so it is not a route and not in the sitemap.
A bare card page is not something a reader should land on.

If the card's wording changes, change `og:image:alt` in `Layout.astro` with it — the alt is read
aloud in place of the card, so it describes the card rather than the site.

## Regenerating the favicons

```bash
python3 scripts/favicon-ico.py
```

`MarkFigure.astro` is the source of truth for the mark; `favicon.svg` is a hand copy the
build **diffs against it** (assertions in `src/pages/system.astro`). An `.ico` is a raster
and can't be diffed that way, so it is never hand-edited — run the script and commit both
`favicon.ico` (ink, light tab) and `favicon-dark.ico` (paper, dark tab). `Layout.astro`
swaps them on a `prefers-color-scheme` listener.

---

## The droplet

| | |
|---|---|
| Host | `104.236.237.122`, Ubuntu 18.04, NYC3, 512 MB. SSH alias `droplet` |
| Server | nginx 1.14.0, certbot 0.27 (`certbot.timer` active, auto-renew) |
| Webroot | `/var/www/andrewshiau` — the `rsync --delete` target, built output only |
| vhosts | `sites-available/andrewshiau`, `practiceandrewshiau`, `andrewshiau2018` |
| Archive | the old React site at `https://2018.andrewshiau.com` |

### Two hosts, one webroot — how the practice tools are served

`practice.andrewshiau.com` is **the practice host**: the tools you open to practise on,
each at its only public address (moved 2026-08-07). Both vhosts have
`root /var/www/andrewshiau`, so **one `./deploy.sh` feeds both** and the two can never
serve different content — verified byte-identical, same ETag.

| tool | its address | the apex path |
|---|---|---|
| practice room (tuner, metronome, drone) | `practice.andrewshiau.com/` | `/practice-room/` → 301 |
| pitchgraph (the intonation trace) | `practice.andrewshiau.com/pitchgraph/` | `/pitchgraph/` → 301 |

**Renamed 2026-08-07: `readings` was `pitchgraph`.** `/pitchgraph/` on the apex **keeps its
301** — it points at the new address, because it was published under the old name and a
retired name is not a retired URL. Asserted by the `RETIRED_PATHS` test in
`tests/e2e/page.spec.ts`, which also checks the query string survives.

**Adding a tool is three things**, and the e2e table in `tests/e2e/page.spec.ts` fails
until all three are done: pass `onPracticeHost` to `Layout` (moves the canonical), add a
`location ^~` on the practice vhost (its catch-all 301s anything unknown to the apex, so a
missing block shows up as a redirect where a 200 belongs), and add the 301 on the apex
vhost. The sitemap exclusion in `astro.config.mjs` is asserted by a *relationship* test —
no sitemap URL may name a page declaring a different canonical — so that one goes red on
the build rather than needing to be remembered.

Case studies stay on the apex (`/work/practice-room/`). The practice host links tools to
tools: if you are there, you came to play, not to read.

The part worth understanding before changing either vhost, because it is easy to get
backwards:

| | |
|---|---|
| `practice.andrewshiau.com/` | **200.** `location = /` does `try_files /practice-room/index.html` — a **filesystem** lookup, not an HTTP request to the apex |
| `andrewshiau.com/practice-room/` | **301** to the subdomain, keeping `$is_args$args` |
| `practice.andrewshiau.com/practice-room/…` | **200.** Its own `location ^~` serves the manifest and icons from here |
| `practice.andrewshiau.com/practice-room/manifest.json` | **200,** but serves `manifest-root.json` — same URL, host-specific file, so `start_url`/`scope` can be `/` for the home-screen app |

So the **files** under `dist/practice-room/` must exist; the **apex URL** was only ever a
routing choice. Redirecting a URL is not deleting a file — that confusion is what kept
the duplicate address alive for two days.

Non-app paths on the subdomain 301 to the apex, so the subdomain is not a second copy of
the site. And `$is_args$args` on every one of these redirects is deliberate: dropping
`?e2e` once broke 21 tests.

Certs were added with `certbot --nginx` rather than swapping in another server: nginx was
already healthy serving every vhost, so adding certs in place had far lower blast radius
than replacing the server on an EOL 512 MB box.

**Anything destructive here — nginx config, certs, `rm` outside the webroot — stops and
asks first.** Deploying does not: it is one rsync into a directory that holds nothing but
built output.
