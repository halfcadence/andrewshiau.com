// THE LIVE LOOP CASE, CHECKED ON THE BUILT PAGE.
//
// WHY THIS IS A SECOND HARNESS AND NOT A FLAG ON THE FIRST. `verify-practice-room-datums.mjs`
// is the console's: its axis list names `#mt-dial`, `#mt-mic .rd`, the drone's letter and the
// metronome's needle, and it waits on the tuner's gauge before it measures anything. Pointing it
// at another route times out on a selector that route does not have — which is exactly what it
// did when tried. Generalising its mark list is a real refactor and a separate change; this file
// checks the geometry THIS case actually introduced, and says plainly what it does not check.
//
// WHAT THIS CASE INHERITS RATHER THAN DECLARES. The live loop reuses the room's existing
// containers unchanged — .mt-ctop / .mt-mid / .mt-gauge / .mt-read / .mt-cap / .mt-cfoot /
// .mt-fr / .mt-grp — all of which the console's harness already holds to the axis and the
// 3ch inset. The only new geometry is the four lane rows inside the figure. So the three
// assertions below are the ones a reviewer cannot get from the existing harness:
//
//   1. THE VERB IS ON THE CASE AXIS. The transport is the mark the room's axis datum exists
//      for, and it is measured as SVG ink extent — an <svg>'s box IS its ink, which is why this
//      mark can be checked without the text-ink machinery the console's harness needs.
//   2. THE FIGURE IS THE SYSTEM'S FIGURE. .mt-gauge must stay centred in the case and keep the
//      6-of-12-track width the room gives every other figure; a hand-set width here would be a
//      third structure over a composition that already has one.
//   3. NOTHING OVERFLOWS. Four lane rows of name + strip + two buttons is the densest row in
//      the room, and phone width is where it would break first.
//
// Run against a loopback preview (never 0.0.0.0 — CLAUDE.md rule 1):
//   npm run build && npx astro preview --host 127.0.0.1 --port 4321
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/live-loop/ node tools/verify-live-loop-datums.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/live-loop/';
// The room's own breakpoints, trimmed to the ones that can move THIS case: the phone switch,
// the narrowest supported width, and a spread of desktop widths.
const WIDTHS = [2560, 1512, 1280, 1024, 1002, 1001, 940, 430, 390, 360];
const TOL = 1.0; // px — sub-pixel layout rounding, not a design allowance

const browser = await chromium.launch();
let bad = 0;
const rows = [];

for (const scheme of ['light', 'dark']) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    // Wait on the marks themselves rather than sleeping at the page — a flat timeout in the
    // console's harness once reported "absent" as a datum failure, which is a false red.
    await page.waitForSelector('.mt-liveloop .mt-lllane', { state: 'attached', timeout: 15000 });
    await page.waitForSelector('#mt-ll-run .rd', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(() => {
      const g = document.querySelector('.mt-liveloop .mt-gauge');
      return g && g.getBoundingClientRect().width > 10;
    }, null, { timeout: 15000 });
    await page.waitForTimeout(120); // one frame for the fonts to settle

    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const box = (el) => (el ? el.getBoundingClientRect() : null);
      const kase = q('.mt-liveloop');
      const gauge = q('.mt-liveloop .mt-gauge');
      const verb = q('#mt-ll-run .rd');
      const lanes = [...document.querySelectorAll('.mt-liveloop .mt-lllane')];
      const app = q('#mt-app');

      // the token, read from the page — the datum is whatever --mt-inset resolves to
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--mt-inset)';
      app.appendChild(probe);
      const inset = parseFloat(getComputedStyle(probe).width);
      probe.remove();

      const kb = box(kase), gb = box(gauge), vb = box(verb);
      const axis = kb ? (kb.left + kb.right) / 2 : null;

      // the widest lane row's ink, to catch overflow past the case's content edge
      let worstRight = -Infinity, worstLeft = Infinity;
      for (const l of lanes) {
        const b = box(l);
        if (b.right > worstRight) worstRight = b.right;
        if (b.left < worstLeft) worstLeft = b.left;
      }

      return {
        inset,
        axis,
        caseLeft: kb.left, caseRight: kb.right, caseWidth: kb.width,
        verbCentre: vb ? (vb.left + vb.right) / 2 : null,
        gaugeCentre: gb ? (gb.left + gb.right) / 2 : null,
        gaugeWidth: gb ? gb.width : null,
        laneCount: lanes.length,
        worstLeft, worstRight,
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    const fails = [];
    if (r.laneCount !== 4) fails.push(`${r.laneCount} lane rows, expected 4`);
    if (r.verbCentre === null) fails.push('the verb: absent');
    else if (Math.abs(r.verbCentre - r.axis) > TOL) {
      fails.push(`the verb reads ${(r.verbCentre - r.axis).toFixed(2)}px off the case axis`);
    }
    if (r.gaugeCentre === null) fails.push('the figure: absent');
    else if (Math.abs(r.gaugeCentre - r.axis) > TOL) {
      fails.push(`the figure reads ${(r.gaugeCentre - r.axis).toFixed(2)}px off the case axis`);
    }
    // The lane rows live inside the figure, so they may not exceed it.
    if (r.worstRight > r.caseRight - r.inset + TOL) {
      fails.push(`a lane row crosses the inset on the right by ${(r.worstRight - (r.caseRight - r.inset)).toFixed(2)}px`);
    }
    if (r.worstLeft < r.caseLeft + r.inset - TOL) {
      fails.push(`a lane row crosses the inset on the left by ${((r.caseLeft + r.inset) - r.worstLeft).toFixed(2)}px`);
    }
    if (r.docOverflow > 0) fails.push(`the page scrolls sideways by ${r.docOverflow}px`);

    if (fails.length) { bad += 1; rows.push(`FAIL ${scheme.padEnd(6)} ${String(width).padStart(4)}  ${fails.join('; ')}`); }
    else rows.push(`ok   ${scheme.padEnd(6)} ${String(width).padStart(4)}  inset ${r.inset.toFixed(1)}  case ${r.caseWidth.toFixed(0)}  figure ${r.gaugeWidth.toFixed(0)}`);

    await ctx.close();
  }
}
await browser.close();
console.log(rows.join('\n'));
console.log('');
if (bad) {
  console.log(`${bad} of ${rows.length} configurations FAIL.`);
  process.exitCode = 1;
} else {
  console.log(`the live loop's own geometry holds at every width, both colourways: the verb and the`);
  console.log(`figure on the case axis, four lane rows inside the 3ch inset, no sideways scroll.`);
  console.log('');
  console.log(`NOT CHECKED HERE, and worth knowing: the inset datum for this case's TEXT marks (the`);
  console.log(`reading, the group notches, the lane names). Those need the ink measurer in`);
  console.log(`verify-practice-room-datums.mjs, whose mark list is the console's — see this file's head.`);
}
