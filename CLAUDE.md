# andrewshiau.com — read this first

Astro static personal site, hand-set in the Müller-Brockmann grid system.

- **Design + voice spec: [`STYLE.md`](STYLE.md)** — the source of truth for tokens, the
  type ramp, grid, link system, motion, voice, and the `/design-critique` panel. Read it
  before editing anything visual.
- **Setup, droplet runbook, deploy: [`README.md`](README.md).**

## Two rules that bite

1. **Never run a dev server on the Amazon devbox.** `npm run dev` runs on the **Mac**
   only. On the devbox, `npm run build` and view the Unison-synced `file://` copy. A
   server bound to `0.0.0.0` here is a CRITICAL Qualys finding (it has happened twice).
2. **A green build ≠ a correct change.** Fetch the LIVE bundle and grep for what you
   shipped, then eyeball the rendered page (light, dark, and phone width). Two bugs
   shipped clean-built.

## Reading the user's design annotations

The user marks up the running site with the **Vibe Annotations** Chrome extension
(`vibe-annotations.com`) instead of describing problems in prose. When they say
"read my annotations" / "address my notes", read this file:

```
/local/home/shiauas/workplace/work/vibe-annotations/annotations.json
```

That is the Mac's `~/.vibe-annotations` — a **symlink** into the Unison-synced
`workplace` tree, so the annotation server writes into a path the devbox can read.
Prefer this file over Chrome MCP (which disconnects often). Setup + gotchas:
`work/vibe-annotations/README.md`.

Each annotation carries: `comment` (the user's note), `selector` +
`element_context.path` + `parent_chain`, `element_context.tag/text/styles` (computed),
`url_path`, and `viewport` (tells you whether a complaint is desktop or narrow).

- **`source_file_path` is always `null`** — resolve to source by grepping the element
  text or selector. E.g. `<h2>Work</h2>` → `src/pages/index.astro`; a `p.ed` inside
  `a.entry.pos-02` → the blurb in `src/data/experiments.ts`.
- **Delete each annotation once implemented** — via the extension API, not by editing
  the JSON (hand-edits fight the server's in-memory copy):
  ```
  # Chrome MCP evaluate_script on the localhost tab
  await window.__vibeAnnotations.deleteAnnotation(id)
  ```
  Design-edit annotations left behind get re-applied as a live inline-style overlay on
  the next reload, doubling your source change.

If the file is missing or stale: the Mac-side server must be running
(`npx vibe-annotations-server start -d`; `init` alone may not start it) — check
`server.pid` / `server.log` beside the JSON, then allow for Unison sync delay.
`window.__vibeAnnotations.status()` returning `{extension:true, server:false}` means the
server is down (the Chrome-MCP fallback still works in that state).

**Never run the annotation server on the devbox** — it binds `0.0.0.0` on port 3846
(a WSL2 workaround in its source), which is exactly the finding in rule 1.
