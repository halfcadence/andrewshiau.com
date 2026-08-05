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
    ['the page words', '.pgword'],
    ['the reduced-motion block', 'prefers-reduced-motion'],
  ])('keeps %s (%s)', (_label, needle) => {
    expect(css).toContain(needle);
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
  ])('keeps the declaration that carries %s (%s)', (_label, decl) => {
    expect(css).toContain(decl);
  });
});
