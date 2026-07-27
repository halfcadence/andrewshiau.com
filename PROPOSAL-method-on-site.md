# Proposal — putting the method on the site

**Chooser (open this first):**
`file:///Volumes/workplace/work/understand/andrewshiau-method-placement/index.html`
Four decisions, every option rendered in the real tokens. Pick a number per section.

---

## The recommendation in one line

Two changes, not one: a **one-line pointer on the thesis block** at the top, and a
**Method section after Experiments** that links to a `/method/` page. Nothing gets an
expander.

---

## Why the method is not a case study

Every other thing on the index is an artifact: a tool, a widget, a skill, a set of
photographs. The method is not an artifact of the same kind — it is the **operating
manual the artifacts came out of**, and the site already carries its headline sentence
as the thesis under the h1. That sentence *is* `method.md`'s second sentence, verbatim.

So the honest structure is not "a fourth experiment." It's:

```
thesis          the claim                (already live)
Work            evidence
Experiments     evidence
Method          the procedures that produced both   ← new
```

Claim → evidence → method. Putting Method *above* Work would be claim, claim, evidence:
two paragraphs of assertion before a single thing shipped. Putting it *after* the work
means a reader who is already interested finds it exactly when they want it.

The one thing missing from that order is a way in from the top, which is what the
pointer line buys — one sentence and a link, no new section, no vertical cost.

## The expander is the one option the method forbids

You floated an expander. The method's own first shared rule:

> **Simplify by removal, not by hiding.** The win is the thing that's gone — a step, a
> file, a person in the loop — not a thing tucked behind a disclosure triangle.

A `<details>` on the home page would be the site contradicting its spec on the same
screen as the spec's headline. It's in the chooser as option 06 so you can see it, and
it's rendered honestly, but I'd cut it.

If the concern behind the expander was vertical space, the pointer line solves that at
one line instead of a widget.

## Four decisions

| # | decision | options | my pick |
|---|---|---|---|
| 1 | Where it appears on the index | 7 | **02 + 05** (pointer line at top, section last) |
| 2 | Shape of the `/method/` page | 4 | **02** two-column spec — the page's shape states the duality |
| 3 | Section label + dek copy | 4 | **02** "Method" / "The thesis above, written as procedures an agent can run." |
| 4 | Single source of truth | 3 | **03** assert, don't duplicate |

### Decision 4 is the one with a real engineering answer

The page will restate things `method/method.md` says. Two copies of a claim drift. Three
mechanisms:

1. **Hand-write the page, hope.** Cheapest, and the README's "these two strings must
   match" becomes a comment nobody runs.
2. **Render the markdown at build time** (`?raw` + a markdown renderer). Zero drift, but
   it puts an agent-facing spec in front of a human reader — wrong audience — and adds a
   dependency.
3. **Hand-write the page, assert the shared sentence at build time.** The page is edited
   copy for a reader; a build-time check fails the build if the thesis sentence is no
   longer present in `method/method.md`. Derive it or assert it — this asserts it.

Option 3, roughly ten lines in the page's frontmatter:

```ts
import spec from '../../method/method.md?raw';
const THESIS = 'Taste finds the simplest form; engineering proves the simplest solution.';
if (!spec.replace(/\s+/g, ' ').includes(THESIS)) {
  throw new Error('method.md no longer contains the thesis sentence the site quotes');
}
```

The same assertion belongs on `index.astro`, where the thesis actually renders.

## Scope

**In:** the index placement, a `/method/` page, the copy, the drift assertion.

**Out, on purpose:**

- The Experiments→Method *rename* of the existing section — that's in
  `BRIEF-claim-and-evidence.md` and belongs to the other agent's pass. Note the naming
  collision: if that section gets renamed to "Method", this new section needs a
  different word. Worth settling before either lands.
- The six remaining case-study pages' claim+evidence fields — same brief, same agent.
- Adding a `side` marker to the Method entry if it lands in a matrix. It would be
  `both`, and `sideOf()` throws on an href it doesn't know, so `experiments.ts` has to
  be edited in the same diff.

## Traps the chooser hides

The chooser defines its own copies of the grid helpers so it can stand alone. Three of
them do **not** exist in `src/styles/global.css`, and reaching for them in a real page
silently collapses the element to one 1/12 column (the `.c1-7` bug again):

1. **`.c1-4`** — not a class. `index.astro` writes `style="grid-column:1 / 5"` inline for
   its section heads. Match that.
2. **`.colo.c4`** — the colophon defines `c1`–`c3` only. Placement option 07 needs a new
   one, and the fourth column is currently empty on purpose.
3. **`.ptr` and `.duo`** — new primitives, not in `global.css`. If either lands it needs
   a `STYLE.md` entry under *Layout blocks* with the reason, like every other block has.

Fourth, not a CSS trap: if the Method entry lands in a matrix (placement 03), `sideOf()`
throws on an href it doesn't know, so `experiments.ts` has to change in the same diff.

## Cost

Roughly an hour: the pointer line and the section are small edits to `index.astro`; the
`/method/` page is one new file on existing primitives (no new CSS if decision 2 is
option 01 or 03; option 02 needs one small two-column block, ~12 lines). Then build,
check dark and phone width, deploy, and fetch the live page to confirm.

## Next action

Open the chooser and give me four numbers.
