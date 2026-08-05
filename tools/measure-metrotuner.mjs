// GEOMETRY AUDIT for /metrotuner/. Reads real rects off the built page in
// headless Chrome over loopback and prints, per viewport, where every mark
// actually sits — so an alignment claim is a measurement rather than a look.
//
// What it answers:
//  · do the two cases' rows share a y? (the user's report: the two `start`
//    buttons are not vertically aligned)
//  · does anything sit on the 28px baseline (--lead) the site claims?
//  · do the cases' content edges land on the 12 columns the ::after draws?
//
// Usage:  node tools/measure-metrotuner.mjs            (1440 + 390)
//         MEASURE_URL=… node tools/measure-metrotuner.mjs
import { chromium } from '@playwright/test';

const base = process.env.MEASURE_URL || 'http://127.0.0.1:4321/metrotuner/';
const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'laptop-1024', width: 1024, height: 700 },
  { name: 'phone-390', width: 390, height: 844 },
];

const PROBES = [
  // structure
  ['#mt-app', 'app'],
  ['.mt-pages', 'pages'],
  ['.mt-half:nth-of-type(1)', 'case:tuner'],
  ['.mt-half:nth-of-type(2)', 'case:metro'],
  // tuner
  ['.mt-half:nth-of-type(1) .mt-ctop', 'T ctop'],
  ['#mt-a4-scrub', 'T a4 group'],
  ['#mt-a4', 'T a4 input'],
  ['.mt-half:nth-of-type(1) .mt-mid', 'T mid'],
  ['.mt-half:nth-of-type(1) .mt-gauge', 'T gauge'],
  ['.mt-half:nth-of-type(1) .mt-gauge svg', 'T gauge svg'],
  ['.mt-read', 'T readout'],
  ['#mt-note', 'T note'],
  ['.mt-half:nth-of-type(1) .mt-cap', 'T cap'],
  ['#mt-mic', 'T START btn'],
  ['#mt-mic .w', 'T START word'],
  ['.mt-half:nth-of-type(1) .mt-cfoot', 'T cfoot'],
  ['#mt-tone', 'T tone btn'],
  ['#mt-refnote', 'T refnote'],
  ['.mt-hintline', 'T hintline'],
  // metronome
  ['.mt-half:nth-of-type(2) .mt-ctop', 'M ctop'],
  ['#mt-beats-seg', 'M beats seg'],
  ['#mt-beats-seg .rm-digits', 'M beats digits'],
  ['#mt-beats-seg .rm-rule', 'M beats rule'],
  ['#mt-sub-seg', 'M sub seg'],
  ['#mt-sub-seg .rm-digits', 'M sub digits'],
  ['#mt-sub-seg .rm-rule', 'M sub rule'],
  ['.mt-half:nth-of-type(2) .mt-mid', 'M mid'],
  ['.mt-half:nth-of-type(2) .mt-gauge', 'M gauge'],
  ['.mt-half:nth-of-type(2) .mt-gauge svg', 'M gauge svg'],
  ['.mt-half:nth-of-type(2) .mt-cap', 'M cap'],
  ['#mt-run', 'M START btn'],
  ['#mt-run .w', 'M START word'],
  ['.mt-half:nth-of-type(2) .mt-cfoot', 'M cfoot'],
  ['#mt-bpm-scrub', 'M bpm group'],
  ['#mt-bpm', 'M bpm input'],
  ['#mt-tap', 'M tap btn'],
  ['.mt-foot', 'foot'],
];

// The pendulum/needle pivot in page space — the thing the eye actually reads as
// "the instrument's centre". viewBox is 320x184, pivot at (160,160).
const PIVOT_JS = (sel) => `(() => {
  const s = document.querySelector(${JSON.stringify(sel)});
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return { x: r.left + r.width * (160/320), y: r.top + r.height * (160/184),
           top: r.top + r.height * (44/184) };
})()`;

const browser = await chromium.launch();
const out = {};

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const rects = await page.evaluate((probes) => {
    const r = {};
    for (const [sel, label] of probes) {
      const el = document.querySelector(sel);
      if (!el) { r[label] = null; continue; }
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      r[label] = {
        x: +b.left.toFixed(2), y: +b.top.toFixed(2),
        r: +b.right.toFixed(2), b: +b.bottom.toFixed(2),
        w: +b.width.toFixed(2), h: +b.height.toFixed(2),
        pad: cs.padding, font: cs.fontSize,
      };
    }
    return r;
  }, PROBES);

  const pivots = {
    'T pivot': await page.evaluate(PIVOT_JS('#mt-dial')),
    'M pivot': await page.evaluate(PIVOT_JS('#mt-metro-fig')),
  };

  // FIRST-BASELINE of the text in each key row: the y a reader's eye uses.
  const baselines = await page.evaluate(() => {
    const bl = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      // range over the first text node gives the ink box, not the box model
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n = walk.nextNode();
      while (n && !n.textContent.trim()) n = walk.nextNode();
      if (!n) return null;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const b = rg.getBoundingClientRect();
      return { top: +b.top.toFixed(2), bottom: +b.bottom.toFixed(2), text: n.textContent.trim().slice(0, 12) };
    };
    return {
      'T a4 label': bl('#mt-a4-scrub .mt-lb'),
      'T START word': bl('#mt-mic .w'),
      'T note': bl('#mt-note'),
      'T tone word': bl('#mt-tone .w'),
      'T refnote': bl('#mt-refnote .w'),
      'M beats label': bl('#mt-beats-seg')  || bl('.mt-half:nth-of-type(2) .mt-fl .mt-lb'),
      'M beats lb': bl('.mt-half:nth-of-type(2) .mt-fl > .mt-lb'),
      'M beats digit1': bl('#mt-beats-seg .rbtn'),
      'M sub lb': bl('.mt-half:nth-of-type(2) .mt-fr > .mt-lb'),
      'M sub digit1': bl('#mt-sub-seg .rbtn'),
      'M START word': bl('#mt-run .w'),
      'M bpm input': (() => { const i = document.querySelector('#mt-bpm'); if (!i) return null; const b = i.getBoundingClientRect(); return { top: +b.top.toFixed(2), bottom: +b.bottom.toFixed(2), text: '(input)' }; })(),
      'M bpm label': bl('#mt-bpm-scrub .mt-lb'),
      'M tap word': bl('#mt-tap .w'),
    };
  });

  out[vp.name] = { rects, pivots, baselines, vp };

  // ── report ───────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(78)}\n${vp.name}  (${vp.width}x${vp.height})\n${'='.repeat(78)}`);
  const g = (k) => rects[k];
  console.log('--- boxes (x, y, w, h) ---');
  for (const [, label] of PROBES) {
    const v = g(label);
    console.log(
      label.padEnd(16),
      v ? `x ${String(v.x).padStart(8)}  y ${String(v.y).padStart(8)}  w ${String(v.w).padStart(7)}  h ${String(v.h).padStart(6)}  →r ${String(v.r).padStart(8)}  ↓b ${String(v.b).padStart(8)}`
        : '(absent)');
  }
  console.log('--- pivots (the eye\'s centre) ---');
  for (const [k, v] of Object.entries(pivots)) console.log(k.padEnd(16), v ? `x ${v.x.toFixed(2)}  y ${v.y.toFixed(2)}  bobTop ${v.top.toFixed(2)}` : '(absent)');
  console.log('--- text first-baselines (ink boxes) ---');
  for (const [k, v] of Object.entries(baselines)) console.log(k.padEnd(16), v ? `top ${String(v.top).padStart(8)}  bottom ${String(v.bottom).padStart(8)}  "${v.text}"` : '(absent)');

  // ── the alignment deltas that matter ─────────────────────────────────────
  const d = (a, b, f = 'y') => {
    const A = g(a), B = g(b);
    if (!A || !B) return 'n/a';
    return (A[f] - B[f]).toFixed(2);
  };
  console.log('--- CROSS-CASE DELTAS (0 = aligned) ---');
  const pairs = [
    ['T ctop', 'M ctop'], ['T mid', 'M mid'], ['T gauge', 'M gauge'],
    ['T cap', 'M cap'], ['T START btn', 'M START btn'], ['T cfoot', 'M cfoot'],
  ];
  for (const [a, b] of pairs) {
    console.log(`${(a + ' ↔ ' + b).padEnd(34)} Δtop ${String(d(a, b, 'y')).padStart(9)}  Δbottom ${String(d(a, b, 'b')).padStart(9)}  Δheight ${String(d(a, b, 'h')).padStart(9)}`);
  }
  const bd = (a, b) => {
    const A = baselines[a], B = baselines[b];
    return A && B ? (A.bottom - B.bottom).toFixed(2) : 'n/a';
  };
  console.log(`${'T START word ↔ M START word (BASELINE)'.padEnd(40)} Δ ${bd('T START word', 'M START word')}`);
  console.log(`${'T pivot ↔ M pivot (y)'.padEnd(40)} Δ ${pivots['T pivot'] && pivots['M pivot'] ? (pivots['T pivot'].y - pivots['M pivot'].y).toFixed(2) : 'n/a'}`);
  console.log(`${'T tone word ↔ M bpm label (baseline)'.padEnd(40)} Δ ${bd('T tone word', 'M bpm label')}`);
  console.log(`${'T a4 label ↔ M beats digit1 (baseline)'.padEnd(40)} Δ ${bd('T a4 label', 'M beats digit1')}`);
  console.log(`${'M beats digit1 ↔ M sub digit1 (baseline)'.padEnd(40)} Δ ${bd('M beats digit1', 'M sub digit1')}`);
  console.log(`${'M bpm label ↔ M tap word (baseline)'.padEnd(40)} Δ ${bd('M bpm label', 'M tap word')}`);

  // ── the baseline grid check: is anything on a 28px multiple from the case top? ──
  const lead = 28;
  const caseT = g('case:tuner'), caseM = g('case:metro');
  const onGrid = (label, originY) => {
    const v = g(label);
    if (!v || originY == null) return;
    const off = (v.y - originY) % lead;
    const near = Math.min(off, lead - off);
    console.log(`  ${label.padEnd(16)} y−origin ${String((v.y - originY).toFixed(2)).padStart(9)}  mod28 ${String(off.toFixed(2)).padStart(7)}  off-grid ${near.toFixed(2)}`);
  };
  console.log('--- 28px BASELINE GRID from each case top ---');
  if (caseT) { console.log(' tuner case:'); ['T ctop', 'T mid', 'T gauge', 'T readout', 'T cap', 'T cfoot', 'T hintline'].forEach((l) => onGrid(l, caseT.y)); }
  if (caseM) { console.log(' metro case:'); ['M ctop', 'M mid', 'M gauge', 'M cap', 'M cfoot'].forEach((l) => onGrid(l, caseM.y)); }

  // ── the 12-column check per case ─────────────────────────────────────────
  if (caseT) {
    const contentL = caseT.x + 1 + 28; // border + --gutter
    const contentW = caseT.w - 2 - 56;
    const col = contentW / 12;
    console.log(`--- tuner case 12-col: content ${contentL.toFixed(2)} → ${(contentL + contentW).toFixed(2)}, track ${col.toFixed(2)} ---`);
    for (const l of ['T a4 group', 'T gauge', 'T readout', 'T START btn', 'T tone btn', 'T refnote']) {
      const v = g(l);
      if (!v) continue;
      const lc = (v.x - contentL) / col, rc = (v.r - contentL) / col;
      console.log(`  ${l.padEnd(16)} left col ${lc.toFixed(2)}   right col ${rc.toFixed(2)}   (off L ${(Math.abs(lc - Math.round(lc)) * col).toFixed(2)}px, off R ${(Math.abs(rc - Math.round(rc)) * col).toFixed(2)}px)`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log('\n\n### JSON ###');
console.log(JSON.stringify(out, null, 1));
