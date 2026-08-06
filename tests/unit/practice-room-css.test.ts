import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// WHY THIS FILE EXISTS. A stray `*/` inside a CSS comment shipped TWICE during the grid
// pass, and both times the build said "Complete!" and the page rendered — just without
// most of its stylesheet. Astro/lightningcss truncate at the parse error and emit no
// warning, so the failure mode is "the build is green and the layout is gone". A green
// build is not a correct change (CLAUDE.md rule 2), and this is the check that makes the
// difference visible before the deploy rather than after.
//
// It asserts on the BUILT artifact, not the source: the whole point is that the source
// looked fine. Run `npm run build` first; if dist/ is missing the test says so rather
// than passing vacuously (a skipped assertion reporting green is the bug this replaces).

const DIST = join(process.cwd(), 'dist');

// THIS PAGE'S OWN CSS, and not the site's. The page loads two sheets — `Layout.*.css`,
// which is `global.css` plus Tailwind's preflight, and `practice-room.*.css`, which is this
// page's scoped block. Only the second is under test: the first legitimately carries
// Tailwind's `/*! … MIT License … */` banner, so a blanket "no comment tokens survive"
// check against both is a false positive (it fired on the first run — the assertion was
// measuring the wrong document).
// Astro's scope hash is the marker that tells them apart, and it is also the thing that
// makes the check robust to Astro changing where it puts the CSS: whichever file or
// <style> carries `data-astro-cid-`, that is the page's block.
function practiceRoomCss(): string {
  const page = join(DIST, 'practice-room', 'index.html');
  let html: string;
  try {
    html = readFileSync(page, 'utf8');
  } catch {
    throw new Error(`dist/practice-room/index.html is missing — run \`npm run build\` first`);
  }
  const parts: string[] = [];
  // inlined (Astro does this when the chunk is small — which is what happened WHILE the
  // sheet was truncated, so this branch must stay covered)
  for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    if (m[1].includes('data-astro-cid-')) parts.push(m[1]);
  }
  // or an external chunk
  for (const m of html.matchAll(/<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)"/g)) {
    const text = readFileSync(join(DIST, m[1].replace(/^\//, '')), 'utf8');
    if (text.includes('data-astro-cid-')) parts.push(text);
  }
  if (!parts.length) {
    throw new Error("no scoped stylesheet found for /practice-room/ — the page's own CSS is missing entirely");
  }
  return parts.join('\n');
}

describe('/practice-room/ ships the stylesheet it was written with', () => {
  const css = practiceRoomCss();

  // ── the parse-truncation canary ────────────────────────────────────────────
  // Every one of these is a declaration from a DIFFERENT part of the page's <style>
  // block, in source order. A truncated sheet keeps the early ones and loses the rest,
  // so the set is what localises the break — a single sentinel at the top would have
  // passed on both occasions this actually broke.
  it.each([
    ['the row ladder', 'case-top'],
    ['both cases subgrid onto it', 'subgrid'],
    ['the transport row (the reported defect)', 'grid-row:transport'],
    ['the accent mark reservation', '.rm-accbtn'],
    ['the meter digits', '.rbtn'],
    ['the track grammar', '.tbtn'],
    ['the scrub handles', '.mt-hd'],
    ['the drone case', '.mt-drone'],
    ["the drone's figure — its note letter", '.mt-dnote'],
    ['the page words', '.pgword'],
    ['the reduced-motion block', 'prefers-reduced-motion'],
  ])('keeps %s (%s)', (_label, needle) => {
    expect(css).toContain(needle);
  });

  // ── THE THIRD CASE (chooser metrotuner-drone-box, Q1/02 + Q2/05) ───────────
  it('lays the room out as two equal cases plus the narrow third', () => {
    // The pick is "the narrow third": the drone gets the width a letter and a verb need
    // and no more, so the two worked instruments keep theirs. A future edit back to
    // `repeat(3, minmax(0,1fr))` would be a different pick, silently.
    expect(css).toContain('--mt-drone-w');
    expect(css).toMatch(/grid-template-columns:minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)\s+var\(--mt-drone-w\)/);
    expect(css, 'three equal columns is a different pick').not.toMatch(/repeat\(3,\s*minmax/);
  });

  it('gives the phone three snap pages', () => {
    expect(css).toMatch(/repeat\(3,\s*100%\)/);
    expect(css, 'the two-page scroller is gone').not.toMatch(/repeat\(2,\s*100%\)/);
  });

  // The one deliberate break of the site's single type size, and the only one on this
  // screen: the drone's figure is a glyph doing a drawing's job. Pinned so it cannot drift
  // into a second display size — and so deleting the figure's size is a visible change.
  it("states the drone letter's size once, as the figure it is", () => {
    const sizes = css.match(/font-size:\s*\d+px/g) || [];
    expect(sizes, `only the drone letter may set a px size: ${sizes.join(' | ')}`)
      .toEqual(['font-size:72px']);
  });

  // ── the alignment contract, as declarations ────────────────────────────────
  it('places every ladder row explicitly', () => {
    for (const row of ['spec', 'figure', 'read', 'transport', 'foot', 'hint']) {
      expect(css, `grid-row:${row} must be placed`).toContain(`grid-row:${row}`);
    }
  });

  it('aligns the control rows to the row start, not centred', () => {
    // Centring rows of different heights in the same row is what put the two cases' type
    // 6.50px apart after the ladder landed; `start` plus per-control baselines is 0.00.
    expect(css).toMatch(/align-self:start/);
  });

  it('does not reintroduce the off-grid hint margin', () => {
    // `.mt-hintline{min-height:28px;margin-top:2px}` — the 2px was an off-grid margin of
    // exactly the kind STYLE.md forbids, and the reserved line is a ladder row now.
    expect(css).not.toMatch(/margin-top:2px/);
  });

  it('states the figure width in columns, not a fixed 320px', () => {
    expect(css).toContain('--mt-track');
    expect(css).not.toContain('min(320px,80vw)');
  });

  // ── THE OVERLAY MAY NOT DRAW A GRID. Found by the user, by looking: the ⌥G guide was
  // painting twelve tracks per case as a pair of hairlines each, plus twelve across the
  // screen — "i thought we chose just a few datums, i see like 25 cols". The horizontal
  // system is two datums, and a guide that draws a rejected column grid is an instrument
  // that lies about what the page is built on.
  // A sentinel per datum was NOT enough, red-cased: re-adding a repeating column gradient
  // left both datum sentinels present and the suite green. So this counts the marks instead.
  // AND THE ROW LADDER'S 32 LINES ARE GONE TOO (vertical datum pass), for the same reason on
  // the other axis: measured, the first `1fr` slack row resolves to a fraction and every line
  // below it is 9.06px off a lead, so 20 of the 32 could never be met. The overlay now draws
  // FOUR horizontal lines — top, the centre pair, bottom — and three vertical. Seven marks,
  // every one of them a datum something actually sits on.
  // So the rule is now absolute: NO repeating gradient anywhere in this sheet's overlay.
  it('the ⌥G overlay draws discrete datums, never a repeating grid', () => {
    const repeats = css.match(/repeating-linear-gradient\([^)]*/g) || [];
    expect(repeats, `the overlay must not repeat on either axis: ${repeats.join(' | ')}`)
      .toEqual([]);
  });

  // ── the sheet is whole ─────────────────────────────────────────────────────
  it('has balanced braces and no comment tokens left in the output', () => {
    const opens = (css.match(/\{/g) || []).length;
    const closes = (css.match(/\}/g) || []).length;
    expect(closes, `unbalanced braces: ${opens} { vs ${closes} }`).toBe(opens);
    // The page's own block carries no `/*!` banner, so any surviving comment token means
    // something was parsed as content rather than as a comment.
    expect(css).not.toContain('*/');
  });

  it('is big enough to be the whole sheet', () => {
    // The worst truncation seen measured 1453 bytes; the real sheet is ~12kB. A floor,
    // not a target — it only has to be unmistakably above the failure.
    expect(css.length).toBeGreaterThan(8000);
  });

  // ── THE DECLARATION-LEVEL CHECK, and why the byte-level ones are not enough.
  // The first version of this file asserted brace balance, "no `*/`", and a size floor,
  // then PASSED on a deliberately broken build — proof by red case that those three do
  // not catch this bug. What a stray `*/` actually does is narrower and quieter than
  // "the sheet truncates": lightningcss consumes the orphaned token together with the
  // NEXT RULE and drops just that rule, leaving a sheet that is still ~12kB, still
  // brace-balanced, still comment-free, and missing one block. Both real occurrences
  // took out exactly one rule — `.mt-half`'s box, then `.rm-accbtn`'s.
  // So the check has to be a declaration the lost rule uniquely contains. Each of these
  // is the first declaration of a rule that sits immediately after a long comment — the
  // position where this failure lands.
  it.each([
    ['.mt-half inherits the ladder', 'grid-template-rows:subgrid'],
    ['the accent mark holds its own space', 'top:-8px'],
    ['the meter digits keep their tap target', 'min-height:36px'],
    ['the figure is placed on the figure row', 'grid-row:figure'],
    ['the control rows align to the row start', 'align-self:start'],
    // ADDED after the THIRD occurrence, which this list missed. The ⌥G column overlay
    // shipped to production drawing nothing for a day: an orphaned `*/` in the comment
    // above `.mt-half::after` ate the whole rule, and every check above passed — the sheet
    // was 12kB, brace-balanced, comment-free, and the four declarations named above were
    // all present, because none of them lived in the rule that died.
    ['the figure spans six columns', '--mt-track'],
    // the VERTICAL datums, which replaced the 32-line ladder: two on `.mt-pages::before`
    // (top and bottom, grid-derived) and the centre pair on `.mt-mid::after`.
    ['the top/bottom vertical datums', 'calc(var(--lead) * 2 - 1px)'],
    ['the centre datum pair', 'calc(100% - var(--lead) - 1px)'],
    // THE TWO DATUMS. The ⌥G overlay used to paint twelve tracks per case as a pair of
    // hairlines each — 24 lines inside every case plus 12 across the screen, which is what
    // the reader saw as "like 25 cols". It draws three lines now: the axis at 50%, and one
    // inset a --lead inside each edge. These two sentinels are what a future edit would have
    // to keep, and they are declarations only this rule contains.
    // `.5px`, not `0.5px`: lightningcss strips the leading zero, and this test reads the
    // BUILT sheet. Asserting the source spelling failed here for exactly that reason.
    ['the axis datum', 'calc(50% - .5px)'],
    ['the inset datum', 'calc(100% - var(--lead))'],
  ])('keeps the declaration that carries %s (%s)', (_label, decl) => {
    expect(css).toContain(decl);
  });

  // ── THE CLASS, NOT THE INSTANCES. Three times now a stray `*/` has eaten a rule, and
  // three times the fix was to add that rule's declaration to the list above — which only
  // ever catches the failure that already shipped. This checks the CAUSE instead, in the
  // SOURCE, so a fourth one fails before a build is even produced.
  // Why the built sheet cannot answer it: lightningcss strips comments entirely, so by the
  // time the CSS is minified the evidence is gone — the only trace is a rule that silently
  // is not there. The source is where the imbalance is visible.
  it('has balanced CSS comments in the source, per style block', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(join(process.cwd(), 'src/pages/practice-room.astro'), 'utf8');
    const blocks = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    expect(blocks.length, 'expected at least one <style> block').toBeGreaterThan(0);

    blocks.forEach((block, i) => {
      let depth = 0;
      let k = 0;
      const problems: string[] = [];
      while (k < block.length - 1) {
        const two = block.slice(k, k + 2);
        if (two === '/*') {
          // A nested opener is also a bug: `/* … /* … */` closes early and leaves the tail
          // as CSS content, which is the same failure wearing a different hat.
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
