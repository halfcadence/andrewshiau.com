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
boxes**, and **one rationed signal-red accent.** Hierarchy is size + weight + position,
never a second colour. Light is default; dark follows `prefers-color-scheme`.

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
| `--accent` | `#d5241a` | `#ff4d3f` | signal red — **structural only** (see below) |
| `--on-accent` | `#ffffff` | `#ffffff` | text on a red field |

- There is **exactly one accent hue.** Red appears in ~5 sanctioned roles and nowhere
  else: the first/lead top-rule of a group, a big set number (`.sn`/`.en`), the one
  filled `.block`, the correct-answer quiz state, and link interaction (see Link system).
  A second hue, or red used decoratively, is a slop finding — reject it.
- The accent is the **same hue** in both modes; only the base tones invert. Don't
  invert or recolour red in dark.

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
  - `25 / 31` → `h2`, entry headings (`clamp(20–28)`)
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
  (`.mark`, 0.5s), headline "— lately with AI." resolving from `--faint` to `--ink` on
  `h1:hover` (0.45s). Reduce, don't add, unless it earns its place.
- Respect `prefers-reduced-motion` for any new non-essential animation.

---

## Link system

Three kinds of link, three treatments. This is deliberate — do not collapse them.

1. **Inline prose links** (`p a`): ink text + red underline by default → **invert-fill**
   on hover (red box, white text) via a simple `background-color`/`color` fade on
   `--dur`. **No wipe.** Scoped to `p a` so it does NOT leak into nav, colophon, or
   project links.
2. **Project / gallery links** (`.links a`): red arrow (`.arrowc`) **slides right 6px**
   on hover (`--dur-fast`); the invert-fill is explicitly reset here. Markup includes
   `<span class="arrowc">→</span>` (or `↗` for external).
3. **Utility / colophon links** (`.colo a`): red text, a **hairline underline appears**
   on hover (`border-bottom` transparent → accent, `--dur-fast`). Quiet.

The bare `a` default is red text + underline-offset — a fallback for links that are
none of the above (e.g. figcaption, back-links have their own rules).

---

## Layout blocks

The composition primitives, chosen from the base-blocks + link-style choosers:

- **Experiment matrix** (`.matrix` / `.entry` / `.pos-01…04`): a **calendar-scatter** —
  four cells dropped into non-adjacent grid modules; the empty modules between them are
  the composition. Each cell opened by a top rule, never a card. Collapses to a stack
  `≤900px`.
- **Facts — F1** (`.facts` / `.frow`): three across on the grid, label-on-top, opened by
  a top rule (`3n+1`→cols 1–4, `3n+2`→5–8, `3n+3`→9–12). Used for objective info.
- **Links — L2** (`.links a`): a **diagonal staircase** — each link steps down-and-right
  (`3n+1`→1–6, `3n+2`→5–10 + 1 unit down, `3n+3`→8–13 + 2 units down). A gallery you
  navigate; echoes the matrix scatter.
- **Colophon** (`.colo`): grid-placed facts (label column + satellites 5–13), not a
  stacked list. Right columns stay intentionally empty.
- **The one filled form:** `.block` (red field, `--on-accent` text) — used once per page
  for the key statement. Everything else is type + rule. Do not add filled cards.
- **Structure is rules, not boxes.** A wrap-around hairline border to make a "card" is
  the un-Swiss tell — use a top rule + gutter + whitespace instead.

---

## Easter eggs (rationed delights)

Kept because they're subtle and on-system. Don't add more without reason.

- `::selection` → pure invert (`--ink` bg, `--paper` text).
- Cursor → a red-dot SVG data-URI (the logo's dot as the pointer).
- Logo (`.mark`) → 90° rotate on hover.
- Headline `.lately` clause → resolves from `--faint` to `--ink` on hover.
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
