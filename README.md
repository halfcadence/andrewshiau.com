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

Dependencies: **nothing ships at runtime** — no `dependencies` block at all, and the four
devDependencies never leave the build or the test run (`astro`, `@astrojs/sitemap`, `vitest`,
`@playwright/test`). The count is asserted by `tests/unit/readme.test.ts`.

## Structure

The site is a page of links (2026-10-20). The case studies, essays, `/method/`, `/style/`,
`/system/`, `/stories/` and the demos are at tag `full-site-2026-10`; their URLs are
redirect stubs to `/`, listed in `RETIRED` in `astro.config.mjs`.

```
src/pages/index.astro        the links page
src/pages/resume.astro       /resume/ — prints to PDF (scripts/print-check.py)
src/pages/404.astro
src/pages/practice-room/     the instrument, served by practice.andrewshiau.com
src/pages/pitchgraph.astro   the intonation trace, same host
src/layouts/Layout.astro     shared shell — head, landmarks, ⌥G grid overlay, favicon swap
src/styles/global.css        tokens, grid, every block
method/                      method.md + designer/builder/messaging (not rendered)
scripts/print-check.py       print a page for real and assert the PDF
scripts/favicon-ico.py       regenerate the .ico files from MarkFigure.astro's geometry
scripts/mac-preview.py       rewrite dist/ for file:// viewing on the Mac
tools/og-card.html           source for public/og.png (not a route)
deploy.sh                    rsync dist/ → droplet, with an empty-dist guard
```

### A build-time behaviour worth knowing

- **Comments are stripped from the built HTML** (`stripHtmlComments` in
  `astro.config.mjs`). The source carries long explanatory comments; the shipped page
  doesn't. `<pre>`, `<code>`, `<script>` and `<style>` regions are masked first.

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

## nginx on the droplet

The vhost is `/etc/nginx/sites-enabled/andrewshiau` (root `/var/www/andrewshiau`, certbot TLS).
Back it up before an edit, then test and reload:

```bash
ssh droplet 'cp -p /etc/nginx/sites-available/andrewshiau /root/andrewshiau.nginx.bak.$(date +%Y%m%d-%H%M%S)'
ssh droplet 'nginx -t && systemctl reload nginx'
```

The password gate on `/work/stores-designer/` was removed 2026-10-20; the vhost and `gate.conf`
from before are in `/root/*.20261020-235116`.

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
which is worse than the homepage was. The body is `src/pages/404.astro` → `dist/404.html`,. **Deploy the page before
changing the config**, or misses are nginx-grey in the window between.

Verify after any change:

```bash
C() { curl -s -o /dev/null -w "%{http_code}\n" "$@"; }
C https://andrewshiau.com/zzz-does-not-exist    # 404, NOT 200
curl -s https://andrewshiau.com/zzz | grep -c '<h1>Not found</h1>'  # 1  our page, not nginx grey
curl -sI https://andrewshiau.com/favicon.ico | grep -i content-type   # image/x-icon
C https://andrewshiau.com/resume/               # 200
C https://andrewshiau.com/work/luthier/         # 200, a redirect stub
```

`/favicon.ico` returning `text/html` means the fallback went back to `/index.html`. Match the
`<h1>`, not the bare phrase: `grep -c` counts lines, and the minified HTML puts "Not found" in the
title too.

---

## Regenerating the social card (`public/og.png`)

```bash
npm run build && python3 scripts/og-shoot.py && npm run build && ./deploy.sh
```

The second build is not optional: the script writes `public/og.png` only, and `dist/` still
holds the card the first build copied in.

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
