# Brief: apply "claim + evidence" to the rest of the site

Paste-ready handoff. Everything below is decided — this is implementation, not design
exploration. Read `STYLE.md` before touching anything visual; it still governs.

## The thesis (already live on the index)

> Andrew Shiau is a frontend engineer who designs and builds, chasing simplicity.
> Taste finds the simplest form, engineering proves the simplest solution.

This is `.statement` + `.thesis` — **one continuous block** in a single `.grid` in
`src/pages/index.astro`: the name-sentence in `--ink`, then the design clause and the
build clause running on in their duality hues. Don't reword it — it's the root of a
separate spec (`method/method.md`) and the two must match. Don't split it into two
`.grid`s either; that inserts a `--unit` gap and breaks it into two statements.

Consequence for the site: **every project page states its claim and its evidence.**
Not as prose buried mid-page — as two fixed, labelled fields.

## The pattern (done once, copy it)

See `src/pages/work/powerpoint.astro`, the second `.facts` block, right after the
Role/Tools/Span facts:

```astro
<!-- Claim + evidence — the two fixed fields every project page carries.
     Simplest form = what got removed. Proof = the measurement that made it real. -->
<div class="grid">
  <div class="facts" style="margin-top:var(--unit)">
    <div class="frow">
      <div class="fm">Simplest form</div>
      <div class="ftx">Removed the add-pen button and folded the eraser into the toolbox as just another pen — <b>fewer tools, not more options</b>.</div>
    </div>
    <div class="frow">
      <div class="fm">Proof</div>
      <div class="ftx">An <b>A/B test against the plain dropdown</b>, everything else held constant. The ribbon's benefit was too marginal to justify the engineering.</div>
    </div>
  </div>
</div>
```

Rules for the two fields:

1. **Simplest form = what got REMOVED.** A step, a file, a person in the loop, a
   concept the user no longer has to hold. Not "what got added." If nothing was
   removed, the field is wrong or the project doesn't fit — say so, don't fudge it.
2. **Proof = the measurement or the looking that made it real.** An A/B, a user test, a
   live-deployment verification, a side-by-side render. Name the instrument and what it
   held constant. "It shipped" is not a proof. "Users liked it" is not a proof.
3. **Two facts, not three.** `.frow` is a 3-across grid; two cells leave column 9–12
   empty on purpose. That's the composition, not a gap to fill.
4. **One `<b>` per field, maximum**, on the phrase that carries the claim.
5. Keep each field to ~2 lines at desktop width. If it needs more, the claim isn't
   sharp yet.

## Pages to do (6 remaining)

Work: `stores-designer`, `luthier`. Experiments: `recipes`, `aping`, `explain`,
`proofs`, `photography`.

Notes on the hard ones:

- **stores-designer** — the one that strains the thesis. The simplification is *many
  teams stop reinventing the same components*; the consistent path becomes the easy
  path. Proof must stay high-level — production Amazon work, no internal detail (the
  page already carries that caveat; keep it).
- **photography** — may legitimately have no claim/evidence pair. If so, **skip it**
  and leave a one-line comment saying why. A forced field is worse than an absent one.
- **proofs / explain** — these are the thesis in tool form (render every option in the
  real system; quiz the comprehension). Don't restate the thesis in the field; state
  what the specific skill removes and what it checks.

## Also decided

Rename the **"Experiments"** section heading to **"Method"** (`src/pages/index.astro`,
and `src/data/experiments.ts` comments). Those five entries are the practice itself, not
side projects. Leave the exported const name `experiments` alone — renaming the symbol
touches every import for no reader benefit.

## Verify before calling it done

Non-negotiable, from `CLAUDE.md`:

1. `npm run build` — on the devbox. **Never** a dev server on the devbox; `npm run dev`
   is Mac-only.
2. `grep` the built `dist/` HTML for the exact copy you added. A green build does not
   mean the change is present.
3. Check grid classes exist in `src/styles/global.css` before using them. `.c1-7` does
   **not** exist — using it silently collapses the element to one 1/12 column. (That
   happened on the index thesis paragraph; it's `.c1-8` now.)
4. Eyeball light **and** dark, plus phone width (<480px). Two live bugs shipped
   clean-built. A third — a paired `h2` breaking mid-word ("Engineerin/g") — was caught
   only in the dark screenshot, by measuring the column against the rendered text.

Copy voice: dry, direct, understated. No preamble, no intensifiers, nothing that reads
like a LinkedIn post. `STYLE.md` § Voice & tone is the spec.
