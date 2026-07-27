# STYLE.md — andrewshiau.com steering

The single source of truth for how this site looks, reads, and ships. Read this
before editing content or CSS. If you change the system, change this file in the
same commit.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** are to be
interpreted as in RFC 2119.

This site is itself an artifact of the `/muller` house style (Josef Müller-Brockmann's
grid system) — it is the live demo of the "Aping" experiment. When the two conflict,
`/muller`'s system wins; this file records the *specific* choices made for this site
(exact tokens, the link system, the voice) that the general skill leaves open.

---

## Voice & tone

The voice is **dry, direct, understated — Swiss.** Rational objectivity in prose,
not just layout. The bar: **better not funny than very, very bad.** A joke that
doesn't land is worse than no joke.

- Copy MUST be plain. No preamble, no throat-clearing, no "In today's world…".
  State the thing.
- Copy MUST NOT be smarmy, salesy, or breathless. No "excited to share", no
  "revolutionary", no "leveraging AI to…". If a sentence sounds like a LinkedIn
  post, delete it.
- Understatement over emphasis. "It does the job well" beats "incredibly powerful".
- Own the premise plainly. The word is **aping** — imitating — and the site says so.
  Don't reach for a softer word ("inspired by", "homage").
- On AI ethics: **hold cards close to the chest.** State what was done (I taught an
  agent a style; I drew a line at living studios) without moralizing or a manifesto.
  The reader draws the conclusion. No "the future of creativity" essays.
- First person, lower-key. "I design and build" — not "Andrew is a multidisciplinary…".
- Cut hedging adverbs ("perhaps", "arguably", "quite") and intensifiers ("very",
  "really", "incredibly") — they add nothing.
- No meta-commentary about how the content was produced beyond the honest, one-line
  AI-transparency notes the site already carries (the footer, the "/swiss" attributions).
  No compliance boilerplate, no "rephrased for…", no tool instructions in prose.

---

## Design system — Müller-Brockmann grid

International Typographic Style: one typeface, a visible 12-column modular grid every
element snaps to, baseline rhythm, structure drawn by **rules and alignment — not
boxes**, and **one rationed structural accent** (`--design`, navy). Hierarchy is size +
weight + position, never colour. The second hue (`--build`, olive) is **not** a second
accent — it is a piece of content: it says *which half of the practice* something is,
and it appears in exactly three places (below). Light is default; dark follows
`prefers-color-scheme`.

All tokens live in `src/styles/global.css` `:root` (light) and one
`@media (prefers-color-scheme: dark)` block. Every colour MUST be a `var(--…)` — a
hardcoded hex in an element won't flip in dark and is a bug.

### Colour tokens

| token | light | dark | role |
|---|---|---|---|
| `--paper` | `#f4f3ef` | `#141413` | page ground (warm off-white / near-black) |
| `--panel` | `#ffffff` | `#1b1b19` | framed surfaces (embed frames) |
| `--ink` | `#141412` | `#f0efe8` | type + rules |
| `--dim` | `#5f5e57` | `#a09f96` | secondary text, deks, blurbs |
| `--faint` | `#6e6d64` | `#8f8e85` | meta labels (kickers, `.lu`, `.em`) — **darkened to pass WCAG AA 4.5:1**; do not lighten |
| `--line` | `#d5d4cd` | `#2b2b27` | hairline rules |
| `--design` | `#14306b` navy | `#6ea8ff` | the design half — **and** the structural accent |
| `--build` | `#5c6b12` olive | `#b9cc4a` | the build half — **content only**, 3 places |
| `--accent` | `var(--design)` | `var(--design)` | indirection: every structural role reads this |
| `--on-accent` | `#ffffff` | `#141413` | text on a filled `--accent` field |

**Measured** (WCAG contrast on the mode's own `--paper`): navy 11.36:1 light, 7.64:1
dark; olive 5.30:1 light, 10.36:1 dark; `--on-accent` on the field 12.61:1 light,
7.64:1 dark. Note the dark flip — **white on `#6ea8ff` is only 2.6:1**, so
`--on-accent` MUST be near-black in dark. Don't "simplify" it back to white.

#### The duality — why there are two hues

The site's subject is a practice with two halves. The two hues carry that, and nothing
else. Keep the two jobs separate:

- **`--accent` is structural, and it IS `--design`.** It appears in ~6 sanctioned roles
  and nowhere else: the first/lead top-rule of a group, a big set number (`.sn`/`.en`),
  the flagship `.entry.accent` rule on each index list, the one filled `.block`, the
  correct-answer quiz state, and link interaction (see Link system). Because `--accent: var(--design)`, changing
  the design hue moves every structural role in one line — never find-and-replace it.
- **`--build` appears in exactly three places.** The mark (`.mark`, `favicon.svg`), the
  side marker (`.side-build` / `.side-both`), and the thesis clause (`.thesis .t-build`)
  on the homepage. That's the whole list.
- **Colour is never the only signal.** Navy and olive are just **2.14:1 apart in
  greyscale** — a colourblind or greyscale reader can't tell the dots apart. So the side
  marker always sets the **word** beside the dot ("Design" / "Build" / "Design + Build"),
  and the marker's data lives in one place: `side` on each `Entry` in
  `src/data/experiments.ts`. Case-study pages read it via `sideOf(href)` (the
  `SideMark.astro` component) so the page and the index can't disagree.
- **A third hue, or either hue used decoratively, is a slop finding — reject it.**
  Colour in body copy is allowed in the thesis sentence ONLY, because there the two
  halves *are* the subject.
- Both hues are the **same hue family** in both modes — lifted for the dark ground, not
  inverted, not recoloured.

### Type

- **Typeface:** Graphik, self-hosted from the 2018 portfolio (`public/fonts/*.woff2`,
  weights 400 / 400-italic / 600 / 700), with `"Helvetica Neue", Helvetica,
  "Akzidenz-Grotesk", Arial, system-ui, sans-serif` fallback. One family. No serif,
  no mono body (mono only for inline `code`). `--sans` is the token.
- Body: **16px / 24px line** (`--unit` = 24px is the baseline), weight 400, tracking
  `-0.004em`. Heads are 700. Large type gets tighter negative tracking.
- **Type ramp — Ramp B (major third, ×1.25, base 16):**
  `10 · 13 · 16 · 20 · 25 · 31 · 39`. This is the reference scale; new sizes MUST
  snap to a ramp step (display sizes MAY use a `clamp()` whose max lands on a step).
  Current mapping:
  - `11` → kickers, `.lu`, `.em`, `.ck`, section meta (below-ramp micro-label; the one
    intentional exception, tracked `.13–.16em` uppercase)
  - `13` → small facts / footer text
  - `15` → blurbs, step detail, colophon
  - `16` → body (base)
  - `20 / 25` → `.dek`, project links (`clamp(18–24)`)
  - `25 / 31` → `h2`, entry headings (`clamp(20–28)`) — one size everywhere, including
    inside `.shead`; the old 25px cap existed only to fit a 2-column margin that is gone
  - `31 / 39+` → section numbers `.sn` (`clamp(26–42)`), entry numbers `.en`
  - **display** → `h1` hero `clamp(42px, 7.5vw, 88px)`, line-height 0.97, tracking
    `-0.03em` (above the ramp; the one type-as-event moment)
- **Case:** sentence/lower case for content. `text-transform: uppercase` +
  letter-spacing is used ONLY on the small micro-labels (kickers, `.em`, `.ck`, mast
  captions, `.back`). Never uppercase a headline or body.
- Flush-left, ragged-right. **Never justify** — it wrecks word spacing.

### The grid

- 12 columns, `--gutter` 28px, via `.grid` / `.c1-8` / `.c7-12` etc. Every block
  MUST span a **named whole-column range**, never a stray width. Reuse column starts
  down the page so alignments recur — that recurrence *is* the design.
- Vertical space is **`--unit` × n** (section gaps 2.5×, paragraph 1×, tight 0.5×).
  No off-grid margins like `17px`.
- Mobile (`≤720px`) collapses every block to full width (`1 / 13`).
- The faint column-guide overlay is hidden; press **`g`** to flash it (wired in
  `Layout.astro`). The footer invites it: "Press g to see it."

---

## Motion

One easing, one duration family, one idea: **a faint element resolves into place.**
Tokens in `:root`:

```
--ease: cubic-bezier(0.16, 1, 0.3, 1);   /* everything animates on this */
--dur: 220ms;   --dur-fast: 140ms;   --dur-big: 340ms;
```

- Every transition/animation MUST use `--ease` and one of the three durations. A stray
  `ease-in-out` or `0.3s` is off-system.
- Motion is **rationed and subtle** — a few deliberate delights, not scattered gimmicks.
  Currently shipped: link interactions (below), logo 90° rotate on hover
  (`.mark`, 0.5s), `.entry` hover tint, `.arrowc` slide. Reduce, don't add, unless it
  earns its place.
- Respect `prefers-reduced-motion` for any new non-essential animation.

---

## Link system

Three kinds of link, three treatments. This is deliberate — do not collapse them.

1. **Inline prose links** (`p a`): ink text + accent underline by default →
   **invert-fill** on hover (accent field, `--on-accent` text) via a simple
   `background-color`/`color` fade on `--dur`. **No wipe.** Scoped to `p a` so it does
   NOT leak into nav, colophon, or project links.
2. **Project / gallery links** (`.links a`): accent arrow (`.arrowc`) **slides right
   6px** on hover (`--dur-fast`); the invert-fill is explicitly reset here. Markup
   includes `<span class="arrowc">→</span>` (or `↗` for external).
3. **Utility / colophon links** (`.colo a`): accent text, a **hairline underline
   appears** on hover (`border-bottom` transparent → accent, `--dur-fast`). Quiet.

The bare `a` default is accent text + underline-offset — a fallback for links that are
none of the above (e.g. figcaption, back-links have their own rules).

---

## Layout blocks

The composition primitives, chosen from the base-blocks + link-style choosers:

- **The index list** (`.matrix` / `.entry`): **one ruled reference list**, used for both
  homepage sections — number (c1) · title (c2–5) · blurb (c6–10) · marker (c11–12), each
  row opened by a hairline, the list opened by a 2px ink rule. Never a card. The flagship
  row of each list takes `.entry.accent` (accent rule) — the only per-row differentiator.
  At `≤900px` the five columns collapse to `44px 1fr`: number + title on the first line,
  blurb and marker stacked under them.
  - This replaced a **calendar-scatter** (`.pos-01…05`, both sections). The scatter
    composed better in isolation and indexed worse: both sections used the same device, so
    only the heading told them apart, and the page ran ~2.5 screens with neither list ever
    whole in view. An index shows what's there. The one thing the scatter did well —
    numerals as the rhythm — survives as the tabular `.en` column.
  - The **only surviving scatter** is `.mscatter` (below); `grid-auto-rows` lives there,
    not on `.matrix`, since list rows are content-height.
  - **Three sections, in this order: Method · Work · Experiments.** Method is a
    **one-row** `.matrix` above the evidence — the statement at the top of the page IS the
    spec's opening claim, so the thing that states it sits beside it, and a reader who
    wants artifacts scrolls one row. It is one row and not a section of prose on purpose:
    the cost of putting a claim before the evidence is a manifesto, and a single list row
    can't be one. Section heads carry **no dek** (`Work` and `Experiments` have none, and
    one dek would be the only one on the page); the row's own blurb does that job.
    All three use the identical device — one mechanism, used everywhere.
- **Section break — air, not a rule** (`.grid.sect`): a section is opened by `3.5 × --unit`
  of space plus its head, with **no** divider. A 1px ink line across all 12 columns was
  the heaviest mark on the page and never touched the thing it opened, so it read as a
  divider dropped between sections; six per page also flattened the hierarchy. Whitespace
  is structural — a rule that repeats has stopped being structure. It is a class on the
  section's **own first `.grid`**, never a spacer div, and it must be written `.grid.sect`
  to outrank `.grid + .grid`'s one-unit gap.
  - Rules that **survive** are the ones that own something they touch: a `.frow` top rule
    opens its fact, an `.entry`'s opens its row, `.colo-rule` closes the page. The
    full-width `.rule` is kept for `writing/*` only, where it pairs with a numbered
    section's set figure.
  - There is **no rule above a case-study `h1`**. The old 32px `.shrule` accent stub was
    not a column, not the word's width, not the measure — it read as template decoration.
    The `.smark` side marker opens the page instead and says more.
- **Homepage statement** (`.statement` + `.thesis`): the `h1` and the two-clause thesis
  are **one continuous block** in a single `.grid` — the name-sentence in `--ink`, then
  the design clause (`.t-design`) and build clause (`.t-build`) running on as the same
  paragraph. They MUST stay in one `.grid`: `.grid + .grid` adds a `--unit` gap, which
  breaks the block into two statements. This is the only place colour enters body copy.
- **Section head — the stacked head** (`.shead` + `.sbody`): the `h2` sits **above** its
  prose and **both start at column 1**, spanning `1–9` (791px). Two vertical lines then run
  the length of the page: **column 1** (head, prose, ledger label, clip left edge, `h1`,
  `.back`) and the **right edge of column 9** at x=959 (prose column, ledger value, clip
  right edge, where the hung caption starts). Measured on the live page at 1400px.
  - This replaced a *paired* head (`h2` at c1–2, prose beside it at c4–12). The pairing
    aligned nicely and wasted the page: `.sbody` measured 791px while `p{max-width:33em}`
    is 528px, so every prose section on all eight pages carried **263px of dead space** on
    the right, next to a near-empty 154px head margin. Proof sheet §1, option 04.
  - The 25px size cap that protected the 154px margin is gone with the margin — `h2` uses
    the full ramp step 31 (`clamp(21px,2.4vw,28px)`) with `overflow-wrap:anywhere`.
  - Prose stops at **c1–9, not c1–10 or c1–12**: 791px is the same edge a hung-caption clip
    stops at, so the two devices share a line instead of each ending somewhere private.
  - `.shead` is still only for a head **with a paragraph**. Over a `.facts` ledger, a
    `.links` staircase, a `.step` row, or a full-width embed, put the `h2` in a flush-left
    `.c1-12` — it lands on the same column 1 either way.
  - `writing/*` pages are exempt: their `.c1-2` holds a real `<span class="sn">` section
    number, not an empty spacer.
- **Two-column duality** (`.duo` + `.dcol.d` / `.dcol.b`): the **only** block that splits
  the measure into two equal halves (span 6 each), each opened by a 3px rule in its
  duality hue and a `.dk` kicker in the same hue. Used on `/method/` for the two
  procedures, and only where **the two instruments are literally the subject** — this is
  the second sanctioned place colour carries meaning in body copy (the homepage
  `.statement` is the first). The composition states the argument before a word is read.
  - It MUST be preceded by a **full-measure unified statement**. Two lists side by side
    read as two unrelated lists to anyone meeting them cold; the shared claim runs
    `.c1-8` above the split, so the columns arrive as halves of one thing.
  - Do **not** reach for it to put any two things next to each other. Two arbitrary
    columns are a layout convenience; the hued rules assert a relationship, and a `.duo`
    that isn't about design-vs-build makes the hues decorative.
  - Stacks to one column `≤900px` (same breakpoint as `.matrix`), where the two hued top
    rules do the separating that the gutter did.
- **Clip scatter** (`.matrix.mscatter` + `.m-a…d`): case-study video clips dropped into
  non-adjacent modules of a 12-col × `--unit`-row lattice (`.mscatter` supplies the
  `grid-auto-rows`). Recordings are not all the
  same shape, and a two-up row forces mismatched ratios onto one baseline where the
  difference reads as a cropped bottom edge. Scattered, no two clips share a baseline.
  Collapses to a stack `≤900px`. `.mscatter` is **not** a `.grid`, so the block after it
  needs an explicit top margin — the `.grid + .grid` rule won't reach it.
- **Photo gallery** (`.g-rag`): **two ragged column-flows** (`.col-l` c1–6, `.col-r`
  c7–12 dropped `3 × --unit`), not a 2-up grid. Independent flows mean each photograph is
  just the next one down, rather than half of a forced comparison pair. One column
  `≤720px`, with the drop removed (it would leave a 72px hole at the top of the stack).
- **Live embed** (`figure.embed`): **one proportion for every embed** — `16/10` on
  desktop, `3/4` (portrait) `≤720px`, so the embedded page gets a phone-shaped viewport
  instead of a letterbox scaled to unreadable. There is no tall variant. The link out
  appears **twice**: `.esrc` above the frame (an embed is tall, so the one actionable
  thing must not sit a screenful below) and the `figcaption` below. Mirrored hairlines —
  rule under the top label, rule over the caption — so the frame sits between two rules.
  Never write a literal `↗`: the O7 rule appends one to every `target="_blank"` link.
- **Facts — the ledger** (`.facts` / `.frow`): one row per fact, full width — label in
  **c1–3**, value in **c4–12**, separated by a single hairline; only the first row gets the
  2px ink rule. The most Müller-Brockmann device on the site (caption column + text column),
  and a real table rather than a grid of tiles.
  - It replaced three-across cells (`3n+1`→1–4, `3n+2`→5–8, `3n+3`→9–12). Three across only
    composed when the count was a multiple of three: luthier's 4-row table left **two empty
    cells** hanging off the last row, and every value was squeezed to a 245px measure that
    made four-line paragraphs out of one-line facts.
  - Values are body ramp (16/24) in `--dim`, `<b>` promotes to `--ink`. Labels are 13px
    uppercase bold — a caption, not a heading.
  - Stacks (`display:block`, label above value) `≤720px`.
- **Clip with a hung caption** (`figure.demo.hang`): a full-measure clip stops at **c1–9**
  and its `figcaption` sits in **c10–13**, beside the video rather than under it — the same
  791px edge the prose stops at, so one line governs the page.
  - Only for full-measure clips. A half-width clip (`.c1-6` / `.c7-12`) and the `.mscatter`
    frames have no margin to hang anything in and keep the caption below.
- **Links — L2** (`.links a`): a **diagonal staircase** — each link steps down-and-right
  (`3n+1`→1–6, `3n+2`→5–10 + 1 unit down, `3n+3`→8–13 + 2 units down). A gallery you
  navigate; echoes the clip scatter.
- **Colophon** (`.colo`): grid-placed facts (label column + satellites 5–13), not a
  stacked list. Right columns stay intentionally empty.
- **Side marker** (`.side` + `.smeta` in the index list; `.smark` on a case-study header):
  an 8px dot in the duality hue plus the word. In the list it sits in the `.em` marker
  column (c11–12, right-aligned) before the artifact noun, separated by a `·`; on a
  case-study page it is the **first thing on the page**, above the `h1`. Both read `side`
  from `experiments.ts` — never hardcode one. One component, `SideDot.astro`.
- **Meta line = artifact nouns.** The `meta` field on each `Entry` names **what the thing
  is** — "Design system tool", "Figma widget", "Static site", "Agent skill",
  "Photographs". One consistent category across the whole index, so the column reads as a
  set. It MUST NOT carry dates ("2023–present"), employers ("At Amazon"), or a discipline
  list ("rapid prototyping + UX") — mixing those kinds made the column read as noise, and
  the long ones overflowed. The side marker already says which half; the noun says what.
- **The one filled form:** `.block` (`--accent` field, `--on-accent` text) — used once
  per page for the key statement. Everything else is type + rule. No filled cards.
- **Structure is rules, not boxes.** A wrap-around hairline border to make a "card" is
  the un-Swiss tell — use a top rule + gutter + whitespace instead.

---

## Easter eggs (rationed delights)

Kept because they're subtle and on-system. Don't add more without reason.

- `::selection` → pure invert (`--ink` bg, `--paper` text).
- Cursor → a dot SVG data-URI in `--design` (the mark's design dot as the pointer);
  it's the `--cursor` token, so it flips with the scheme.
- Logo (`.mark`) → 90° rotate on hover. The mark itself is the duality: two dots on the
  descending diagonal (design then build) joined by a 1.5px `currentColor` hairline —
  two things, one line; the rule is the relationship. `public/favicon.svg` is the same
  drawing and carries its own `prefers-color-scheme` block; change both together.
- `g` → flash the column grid.

---

## Explainers (the /swiss + /explain artifacts)

Standalone pages under `src/pages/writing/` (`10x-is-a-loop`, `canele`) and
`public/writing/` (`four-critics`). These carry their **own inline `<style>`** built
from the `/muller` template — global.css does NOT style them.

- Each is a self-contained explainer: masthead + type + a diagram + a scored quiz +
  a back-link to its parent experiment page.
- **Quiz gotcha:** quiz option buttons are created by JS (`createElement`), so Astro's
  scoped `[data-astro-cid]` selectors miss them. Quiz CSS (`.opt`, `.q`, `.exp`) MUST
  be wrapped in `:global()` or the quiz ships unstyled. This bug shipped live twice —
  verify the quiz renders styled before calling an explainer done.
- The correct-answer state MUST have a non-colour signal (`.opt.correct::before{content:"✓ "}`)
  for accessibility — colour alone isn't enough.
- **Grid flow gotcha:** `.grid{grid-auto-rows}` without a `.grid + .grid{margin-top}`
  rule collapses all sections into overlap. Match the 10x essay's grid flow.

---

## The design panel (`/design-critique`)

Before shipping a redesign, run the `/design-critique` skill — an adversarial panel of
design-world personas (parallel subagents), each finding flaws through one lens, then a
de-duplicated ranked fix list. The panel for this site:

1. **Design director** — brand & system integrity, cross-page consistency.
2. **Nitpicky junior + a11y** — contrast ratios, heading order, focus states, tap targets.
3. **Design manager** — does the work show judgment, not just taste; positioning risk.
4. **CEO / hiring manager** — would this get its owner hired; is the point clear in 5s.
5. **Orwell-plain copywriter** — kills slop, hedging, and any sentence that could be
   shorter. Straightforward to a fault.
6. **Minimalist code reviewer** — "less, but better": rips out dead CSS, unused classes,
   outdated markup; flags anything that shouldn't ship (leaked internal content/config).
7. **Reductionist product designer (Ive / Rams)** — cuts visible ornament; every element
   must earn its place.

Personas MUST be adversarial (praise = failed prompt) and cite specifics. The synthesis
MUST de-duplicate (one defect caught by three personas is one finding) and rank.

**Ethics rule for aping-style skills:** only imitate the **dead, or a movement** — never
a living studio you could just ask. This site's "Aping" page states the line; keep it.

---

## Design feedback comes as annotations, not prose

The user reviews this site by marking it up in the browser with the **Vibe Annotations**
extension, then saying "read my annotations". The notes land in a JSON file the devbox
can read directly — see [`CLAUDE.md`](CLAUDE.md) for the path, the payload shape, and the
delete-after-implementing rule.

Two things that follow for design work here:

- **The note is the judgment; the location is free.** An annotation already carries the
  selector, the computed styles, and the viewport width. What it adds that nothing else
  can is *what's wrong*. Treat a terse note ("gap too big") as a real spec and resolve it
  against this file's tokens — don't ask the user to restate it.
- **Fix to the system, not to the pixel.** An annotation reports a symptom on one
  element. If the cause is a token, a ramp step, or a shared block in `global.css`, fix it
  there so every page moves together — a one-off override on the annotated node is how
  this system rots.

---

## Ship workflow

The site is Astro static → `dist/`, served from a DigitalOcean droplet
(`104.236.237.122`) over HTTPS via **nginx + certbot** (Let's Encrypt, auto-renew).

```bash
# 1. edit, then verify locally (build on devbox, view the synced file:// copy on the Mac,
#    or `npm run dev` on the MAC only — never a server bound to 0.0.0.0 on the devbox)
npm run build

# 2. commit + push (personal PAT, entered inline, never persisted to the devbox)
git commit -am "…" && git push

# 3. deploy: rsync dist/ → droplet:/var/www/andrewshiau (no service reload needed for
#    static files; nginx serves them on next request)
./deploy.sh

# 4. verify LIVE — don't trust a clean build
curl -I https://andrewshiau.com                    # 200, valid cert
curl -I http://andrewshiau.com                     # redirect → https
curl -I https://2018.andrewshiau.com               # old React app archived here
# and: fetch the live CSS, grep for the change you shipped (a clean build ≠ the change
# is in the live bundle). Screenshot-review catches layout bugs a build never will.
```

**Verification rule (hard-won):** a green build does not mean the change is correct or
even present. Verify the fix is in the LIVE bundle and eyeball the rendered page (both
light and dark) before calling it done. Two live bugs (canelé overlap, unstyled quiz)
shipped clean-built.
