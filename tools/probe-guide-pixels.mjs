// PROBE — read the ⌥G guide from the PAINTED PIXELS, then measure the marks against it.
//
// WHY PIXELS. My first two probes RE-DERIVED the drawn lines from the same ladder arithmetic the
// CSS uses (`--lead * 2`, `inset: --group`). A probe that shares the CSS's premise cannot see a
// bug in that premise, and worse, it went on printing pre-fix numbers after the CSS changed —
// the stale-instrument failure this project has recorded three times. Parsing the resolved
// `background-image` string is only marginally better (Chrome leaves some `calc()` unresolved).
// The pixels are ground truth: whatever the reader sees at ⌥G is what this reads.
//
// METHOD: shoot the page twice at the same size — guide off, guide on — and diff. Every pixel
// that changed is guide ink. Collapse to rows and columns to get the drawn lines' positions,
// then compare to the marks' own geometry read from the DOM.
//
//   npx astro preview --host 127.0.0.1 --port 4321
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/ node tools/probe-guide-pixels.mjs
// `sharp` (already a dependency) decodes to raw RGBA — no pngjs needed.
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';
const WIDTHS = (process.env.WIDTHS || '1440,1024,390').split(',').map(Number);

const shoot = async (page, on) => {
  await page.evaluate((v) => {
    document.documentElement.classList.toggle('showgrid', v);
    document.body.classList.toggle('showgrid', v);
  }, on);
  await page.waitForTimeout(250);   // the overlay fades in
  const buf = await page.screenshot();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
};

const browser = await chromium.launch();
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('#mt-dial', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => {
    const g = document.querySelector('.mt-half[aria-label="Tuner"] .mt-gauge');
    return g && g.getBoundingClientRect().width > 10;
  }, null, { timeout: 15000 });
  await page.waitForTimeout(250);

  const off = await shoot(page, false);
  const on = await shoot(page, true);

  // diff → guide ink mask
  const W = off.width, H = off.height, C = off.channels;
  const rowHits = new Array(H).fill(0), colHits = new Array(W).fill(0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      const d = Math.abs(off.data[i] - on.data[i]) + Math.abs(off.data[i + 1] - on.data[i + 1])
        + Math.abs(off.data[i + 2] - on.data[i + 2]);
      if (d > 8) { rowHits[y]++; colHits[x]++; }
    }
  }
  // a DRAWN HORIZONTAL line = a row whose changed pixels span most of a case's width.
  // a DRAWN VERTICAL line = a column whose changed pixels span most of the case's height.
  const hLines = [];
  for (let y = 0; y < H; y++) if (rowHits[y] > W * 0.25) hLines.push(y);
  const vLines = [];
  for (let x = 0; x < W; x++) if (colHits[x] > H * 0.35) vLines.push(x);
  // collapse runs of adjacent indices to one line each
  const collapse = (a) => {
    const out = [];
    for (const v of a) {
      if (out.length && v - out[out.length - 1].end <= 1) out[out.length - 1].end = v;
      else out.push({ start: v, end: v });
    }
    return out.map((r) => (r.start + r.end) / 2);
  };
  const drawnH = collapse(hLines), drawnV = collapse(vLines);

  // ── the marks, from the DOM ────────────────────────────────────────────────
  const marks = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const bl = (sel) => {
      const el = q(sel); if (!el) return null;
      const s = document.createElement('span'); s.textContent = 'x';
      s.style.cssText = 'display:inline-block;width:0;overflow:hidden;font:inherit';
      el.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return +y.toFixed(2);
    };
    const midY = (sel) => { const e = q(sel); if (!e) return null;
      const b = e.getBoundingClientRect(); return b.height ? +(b.top + b.height / 2).toFixed(2) : null; };
    const glyphL = (el) => { if (!el) return null;
      const rg = document.createRange(); rg.selectNodeContents(el);
      const b = rg.getBoundingClientRect(); return b.width ? +b.left.toFixed(2) : null; };
    const tuner = q('.mt-half[aria-label="Tuner"]');
    return {
      H: {
        'the tuner’s plate glyph': glyphL(tuner.querySelector('.mt-plate')),
        'the tuner’s notch glyph': glyphL(tuner.querySelector('.mt-gl')),
        'the a4 control ink': glyphL(q('#mt-a4-scrub .mt-hd')),
      },
      V: {
        'a4 digits baseline': bl('#mt-a4-scrub .mt-hd'),
        'beats digits baseline': bl('#mt-beats-seg .rbtn'),
        'the tuner’s verb centre': midY('#mt-mic .rd'),
        'the reading baseline': bl('#mt-note'),
        'bpm baseline': bl('#mt-bpm-scrub .mt-lb'),
        'tap baseline': bl('#mt-tap .w'),
      },
    };
  });

  const near = (v, list) => {
    if (v == null || !list.length) return null;
    let best = list[0];
    for (const l of list) if (Math.abs(l - v) < Math.abs(best - v)) best = l;
    return { line: best, off: +(v - best).toFixed(2) };
  };
  // ±1px IS THIS INSTRUMENT'S RESOLUTION, NOT A DEFECT. The painted line occupies one pixel
  // row/column and this reports its CENTRE, while a baseline is the boundary below the glyph —
  // so a mark sitting exactly on the line reads ±1 here. The DOM probes read those same marks
  // at 0.00. Anything at or under 1.5 is "on the line"; the numbers worth reading are the ones
  // that are whole leads or whole characters off.
  const TOL = 1.5;

  console.log(`\n════ ${width}px  — the guide PAINTS ${drawnH.length} horizontal, ${drawnV.length} vertical lines`);
  console.log(`  horizontal at y: ${drawnH.join(', ')}`);
  console.log(`  vertical   at x: ${drawnV.join(', ')}`);
  console.log('  ── each mark vs the NEAREST painted line ──');
  for (const [k, v] of Object.entries(marks.V)) {
    const n = near(v, drawnH);
    if (!n) { console.log(`    —      ${k}: absent`); continue; }
    console.log(`    ${Math.abs(n.off) <= TOL ? ' ok ' : 'OFF '} ${String(n.off > 0 ? '+' + n.off : n.off).padStart(7)}  ${k} (y${v} vs line y${n.line})`);
  }
  for (const [k, v] of Object.entries(marks.H)) {
    const n = near(v, drawnV);
    if (!n) { console.log(`    —      ${k}: absent`); continue; }
    console.log(`    ${Math.abs(n.off) <= TOL ? ' ok ' : 'OFF '} ${String(n.off > 0 ? '+' + n.off : n.off).padStart(7)}  ${k} (x${v} vs line x${n.line})`);
  }
  await ctx.close();
}
await browser.close();
