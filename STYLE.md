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

---

## Case-study page types

Every one of these pages is laid out in **the split** (above): the beats below describe
the order of the *content*, and the split decides which column each beat lands in — the
facts block goes to the panel on Type A and C, stays in the feed on Type B.

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

## The split — the site's shape

Every page of this site — the index and all eight case studies — is one **pinned identity
column beside one scrolling reading column**, divided by the site's only vertical rule.
There is no second page shape.
(Chooser: `work/understand/andrewshiau-redesign-directions/`, round 1 picks 12 + 10 +
hover-only motion + warm paper; round 2 picks concept 02 · spec block · scope 03.)

Why it exists: the complaint was that the landing page read *pedestrian* to someone
deciding whether to work with me, and the cause was that the largest thing on it was a
sentence **about** me with the evidence below the fold. Pinning the sentence puts the
evidence at the top of the reading column without deleting the claim.

### The three children, at one ratio, on every page

`.pin` (c1–5) · `.splitrule` (c5) · `.feed` (c5–13) — **4:8, never 6:6**, no modifier
class and no second ratio. The reading column is the page's subject, and a half split
would rank the two equally. Measured at 1440: panel 336px, rule at x=524, feed 700px —
identical on the index and on all eight case studies, so clicking into a case study
doesn't move the one division the site has.

- **`.pin` is `position:sticky`, NOT a fixed panel with an independently scrolled list.**
  The page keeps ONE scrollbar, so scroll position, find-in-page, and deep links all still
  work; a nested scroller breaks all three. And it degrades to a stacked block the moment
  the viewport can't hold it, so there is no state where content is trapped in a box too
  short to show it.
- **`.splitrule` is its own grid child, not a border on the panel.** The panel is 560px
  tall against a 1550px feed, so a border on the panel's own edge stopped a third of the
  way down and the rest of the page had a wide empty left third with nothing dividing it.
  A rule that spans something is its own element — same principle as `.colo-rule`. It is
  `width:0` + `justify-self:start` with a negative `margin-left`, so it draws at the end of
  column 4 and occupies no area; a stretched 1-column box would overlap the feed's numeral
  column and eat its hover and clicks.
- **It is the only rule on the site that runs vertically**, which is affordable because it
  is the one division the page actually has. Do not add a second.
- **Measured in both schemes:** the hairline reads at the same weight either way — dark
  `#2b2b27` on `#141413` = **1.30:1**, light `#d5d4cd` on `#f4f3ef` = **1.34:1**, same x
  and same height. "Structure by rules" fails if the rule is loud in one mode.

### `PanelHead.astro` — the panel is a component, not eight copies

The case-study panel is one component: back link, `SideMark`, `h1`, a `.facts` ledger whose
**first row is always `Type`**, then a `<slot>`, then the contact address. The `Type` value
comes from `metaOf(href)` — the same artifact noun `experiments.ts` prints in the index's
marker column, so the page and the index can't drift.

The ledger is left **open** on purpose: the component emits the block and the `Type` row and
the page adds its own rows. That is what lets one component serve all three page types, and
it is why a Type B panel isn't a title floating over 300px of nothing.

`src/layouts/Layout.astro` was **not** changed. Putting the panel in the layout would have
forced every page's ledger through a prop, and the ledgers are page content.

### Where each type's ledger goes

The ledger moves into the panel **only where it is metadata read before the work**:

| type | ledger | where it goes |
|---|---|---|
| A — case study | masthead (role, stack, span) | **into the panel** |
| B — skill | colophon (what it's made of) | **stays last in the feed** |
| C — collection | contents (a count, the cameras) | **into the panel** |

Type B's facts block is read *after* the work, so moving it up would invert the one thing
the page types were declared to fix. On `aping` / `explain` / `proofs` the panel is title +
marker + `Type` + contact, and the air under it is the same condition the index's own panel
is already in.

### Two breakpoints, two different failures

- **≤1100px — the split unwinds to a stacked block.** At 4 columns the panel is 300px,
  where "Design system tool" in the marker column starts wrapping to three lines. The panel
  stops being sticky, loses the vertical rule, and takes a **horizontal** 2px ink rule
  instead — a rule must own the edge it draws, and the edge is now horizontal.
- **`max-height:760px` — the panel unsticks.** A sticky panel taller than the viewport
  scrolls its own bottom out of reach and never comes back.

### The rule that MUST NOT be broken: scope the split's CSS to `min-width:1101px`

**Every** rule that exists because the feed is 700px and the panel 308px lives inside
`@media(min-width:1101px)` in `global.css` (one block, ending in a labelled comment). Below
1101px the panel *is* the page's full measure and the feed is 1064px, so the correct values
there are the page's own defaults, already written once at the top of the file.

This is not tidiness. The first version declared those rules globally and un-declared them
in the ≤1100px unwind, and it shipped a real bug: the split's block sits **later in the
file at equal specificity**, so `.pin h1{39px}` and `.pin .frow{88px 1fr}` beat the unwind's
overrides, and at 1099px a stacked full-measure panel rendered a 35px title over an 88px
ledger key with 941px of value beside it. Scoping the cause means the stacked page can't be
broken by adding a rule to the split. The same cascade trap bit a second time on
`.matrix.mscatter` at ≤900px, which needed **two classes** to outrank a later
`.matrix{display:grid}`.

### What the feed re-cuts, and the cost of each

The feed is 700px where the page was 1064px, so a block on the feed's own 12 sub-tracks is
~34% narrower. Five blocks were re-measured rather than left to shrink:

1. `figure.demo.hang` → `display:block`, caption under. The hung caption put the video at
   9 of 12 sub-tracks = 518px; as a block it takes the full 700px (an 11.5% loss against
   791px, not 35%). There is no margin left to hang a caption in — the split spent it.
2. `.shead > h2` / `.sbody` → `1 / 13`. c1–10 of the feed is 518px against a 528px prose
   measure, so the track had stopped framing the paragraph and started cropping it.
3. `.feed .mscatter` → a stack. The four powerpoint clips rendered 336/275/275/275px from
   1000px recordings (0.28–0.34), and three of those captions point at a detail that is a
   few pixels at 0.28. Costs ~800px of scroll; scroll is the cheaper thing to spend.
4. `.feed .g-rag` → one flow. Two ragged columns inside the feed give 336px per photograph
   from a 1400px file (0.24) — and the page has no lightbox, so 336px isn't a thumbnail of
   the work, it *is* the work. One flow gives each frame 700px, the same 0.50 the two-column
   version gave on the old page.
5. `.feed .specblock .sk` → c1–3. The 154px key was measured against a masthead that is in
   the panel now.

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
- **`--build` appears in exactly ONE place now: the thesis clause** (`.statement .t-build`)
  on the homepage. It used to have three, and the other two were the mark and the side
  marker — both of which have stopped using hue entirely (chooser:
  `andrewshiau-mono-redesign` Q7/02 + `andrewshiau-mark-options`). The figure is
  `currentColor` throughout and distinguishes its halves by **outline vs. fill**; the
  favicon is ink on paper. The reason is the next bullet: a signal that only colour carries
  is not a signal, and the mark was the site's most-repeated instance of exactly that.
- **Colour is never the only signal.** Navy and olive are just **2.14:1 apart in
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
- **The join is trimmed at both ends, and the numbers are geometry** (chooser:
  `andrewshiau-mark-options`, Q1/04). `x1,y1 = 14.17` is the ring's outer edge and
  `x2,y2 = 18.46` the disc's near edge, both projected along the 45° join from r=5 circles
  with a 1.8 stroke. The rule touches neither object, so it reads as a dimension line
  between two things rather than a stick through them — and a centre-to-centre line, which
  is what shipped while both dots were solid, pokes a visible stub into a hollow ring.
  Change r or the stroke and **both numbers move**; the arithmetic is in `MarkFigure.astro`.
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
  letter-spacing is used ONLY on the small micro-labels (kickers, `.em`, `.ck`, `.smark`,
  `.fm`, `.pk`, mast captions). Never uppercase a headline or body.
- Flush-left, ragged-right. **Never justify** — it wrecks word spacing.

### The grid

- 12 columns, `--gutter` 28px, via `.grid` / `.c1-6` / `.c7-12` / `.c1-12`. Every block
  MUST span a **named whole-column range**, never a stray width. Reuse column starts
  down the page so alignments recur — that recurrence *is* the design.
- **Those three spans are all that exist**, and adding a fourth means placing it. Five more
  were declared (`.c1-2`, `.c3-12`, `.c1-8`, `.c1-10`, `.c4-12`) and selected nothing —
  leftovers from the full-width stack the split replaced. Inside the feed they're wrong by
  construction: the feed re-divides its 8 columns into 12 of its own, so a block sits on the
  FEED's tracks, and a span carried over from the page's grid lands somewhere else.
  Declare a span when a page uses it, never in advance.
- Vertical space is **`--unit` × n** (section gaps 2.5×, paragraph 1×, tight 0.5×).
  No off-grid margins like `17px`.
- **The page's top edge is 1.5 units**, set once as `main > .grid:first-child` — not per page.
  It was two inline `style="margin-top:…"` attributes on the index and `/gate/`, and the nine
  case studies never got a copy: marker, title and dek opened flush at y=0. That is what an
  inline value does — it can't reach a page nobody remembered to edit. The margin belongs on
  the grid rather than on `.wrap`'s padding, because the guide overlay is `inset:0` inside
  `.wrap` and padding there would make the guide stop describing the grid it draws.
- Mobile (`≤720px`) collapses every block to full width (`1 / 13`).
- The faint column-guide overlay is hidden; press **`⌥G`** to flash it (wired twice — in
  `Layout.astro` AND `Explainer.astro`, so a change to one needs the other). The footer
  invites it: "Press ⌥G to see the grid."

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
  Currently shipped: link interactions (below), the case-study marker's 90° rotate on hover
  (`.smark-home .mark`, 0.5s — the one drawing of the figure that is still a link),
  `.entry` hover tint, `.arrowc` slide. Reduce, don't add, unless it earns its place.
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
    one dek would be the only one on the page); the row's own sub-rows do that job.
    All three use the identical device — one mechanism, used everywhere.
- **The spec row** (`.espec` + `.proc.d` / `.proc.b`): the Method row — the one entry in the
  index that is a **spec, not a project**. It is an `.entry` with exactly two changes, both
  forced by content, and nothing else:
  - **No numeral.** There is one of it, and a set `01` in the accent promises an `02` that
    never comes — a list of one dressed as a list of many. The title starts at **column 1**
    (nothing to indent past) and the 2px ink rule still opens the row, which is what keeps
    it a row *of this list* rather than a block parked above it.
  - **The duality is the row's content, as two sub-rows** — not two columns. Columns would
    be a `.duo`, which is `/method/`'s device and reads as a foreign object on an index of
    rows; **rows are this page's unit**. Each `.proc` is the row grammar one level down:
    hairline, hue-coloured kicker in **c1**, title in **c2–5**, blurb in **c6–13** — so the
    sub-rows land on the same verticals as the `.en` / `.eh` / `.ed` of every row below
    (measured at 1440: 188 / 279 / 643 / 1007 px, identical to a `.entry`).
  - The hue lands in the **numeral track**, which is where colour already lives on every
    other row (`.entry .en` is the accent). Nothing new is introduced — the existing accent
    slot is re-used, in the two duality hues.
  - **The cost, accepted:** three stacked rules make this the tallest row on the page, and
    stacked rows imply sequence where the two procedures are peers. Fitting the list won over
    the equality a side-by-side asserts; `/method/` makes the side-by-side argument at full
    size, one click away.
  - There is **no CTA**. Round 1 of the chooser had a right-aligned "Read the spec →" and it
    read as a button dropped on the grid: nothing else on this site is a call to action, the
    arrow always rides the **title** of the thing being clicked. The whole row is the link.
  - The `≤900px` block MUST reset `grid-template-columns` on both `.eth` and `.proc` before
    moving children to `grid-column:1` — the 12 tracks otherwise survive and each child gets
    a 1/12 sliver (this bit twice, once in the chooser and once here).
- **Section break — air, not a rule** (`.grid.sect`): a section is opened by `3.5 × --unit`
  of space plus its head, with **no** divider. A 1px ink line across all 12 columns was
  the heaviest mark on the page and never touched the thing it opened, so it read as a
  divider dropped between sections; six per page also flattened the hierarchy. Whitespace
  is structural — a rule that repeats has stopped being structure. It is a class on the
  section's **own first `.grid`**, never a spacer div, and it must be written `.grid.sect`
  to outrank `.grid + .grid`'s one-unit gap.
  - Rules that **survive** are the ones that own something they touch: a `.frow` top rule
    opens its fact, an `.entry`'s opens its row, `.colo-rule` closes the page. The
    full-width `.rule` survives for `writing/*` only, where it pairs with a numbered
    section's set figure — **and it lives in `Explainer.astro`, not `global.css`.** The
    declaration sat in both for a while, and the `global.css` copy selected nothing: the
    explainers never load that file. Edit the one in `Explainer.astro`.
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
  `.smark`) and the **right edge of column 9** at x=959 (prose column, ledger value, clip
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
    `.c1-12` above the split, so the columns arrive as halves of one thing. (It was `.c1-8`
    before the split; inside a 700px feed the two are the same edge, and `.c1-12` is one of
    the three spans that still exist.)
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
  Collapses to a stack `≤900px` — written `.matrix.mscatter`, **two classes**, because a
  later `.matrix{display:grid}` outranks a one-class rule at equal specificity (this is the
  cascade trap from the split; it shipped four clips at 153/123/123/123px on a phone).
  `.mscatter` is **not** a `.grid`, so the block after it needs an explicit top margin — the
  `.grid + .grid` rule won't reach it. Inside the feed it stacks at every width (see The
  split).
- **Photo gallery** (`.g-rag`): **two ragged column-flows** (`.col-l` c1–6, `.col-r`
  c7–12 dropped `3 × --unit`), not a 2-up grid. Independent flows mean each photograph is
  just the next one down, rather than half of a forced comparison pair. One column
  `≤720px`, with the drop removed (it would leave a 72px hole at the top of the stack) —
  by spanning both children `1 / 13`, so it stays `display:grid` there. Inside the feed it
  is one flow at every width (see The split).
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
- **The locked row + its gate** (`.entry .lockc`, `.egaterow` / `.egate`, `.f`): the site's
  only form, and the only row that opens. A gated entry keeps the index row exactly as it is
  and adds **two** signals, because neither an icon nor a colour is ever allowed to be the
  only one: a small lock in the arrow's slot at the title (`.lockc`, ink → accent when open,
  `aria-hidden`) and the word `Password` as a third line in the marker cell. Clicking the row
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
- Cursor → a filled dot SVG data-URI in `--design`; it's the `--cursor` token, so it flips
  with the scheme. It is deliberately **not** kept in sync with the mark: the design half of
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
   Don't ask a persona to *eyeball* dead CSS — **measure** it: extract every class token from
   `class="…"` across `dist/**/*.html`, extract every class in every selector, and diff.
   Scope the two stylesheets SEPARATELY: `global.css` is loaded only by `Layout.astro`'s 14
   pages, and the three `/writing/` explainers carry their own `is:global` block in
   `Explainer.astro`. Pooling them reports a selector as live because the *other* stylesheet's
   pages use that class — which is exactly how `.rule` sat dead in `global.css` while the
   explainers drew their own copy. Allow for the handful of classes JS adds at runtime
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
