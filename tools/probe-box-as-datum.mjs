// PROBE — THE QUESTION REVERSED. Not "where does the box's content go to meet the datum"
// (that was the last probe, and it was the wrong question) but: IF THE DATUM DESCRIBES THE
// BOXES, where are the lines?
//
// The boxes stay. The box is the object the eye reads now, so the datum should name the box's
// own edges — its top rule and its left/right rules — rather than the text inside it. This
// probe reports, for every group box on the real page and at every width:
//   · where each box's four rules actually sit, in leads and in characters
//   · whether the boxes AGREE with each other (a datum has to be one line for all of them)
//   · where the UNBOXED marks sit relative to those same lines, since half the page has no box
//     (the foot controls, the reading, the figure) and a box datum must not orphan them
//
//   npx astro preview --host 127.0.0.1 --port 4321
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/ node tools/probe-box-as-datum.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';
const WIDTHS = (process.env.WIDTHS || '1440,1280,1024,390').split(',').map(Number);

const browser = await chromium.launch();
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('#mt-dial', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => {
    const g = document.querySelector('.mt-half[aria-label="Tuner"] .mt-gauge');
    return g && g.getBoundingClientRect().width > 10;
  }, null, { timeout: 15000 });
  await page.waitForTimeout(180);

  const r = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => [...document.querySelectorAll(s)];
    // resolve tokens where the OVERLAY reads them — `.mt-pages` for the ladder, the case for
    // its own inset (the phone re-declares case-top on .mt-pages).
    const px = (host, e) => { const p = document.createElement('div');
      p.style.cssText = `position:absolute;visibility:hidden;width:${e}`;
      host.appendChild(p); const w = p.getBoundingClientRect().width; p.remove(); return +w.toFixed(3); };
    const pages = q('.mt-pages');
    const LEAD = px(pages, 'var(--lead)');
    const CASETOP = px(pages, 'var(--mt-case-top)');
    const GROUP = px(pages, 'var(--group)');
    const INSET = px(pages, 'var(--mt-inset)');
    const CH = px(pages, '1ch');
    const phone = window.innerWidth <= 1001;
    const pb = pages.getBoundingClientRect();
    const originY = phone ? pb.top : pb.top + GROUP;

    const bl = (el) => { if (!el) return null;
      const s = document.createElement('span'); s.textContent = 'x';
      s.style.cssText = 'display:inline-block;width:0;overflow:hidden;font:inherit';
      el.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return y; };
    const glyph = (el) => { if (!el) return null;
      const rg = document.createRange(); rg.selectNodeContents(el);
      const b = rg.getBoundingClientRect(); return b.width ? b : null; };

    const boxes = qa('.mt-grp').map((g) => {
      const b = g.getBoundingClientRect();
      const half = g.closest('.mt-half');
      const hb = half.getBoundingClientRect();
      const hcs = getComputedStyle(half);
      const bw = parseFloat(hcs.borderLeftWidth);
      const padL = hb.left + bw;                       // the case's padding box edge
      const padR = hb.right - bw;
      const notch = g.querySelector('.mt-gl');
      const ng = glyph(notch);
      return {
        name: notch ? notch.textContent : '?',
        case: half.getAttribute('aria-label'),
        // the box's own four rules
        top: b.top, bottom: b.bottom, left: b.left, right: b.right,
        topLeads: +((b.top - originY) / LEAD).toFixed(3),
        botLeads: +((b.bottom - originY) / LEAD).toFixed(3),
        leftCh: +((b.left - padL) / CH).toFixed(3),
        rightCh: +((padR - b.right) / CH).toFixed(3),
        h: +b.height.toFixed(2),
        // and where the notch's glyph sits relative to the box's own left rule
        notchFromBoxLeft: ng ? +(ng.left - b.left).toFixed(2) : null,
      };
    });

    // THE UNBOXED MARKS — a datum drawn on the boxes must not orphan these. Half the screen
    // has no box: the foot line, the reading, the hint line, the figure.
    const padOf = (sel) => { const h = q(sel); if (!h) return null;
      const hb = h.getBoundingClientRect(); const bw = parseFloat(getComputedStyle(h).borderLeftWidth);
      return { L: hb.left + bw, R: hb.right - bw }; };
    const T = padOf('.mt-half[aria-label="Tuner"]');
    const M = padOf('.mt-half[aria-label="Metronome"]');
    const unboxed = [];
    const addU = (name, el, pad, side) => {
      const g = el && glyph(el);
      if (!g || !pad) return;
      unboxed.push({ name,
        fromInsetCh: +(((side === 'R' ? pad.R - g.right : g.left - pad.L)) / CH).toFixed(3),
        baselineLeads: +((g.bottom - originY) / LEAD).toFixed(3) });
    };
    addU('bpm (foot, unboxed)', q('#mt-bpm-scrub .mt-lb'), M, 'L');
    addU('tap (foot, unboxed)', q('#mt-tap .w'), M, 'L');
    addU('play tone (foot, unboxed)', q('.mt-half[aria-label="Tuner"] .mt-cfoot .mt-lb'), T, 'L');
    addU('the case plate', q('.mt-half[aria-label="Tuner"] .mt-plate'), T, 'L');

    return { LEAD, CASETOP, INSET, CH, phone,
      originY: +originY.toFixed(2), boxes, unboxed,
      // the count that decides whether a box datum is even possible
      distinctTop: [...new Set(boxes.map((b) => +b.top.toFixed(1)))],
      distinctLeftCh: [...new Set(boxes.map((b) => b.leftCh))],
      distinctH: [...new Set(boxes.map((b) => b.h))] };
  });

  const w = (v) => (Math.abs(v - Math.round(v)) < 0.02 ? '✓' : ' ');
  console.log(`\n════ ${width}px ${r.phone ? '(phone)' : ''}   lead ${r.LEAD}  case-top ${r.CASETOP}  1ch ${r.CH}`);
  console.log('  ── EVERY BOX, by its OWN rules ──');
  for (const b of r.boxes) {
    console.log(`  ${String(b.name).padEnd(12)} ${String(b.case).padEnd(10)}` +
      ` top ${String(b.topLeads).padStart(7)} leads ${w(b.topLeads)}` +
      `  bottom ${String(b.botLeads).padStart(7)} ${w(b.botLeads)}` +
      `  left ${String(b.leftCh).padStart(7)} ch ${w(b.leftCh)}` +
      `  right ${String(b.rightCh).padStart(7)} ch ${w(b.rightCh)}` +
      `  h ${b.h}`);
  }
  console.log(`  boxes share a top edge? ${r.distinctTop.length === 1 ? 'YES' : 'NO — ' + r.distinctTop.length + ' tops: ' + r.distinctTop.join(', ')}`);
  console.log(`  boxes share a left inset? ${r.distinctLeftCh.length === 1 ? 'YES, ' + r.distinctLeftCh[0] + 'ch' : 'NO — ' + r.distinctLeftCh.join(', ') + ' ch'}`);
  console.log(`  box heights: ${r.distinctH.join(', ')}`);
  console.log('  ── THE UNBOXED MARKS (a box datum must not orphan these) ──');
  for (const u of r.unboxed) {
    console.log(`  ${String(u.name).padEnd(26)} ${String(u.fromInsetCh).padStart(7)} ch from the case edge ${w(u.fromInsetCh)}` +
      `   baseline ${String(u.baselineLeads).padStart(7)} leads ${w(u.baselineLeads)}`);
  }
  await ctx.close();
}
await browser.close();
