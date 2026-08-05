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

### Four habits that make prose read machine-written

Found by counting, not vibes, across the eight case studies (Jul 2026): 32 antithesis
snaps, 9 aphorism closers, 14 em-dashes on one page, 6 stated principles. All four are
what a language model reaches for when it wants a sentence to *sound* concluded. Every
one is banned:

1. **The antithesis snap** — `X, not Y`. "Filed like a reference manual, not a blog";
   "fewer tools, not more options"; "real drawing, not a click-through". It reads as
   emphasis and carries no information: the reader was never considering Y. Say what the
   thing is. (`, not ` inside a *title* is fine — "10x is a loop, not a prompt" is the
   essay's name.)
2. **The aphorism closer** — a section that ends on a maxim instead of a fact. "That
   reframe is the whole project." "The quiz is the point." "That's the bar." A closing
   line MUST end on something that happened, or a link to the next thing.
3. **The em-dash as a general joint.** Two or three per page, for a real parenthetical.
   Not as a way to avoid committing to a comma, a colon, or a full stop. Powerpoint had
   14; it now has 6, and reads faster.
4. **The stated principle** — "The job is to…", "The principle:", "The way I think
   about…". A claim about how one *ought* to work, standing in for a fact about what
   happened. Replace it with the fact: "Telling people to be consistent doesn't work;
   nobody has time to check."

The positive rule, from Orwell: **prefer the concrete**. "Feedback was positive" became
"What they got stuck on became the roadmap" — same length, and it says something.

### Two more, found on /work/practice-room/ (Aug 2026)

The annotation was "this reads kinda ai slop do a few passes on the whole copy to fix". The four
habits above were already clean on that page. What was actually wrong was different, and worse:

5. **The apposition dodge** — a clause bolted on with `—` or `,` that renames what you just
   said instead of adding to it. "normalizing the taper out made every multiple score the same,
   and the picker grabbed nine times the period — a reading three octaves flat." The final clause
   is the same fact in other words. It is the em-dash habit's smarter cousin: the punctuation is
   defensible, the content is a second helping. It became "…so the picker took nine times the
   period and read three octaves flat" — one clause, one fact, and now the sentence says *why*.
   The tell is that you can delete the tail and lose nothing.
6. **The unfalsifiable number.** "within 0.25 cents from C2 to C8" read as rigour and was
   **false**: measured, C8 fails by 1200 cents on the plucked case and nothing asserted the range
   at all. A specific figure is the most trusted sentence on a page and therefore the one that
   must have a test behind it. The bound is `0.35 cents, C2 to C7` now, `pitch.test.ts` asserts
   every chromatic step of it, and the paragraph that follows states the C8 failure and its
   mechanism. **A number in the copy MUST have an assertion in the suite that fails if the copy
   drifts** — this is the same rule as "verify the artifact", applied to prose.

The generative version of both: prose slop and engineering slop are the same defect. A sentence
that cannot be falsified and a test that cannot fail are the same mistake in two notations.

---

## Case-study page types

Every one of these pages is laid out as **the document** (above): one column, read top to
bottom. The beats below describe the order of the *content*. The panel/feed distinction is now
a matter of reading order rather than of columns — the facts block comes early on Type A and C
(metadata read before the story) and last on Type B (a colophon read after it).

Eight case-study pages, three shapes. The shapes already existed by accident, and the
drift between them was the whole reason the set read as arbitrary — the facts block was
beat 2 on four pages and the last beat on three, so a reader who learned the pattern on
one page had it inverted on the next. **The type is now declared**, and the type fixes
the **opening and the close only**; the middle stays free, because a photo gallery and a
12-week engineering project don't have the same story.
(Chooser: `work/understand/andrewshiau-case-study-beats/`, picks 1/02 · 2/03 · 3/03 · 4/02.)

### Type A — case study (`luthier`, `powerpoint`, `stores-designer`)

```
h1 → dek → THE CLIP → facts masthead → The problem
     → [free middle: block, ledgers, clips] → THE ALTERNATIVES → a NAMED closing section
```

- **The clip is beat 2**, before any prose. The page opens on the thing working. Only the
  one clip that shows the *whole idea* earns this slot; clips that explain a detail stay
  down in the mechanics section. A page with nothing public to show (`stores-designer`)
  skips this beat — it's the only beat the type allows to be missing.
- **The facts block is the masthead** here, always: role, stack, span. Never a colophon.
- **The alternatives are a beat, and the claim ledger is gone.** Every Type A page carries
  a named section — "What else was on the table", "The three we built" — stating what the
  other options were and why they lost, placed after the mechanics and before the close.
  It replaces the `Simplest form` / `Proof` ledger that used to sit under the masthead.
  Why the ledger came out (round-3 sheet `andrewshiau-copy-ground/`, Q05 + Q06): the two
  labels were vocabulary from the operating spec, so reading a portfolio page required
  learning the site's private terms first, and "Simplest form" asserted a claim with no
  rival to read it against — which is what makes a claim sound like a slogan. Three
  rejected options are the same argument with the evidence attached.
  **Only sourced alternatives go in.** Every option named MUST be one the page or its
  history actually records. An invented rival is worse than no section, because it reads
  as the strongest evidence on the page while being the only fabricated thing on it.
- **The numbers live in the prose** (Q06). `12 weeks`, `15 designers`, `52
  recommendations`, `50,000 images a year` sit in the sentence that needs them, in `<b>`.
  They used to be collected in the `Proof` row, where a reader got the figures without the
  claim they supported. The masthead ledger keeps role/stack/span only — the metadata you
  read *before* the story, never the results.
- **The close is a named section, always last.** `Outcome` for finished work;
  `Where it stands` for work still running (an "Outcome" head on unfinished work
  overclaims). It MUST NOT be an unheaded paragraph — `powerpoint`'s most important claim
  used to sit in the one block with no title.

### Type B — skill (`aping`, `explain`, `proofs`)

```
h1 → dek → a NAMED head over the argument → block (the meta note)
     → [free middle: step, links, embeds] → facts COLOPHON
```

- Beat 2 is a `.shead` with a real title — "The line I drew", "Why the quiz", "Why render
  it". These were unheaded paragraphs, which made the best writing on each page look like
  a stray thought that didn't earn a section.
- **The facts block is the colophon** here, always last: what the thing is made of, read
  after the work. Same device as Type A's masthead, opposite job — which is exactly why
  it must be consistent *within* a type.

### Type C — collection (`recipes`, `photography`)

```
h1 → dek → facts contents → the work, full width → nothing
```

- The ledger is short on purpose (a count and a stack, or a count and the cameras).
- **No claim+evidence, no outcome.** There is no claim to make about a photograph that
  the photograph doesn't make. This is why the type system has three types instead of one
  frame: forcing a gallery to claim something is how you get filler.

### The head rule that cuts across all three

A head with **prose** under it uses `.shead` (head and first line share column 1). A head
followed by a **ledger, a step, or a links staircase** is a flush-left `h2` in `.c1-12`
— there's no paragraph to pair on the row. Two heads on `proofs` claimed in a comment
that an embed followed them directly; prose did, and they're now `.shead`.

---

## The document — the site's shape

Every page of this site is **ONE COLUMN of seven fields**, read top to bottom. There is no
second page shape and no second column.
(Chooser: `work/understand/andrewshiau-mono-redesign/` — Direction 02 "the document",
Typeface 01 IBM Plex Mono, Ramp 04 one size, Ground 05 ink plus one hue, Grid 01 invisible,
Motion 01 hover only + 05 the one-character shift.)

Why it exists: the brief was explicit that this was **not** a subtraction from the previous
design — *"a ground-up redesign, the visual style should completely change… minimal monospace
typography, not too much type ramp, text and lines and whitespace, interest through animation,
grid, white space, content, restraint."* Four things inverted at once: one typeface became a
mono, seven ramp steps became one size, rules-as-structure became whitespace-as-structure, and
two hues became one hue with one job.

### The four rules

1. **ONE SIZE.** 15px / 28px leading for everything — prose, titles, labels, meta. Hierarchy
   comes from **case, colour value, and whitespace only**. `--step` and `--lead` are the tokens.
   A new font-size is a bug, not a decision. Two exceptions, both earned:
   - ~~`11px` tracked caps~~ — **GONE.** The micro-label lost both its size and its caps in the mono pass: `.fm`, `.pk`, `.ck`, `.sl` are 15px, sentence case, `--faint`. No rule in `global.css` declares `font-size:11px`, and `.lb` does not exist.
   - `16px` on `.f input` — below 16px iOS Safari zooms the page on focus. A size forced by a
     platform is not a ramp step.
2. **WHITESPACE IS THE STRUCTURE.** There are no rules. No 2px group openers, no per-row
   hairlines, no vertical split rule, no frames on clips or photographs. Groups are separated
   by `--group` (56px). **Exactly two borders survive site-wide**, and each is a fact rather
   than decoration: `.f input`'s writing line (a horizontal rule under text means "type here",
   and now means nothing else), and `.embed-frame`'s 1px boundary (inside it is somebody
   else's live page — the border says where this site stops).
3. **ONE COLUMN, EIGHT FIELDS.** The grid is still 12 and still invisible (press `⌥G`), but the
   page places `1 / 9` — 700px at the 1120px measure. The prose still caps at `62ch` (558px), and
   the difference is the working room a hung label needs, which is why nothing has to bleed out of
   the document to be legible. The four empty fields to the right are the page's margin — putting
   type in them would make the margin a column, and the document would be two columns again.
   It was seven fields, and going to eight is what bought **Nothing breaks out**.
4. **INK, PLUS ONE HUE FOR ONE JOB.** Colour means "you can act on this" — a link, and the
   hovered row's title. Nothing else is coloured. See Colour tokens.

### Measure is stated in `ch`, not in tracks

`62ch` for prose, `22ch` for the spec block's key column, `38ch` for the `.rules` floor, `3ch`
for the gate's indent, `1ch` for the hover shift. In a monospace face every glyph has the same
advance, so `ch` is exact rather than approximate — and a measure in `ch` cannot drift when a
column moves, which a track count does.

**This is the rule that replaced "scope the split's CSS to min-width:1101px".** The old file
had four separate cuts of the index row (12-track page, 3-track feed, ≤1100 stack, ≤900
collapse) plus a hung-caption device and a section head, all sized in track counts against a
page width. When the split was deleted, three of those silently pointed at columns that no
longer existed — measured on the built page, the section head's prose stopped 107px short of
the clip beside it, and the hung caption's clip stopped 265px short of the prose. **A track
count is a measurement against a layout; a `ch` value is a measurement against the type.**

### No breakpoints for the row

The index row is one flex line — numeral · title · leader · meta — and it reflows because a
flex line reflows. `flex-wrap` plus `min-width:0` on the title is the whole responsive story;
below 560px the meta drops to its own line, indented `3ch` to the title's edge. Roughly 55
lines of re-cut CSS were deleted, not ported.

`.pin` and `.feed` keep their class names (ten pages and `PanelHead.astro` emit them) and are
now simply two stacked blocks of the one column. `.splitrule` still ships in that markup and is
`display:none` — a known slop finding, cleared in the design-system pass.

### What the deletion bought

~350 lines: the sticky panel, THE BOX (a one-screen-tall grid with an internally scrolled feed,
its 693px height gate, its bleeding scrollport and styled scrollbar), the ≤1100px unwind, the
≤603px short-viewport unstick, and the case-study feed re-cut. **One scrollbar** — so
find-in-page, deep links and the browser's own scroll position all work with no mechanism at
all, which is what the box worked hardest to preserve.

### `PanelHead.astro` — the panel is a component, not eight copies

Unchanged and still required. The case-study head is one component: `SideMark`, `h1`, a
`.facts` ledger whose **first row is always `Type`** (from `metaOf(href)`, the same artifact
noun the index prints), then a `<slot>`, then the contact address. The ledger is left **open**
so each page adds its own rows.


## Design system — Müller-Brockmann grid

International Typographic Style, taken to its quiet end: one typeface, a 12-column modular
grid every element snaps to (invisible — press `⌥G`), structure drawn by **whitespace and
alignment**, and **one hue with one job**. Hierarchy is weight + value + case + whitespace,
never size and never colour. Light is default; dark follows `prefers-color-scheme`.

**Rules and boxes are both gone.** The old system drew structure with rules (2px ink openers,
hairlines per row) on the Müller-Brockmann principle that a rule is not a box. The document
direction goes one step further and deletes the rules too — the same file already argued *"a
rule that repeats has stopped being structure"*, and at six per page they repeated. Two borders
survive site-wide and both are facts, not decoration: the field's writing line and the embed's
boundary. See The document.

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
| `--design` | `#14306b` navy | `#6ea8ff` | **the one hue** — interaction, and nothing else |
| `--build` | `var(--design)` | `var(--design)` | kept as a NAME, not a colour — see below |
| `--accent` | `var(--design)` | `var(--design)` | indirection: every structural role reads this |
| `--on-accent` | `#ffffff` | `#141413` | text on a filled `--accent` field |

**Measured** (WCAG contrast on the mode's own `--paper`): navy 11.36:1 light, 7.64:1 dark;
`--on-accent` on the field 12.61:1 light, 7.64:1 dark. Note the dark flip — **white on
`#6ea8ff` is only 2.6:1**, so `--on-accent` MUST be near-black in dark. Don't "simplify" it
back to white.

The old olive (`#5c6b12` light / `#b9cc4a` dark) is **deleted**. It was 5.30:1 against navy's
11.36:1, and the two were only **2.14:1 apart in greyscale** — the pair could not carry a
distinction a colourblind or greyscale reader could read, which is why the mark now carries it
in shape instead (ring vs. disc).

#### The duality — why the two hues became one

The site's subject is a practice with two halves, and **it is no longer colour that says so.**
The duality did not go away — it stopped being a hue.

- **`--accent` is INTERACTION, and it IS `--design`.** Its sanctioned roles collapsed from six
  to three when structure stopped being drawn in colour: **link interaction** (see Link
  system), **the one filled `.block`** (a statement you act on — the same job), and the
  correct-answer quiz state in the explainers. The three that are gone with the rules: the
  lead top-rule of a group, the big set number, and the flagship `.entry.accent` rule.
  A coloured mark that is not interactive is now a **slop finding** — on a page where colour
  appears only in response to the reader's pointer, anything else in the hue reads as a link
  that won't click. (The pointer itself is ink, not the hue — see Easter eggs.)
  Because `--accent: var(--design)`, changing the hue moves every interactive role in one
  line — never find-and-replace it.
- **`--build` is a NAME with no colour of its own.** It is `var(--design)`, so the two tokens
  render identically, and it is kept rather than deleted for one reason: `side` in
  `experiments.ts` is still `design | build | both` and the marker still reads that fact. What
  changed is that the fact is carried by SHAPE (ring vs. disc — see `MarkFigure.astro`) instead
  of by hue. Two names, one value, so nothing has to pretend the duality disappeared.
  Its three old sites are all resolved: the mark and the side marker are `currentColor`, the
  favicon is ink on paper, and the thesis clause is now **italic in `--dim`** rather than two
  coloured spans — a coloured clause mid-paragraph reads as a link that won't click.
- **Colour is never the only signal.** The old navy and olive were just **2.14:1 apart in
  greyscale** — a colourblind or greyscale reader could not tell the old two dots apart.
  Two things follow. The figure carries its distinction in SHAPE (hollow ring = design,
  solid disc = build, the whole figure = both), and the side marker still **emits** the
  word ("Design" / "Build" / "Design + Build"). The marker's data lives in one place:
  `side` on each `Entry` in
  `src/data/experiments.ts`. Case-study pages read it via `sideOf(href)` (the
  `SideMark.astro` component) so the page and the index can't disagree.
  On an **index row** the word is emitted and visually clipped (`.sw`, plus `title` on
  the wrapper) — eight rows repeating "Design + Build" made the constant fact the loudest
  thing in a column that exists to annotate them (chooser: `andrewshiau-panel-marks`,
  Q1/05). Clipped, not `display:none`: the label stays in the accessibility tree, which
  is the entire point of the rule. On a **case-study panel head** the word is visible —
  one marker per page costs nothing, and there it is the greyscale fallback.
  This is the one sanctioned exception, and it is bounded: a marker may hide the word
  only where the same page shows the word for the same fact elsewhere, or where the word
  is one keystroke of hover away. **A marker that emits no word at all is still a slop
  finding.**
- **The figure is side-aware, and the constant is the ink.** `MarkFigure.astro` draws the
  diagonal pair where a page or row sits on both halves of the practice and a single object
  where it sits on one — a rule joining two things is only drawn where there are two
  things. The single object is **r=7.2, not r=5**: measured by ink coverage at 4×, r=5
  paints 47% of the pair's ink and r=9 paints 151%, so a radius picked by arithmetic makes a
  one-sided marker read lighter or heavier than a two-sided one. Match coverage, not radius.
- **The join lands on each circle's PATH, and the numbers are geometry** (chooser:
  `andrewshiau-mark-options`, Q1/04). `x1,y1 = 13.54` and `x2,y2 = 18.46` — r=5 projected along
  the 45° join (`5 × 0.70711`) from centres at 10 and 22. Each end sits **0.9 units inside the
  1.8 stroke band**, so the rule overlaps the stroke it meets and the join is unambiguous.
  Three positions exist and only the middle one works, all three rendered at 260px before
  choosing: **centre-to-centre** pokes a visible stub into the hollow ring; the **outer edge**
  (5.9 → `14.17`/`17.83`, which shipped for four passes) is *tangent* rather than overlapping, and
  tangency plus a hair of antialiasing reads as a gap — the annotation that caught it was "the
  bars are a tiny bit short and dont visibly connect at big sizes to the balls"; the **inner
  edge** (4.1 → `12.90`) breaks back into the hole. The path leaves **0.64 units of clearance**
  to the hole, and that margin is the entire tolerance of this device.
  This entry previously stated `14.17` and `18.46` together, which are two different conventions
  (outer edge and path) and cannot both be right — a spec that mixes them is how the wrong pair
  survives a review.
  Change r or the stroke and **both numbers and the clearance move**; the arithmetic is in
  `MarkFigure.astro`.
- **FOUR drawings of this figure exist and the join lives in TWO of them.** `MarkFigure.astro` is
  the source of truth; `public/favicon.svg` is a hand copy because an SVG served as a favicon
  cannot import. Change one, change both. `resume.astro` used to be a third — it hand-rolled the
  whole SVG and silently kept the tangent join through this fix, which is exactly the drift the
  component exists to prevent; it imports `MarkFigure` now. **A new hand copy is a slop finding**:
  the page may hand-roll its panel (`metaOf()` throws for an href that isn't an `Entry`) and still
  import the figure. The fourth is the GitHub avatar PNG, rendered from the same geometry —
  `work/understand/halfcadence-avatar-options/upload/` — and it is a raster, so it is regenerated
  rather than edited.
- **The mark's only job on the page is the index's row marker** (chooser:
  `andrewshiau-mark-options`, Q3/05). There is no logo above the name: `Mark.astro` and
  `.pin .pmark` are deleted. The figure ships in exactly two wrappers, and both carry a
  fact — `SideDot.astro` (18px, index row, word clipped) and `SideMark.astro` (26px,
  case-study kicker, word visible, and the link home). A new drawing of the figure that
  states identity rather than information is a slop finding.
  **18px is the floor.** The 1.8 ring stroke is 0.056em, so below 18 it falls under one
  device pixel and the ring antialiases into a soft blob — the shape distinction, which is
  now the whole signal, quietly dies. The favicon is the one place it renders smaller, and
  that cost was picked with eyes open (Q4/02).
- **A third hue, or either hue used decoratively, is a slop finding — reject it.**
  Colour in body copy is allowed in the thesis sentence ONLY, because there the two
  halves *are* the subject.
- Both hues are the **same hue family** in both modes — lifted for the dark ground, not
  inverted, not recoloured.

### Type

- **Typeface:** IBM Plex Mono, self-hosted (`public/fonts/IBMPlexMono-*.woff2`, weights
  400 / 400-italic / 500 / 600), with `ui-monospace, "SF Mono", SFMono-Regular, Menlo,
  Consolas, "Liberation Mono", monospace` fallback. One family, and it is the BODY family —
  `--mono` is the only type token. **`--sans` is deleted**; nothing in `src/` sets Graphik.
  (Graphik's four woff2 files remain in `public/fonts/` because the three explainers under
  the four Graphik files stay in `public/fonts/` because ONE standalone artifact still asks for them — `demo/index-layouts/`, embedded on `/work/proofs/`. `public/writing/` is empty and `src/pages/writing/` is on `global.css` now, so the reason this line used to give is wrong even though the decision is right.
  for them. They are not referenced by `global.css`.)
  Plex over JetBrains because its italic is a **true italic**, not a slanted roman — and the
  site's one emphasis device is the italic thesis clause. Plex over system-mono because a
  portfolio that can't specify its own typeface renders as Menlo on one machine and Consolas
  on the next.
- Body: **15px / 28px line** — `--step` and `--lead`. Weight 400. **No `letter-spacing`**:
  negative tracking is a correction for large sans display type, and in a monospace face the
  advance width IS the cell `1ch` is measured against. Tracking the body would make `1ch` and
  the character disagree, and the hover shift would stop landing on a cell.
#### One mechanism per job

The rule that governs every hierarchy decision, and it **overrides a literal pick where the two
collide** (chooser: `andrewshiau-hierarchy-options`; the instruction was *"prioritize overall
consistency over my individual choices — if one thing adds the hierarchy needed, like hanging
label in col, it might not also need the color change in the same place"*).

> **A label earns its hierarchy from POSITION if it has a position; otherwise from VALUE.**
> Hung in its own column → stays `--faint`. The column is the hierarchy.
> Stacked above its value → goes to `--ink`. There is no column, so value is.
> Either way the **pair is the unit**, with `--group` between pairs.

So `.frow .fm` is faint and `.colo .ck` is ink. That reads as an inconsistency in the stylesheet
and is the opposite on the page: every label is exactly as loud as it needs to be to separate
from its value, and **no label is loud twice**. Adding the second treatment to a label that
already has one is a slop finding.

**Colour and space are the only two mechanisms.** Not size, not case, not rules, not a third
weight. The three greys keep their jobs — `--ink` is the fact, `--dim` is support, `--faint` is
annotation.

**Emphasis inside a sentence is WEIGHT, never colour.** `b,strong` is `font-weight:500` +
`color:inherit`. Body copy is `--dim` and a `<b>` promoted to `--ink` is a **2.83:1 → 16.61:1
jump — a 2.8× contrast step inside one sentence** (2.31× in dark), which made three words in a
paragraph higher contrast than the head above them. Weight 500 against 400 is ~7% more stem
width, and in a monospace face — where every glyph is the same width — that is the only variable
a word has. Weight 500 is **reserved** for this; a heading may not also use it (see below).

**Applying the rule to a heading, worked example.** The section head hangs in the 16ch column
(POSITION) *and* is `--ink` (VALUE) — two mechanisms, defensible because they say different
things: the column says "this annotates the section", the ink says "and it is the strongest thing
in it". It was **also** weight 500, which was a third mechanism that earned nothing — invisible
next to the colour it sat on. Dropped. `h2` is `font-weight:400`.

#### The two axes

Every page has exactly **two** vertical axes, and one token sets both: `--label`.

| x = 0 | x = `--label` + `--gutter` (182px at the measure) |
|---|---|
| the side marker, the `h1`, every field label, every section head | every field value, every paragraph, the dek, media |

**`--label` IS DERIVED FROM THE GRID, and it must stay that way.** It is two columns plus the
gutter between them:

```css
--track: calc((min(100vw, var(--measure)) - var(--gutter) * 13) / 12);
--label: calc(var(--track) * 2 + var(--gutter));
```

It was `16ch` — a flat 144px, measured against the longest field label on the site
(`Dropdown refresh`, `Remove "add pen"`, both 16 characters). That number was right about
typography and **wrong about the grid**, and the defect was invisible for four passes: the content
axis landed at 144 + 28 = **172px** while column 3 starts at **182px**, so every ledger row,
section head and panel put its value **10px inside the gutter**. Two grids were running at once —
one typographic, one geometric — and the typographic one was silently winning.

Found by drawing the `⌥G` overlay underneath a real `.frow` and measuring the value's left edge
against the column's. Nothing else finds this. A page whose axis is 10px off the grid looks
completely fine.

Derived, the two grids agree at **every** width, not just at the measure — verified 2560 → 390.

**`--label` also sets the breakpoint.** The formula returns exactly 144px — the width of that
16-character label — when the viewport is **1060px**. Above it the label column can hold its own
label; below it, it cannot, so the hung layout stops and every label stacks. **One equation gives
both the axis and the breakpoint**, which is why neither is a number anyone chose.

**Nothing bleeds any more.** The hung blocks used to grow right by `--label + --gutter` so their
prose kept a 62ch measure; `.shead`, `.facts` and `.mdoc` all did it, and media grew further still
by `5 × (100% + gutter) / 7`. See **Nothing breaks out** below for why all of that is deleted.

- **THERE IS NO TYPE RAMP.** One size, for everything (chooser Ramp 04). `h1`, `h2`, `.dek`,
  `.statement`, a paragraph, a blurb and a meta line are all 15/28. Hierarchy comes from:
  - **weight** — 500 for a title or a `<b>`, 400 for everything else. (600 is loaded and held
    for the design-system pass; nothing in `global.css` uses it yet.)
  - **value** — `--ink` → `--dim` → `--faint`, which is how an aside recedes now that it
    cannot get smaller. `.fine` is a single `color` declaration.
  - **case** — 11px tracked caps for labels, and section heads (`h2`) which are the one place
    case is structural at full size.
  - **whitespace** — `--group` (56px) between groups, `--lead` (28px) inside one.
  A new `font-size` anywhere is a **slop finding**. The two sanctioned values are `11px`
  (micro-label, tracked `.14em` uppercase — ONE tracking value site-wide now; it used to be
  `.13em`/`.14em`/`.16em` in three places for one device) and `16px` on `.f input`.
- **Case:** sentence/lower case for content, except `h2` section heads and micro-labels.
  Never uppercase a body paragraph. **Never nest a value inside a label without resetting**
  `font-size` / `letter-spacing` / `text-transform` — with one size, a label's styling is the
  only thing that makes it a label, so anything inside one silently becomes one. This shipped
  as a real bug: the email address in `.pin .pfoot a` rendered as 11px tracked caps until the
  reset was added.
- Flush-left, ragged-right. **Never justify** — it wrecks word spacing, and in a monospace
  face it is catastrophic.

### The grid

- 12 columns, `--gutter` 28px, via `.grid` / `.c1-6` / `.c7-12` / `.c1-12`. Every block
  MUST span a **named whole-column range**, never a stray width. Reuse column starts
  down the page so alignments recur — that recurrence *is* the design.
- **Those three spans are all that exist**, and adding a fourth means placing it. Declare a
  span when a page uses it, never in advance.
- **The page places ONE column: `1 / 9`.** **Eight** of the twelve fields, on `.pin` and
  `.feed`. The four to its right are margin, deliberately empty.
  It was seven (609px) and the prose caps at `62ch` = 558, so the column was **51px wider than
  its own contents** — too little slack for any rule to use, too much to be invisible. At eight
  it is 700px, and those 142px of working room are what pay for **Nothing breaks out** below: a
  ledger, a table or a two-up now fits *inside* the document instead of bleeding out of it.
  The prose did not move. `62ch` is still `62ch`; the extra field is structure, not measure.
- **NOTHING BREAKS OUT.** One width for everything on the page — a figure spans the document,
  the same as a paragraph.
  The page used to have **three** widths, each derived by its own formula and none of them named:
  609 (prose), 781 (section heads and ledgers, bled by `--label + --gutter`), and 1064 (media,
  bled by `5 × (100% + gutter) / 7`). A reader could see all three on one screen.
  It also removes the defect class that cost the most time in this redesign: **all four
  phantom-measure bugs were inside a bleed formula.** A block that simply spans the document
  cannot be measured against the wrong grid, because there is only one grid left to measure
  against.
  **What it costs, stated:** media is 700px rather than 1064, so two side-by-side clips get 336px
  each instead of 518, and a section head's prose is 57 characters rather than 62. A screenshot
  that needs 1064px to read should be its own page — not a reason for fifteen other pages to
  carry a second measure.
- **A track count inside the document column is a phantom measure.** `.pin` / `.feed` are
  themselves grid children, so a nested 12-track sub-grid divides 609px, not the page — and
  `grid-column:1 / 10` written in one means 502px, which lines up with nothing. Three devices
  had exactly this bug after the split came out (the section head, the hung caption, `.mscatter`
  inheriting a `display` it no longer got). **State an inner measure in `ch`.** See The
  document.
- Vertical space is one of three values, and each has a job: **`--lead` (28px)** inside a group,
  **`--group` (56px)** between groups, **`--sect` (112px)** between sections (the
  page's top edge, the guide). `--group` is deliberately NOT a clean multiple of `--unit`: at
  48px a group break measured the same as the gap inside a group and the page read as one
  undifferentiated list. Whitespace can only be structure if the structural gap is
  unmistakably larger than the incidental one. No off-grid margins like `17px`.
- **The page's top edge is 1.5 units**, set once as `main > .grid:first-child` — not per page.
  It was two inline `style="margin-top:…"` attributes on the index and `/gate/`, and the nine
  case studies never got a copy: marker, title and dek opened flush at y=0. That is what an
  inline value does — it can't reach a page nobody remembered to edit. The margin belongs on
  the grid rather than on `.wrap`'s padding, because the guide overlay is `inset:0` inside
  `.wrap` and padding there would make the guide stop describing the grid it draws.
- **`1 / -1`, never `1 / 13`.** A full-span declaration MUST say `-1`. Almost every use is
  inside the feed's own nested grid, where a literal `13` is the phantom-measure bug above. `-1`
  cannot be wrong. `.c1-12` keeps its name (the page's grid has twelve) and ships `1 / -1`.
- **Two breakpoints, and only one of them is a choice.**
  - **`≤1060px`** — every hung device stacks: `.frow`, `.shead`, `.colo`, `.specblock`,
    `.sysrow`, `.mdoc`, `.num`. **Derived, not chosen**: see `--label`. All seven give at the
    same width because they share the same column; one of them stacking at a different number
    would make that page the odd one out.
  - **`≤720px`** — every block collapses to full width (`1 / -1`). This one is a choice, and it
    is about columns rather than labels.
  - `900px` and `560px` each carry exactly one rule (`.duo .dcol`, `.entry .em`). Leave them
    alone or fold them in; don't add a third general breakpoint.
- The faint column-guide overlay is hidden; press **`⌥G`** to flash it. It is wired **once**, in
  `Layout.astro` — it used to be wired twice, because `Explainer.astro` had its own copy, and
  that layout is deleted. The colophon invites it: "Press ⌥G to see it."

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
- Motion is **rationed and subtle** — hover only, and it moves by the grid's own unit.
- **THE ONE-CHARACTER SHIFT** (chooser Motion 01 + 05). On hover an index row's title steps
  right by exactly **`1ch`** — one character cell — its underline goes to ink, and its numeral
  darkens from `--faint` to `--ink`. Nothing fades, nothing scales, nothing tints.
  `1ch` and not `8px` because on this site `1ch` is a real unit: every glyph has the same
  advance, so the row moves by the grid's smallest increment and lands back **on** the grid.
  (Measured on the built page: `padding-left` computes to 9px at 15px Plex.) This is why the
  body sets no `letter-spacing`, and it is the motion vocabulary everywhere — `.links a
  .arrowc` slides `1ch` too, where it used to slide 6 arbitrary pixels.
  It MUST be mirrored on `:focus-visible`. A shift and a colour that only a mouse can trigger
  are a mouse-only affordance.
- **The row's hover tint is gone.** A 4% background wash is a box, and this is the document —
  it moves the type instead of painting behind it. The gate's "open" state went with it: an
  open row is disclosed by its content **being there**, not by a held-on tint.
  Currently shipped, the whole list: the one-character shift, link interactions (below), and
  the case-study marker's 90° rotate (`.smark-home .mark` — the one drawing of the figure that
  is still a link). Reduce, don't add.
- Respect `prefers-reduced-motion` for any new non-essential animation.

---

## Link system

**ONE IDIOM, and one exception.** The three treatments collapsed into one when there was one
type size and one hue: a link is **ink type with a `--faint` underline at 4px offset**, and on
hover the **underline goes to `--ink` and the text goes to `--accent`**.

**The underline token is `--faint`, not `--line`** (annotation, /work/practice-room/ in dark: "this
link isnt obv — shouldnt it have perma underline"). It had a permanent underline; the underline
was invisible. Measured on the built page: `--line` computed 1.30:1 against dark paper, 1.34:1
in light. `--line` is the **hairline** token — it draws structure between blocks, where nearly
invisible is the job. A link's underline is the affordance, and it was borrowing a token tuned
for the opposite purpose. `--faint` is 5.60:1 dark / 4.69:1 light and already labels the index
numerals and meta, so no new value entered the system. Picked off a four-option proof sheet
rendered in both colourways at the real 15px Plex: `--dim` is 2.40:1 in light, so it fixes one
colourway only; `--accent` makes the underline the loudest mark in the paragraph and revives a
second hue role. One token changed, all **seven** underline sites with it.

This overrules half of a finding filed below under "Three findings that were WRONG": `--line` at
1.34:1 genuinely is a decorative underline under 1.4.3, so it was never a WCAG failure. It was a
findability failure, which is a different question, and the one the reader was asking. That is `.entry .eh`,
`.espec .eth .eh`, `.pin .pfoot a`, `.colo a`, and `.links a` — five places that each had their
own mechanism (a `border-bottom` that filled in, a `text-decoration-color` that darkened, an
arrow that slid 6px) doing the same job three ways.

The one exception, kept on purpose:

- **Inline prose links** (`p a`): ink text + accent underline → **invert-fill** on hover
  (accent field, `--on-accent` text), a `background-color`/`color` fade on `--dur`. **No
  wipe.** Scoped to `p a` so it does not leak. It survives because a link *inside a sentence*
  has to be findable without being read first, and a filled field is the one treatment that
  reads at a glance in a page of one type size.

External links still get the `↗` from `a[target]::after`. The bare `a` default is accent text +
underline-offset.

### Instrument controls — the Track grammar (`/metrotuner/` only)

The instrument screen retired the action underline: a button that wears the link's
line is dressed as a link, and the page had four operationally different control
classes in one costume (chooser `metrotuner-control-taxonomy`, pick 03 of 30 judged
concepts — Rams's form-announces-operation translated, not Braun's hardware copied).
**One moving disc everywhere; the TRACK it rides announces the operation:**

- **VALUE** (bpm, A4 Hz, reference note) — the **bare numeral** (round-15 chooser,
  Q2/06: the rails shipped and were deleted the same week — they read as imported
  slider furniture). The number is display and control: scrub anywhere on it (4px
  per unit; the reference note drags vertically), type as before. The affordance is
  the resize cursor, the title, and the digits reading **accent while in hand**
  (`.scrubbing`). The wager, stated on the sheet: a practice tool is used repeatedly,
  so the gesture amortizes.
- **TOGGLE** (start/stop, play tone) — a **two-pocket track**: one disc, two ring
  berths, 18px throw on `--dur`. Latched = the far pocket, disc in **accent** —
  state reads at arm's length with no words. ONE label that swaps text (the user's
  refinement on the sheet's mock: printing both words was redundant), with the longer
  string's width reserved on the `.w` span so nothing reflows.
  - **The accent toggle is the exception** (round-15, Q1/06 "the rule is the
    switch"): no latch, no words — the beats rule ITSELF is the button (140px-wide
    target). Accented = the downbeat tick stands full-height in ink and the digit
    "1" carries weight 500; equal = a flush `--faint` stub and a plain 1. The state
    lives in marks the meter already draws.
- **MOMENTARY** (tap) — a **lone ring, no track**: a disc with nowhere to travel can
  only be pressed. Each strike fills it accent instantly and the fill drains over
  300ms — the per-strike reward, and the visible proof it holds nothing. Fires on
  **press** (pointerdown), the hardware convention — measuring on release folds the
  press's duration into the tapped intervals.
- **SELECTOR** (beats, subdivide) — the ruled measure: digits ARE the buttons and
  the rule under them is the value. Both rules **grow to digit N** now (round-15,
  Q3/04 "the dashed extent" — one lesson, learned once); the texture is the
  difference: beats' rule is solid (positions in the bar), subdivide's is cut into
  n dashes (divisions of the beat).

Scoped to the instrument: the document pages keep the link idiom — a case study is a
text to read, the instrument is a machine to operate, and the two vocabularies must
not blend.

---

## Layout blocks

The composition primitives, chosen from the base-blocks + link-style choosers:

- **The index list** (`.matrix` / `.entry`): **one link line**, used for both homepage
  sections — `numeral · title · leader · meta`, on one 28px line, **no rule and no tracks**.
  A flex line, not a grid cell. `.ends` is the leader: an empty span that absorbs the slack,
  which is how a printed index or a table of contents sets a row.
  - **The BLURB is not displayed** (`.entry .ed{display:none}`). This is the largest deletion
    in the mono pass and the one that makes a single type size scannable: with the blurb in the
    row, a size distinction was needed to separate title from description, and the ramp came
    back in through the door. Eight blurbs is eight sentences you must read to find the one you
    want — the title plus the artifact noun is what an index is *for*. The data still carries
    `blurb` because the case-study pages use it as their dek, so this is a CSS rule rather than
    an edit to eight entries.
  - **No `.entry.accent`.** The flagship row was marked by an accent top-rule; there are no
    rules, and a coloured mark that isn't interactive is a slop finding. Position is the
    emphasis — the flagship is first. `accent` is still emitted by two data entries and
    selects nothing.
  - **No breakpoint.** `flex-wrap` + `min-width:0` on the title is the whole responsive story;
    ≤560px the meta drops to its own line, indented `3ch` to the title's edge. Four separate
    cuts of this row (~55 lines) were deleted, not ported.
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
    one dek would be the only one on the page); the row's own sub-rows do that job.
    All three use the identical device — one mechanism, used everywhere.
- **The spec row** (`.espec` + `.proc.d` / `.proc.b`): the Method row — the one entry in the
  index that is a **spec, not a project**. It is an `.entry` with exactly two changes, both
  forced by content, and nothing else:
  - **No numeral.** There is one of it, and a set `01` promises an `02` that never comes — a
    list of one dressed as a list of many.
  - **The duality is the row's content, as two sub-rows** — not two columns. Columns would be
    a `.duo`, which is `/method/`'s device and reads as a foreign object on an index of rows;
    **rows are this page's unit**. Each `.proc` is now a **kicker above its title and blurb**,
    indented `1ch` — the same character cell the hover shift uses, so the nesting is measured
    in the grid's own unit. Its hairline and its 12 tracks are gone with every other rule.
  - **The hue is gone from the kickers.** `.proc.d` and `.proc.b` printed navy and olive;
    DESIGN and BUILD are two faint labels now, and the words do the work they always actually
    did. The two class hooks still ship and select nothing — cleared in the system pass.
  - There is **no CTA**. Round 1 of the chooser had a right-aligned "Read the spec →" and it
    read as a button dropped on the grid: nothing else on this site is a call to action, the
    arrow always rides the **title** of the thing being clicked. The whole row is the link.
  - (Historical, kept because the trap is generic.) The `≤900px` block MUST reset
    `grid-template-columns` on both `.eth` and `.proc` before
    moving children to `grid-column:1` — the 12 tracks otherwise survive and each child gets
    a 1/12 sliver (this bit twice, once in the chooser and once here).
- **Section break — air, not a rule** (`.grid.sect`): a section is opened by space plus its
  head, with **no** divider. A 1px ink line across all 12 columns was
  the heaviest mark on the page and never touched the thing it opened, so it read as a
  divider dropped between sections; six per page also flattened the hierarchy. Whitespace
  is structural — a rule that repeats has stopped being structure. It is a class on the
  section's **own first `.grid`**, never a spacer div, and it must be written `.grid.sect`
  to outrank `.grid + .grid`'s one-unit gap.
  - **NO RULES SURVIVE on the 14 pages that load `global.css`.** The earlier version of this
    file said rules survive "where they own something they touch" — a `.frow` opener, an
    `.entry`'s hairline, `.colo-rule` closing the page. All three are deleted. The two
    remaining borders are the field's writing line and the embed's boundary, and both are
    stated as facts rather than as structure (see The document, rule 2).
    The full-width `.rule` still exists for `writing/*`, and **it lives in `Explainer.astro`,
    not `global.css`** — the explainers never load that file. Edit it there.
  - There is **no rule above a case-study `h1`**. The old 32px `.shrule` accent stub was
    not a column, not the word's width, not the measure — it read as template decoration.
    The `.smark` side marker opens the page instead and says more.
- **Homepage statement** (`.statement`): the name-sentence and the two thesis clauses are
  **one continuous block** — one element, because block elements can't share a line and an
  `h1` + `p` version always broke before the thesis and read as two stacked statements.
  The clauses are **italic in `--dim`**, not coloured. Colour left this sentence when colour's
  only job became interaction: a coloured clause mid-paragraph reads as a link that won't
  click. Plex's true italic is why Plex was chosen. **No place colour enters body copy.**
- **Section head — the stacked head** (`.shead` + `.sbody`): the `h2` sits **above** its prose
  and both start at **column 1**. `h2` is 11px-style tracked caps at the body size, in
  `--faint` — the one place case is structural at full size.
  - **It has no sub-grid.** It used to be a 12-track grid with `grid-column:1 / 10`, and inside
    the document column that is 502px of 609 — the prose stopped **107px short** of the clip
    beside it (measured: prose right edge x=638, clip x=797). The fix is no tracks at all: the
    prose's own `62ch` cap sets the measure. Every text right edge on a case study now agrees
    at x=746.
  - Two vertical lines run the page: **column 1** (marker, `h1`, `h2`, prose, ledger label,
    clip left edge — all measured at x=188) and the `62ch` right edge of the prose.
  - `.shead` is still only for a head **with a paragraph**. Over a `.facts` ledger, a `.links`
    staircase, a `.step` row, or a full-width embed, put the `h2` in a flush-left `.c1-12` — it
    lands on the same column 1 either way.
  - `writing/*` pages are exempt: their `.c1-2` holds a real `<span class="sn">` section
    number, not an empty spacer.
- **Two-column duality** (`.duo` + `.dcol.d` / `.dcol.b`): the **only** block that splits the
  measure into two equal halves (span 6 each), each with a `.dk` kicker. Used on `/method/` for
  the two procedures, and only where **the two instruments are literally the subject** — the
  composition states the argument before a word is read, which is now the entire argument: the
  two 3px hue rules are gone, and side-by-side plus two kickers is what tells the halves apart.
  It is the ONE block that still splits the column, and it earns it because the split IS the
  content.
  - It MUST be preceded by a **full-measure unified statement**. Two lists side by side read as
    two unrelated lists to anyone meeting them cold; the shared claim runs `.c1-12` above it, so
    the columns arrive as halves of one thing.
  - Do **not** reach for it to put any two things next to each other. Two arbitrary columns are
    a layout convenience; here the split asserts a relationship, and a `.duo` that isn't about
    design-vs-build is two columns for their own sake.
  - Stacks to one column `≤900px`, where the two kickers do the separating the gutter did.
- **Clip scatter** (`.matrix.mscatter` + `.m-a…d`): case-study video clips dropped into
  non-adjacent modules of a 12-col × `--unit`-row lattice (`.mscatter` supplies the
  `grid-auto-rows`). Recordings are not all the
  same shape, and a two-up row forces mismatched ratios onto one baseline where the
  difference reads as a cropped bottom edge. Scattered, no two clips share a baseline.
  Collapses to a stack `≤900px` — written `.matrix.mscatter`, **two classes**, because a
  later `.matrix{display:grid}` outranks a one-class rule at equal specificity (this is the
  cascade trap; it shipped four clips at 153/123/123/123px on a phone).
  **It declares its own `display:grid` and its own 12 tracks.** It used to inherit both from
  `.matrix`, and `.matrix` is `display:block` since the index's rows became document lines — left
  alone, the four clips on `powerpoint` would have stacked at full width with their `grid-row`
  spans doing nothing. Same class of defect as the cascade trap above: a device that borrows its
  display mode from a neighbour breaks when the neighbour changes.
  `.mscatter` is **not** a `.grid`, so the block after it needs an explicit top margin — the
  `.grid + .grid` rule won't reach it.
- **Photo gallery** (`.g-rag`): **two ragged column-flows** (`.col-l` c1–6, `.col-r`
  c7–12 dropped `3 × --unit`), not a 2-up grid. Independent flows mean each photograph is
  just the next one down, rather than half of a forced comparison pair. One column
  `≤720px`, with the drop removed (it would leave a hole at the top of the stack) — by spanning
  both children `1 / 13`, so it stays `display:grid` there. **No 1px frame on the images**: a
  photograph has its own edge, and a hairline round one is a mat — the card tell in a gallery's
  clothing.
- **Live embed** (`figure.embed`): **one proportion for every embed** — `16/10` on
  desktop, `3/4` (portrait) `≤720px`, so the embedded page gets a phone-shaped viewport
  instead of a letterbox scaled to unreadable. There is no tall variant. The link out
  appears **twice**: `.esrc` above the frame (an embed is tall, so the one actionable
  thing must not sit a screenful below) and the `figcaption` below. **The two mirrored hairlines
  are gone** — the frame has its own edge, so a rule above and below it was three lines doing one
  line's job. The frame itself STAYS, and it is the one sanctioned box on the site: inside it is
  somebody else's live page, and the border is what tells the reader where this site stops.
  Never write a literal `↗`: the O7 rule appends one to every `target="_blank"` link.
- **Facts — the ledger** (`.facts` / `.frow`): one row per fact — the 11px label **above** its
  value, rows separated by `--lead`, no rules. It was a 12-track grid (label c1–3, value c4–12)
  with a hairline per row under a 2px ink opener: three ramp steps and two rule weights to say
  "label, value". A label above its value is how a document annotates; side by side is how a
  table does.
  - It replaced three-across cells (`3n+1`→1–4, `3n+2`→5–8, `3n+3`→9–12). Three across only
    composed when the count was a multiple of three: luthier's 4-row table left **two empty
    cells** hanging off the last row, and every value was squeezed to a 245px measure that
    made four-line paragraphs out of one-line facts.
  - Values are the body size in `--dim`, capped `62ch`; `<b>` promotes to `--ink` at weight 500.
    Labels are the 11px micro-label — a caption, not a heading.
  - No breakpoint: it is already stacked at every width.
- **Clips** (`figure.demo`, `.hang`): a clip takes the **full document column**, caption under
  it. **No frame** — `border:1px solid var(--ink)` round a 1000px video is a card, whatever the
  old comment called it.
  - **The hung caption is deleted as a device.** It hung a `figcaption` beside the clip so the
    clip's right edge would land on the prose's. It cannot: the figure sits inside the document
    column and re-divides *that*, so its `c1-8` meant 8/12 of 609px — measured, the clip stopped
    at x=532 while the prose ran to x=638. There is also no margin left to hang a caption in;
    the five empty fields are the page's margin, and type in them would make it a column.
  - `.hang` is kept as a selector (six pages emit it) and now means "a clip at the full column
    width", which every clip is. It becomes redundant in the design-system pass.
  - **CONTROLS APPEAR ON HOVER, and nowhere else** (chooser: `andrewshiau-clip-controls`, option
    03). Annotation: *"this autoplay no controls vieo is cool but it might be more practical if it
    had controls."* The clips are muted, looping and autoplaying; `controls` is set on
    `pointerenter` and cleared on `pointerleave`. **The still page is unchanged** — a browser
    control bar is a filled grey surface across the bottom of a 700px frame, and always-on would
    have put the loudest box on the site inside the one device that is meant to be pure evidence.
    Three states qualify it, all in `Layout.astro`'s one `apply()`:
    **`prefers-reduced-motion`** pins controls on and pauses on frame 1 — that beats the hover rule,
    because a reader who asked for no motion must not hold a pointer still to keep the bar.
    **`(hover:none)`** gets controls permanently: `pointerenter` does fire on a tap, but it would
    strand the bar with no way to dismiss it.
    **A clip the reader paused keeps its controls** on leave — removing them would leave a stopped
    clip with no way to restart it.
    All eight clips are governed by this: three on `luthier`, five on `powerpoint`. It is one
    listener pair in the layout, never per page, and it MUST stay in the same function that reads
    the motion query — two handlers setting `controls` on one element is the class of bug that
    produced the panel-feet defect.
- **Links — L2** (`.links a`): a **diagonal staircase** — each link steps down-and-right
  (`3n+1`→1–6, `3n+2`→5–10 + 1 unit down, `3n+3`→8–13 + 2 units down). A gallery you
  navigate; echoes the clip scatter.
- **Colophon** (`.colo`): grid-placed facts (label column + satellites 5–13), not a
  stacked list. Right columns stay intentionally empty.
- **Side marker** (`.side` + `.smeta` in the index list; `.smark` on a case-study header):
  the mark's own figure plus the word — 18px in the list, 26px on a case-study head, in
  `currentColor`. Hollow ring = design, solid disc = build, the whole figure = both; this
  is the only mark on the page, and it is the marker (see the duality section). In the list
  it sits in the `.em` marker column (c10–13, right-aligned) after the artifact noun with no
  `·`; on a case-study page it is the **first thing on the page**, above the `h1`. Both read
  `side` from `experiments.ts` — never hardcode one. Two wrappers, one drawing:
  `SideDot.astro` and `SideMark.astro` over `MarkFigure.astro`.
- **Meta line = artifact nouns.** The `meta` field on each `Entry` names **what the thing
  is** — "Design system tool", "Figma widget", "Static site", "Agent skill",
  "Photographs". One consistent category across the whole index, so the column reads as a
  set. It MUST NOT carry dates ("2023–present"), employers ("At Amazon"), or a discipline
  list ("rapid prototyping + UX") — mixing those kinds made the column read as noise, and
  the long ones overflowed. The side marker already says which half; the noun says what.
- **The one filled form:** `.block` (`--accent` field, `--on-accent` text) — used once
  per page for the key statement. Everything else is type + rule. No filled cards.
- **The locked row + its gate** (`.egaterow` / `.egate`, `.f`): the site's
  only form, and the only row that opens. A gated entry keeps the index row **exactly** as it
  is — same numeral, same title, same marker, and **no signal that it is shut**. A lock glyph
  and the word `Password` were both tried and both removed: on the page they read as a warning
  label on the one row in the list that most wants opening, and they were two extra marks in a
  matrix whose whole device is one row per artifact. **The gate is the disclosure** — clicking
  opens the ask in place, immediately, under the row that was clicked, so nothing is hidden and
  no promise is broken (chooser `andrewshiau-decisions`, Q5/01, which re-confirmed this against
  a hiring-manager reading that called the unmarked row a broken link; the row's own comment in
  `LockedRow.astro` carries the argument). This paragraph used to describe the lock and the
  `Password` marker as shipping. They do not, and `.lockc` does not exist. Clicking the row
  expands the gate **in place** — a sibling cell on the row's own tracks, starting on the
  title's left edge, no page transition (chooser `andrewshiau-gate-options`, option 05). The
  gate cannot be a child of the row: `.entry` is an `<a>`, and a `<form>` inside an anchor is
  invalid HTML the parser un-nests. `LockedRow.astro` emits the pair, and `/gate/` renders the
  same pair already open, so the two states cannot drift.
  - **Form controls** (`.f`): the field is a **2px ink underline, not a box** — same weight
    that opens a `.frow` ledger, and a 1px box round an input is the same un-Swiss tell as a
    card round a list row. The button is `.block`'s field and type at control scale (12px
    tracked caps). `border-radius:0` on both, explicitly. **16px on the input** or iOS Safari
    zooms the page on focus; **`min-height:44px` on BOTH**, not just the button — at 390px the
    row wraps and a field that borrowed its height from a sibling loses it (measured: 42px,
    failing WCAG 2.5.5 on the phone only).
- **Structure is rules, not boxes.** A wrap-around hairline border to make a "card" is
  the un-Swiss tell — use a top rule + gutter + whitespace instead.

---

## Easter eggs (rationed delights)

Kept because they're subtle and on-system. Don't add more without reason.

- `::selection` → pure invert (`--ink` bg, `--paper` text).
- Cursor → a filled dot SVG data-URI in **`--ink`**; it's the `--cursor` token, so it flips
  with the scheme. **It MUST NOT be the accent** (chooser: `andrewshiau-cursor-options`, 03).
  It was `--design` until measured on the live index: `cursor` is declared on `body`, so it
  inherits, and an inherited cursor loses to a UA-declared one — the disc never reached the
  **20 links** (native pointing hand) or the password field (I-beam), and painted the other
  **65 of 181 elements**: paper, headings, prose. The interaction hue was on everything a
  reader cannot act on and nothing they can, which is Q4/05 running backwards.
  **The disc is the cursor over PAPER only.** A second pass gave type its I-beam back —
  `:is(p,h1,h2,h3,li,dd,dt,code,blockquote,figcaption,span):not(a *){cursor:auto}`. Without it
  the disc replaced the text cursor over every paragraph and the document did not advertise that
  it is selectable: a pointer that hides an affordance is a regression with a nice drawing.
  **`:not(a *)` is load-bearing** — the unscoped selector strips the pointing hand off
  `.entry .eh` and `.entry .en`, because every index row is an `<a>` whose title is a `<span>`.
  Measured, not reasoned: nine rows read as unclickable at the pixel a reader aims for. `span`
  is in the list on purpose, for the ledger and colophon values (an email, a date) that a reader
  copies.
  It is deliberately **not** kept in sync with the mark: the design half of
  the figure is a hollow ring now, and an 18px ring drawn at cursor weight reads as a smudge
  or disappears over busy ground. The cursor's job is to be visible, not to be the logo.
- The case-study marker (`.smark-home .mark`) → 90° rotate on hover. It is the one drawing
  of the figure that is still a link; the index's row marker states a fact and doesn't move.
  The mark itself is the duality: a hollow ring and a solid disc on the descending diagonal
  (design then build) with a 1.5px `currentColor` rule trimmed to the gap between them —
  two things, one line; the rule is the relationship, and outline-vs-fill is which half.
  `public/favicon.svg` is the same drawing and carries its own `prefers-color-scheme` block;
  change both together.
- `g` → flash the column grid.

---

## The design system — Basecoat, bound

The base is **[Basecoat](https://basecoatui.com)**: shadcn/ui's components and visual patterns as
plain HTML classes, with **no React**. Rendered at **andrewshiau.com/system/**.

Researched before installing, because the obvious answer was wrong for this site:

| | React? | Tailwind? | Verdict |
|---|---|---|---|
| shadcn/ui | **required** | **required** | its Astro install page requires `--add react`; components are imported as React components |
| Basecoat | no | required v4 | **picked** — the patterns without the runtime |
| Open Props | no | no | 500+ tokens where this site uses ~15 |

The site ships **0 kb of JS** and has **one form control and no buttons**. shadcn's three main
offers — button variants, Radix a11y primitives, Tailwind utilities — had nothing to attach to.

### The one decision: Basecoat's tokens are bound to ours

`src/styles/system.css` re-points all 149 of Basecoat's variables at tokens this site already
measured, inside an `@theme` block so Tailwind's own utilities resolve to them too. A Basecoat
component dropped on any page inherits Plex Mono at 15/28, warm paper, the three greys, the one hue
and square corners **without being restyled at the call site** — and dark mode needs no second
binding, because the right-hand side already flips.

The alternative (let Basecoat's defaults win, override per component) is how a design system becomes
a pile of `!important`, and would have put a rounded, sans-serif, blue button on a site whose whole
argument is one typeface, one size, no rules.

### Four rules enforced on Basecoat's own classes

Tokens carry values; these are decisions, so they are stated as CSS:

1. **No filled surfaces.** `.card`, `.alert`, `.popover`, `.dialog` lose their background, border
   and padding. Every box came out with the document direction, including the one filled `.block`.
2. **No caps, anywhere.** `.label`, `.btn`, `.badge`, `.kbd` get `text-transform:none`.
3. **One size.** Every `-sm` / `-lg` modifier collapses to `--step`. A component offering size
   modifiers is offering a ramp, and there isn't one.
4. **The field is a line you type on** — the one Basecoat component actually used, rebound to the
   shipped treatment.

`system.css` loads **before** `global.css`, so where they disagree the site's measured rule wins on
cascade order rather than on `!important`.

### Imports are per-component and explicit

Basecoat's full bundle is 234 kB for 38 components. Four are imported (`input`, `label`, `table`,
`kbd`); two appear on a real page. **If a component has no call site, don't import it** — and if a
specimen on `/system/` has no call site, delete the specimen. A system documenting unused
components is a catalogue.

The import path is `basecoat-css/components/<name>.css`. The short form the docs show
(`basecoat-css/input`) fails with `Missing "./input" specifier`: the bare subpaths in that package's
`exports` map are its **JavaScript** modules.

### `/system/` is the visualizer, and every specimen is real

No isolated sandbox and no second copy of any CSS — the specimens are `.frow`, `.entry`, `.f input`
and `MarkFigure` with no overrides, so a specimen that renders correctly there renders correctly on
a case study. Only the *chrome* (swatch, space bar, specimen row) is new CSS.

The token values are duplicated in that page's frontmatter and **asserted against `global.css` at
build time** — nine declarations, checked literally. A visualizer that lies is worse than no
visualizer, so if a token moves and the page isn't updated, the build fails.

---

## `/style/` — this file, as a page

This document is rendered at **andrewshiau.com/style/**, from this file, at build time. It is set
by the rules it states, so every claim on the page can be checked against the page itself.

- **No markdown dependency.** `src/pages/style.astro` carries a ~90-line renderer for the
  thirteen constructs this file actually uses. It is not a markdown parser and MUST NOT become
  one — if this file needs a construct the renderer lacks, add the construct or change the prose.
- **It escapes HTML first.** This file is full of tag names and selectors; without escaping, the
  page would execute its own examples.
- **Two build-time assertions:** ≥24 headings, and the literal presence of `One mechanism per job`,
  `THERE IS NO TYPE RAMP` and `The two axes`. A renderer that silently stops understanding this
  file fails the build instead of shipping a blank steering page.
- **`.mdoc` is the one block it adds**, because a rendered document is the only content with its
  own nested heading hierarchy. `h2` is ink on the `--label` axis with `--sect` above; `h3` is
  faint with `--group`. It spans `1 / 9` like every other block — it used to bleed to 781px,
  which made this page the widest text on the site. Long code fences and wide tables scroll inside their own box with a `mask-image`
  fade, so a clipped line reads as "there is more" rather than as a bug.

---

## Explainers (the /swiss + /explain artifacts)

Three pages under `src/pages/writing/` — `10x-is-a-loop`, `canele`, `loops-vs-graphs`. They are
**on `Layout.astro` and `global.css` like every other page** (chooser:
`work/understand/andrewshiau-grid-options/`, Q5/02 — "fold into the document").

**They used to be a second design system, and that was the site's largest inconsistency.** They
rendered from `src/layouts/Explainer.astro`, which carried its own 307-line `is:global` copy of an
entire stylesheet. Measured on the built `/writing/canele/` before the fold:

| | the explainers | the other thirteen pages |
|---|---|---|
| font sizes | **12** (12px → 120px) | 1 (15px) |
| typeface | Graphik | Plex Mono |
| weight 700 | 35 elements | 0 |
| uppercase | 11 elements | 0 |
| rules | 2px ink, several per page | none |
| content axis | 182px | 172px |

Two sites under one domain, one click from the index — and **invisible to every check the site
had**, because those pages never loaded `global.css`. The dead-CSS audit below records the same
trap from the other direction.

- **The panel is the masthead.** An explainer opens with `.pin` — `.smark` kicker, `h1`, a
  `.facts` ledger of what it is and where it came from — exactly like a case study. The old
  three-dot mark in a 2px-ruled bar is gone; the site has one identity block.
- **Six devices are explainer-only**, and they live in `global.css` at the end: `.kicker`, `.sn`
  (the section numeral), `.idea` (the one claim), `.num` (the one figure), `.quiz`, `.foot`.
  Everything else an explainer needs — `.dek`, `.facts`/`.frow`, `.step`, `.block`, `h2` — is the
  site's own device, unmodified.
- **What the fold cost:** the display type. A 120px accent numeral, a 30px bold claim and an 80px
  stat were the loudest marks on the site and are now 15px. What replaces them is what replaced
  the ramp everywhere else — value, the space scale, and the two axes.
- **The quiz survives, and it is the only interactive thing on the site.** Being able to check
  yourself is what makes an explainer an explainer. The engine moved to `Layout.astro` behind a
  `quiz` prop that defaults to `[]`, so the thirteen non-explainer pages ship no quiz markup.
- **Quiz gotcha, still true:** the option buttons are created by JS (`createElement`), so scoped
  `[data-astro-cid]` selectors miss them. Their CSS MUST be global — it is now in `global.css`,
  which sidesteps the problem entirely. This bug shipped live twice under the old layout.
- The correct-answer state MUST have a non-colour signal (`.opt.correct::before{content:"✓ "}`).
  Colour alone isn't enough, and here colour means "you can act on this" anyway.
- **What came out of the engine in the fold:** the score line's inline `style` (uppercase, tracked,
  weight 700 — three off-system marks written from JS, where no stylesheet audit could see them;
  it is `.qscore` now), the count-up animation (it existed to make a 120px numeral arrive), and
  the scroll-progress bar (a 2px accent line pinned to the viewport — the site has no rules, and a
  reading indicator on a 900-word page tells the reader what the scrollbar already says).
- **Each page keeps at most one bespoke diagram**, in a page-level `is:global` block, rebuilt on
  the system: canelé's flour scale and loops-vs-graphs' flow diagram. `10x-is-a-loop` has none.
  Both diagrams lost their filled panels — an accent-filled box is a static mark in the one hue
  that means interaction.

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
   Don't ask a persona to *eyeball* dead CSS — **measure** it: extract every class token from
   `class="…"` across `dist/**/*.html`, extract every class in every selector, and diff.
   **This is now one stylesheet for all sixteen pages**, so the audit is a single diff. It used to
   need scoping into two — `global.css` for `Layout.astro`'s pages, and `Explainer.astro`'s own
   `is:global` block for the three explainers — and pooling them reported a selector as live
   because the *other* stylesheet's pages used that class. That is exactly how `.rule` sat dead in
   `global.css` for four passes while the explainers drew their own copy of it. Deleting the second
   stylesheet removes the trap, not just the instance. Allow for the handful of classes JS adds at runtime
   (`showgrid`, and the quiz's `.correct` / `.wrong` / `.show`).
   **A "reserved slot" is dead CSS.** `.colo.c3` and five grid spans each carried a comment
   arguing the empty slot was the pattern rather than the content. To anyone reading the file
   they're indistinguishable from a mistake, and a rule nothing selects is a rule nobody can
   trust. Delete it and record the value in the comment, so the next person adds it back
   knowing it was measured. Same for a comment that has outlived its rule: the `.back` tap
   target claimed "still here for /method, which has a `.back` line" about a page that uses
   `PanelHead`.
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

## Decisions the critique surfaced, and what they were

A `/design-critique` panel of eight personas reviewed all 16 pages at desktop and phone width
(2026-07-29) and produced ~110 findings. Every one was verified against the live site before
being acted on; three were **refuted** by measurement and are recorded here so nobody re-files
them. Six were judgment calls, put to a proof sheet
(`work/understand/andrewshiau-decisions/`) because a render changes the answer.

### The six calls

| | decision | why |
|---|---|---|
| Blurbs | **Work rows only** (3, not 9) | The objection to blurbs holds for a list you scan to CHOOSE from; it does not hold for the three rows a stranger has to judge. Experiments stay bare, which makes the bareness the signal that Work matters more. |
| Mobile fold | **Contact drops below the lists at ≤720** | The first artifact on a phone was an agent spec; the three projects were off-screen. The colophon has always carried the address, so nothing is lost. |
| `/style/` scope | **Publish everything, add one framing row** | Cutting the runbook and the persona roster would have been editing the spec before showing it. What was missing was a frame, not a redaction. |
| HTML comments | **Stripped on build, kept in source** | 31% of shipped bytes, and eight private annotations. The reasoning lives in the repo, on `/style/` and on `/system/` — none of which require view-source. |
| The gated row | **No signal before the click** | Re-confirmed against a hiring-manager reading that called the unmarked row a broken link. The gate opening in place IS the disclosure; two extra marks read as a warning label on the one row that most wants opening. |
| The marker legend | **None on the index** | The type-noun already says what each artifact is. The ring/disc split is a second classification, and a reader who never decodes it is not missing something they needed. |

### Three findings that were WRONG, measured

Do not re-file these. Each was raised by a persona and disproved:

- **Contrast.** Every text token passes AA in both schemes: ink 16.61:1, dim 5.86:1, faint
  4.69:1, accent 11.36:1 on paper; 15.99 / 6.93 / 5.60 / 7.64 in dark. **`--faint` has a 0.19
  margin, so do not lighten it** — and it now carries the link underline as well as the labels,
  which raises the cost of touching it.
  ~~`--line` at 1.34:1 is a decorative underline on text that itself carries 16.61:1 — 1.4.3
  does not apply.~~ **Half-right, and superseded** (see Link system). The WCAG reading holds: a
  1.34:1 underline under text at 16.61:1 is decorative and breaks no criterion. But "does 1.4.3
  apply" and "can the reader find the link" are different questions, and a later annotation
  answered the second one no. The underline is `--faint` now. A clean audit against the standard
  is not the same as a clean reading by a person.
- **Focus indicators.** Nothing is unreachable. Only `.entry` and `.f input` declare a
  `:focus-visible` style; everything else falls back to the UA ring, which is a consistency gap,
  not a blocker.
- **Leaks.** Zero hits across `dist/` for internal hostnames, code-review or ticket IDs, project
  codenames, loopback addresses or private IPs. (The scan pattern lives in the audit, not here —
  naming the strings on a public page is how a clean result becomes a list of things to grep for.)
  No password ships: the gate is nginx-side and the client only reads a status code. The droplet
  IP on this page is already public via DNS — `dig andrewshiau.com` returns it.

### The defect class worth remembering

**A track count is only meaningful in the grid it is evaluated in**, and the corollary the
critique added: **a grid's tracks must collapse, not just its children.** At ≤720 every `.grid`
child was `1 / -1` while the twelve tracks were still declared — and eleven 28px gutters are
308px that cannot compress, so every page scrolled sideways below 364px. Invisible for months
because every sweep tested 390 and up.
When you collapse a grid, use `minmax(0,1fr)`, never a bare `1fr`: `1fr` means
`minmax(auto,1fr)`, whose minimum is min-content, and a 1165px table inside it will force the
track open. Measured: `/style/` went from 336px to 847px on the first attempt.

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
