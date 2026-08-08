// PROBE — CAN THE BOX'S RULE **AND** THE INK BOTH LAND ON THE CHARACTER CELL?
//
// The previous probe said no, and reported the trade as if it were inherent. It is not: the
// obstruction is THE BOX'S OWN 1px BORDER, and the arithmetic is exact.
//
//   ink_x = box_rule_x + border + padding
//
// With the case inset at 27px (3ch) and 1ch = 9px, a box pulled back by `m` with padding `p`:
//   box rule = 27 − m        ink = 27 − m + 1 + p
// For BOTH to be whole cells, `1 + p` must be a multiple of 9 — so p = 8, 17 or 26, NOT 18.
// At p = 18 the ink lands at 3.111ch, which is what the last probe measured and mis-attributed
// to an inherent conflict. p = 17 with m = 18 puts the rule on 1ch and the ink back on 3ch.
//
// This probe tests the whole family, and also asks the question the vertical axis needs: the
// box's top rule already sits on a lead, so where should the GUIDE draw — the box's rule, or
// the text's baseline a lead below it?
//
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/ node tools/probe-box-both-datums.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';

// pad-left/right `p`, pull-back `m`, and the notch's own left offset (it must travel with the
// box's padding or it stops being 1ch of knock-out inside the rule)
const CANDIDATES = [
  { id: '01', label: 'as shipped — p14 m15: rule 1.333ch, ink 3ch',
    p: 14, m: 15 },
  { id: '02', label: 'p17 m18 — rule on 1ch AND ink on 3ch (the border accounted for)',
    p: 17, m: 18 },
  { id: '03', label: 'p8 m9 — rule on 2ch, ink on 3ch (a tighter box)',
    p: 8, m: 9 },
  { id: '04', label: 'p26 m27 — the rule ON the case inset (0ch), ink on 3ch',
    p: 26, m: 27 },
  { id: '05', label: 'p17 m9 — rule on 2ch, ink 4ch (the box grows inward instead)',
    p: 17, m: 9 },
];

const browser = await chromium.launch();
for (const width of (process.env.WIDTHS || '1440,1280,390').split(',').map(Number)) {
  console.log(`\n══════════════ ${width}px ══════════════`);
  for (const cand of CANDIDATES) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForSelector('#mt-dial', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(() => {
      const g = document.querySelector('.mt-half[aria-label="Tuner"] .mt-gauge');
      return g && g.getBoundingClientRect().width > 10;
    }, null, { timeout: 15000 });
    if (cand.id !== '01') {
      await page.addStyleTag({ content:
        `.mt-grp{padding-left:${cand.p}px !important;padding-right:${cand.p}px !important;`
        + `margin-left:-${cand.m}px !important;margin-right:-${cand.m}px !important}`
        + `.mt-gl{left:${cand.p}px !important}` });
    }
    await page.waitForTimeout(180);

    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const qa = (s) => [...document.querySelectorAll(s)];
      const px = (host, e) => { const p = document.createElement('div');
        p.style.cssText = `position:absolute;visibility:hidden;width:${e}`;
        host.appendChild(p); const w = p.getBoundingClientRect().width; p.remove(); return +w.toFixed(3); };
      const pages = q('.mt-pages');
      const LEAD = px(pages, 'var(--lead)'), CH = px(pages, '1ch');
      const GROUP = px(pages, 'var(--group)');
      const phone = window.innerWidth <= 1001;
      const pb = pages.getBoundingClientRect();
      const originY = phone ? pb.top : pb.top + GROUP;

      const rows = qa('.mt-grp').map((g) => {
        const b = g.getBoundingClientRect();
        const half = g.closest('.mt-half');
        const hb = half.getBoundingClientRect();
        const bw = parseFloat(getComputedStyle(half).borderLeftWidth);
        const padL = hb.left + bw, padR = hb.right - bw;
        const flushRight = (padR - b.right) < (b.left - padL);
        const sideCh = (flushRight ? padR - b.right : b.left - padL) / CH;
        // MEASURE THE OUTERMOST GLYPH ON THE FLUSH SIDE. Taking the FIRST `.rbtn` of a
        // flush-RIGHT group and reading `padR - its.right` measures the distance to the
        // group's inner end, not to its flush edge — it reported a phantom 16.333ch for
        // `subdivide` at phone width and would have shipped as "the phone fails". This is the
        // same phantom-inset trap the datums harness already records (267px/927px insets from
        // reading a flush-right group from the left). Derive the glyph from the side.
        const marks = [...g.querySelectorAll('.mt-hd, .rbtn, .vbtn')];
        let inkCh = null;
        if (marks.length) {
          const lbl = flushRight ? marks[marks.length - 1] : marks[0];
          const rg = document.createRange(); rg.selectNodeContents(lbl);
          const ib = rg.getBoundingClientRect();
          if (ib.width) inkCh = (flushRight ? padR - ib.right : ib.left - padL) / CH;
        }
        // the notch's glyph, relative to the box's own rule — it carries 1ch of knock-out
        // THE NOTCH IS ALWAYS AT THE BOX'S LEFT, even on a flush-right group — it is
        // `position:absolute; left:<pad>`, so it does not mirror. Measured from the box's own
        // left rule, which is the thing it is 1ch of knock-out inside.
        const notch = g.querySelector('.mt-gl');
        let notchFromRule = null, notchCh = null;
        if (notch) { const rg = document.createRange(); rg.selectNodeContents(notch);
          const nb = rg.getBoundingClientRect();
          if (nb.width) {
            notchFromRule = (nb.left - b.left) / CH;
            notchCh = (nb.left - padL) / CH;
          } }
        return {
          name: (notch || {}).textContent || '?',
          case: half.getAttribute('aria-label'),
          topLeads: +((b.top - originY) / LEAD).toFixed(3),
          sideCh: +sideCh.toFixed(3),
          inkCh: inkCh == null ? null : +inkCh.toFixed(3),
          notchCh: notchCh == null ? null : +notchCh.toFixed(3),
          notchFromRule: notchFromRule == null ? null : +notchFromRule.toFixed(3),
          fits: b.right <= padR + 0.5 && b.left >= padL - 0.5,
          w: +b.width.toFixed(1),
        };
      });
      const bl = (sel) => { const el = q(sel); if (!el) return null;
        const s = document.createElement('span'); s.textContent = 'x';
        s.style.cssText = 'display:inline-block;width:0;overflow:hidden;font:inherit';
        el.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return y; };
      const b1 = bl('#mt-beats-seg .rbtn'), b2 = bl('#mt-sub-seg .rbtn');
      const gap = (b1 != null && b2 != null) ? b2 - b1 : null;
      return { rows, gap, LEAD,
        stackWhole: gap == null ? null : Math.abs(gap % LEAD) < 0.51,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });

    const whole = (v) => v != null && Math.abs(v - Math.round(v)) < 0.02;
    const uniq = (a) => [...new Set(a)];
    const sides = uniq(r.rows.map((x) => x.sideCh));
    const inks = uniq(r.rows.map((x) => x.inkCh));
    const notches = uniq(r.rows.map((x) => x.notchCh));
    const bad = r.rows.filter((x) => !x.fits);
    const both = sides.every(whole) && inks.every(whole);
    console.log(`  ${cand.id} — ${cand.label}`);
    console.log(`     box RULE ${sides.join(', ')} ch ${sides.every(whole) ? '✓' : '·'}`
      + `   INK ${inks.join(', ')} ch ${inks.every(whole) ? '✓' : '·'}`
      + `   NOTCH ${notches.join(', ')} ch ${notches.every(whole) ? '✓' : '·'}`);
    console.log(`     ${both ? '★ BOTH THE RULE AND THE INK ARE ON THE CELL' : '  not both'}`
      + `   tops on leads ${r.rows.map((x) => x.topLeads).every(whole) ? '✓' : '·'}`
      + `   stacked ${r.gap}px ${r.stackWhole ? '✓' : '✗'}`
      + `${bad.length ? '   ✗ OVERFLOWS: ' + bad.map((x) => x.name + ' ' + x.w + 'px').join(', ') : '   ✓ fits'}`
      + `${r.overflow ? '   PAGE OVERFLOW' : ''}`);
    await ctx.close();
  }
}
await browser.close();
