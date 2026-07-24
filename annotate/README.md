# Annotate — leave notes on the live-dev site for the agent

A dev-only overlay to mark up the site while it runs locally, so you can drop a
pile of "make this bigger / wrong copy / fix this spacing" notes in one pass and
hand them to Claude to address. **Dev only** — it injects nothing into
`astro build`, so production is untouched.

## Run it (on the Mac)

The dev server must run on the **Mac**, not the Amazon devbox (devbox rule: no
server bound to all interfaces). The repo source syncs Mac ⇄ devbox via Unison.

```bash
# on the Mac, in the synced repo (/Volumes/workplace/andrewshiau):
npm install        # once
npm run dev        # → http://127.0.0.1:4321
```

Open `http://127.0.0.1:4321` in the Mac browser.

## Use it

1. Press **`a`** to arm (the toolbar bottom-right shows "annotate: ON").
2. **Click** any element you want to comment on.
3. Type your note in the prompt. A red pin drops where you clicked.
4. Repeat across pages. Press **`Esc`** to disarm.
5. Toolbar buttons: **notes** (list this page's notes) · **clear** (wipe all).

Each note records the page, your text, a CSS selector + visible label for the
element, and the click position. They append to `annotate/notes.ndjson`.

## Hand them to the agent

`annotate/notes.ndjson` syncs back to the devbox via Unison. Just tell Claude
"address my annotation notes" — it reads the file (one JSON object per line:
`{page, note, selector, label, x, y, ts}`), works through them, and can clear the
file when done. The file is git-ignored, so notes never get committed.

## How it's wired (for the curious)

`annotate/integration.mjs` is an Astro integration added in `astro.config.mjs`:
- `astro:config:setup` — only when `command === 'dev'`, injects the overlay client
  via `injectScript('page', …)`. In `astro build` this branch never runs.
- `astro:server:setup` — registers a dev middleware at `/__annotate`
  (POST appends a note, GET returns them, DELETE clears).

No new npm dependencies; no production footprint.
