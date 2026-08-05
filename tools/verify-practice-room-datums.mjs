// THE TWO DATUMS, checked on the built page. This is the instrument the alignment system is
// judged by, and it is the whole system:
//
//   THE AXIS   — the case's centre line. Everything the instrument radiates from sits on it:
//                the dial, the reading, the verb.
//   THE INSET  — one --lead (28px) from the case's box. Everything else sits on it, flush
//                left or flush right.
//
// Run against a loopback `astro preview` (never 0.0.0.0 — see CLAUDE.md rule 1):
//   npm run build && npx astro preview --host 127.0.0.1 --port 4321
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/ node tools/verify-practice-room-datums.mjs
//
// MEASURE INK, NOT BOXES. Every control here pads out to a tap target with matching negative
// margins, so its box edge is nowhere near its visible edge — and an <input>'s value is not a
// text node, so a naive TreeWalker skips the digits entirely and reports the NEXT visible thing
// as the mark's edge. Both mistakes produced wrong conclusions in this project before the
// harness was fixed (a phantom "97px inset" that was really 48, and a phantom off-grid bpm).
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';
const INSET = 28; // --lead
const TOL = 0.51; // half a pixel, so a subpixel layout rounds clean
const WIDTHS = [2560, 1728, 1440, 1280, 1241, 1240, 1100, 1024, 940, 901, 900, 430, 390, 360];

const browser = await chromium.launch();
let bad = 0;

for (const scheme of ['light', 'dark']) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    // WAIT FOR THE INSTRUMENT, don't sleep at it. A flat 260ms timeout intermittently
    // measured a page that had not finished laying out, and the harness then reported
    // "the tuner's dial: absent" as a DATUM FAILURE — a false red that is worse than no
    // check, because the next person reads it as the alignment breaking at phone width.
    // Wait on the marks themselves, and let a genuine absence fail on its own merit.
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForSelector('#mt-dial', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#mt-mic .w', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(() => {
      const g = document.querySelector('.mt-half[aria-label="Tuner"] .mt-gauge');
      return g && g.getBoundingClientRect().width > 10;
    }, null, { timeout: 15000 });
    await page.waitForTimeout(120); // one frame for the fonts to settle the ink

    const r = await page.evaluate(({ INSET, TOL }) => {
      // ── ink: text ranges + drawn SVG + an input's rendered value ──────────
      const ink = (el) => {
        if (!el) return null;
        let l = Infinity, r = -Infinity;
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let t = w.nextNode(); t; t = w.nextNode()) {
          if (!t.textContent.trim()) continue;
          const rg = document.createRange();
          rg.selectNodeContents(t);
          const b = rg.getBoundingClientRect();
          if (b.width) { l = Math.min(l, b.left); r = Math.max(r, b.right); }
        }
        for (const s of el.querySelectorAll('svg')) {
          const b = s.getBoundingClientRect();
          if (b.width) { l = Math.min(l, b.left); r = Math.max(r, b.right); }
        }
        // an <input>'s value: measure the glyphs and place them per text-align
        const inputs = el.matches?.('input') ? [el] : [...el.querySelectorAll('input')];
        for (const i of inputs) {
          const cs = getComputedStyle(i), b = i.getBoundingClientRect();
          if (!b.width || !i.value) continue;
          const c = document.createElement('canvas').getContext('2d');
          c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          const tw = c.measureText(i.value).width;
          const cl = b.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
          const cr = b.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
          const tl = (cs.textAlign === 'right' || cs.textAlign === 'end') ? cr - tw
            : cs.textAlign === 'center' ? cl + (cr - cl - tw) / 2
              : cl;
          l = Math.min(l, tl); r = Math.max(r, tl + tw);
        }
        return l > r ? null : { l, r, c: (l + r) / 2 };
      };

      const caseOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el), b = el.getBoundingClientRect();
        return {
          L: b.left + parseFloat(cs.borderLeftWidth),
          R: b.right - parseFloat(cs.borderRightWidth),
          axis: (b.left + b.right) / 2,
        };
      };
      const T = caseOf('.mt-half[aria-label="Tuner"]');
      const M = caseOf('.mt-half[aria-label="Metronome"]');
      const q = (s) => document.querySelector(s);

      // ── THE AXIS ─────────────────────────────────────────────────────────
      const axis = [
        ['the tuner’s dial', '.mt-half[aria-label="Tuner"] .mt-gauge', T],
        ['the reading', '.mt-read', T],
        ['the tuner’s verb', '#mt-mic', T],
        ['the pendulum', '.mt-half[aria-label="Metronome"] .mt-gauge', M],
        ['the metronome’s verb', '#mt-run', M],
      ];
      const axisFails = [];
      for (const [name, sel, c] of axis) {
        const v = ink(q(sel));
        if (!v || !c) { axisFails.push(`${name}: absent`); continue; }
        const off = v.c - c.axis;
        if (Math.abs(off) > TOL) axisFails.push(`${name} ${off.toFixed(2)}px off axis`);
      }

      // ── THE INSET ────────────────────────────────────────────────────────
      // The metronome's spec row is one line on a wide screen (its right group flush RIGHT)
      // and two stacked lines below 1240 (both flush LEFT). Read which from the layout rather
      // than hardcoding a width — a hardcoded side is what made an earlier sweep report
      // phantom 267/927px insets.
      const fl = q('.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fl');
      const fr = q('.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fr');
      const stacked = fl && fr
        && Math.abs(fl.getBoundingClientRect().top - fr.getBoundingClientRect().top) > 2;

      const insets = [
        ['a4 · the tuner’s spec', '.mt-half[aria-label="Tuner"] .mt-ctop > .mt-fr', T, 'L'],
        ['play tone · the tuner’s foot', '.mt-half[aria-label="Tuner"] .mt-cfoot > .mt-fr', T, 'L'],
        ['beats', '.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fl', M, 'L'],
        ['subdivide', '.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fr', M, stacked ? 'L' : 'R'],
        ['bpm · the metronome’s foot', '.mt-half[aria-label="Metronome"] .mt-cfoot > .mt-fr', M, 'L'],
        ['the hint line', '.mt-hintline', T, 'L'],
      ];
      const insetFails = [];
      const seen = new Set();
      for (const [name, sel, c, side] of insets) {
        const v = ink(q(sel));
        if (!v || !c) continue; // the hint line is empty unless the mic was refused
        const d = side === 'L' ? v.l - c.L : c.R - v.r;
        seen.add(+d.toFixed(1));
        if (Math.abs(d - INSET) > TOL) insetFails.push(`${name} at ${d.toFixed(2)}px`);
      }

      // ── nothing may regress while satisfying the datums ───────────────────
      const tgt = (s) => {
        const e = q(s);
        if (!e) return Infinity;
        const b = e.getBoundingClientRect();
        return Math.min(b.width, b.height);
      };
      const smallest = Math.min(...['#mt-mic', '#mt-run', '#mt-tone', '#mt-tap', '#mt-refnote',
        '#mt-a4', '#mt-bpm'].map(tgt));

      return {
        axisFails, insetFails,
        distinct: [...seen].sort((a, b) => a - b),
        smallest,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        // the reading must still be able to SHOW a frequency — the `:empty` rule must not
        // have hidden it outright
        hzExists: !!q('#mt-hz'),
      };
    }, { INSET, TOL });

    const ok = !r.axisFails.length && !r.insetFails.length && !r.overflow
      && r.smallest >= 24 && r.hzExists;
    if (!ok) bad++;
    const notes = [
      r.axisFails.length ? `AXIS: ${r.axisFails.join('; ')}` : '',
      r.insetFails.length ? `INSET: ${r.insetFails.join('; ')}` : '',
      r.distinct.length > 1 ? `insets seen: ${r.distinct.join(', ')}` : '',
      r.overflow ? 'HORIZONTAL OVERFLOW' : '',
      r.smallest < 24 ? `target ${r.smallest}px < 24` : '',
      !r.hzExists ? 'the reading’s Hz element is gone' : '',
    ].filter(Boolean).join('  |  ');
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${scheme.padEnd(5)} ${String(width).padStart(4)}` +
      (notes ? `  ${notes}` : ''));
    await ctx.close();
  }
}

await browser.close();
console.log(bad
  ? `\n${bad} failing configuration(s)`
  : '\nevery mark on the axis or on the 28px inset, at every width, in both colourways');
process.exit(bad ? 1 : 0);
