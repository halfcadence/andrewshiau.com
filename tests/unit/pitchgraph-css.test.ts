import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// WHY THIS FILE EXISTS — the same reason `practice-room-css.test.ts` does, and the reason is
// a failure this project has now shipped THREE times on that page: a stray `*/` inside a CSS
// comment. Astro/lightningcss consume the orphaned token together with the NEXT RULE and drop
// just that rule, so the build says "Complete!", the sheet is still ~12kB, still
// brace-balanced, still comment-free — and one block is silently gone. A green build is not a
// correct change (CLAUDE.md rule 2).
//
// /pitchgraph/ now carries the same density of comment-above-rule that made the room
// vulnerable, so it gets the same canary. What this file adds beyond the room's copy:
//
//   · THE BOX ARITHMETIC AS ARITHMETIC. `border + padding` must be a whole 9px character or
//     the box's rule and its ink cannot both land on the ladder — the 17-not-18 finding, which
//     was reported wrong by exactly one border once already.
//   · THE PARITY THE HARNESS CANNOT SEE UNTIL A BROWSER RUNS. `tools/verify-pitchgraph-parity.mjs`
//     is the real instrument for room-vs-tool drift, but it needs a preview server; these are
//     the claims cheap enough to assert on the built sheet in `npm test`.
//
// It asserts on the BUILT artifact, not the source: the whole point is that the source looked
// fine. Run `npm run build` first; if dist/ is missing the test says so rather than passing
// vacuously.

const DIST = join(process.cwd(), 'dist');

// THIS PAGE'S OWN CSS, not the site's. The page loads `Layout.*.css` (global.css plus
// Tailwind's preflight, which legitimately carries a `/*! … MIT License … */` banner) and its
// own scoped chunk. Only the second is under test — a blanket "no comment tokens survive"
// check against both is a false positive, which is how the room's version of this first failed.
// Astro's scope hash is the marker that tells them apart.
function pitchgraphCss(): string {
  const page = join(DIST, 'pitchgraph', 'index.html');
  let html: string;
  try {
    html = readFileSync(page, 'utf8');
  } catch {
    throw new Error('dist/pitchgraph/index.html is missing — run `npm run build` first');
  }
  const parts: string[] = [];
  for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    if (m[1].includes('data-astro-cid-')) parts.push(m[1]);
  }
  for (const m of html.matchAll(/<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)"/g)) {
    const text = readFileSync(join(DIST, m[1].replace(/^\//, '')), 'utf8');
    if (text.includes('data-astro-cid-')) parts.push(text);
  }
  if (!parts.length) {
    throw new Error("no scoped stylesheet found for /pitchgraph/ — the page's own CSS is missing entirely");
  }
  return parts.join('\n');
}

describe('/pitchgraph/ ships the stylesheet it was written with', () => {
  const css = pitchgraphCss();

  // ── the parse-truncation canary ────────────────────────────────────────────
  // Each of these is the FIRST DECLARATION of a rule that sits immediately after a long
  // comment — the position where this failure lands — and they are in source order, so the
  // set localises the break rather than merely reporting one.
  it.each([
    ['the screen snaps to the leading', 'round(down'],
    ['the row ladder', 'case-top'],
    ['the case inherits it', 'grid-template-rows:subgrid'],
    ['the spec row', 'grid-row:spec'],
    ['the group box', '--pg-box-pad'],
    ['the notch', '.pg-gl'],
    ['the scrub handle', '.pg-hd'],
    ['the figure', 'grid-row:figure'],
    ['the reading row', 'grid-row:read'],
    ['the record row', 'grid-row:panels'],
    ['the switch', '.pg-fld'],
    ['the reduced-motion block', 'prefers-reduced-motion'],
    // THE MEDIA QUERIES ARE MATCHED AS THEY SHIP, NOT AS THEY ARE WRITTEN. lightningcss
    // rewrites `(max-width: 1001px)` to the modern range syntax `(width<=1001px)`, so the
    // source spelling is absent from the built sheet and asserting it failed here on correct
    // code. The room's suite recorded the same class of mistake for `.5px` against `0.5px`:
    // a test that reads the BUILT artifact has to be written in the built artifact's dialect.
    ['the phone', '1001px'],
    ['the short screen', '640px'],
  ])('keeps %s (%s)', (_label, needle) => {
    expect(css).toContain(needle);
  });

  // ── THE BOX'S RULE AND ITS INK BOTH LAND ON THE CHARACTER CELL ─────────────
  // ink = rule + border + padding, so `border + padding` has to be a multiple of 1ch (9px).
  // With a 1px border that means padding 8, 17 or 26 — NOT 18. "18" was shipped as the answer
  // in a proof sheet on the room and was wrong by exactly the border, which put the ink on
  // 3.111ch. Asserted as the RELATIONSHIP so a future 8/9 or 26/27 still passes.
  it('the group box pads and pulls back by a whole character plus its border', () => {
    const pad = css.match(/--pg-box-pad:\s*(\d+)px/);
    const pull = css.match(/--pg-box-pull:\s*(\d+)px/);
    expect(pad, 'the box states its side padding as a token').toBeTruthy();
    expect(pull, 'the box states its pull-back as a token').toBeTruthy();
    const p = +pad![1], m = +pull![1];
    expect(m, `the pull-back (${m}) must be the padding (${p}) plus the 1px border`).toBe(p + 1);
    expect((p + 1) % 9, `border + padding = ${p + 1}px is not a whole 9px character`).toBe(0);
  });

  // THE BOX'S CHROME IS A WHOLE LEAD, which is what lets a boxed row sit on the baseline grid:
  // 18 top + 8 bottom + 2 borders = 28. The room's sheet used 20/10 = 32, which is not a
  // multiple of 28, and a boxed row then could not land on a lead.
  it("the box's chrome is one whole lead", () => {
    const m = css.match(/padding:(\d+)px var\(--pg-box-pad\) (\d+)px/);
    expect(m, 'the box states its vertical padding beside the token').toBeTruthy();
    expect(+m![1] + +m![2] + 2, 'top + bottom + two 1px borders must be one 28px lead').toBe(28);
  });

  // ── THE TRANSPORT IS THE ROOM'S CURRENT CONTROL ────────────────────────────
  // Treatment 05 is ONE MARK: no word, so no width reservation and none of the apparatus that
  // existed to centre a word beside a track. This is the check that makes reverting to the old
  // control a visible failure rather than a quiet divergence — which is exactly what happened
  // between this page and the room over the first week of August.
  it('carries no word and none of the old two-mark apparatus', () => {
    expect(css, 'treatment 05 has no label to reserve width for').not.toContain('--w');
    expect(css, 'the track is not positioned outside the button any more')
      .not.toMatch(/\.pg-tk\{[^}]*position:absolute/);
    expect(css, 'the two-pocket track is gone with the word').not.toContain('.pg-run');
  });

  // The switch's ink is 32×16 (the 1.45× size chooser practice-room-control-size picked), and
  // its 44px target comes from padding plus a matching negative margin — never from a
  // min-height, which would re-inflate the 28px row it shares with the reading.
  // ASSERTED AS THREE DECLARATIONS, not as one literal rule: lightningcss reorders within a
  // rule (it ships `min-height:0;margin:-14px -6px;padding:14px 6px`) and stamps the scope
  // attribute into every compound selector, so a source-spelling regex fails on a correct
  // sheet — which is exactly what it did on the first run of this file.
  it('states the switch target as padding pulled back, not as a height', () => {
    const rule = (css.match(/\.pg-cap[^{]*\.pg-latch\{[^}]*\}/) || [])[0];
    expect(rule, 'the transport must state its own target').toBeTruthy();
    expect(rule, 'the height must come from the padding, not a min-height').toContain('min-height:0');
    expect(rule).toContain('padding:14px 6px');
    // The pull-back is what keeps the 44px target out of the 28px row it shares with the
    // reading — without it the row inflates and the reading's baseline moves 21.50px.
    expect(rule).toContain('margin:-14px -6px');
  });

  // ── THE LADDER PLACES EVERY ROW IT DECLARES, AND DECLARES EVERY ROW IT PLACES.
  // A row nothing occupies is 28px of dead air pretending to be structure (the room deleted
  // `[transport]` for exactly this), and a child with no `grid-row` lands in the next
  // available track — which on the room put a wrapping control group on top of the spec row,
  // where it intercepted every click on the control beside it.
  it('places every ladder row explicitly, and names no row it does not place', () => {
    const declared = [...css.matchAll(/\[([a-z-]+)\]/g)].map((m) => m[1]);
    const placed = [...css.matchAll(/grid-row:([a-z-]+)/g)].map((m) => m[1]);
    for (const row of ['spec', 'figure', 'read', 'panels', 'hint']) {
      expect(declared, `${row} must be a row of the ladder`).toContain(row);
      expect(placed, `${row} must have something placed on it`).toContain(row);
    }
    // the room's dead-row lesson, as a guard: no `foot` row here, because nothing fills one
    expect(declared, 'this page has no foot row — nothing would sit on it').not.toContain('foot');
    expect(css, 'and nothing may claim one').not.toContain('grid-row:foot');
  });

  // ── THE ⌥G OVERLAY DRAWS DISCRETE DATUMS, NEVER A GRID ─────────────────────
  // The room's "i thought we chose just a few datums, i see like 25 cols" report, as a
  // property. A sentinel per datum was red-cased on that page and FAILED to catch a re-added
  // column grid, because the sentinels were all still present alongside it — so the check is
  // the COUNT and an outright ban on repeats.
  it('draws exactly three datums — the axis, the box rules, the top line', () => {
    const repeats = css.match(/repeating-linear-gradient\([^)]*/g) || [];
    expect(repeats, `the overlay must not repeat on either axis: ${repeats.join(' | ')}`).toEqual([]);
    const rules = (css.match(/\.pg-case[^{]*::?after\{[^}]*\}/g) || [])
      .filter((r) => /background:/.test(r));
    expect(rules.length, 'exactly one rule draws the overlay').toBe(1);
    expect((rules[0].match(/linear-gradient/g) || []).length,
      'three marks: the axis, the box-rule pair, and the top datum').toBe(3);
    // THE DATUM IS DERIVED FROM THE BOX'S OWN TOKENS, never a hand-typed 9px — that derivation
    // is what stops the guide drifting from the rule it names.
    expect(rules[0], 'the box-rule datum is derived from --pg-inset and --pg-box-pull')
      .toMatch(/--pg-datum:\s*calc\(var\(--pg-inset\)\s*-\s*var\(--pg-box-pull\)\)/);
    // and the top datum is read from the token the ladder states the row with, so the line and
    // the row cannot disagree — the room drew its line a whole lead wrong for two days when
    // this was hardcoded.
    expect(rules[0], "the top datum sits at case-top, the box's top rule")
      .toMatch(/calc\(var\(--pg-case-top\)\s*-\s*1px\)/);
    // NO z-index, and it is load-bearing: it is what lets the notch's paper knock the top line
    // out where it crosses the word `calibration`.
    expect(rules[0], 'a z-index would paint the line over the notch it should duck behind')
      .not.toMatch(/z-index/);
  });

  // ── EVERY RULE FOR RUNTIME-BUILT MARKUP IS GLOBAL ──────────────────────────
  // THE ONE DEFECT IN THIS PASS THAT HAD ALREADY REACHED PRODUCTION. A panel is built with
  // `createElement` in the page's script, so it never carries the `data-astro-cid` attribute
  // Astro compiles a scoped selector against — and `.pg-panel`'s rules were in the scoped block,
  // where every one of them was inert. Measured on the live page: `borderLeft: 0px,
  // padding: 0px, minWidth: auto, display: block`. The record row had been drawing its readings
  // with no divider between them since the day it shipped.
  // It survived because it changes no number any test asserted and the row still reads as a row
  // of small figures — `flex:none` plus the parent's `gap:1px` is enough to keep them in order.
  // What was missing is the hairline that separates one reading from the next.
  // ASSERTED ON THE SELECTOR'S COMPILED FORM, which is the only place the bug is visible: a
  // scoped `.pg-panel` ships as `.pg-panel[data-astro-cid-…]`, and an attribute selector on
  // this class is therefore proof the rule cannot match. The page's own comments state the rule
  // ("markup this page creates in JS needs its CSS in the is:global chunk") twice and both
  // times the panel's box was left behind — so it moves from a comment to a check.
  it('styles the runtime-built panels from the global block, not the scoped one', () => {
    const scoped = css.match(/\.pg-panel\[data-astro-cid-[^\]]+\]/g) || [];
    expect(scoped,
      `these .pg-panel rules are scoped and can never match markup built in JS: ${scoped.join(' | ')}`)
      .toEqual([]);
    // and the rules are actually present, unscoped — otherwise "no scoped rules" would pass
    // vacuously on a page that had simply deleted them.
    expect(css, 'the divider between two readings').toMatch(/\.pg-panel\{[^}]*border-left/);
    expect(css, "the panel's figure height").toMatch(/\.pg-panel svg\{/);
  });

  // The same trap, for the two families the page already got right — so a future edit that
  // "tidies" them into the scoped block fails here rather than in a screenshot nobody takes.
  it('keeps the SVG marks and the panel screen-reader text global too', () => {
    for (const sel of ['.pg-trace', '.pg-ptrace', '.pg-pname', '.pg-sr']) {
      const scoped = css.match(new RegExp(`\\${sel}\\[data-astro-cid-[^\\]]+\\]`, 'g')) || [];
      expect(scoped, `${sel} is built at runtime and must not be scoped`).toEqual([]);
    }
  });

  // THE SITE'S SINGLE TYPE SIZE HOLDS HERE. The room's one sanctioned break is the drone's
  // 72px letter, which is a figure made of a glyph; this page has no such figure, so the only
  // px sizes it may state are the SVG label sizes in the global block (11px) and the field's
  // iOS-safe 16px, which lives in global.css rather than here.
  it('sets no display type size of its own', () => {
    const sizes = [...css.matchAll(/font-size:\s*(\d+)px/g)].map((m) => +m[1]);
    const oversize = sizes.filter((s) => s > 16);
    expect(oversize, `no display size belongs on this page: ${oversize.join(', ')}`).toEqual([]);
  });

  // ── the sheet is whole ─────────────────────────────────────────────────────
  it('has balanced braces and no comment tokens left in the output', () => {
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    expect(closes, `unbalanced braces: ${opens} { vs ${closes} }`).toBe(opens);
    expect(css).not.toContain('*/');
  });

  it('is big enough to be the whole sheet', () => {
    // A floor, not a target — it only has to be unmistakably above a truncation.
    expect(css.length).toBeGreaterThan(4000);
  });

  // ── THE CAUSE, IN THE SOURCE, so a fourth stray `*/` fails before a build is produced.
  // The built sheet cannot answer this: lightningcss strips comments entirely, so by the time
  // the CSS is minified the only trace is a rule that silently is not there.
  it('has balanced CSS comments in the source, per style block', () => {
    const src = readFileSync(join(process.cwd(), 'src/pages/pitchgraph.astro'), 'utf8');
    const blocks = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    expect(blocks.length, 'expected at least one <style> block').toBeGreaterThan(0);

    blocks.forEach((block, i) => {
      let depth = 0;
      let k = 0;
      const problems: string[] = [];
      while (k < block.length - 1) {
        const two = block.slice(k, k + 2);
        if (two === '/*') {
          // A nested opener is also a bug: `/* … /* … */` closes early and leaves the tail as
          // CSS content — the same failure wearing a different hat.
          if (depth > 0) problems.push(`nested /* at line ${block.slice(0, k).split('\n').length}`);
          depth++; k += 2; continue;
        }
        if (two === '*/') {
          if (depth === 0) problems.push(`orphan */ at line ${block.slice(0, k).split('\n').length}`);
          else depth--;
          k += 2; continue;
        }
        k++;
      }
      if (depth > 0) problems.push('unterminated /* at end of block');
      expect(problems, `style block ${i + 1}: ${problems.join(', ')}`).toEqual([]);
    });
  });
});
