# STYLE.md — andrewshiau.com steering

How this site looks, reads and ships. Read it before editing content or CSS; if you change
the system, change this file in the same commit. MUST / SHOULD / MAY are as in RFC 2119.

The site is one page of links (`/`), `/resume/`, `/404`, and the practice tools served by
`practice.andrewshiau.com`. The full site — case studies, essays, `/method/`, `/style/`,
`/system/` — and the decisions behind it are at tag `full-site-2026-10`.

---

## Voice

Dry, direct, understated. **Better not funny than very, very bad.**

- Plain. No preamble, no "In today's world…". State the thing.
- Not salesy or breathless. If a sentence sounds like a LinkedIn post, delete it.
- Understatement over emphasis: "it does the job well", not "incredibly powerful".
- First person, lower-key: "I design and build", not "Andrew is a multidisciplinary…".
- Cut hedges ("perhaps", "arguably", "quite") and intensifiers ("very", "really").
- Nothing internal ships: no internal hostnames, ticket or review IDs, codenames.

### Six habits that read machine-written — all banned

1. **The antithesis snap** — "X, not Y" when the reader was never considering Y. Say what it is.
2. **The aphorism closer** — ending on a maxim. End on something that happened, or a link.
3. **The em-dash as a general joint.** Two or three per page, for a real parenthetical.
4. **The stated principle** — "The job is to…". Replace it with the fact it stands in for.
5. **The apposition dodge** — a tail clause that renames what was just said. If deleting the
   tail loses nothing, delete it.
6. **The unfalsifiable number.** A figure in the copy MUST have a test that fails if it drifts.
   "Within 0.25 cents, C2 to C8" shipped false; it is "0.35 cents, C2 to C7" and
   `pitch.test.ts` asserts every step.

Prefer the concrete. A sentence that can't be falsified and a test that can't fail are the
same mistake.

---

## The document

Every page is one column, read top to bottom.

1. **One size.** 15px / 28px (`--step` / `--lead`) for everything. A new `font-size` is a bug.
   The one exception is `16px` on form inputs (`.f input`): below 16px iOS Safari zooms on focus.
2. **Whitespace is the structure.** No rules between groups, no hairlines per row, no boxes
   round content. The document pages draw no borders at all; the practice tools have their own
   vocabulary (see Instrument controls).
3. **One column of a 12-column grid**, placed `1 / 9` (700px at the 1120px measure); prose caps
   at `62ch`. The fields to the right are margin.
4. **Ink, plus one hue for one job.** Colour means "you can act on this". A coloured mark that
   isn't interactive is a slop finding.

Inner measures are stated in `ch`. In a monospace face `ch` is exact, and it can't drift when a
column moves; a track count inside the column is measured against the wrong grid.

---

## Tokens

All in `global.css` `:root` plus one `prefers-color-scheme: dark` block. Every colour MUST be a
`var(--…)`; a hex in a rule won't flip in dark.

| token | light | dark | job | on paper (light / dark) |
|---|---|---|---|---|
| `--paper` | `#f4f3ef` | `#141413` | ground | — |
| `--ink` | `#141412` | `#f0efe8` | the fact | 16.61 / 15.99 |
| `--dim` | `#5f5e57` | `#a09f96` | support: values, prose | 5.86 / 6.93 |
| `--faint` | `#6e6d64` | `#8f8e85` | annotation: labels, link underlines | 4.69 / 5.60 |
| `--line` | `#d5d4cd` | `#2b2b27` | hairlines in the practice tools; never a link underline | 1.34 / 1.30 |
| `--accent` | `#14306b` | `#6ea8ff` | the one hue: interaction | 11.36 / 7.64 |
| `--guide` | navy 6% | blue 8% | the `⌥G` column overlay | — |

**`--faint` clears AA by 0.19. Do not lighten it.** The accent is the same hue in both schemes,
lifted for the dark ground; text on a filled dark-accent field would need near-black (white is
2.41:1).

Space: `--tight` 14 (label to its value) · `--lead` 28 (inside a group) · `--group` 56 (between
groups) · `--sect` 112 (between sections) · `--gutter` 28 · `--measure` 1120. No off-grid
margins.

Motion: `--ease: cubic-bezier(0.16,1,0.3,1)`, durations `--dur` 220 / `--dur-fast` 140 /
`--dur-big` 340. Nothing else.

---

## Type

- **IBM Plex Mono**, self-hosted, 400 / 400 italic / 500 / 600; `--mono` is the only type token.
  Plex for its true italic; self-hosted so it isn't Menlo on one machine and Consolas on another.
- **No `letter-spacing`.** The advance width is the cell `1ch` measures.
- **Weight 500** for `h1` and `<b>`; everything else 400. The homepage statement is an `h1` at 400.
- **Emphasis inside a sentence is weight, never colour.** `b,strong` inherit colour: a `<b>`
  promoted from `--dim` to `--ink` is a 2.8× contrast jump inside one line.
- **The greys keep their jobs**: `--ink` the fact, `--dim` support, `--faint` annotation.
- **One mechanism per label.** A label is set apart by position (hung in its own column) or by
  value, not both. In the panel, `.pk` (Currently, Also) is ink; every other label is faint.
- **A label's styling is the only thing that makes it a label**, so anything nested inside one
  MUST reset it. The email in `.pin .pfoot a` once rendered as a label until it was reset.
- Flush-left, ragged-right. Never justify.

---

## Grid

- 12 columns, `--gutter` 28px, `.grid` + `.c1-12`. Full span is `1 / -1`, never `1 / 13`.
- `--label` is derived, not chosen — two tracks plus a gutter:
  ```css
  --track: calc((min(100vw, var(--measure)) - var(--gutter) * 13) / 12);
  --label: calc(var(--track) * 2 + var(--gutter));
  ```
  It was a flat `16ch` once and put every hung value 10px inside the gutter. The same formula
  gives the breakpoint: at **1060px** `--label` falls to 144px, the longest label, so hung
  labels stack below it.
- **≤720px** every block goes full width. Collapse the tracks too, with `minmax(0,1fr)`, never
  `1fr`: eleven gutters that don't collapse scroll the page sideways below 364px, and `1fr`'s
  min-content floor lets wide content force a track open.
- The page's top edge is one rule, `main > .grid:first-child`, never an inline margin.
- `⌥G` flashes the column guide. It is wired once, in `Layout.astro`, uses `e.code` (macOS turns
  ⌥G into `©`), and persists across pages in `localStorage`.

---

## Links

One idiom: **ink text, a 1px `--faint` underline at 4px offset; on hover the text goes to
`--accent` and the underline to `--ink`**, on `--dur`.

- The underline is `--faint`, not `--line`: at 1.34:1 the underline was technically decorative
  and practically invisible.
- External links get `↗` from `a[target]::after`. Never type it into link text — that rendered
  "github ↗ ↗".
- Internal paths read as paths with one slash (`/resume`); the `href` keeps its trailing slash
  so nginx serves the directory without a redirect.

---

## Motion

Hover only, rationed. What ships: link colour, the `↗` going to full opacity, and the mark's
90° turn on `.smark-home` (the one drawing of the mark that is a link). Every transition uses
`--ease` and one of the three durations. `prefers-reduced-motion` cuts all of it.

---

## Blocks in use

- **The panel** (`.pin`, the index): the statement, then `.prow` pairs (label above value,
  `--group` apart), then `.pfeet` — Contact and Resume side by side above 1060px, Elsewhere
  below, each link on its own line.
- **The facts ledger** (`.facts` / `.frow`, resume and 404): label hung in the `--label` column
  above 1060px, stacked below it.
- **Resume roles** (`.rsect` / `.role`): date span in the label column, body beside it.
- **The base layer**: Tailwind preflight and Basecoat's base live on as `@layer base` at the top
  of `global.css`. Layered, so every unlayered rule wins, as it did when the frameworks loaded.

---

## The mark

A hollow ring (design) and a solid disc (build) on the descending diagonal, joined by a 1.5px
rule. `MarkFigure.astro` is the source; `public/favicon.svg` is a hand copy (a favicon can't
import) — **change both**.

- Circles r=5 at (10,10) and (22,22), stroke 1.8. The join runs `13.54 → 18.46`, ending on each
  circle's path: 0.9 units inside the stroke and 0.64 clear of the hole. Change r or the stroke
  and all three numbers move.
- A one-sided figure is a single circle at r=7.2, matched to the pair by ink coverage, not radius.
- **18px is the floor**: below it the 1.8 stroke is under a device pixel and the ring blurs into
  a dot.

## Small delights — don't add more

- `::selection` inverts (`--ink` ground, `--paper` text).
- The cursor is an ink disc over paper only. Type keeps the text cursor via
  `:is(p,h1,h2,h3,li,dd,dt,code,blockquote,figcaption,span):not(a *)`; the `:not(a *)` keeps the
  pointing hand on links whose text is a `span`. It MUST NOT be the accent.
- `⌥G` (see Grid).

---

## Instrument controls — the practice room only

The tools are machines to operate, so they don't use the link idiom. One moving disc everywhere;
the track it rides says what the control does:

- **Value** (bpm, A4, reference note): the bare numeral is the control — scrub it (4px per unit),
  or type. Accent while in hand.
- **Toggle** (start/stop, tone): a two-pocket track; latched puts the disc in the far pocket, in
  accent. One label that swaps text, with the longer string's width reserved. The accent toggle is
  the exception: the beats rule itself is the switch.
- **Momentary** (tap): a lone ring. It fills accent on pointerdown and drains over 300ms.
- **Selector** (beats, subdivide): the digits are buttons and the rule under them is the value —
  solid for beats, dashed for subdivisions.

---

## Review

- **`/design-critique`** before a redesign. The panel for this site: design director;
  nitpicky junior + a11y; design manager; CEO / hiring manager; Orwell-plain copywriter;
  minimalist code reviewer; reductionist (Ive / Rams). Adversarial — praise is a failed prompt.
  The synthesis de-duplicates and ranks.
- **Measure dead CSS, don't eyeball it**: diff every class in a selector against the classes
  the kept pages and their scripts actually use. A rule nothing selects is a rule nobody trusts.
- **Annotations are the spec.** Andrew marks up the running site with Vibe Annotations; the path
  and the delete-after rule are in [`CLAUDE.md`](CLAUDE.md). A terse note is a real request —
  resolve it against these tokens, and fix the token or the shared rule, not the one pixel.

## Shipping

Build, deploy, push, then verify the live bundle in light, dark and at phone width —
[`CLAUDE.md`](CLAUDE.md) has the commands and the two rules that bite.
