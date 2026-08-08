// PROBE — IF THE DATUM NAMES THE BOX, what has to be true of the box?
//
// The boxes stay. The question is no longer "where does the text go to meet the line" but
// "where are the lines, given that the BOX is what the eye reads". So this measures the box's
// OWN four rules against the two grids the page already has — the 28px lead ladder and the
// 9px character cell — and reports which candidate geometry puts them on it.
//
// What the previous probe established, and what makes this tractable:
//   · every box's TOP rule already lands on a whole lead (1, 2, 4, 26, 27 — all exact)
//   · every box's LEFT rule sits at 1.333ch (12px) — consistent with the others, not on the cell
//   · box BOTTOMS do not land (3.607, 6.536 …) because the heights are 73/84/71/56
//   · the RIGHT rules are ragged by design (each box stops at its own content), so a right-hand
//     box datum cannot exist unless the boxes go full-width
//
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/ node tools/probe-box-datum-candidates.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';

const CANDIDATES = [
  { id: 'A-shipped', label: 'as shipped — box left at 1.333ch, height 73/84/71',
    css: '' },
  { id: 'B-left-1ch', label: 'the box\'s LEFT RULE on the character cell — margin −18px, left = 1ch',
    css: '.mt-grp{margin-left:-18px !important;margin-right:-18px !important}' },
  { id: 'C-left-0ch', label: 'the box\'s left rule ON the case\'s inset line — margin −27px, left = 0ch',
    css: '.mt-grp{margin-left:-27px !important;margin-right:-27px !important}' },
  { id: 'D-height-leads', label: 'the box is a whole number of LEADS tall — 18/10 pad (h 84 = 3 leads)',
    css: '.mt-grp{padding:18px 14px 10px !important}' },
  { id: 'E-both', label: 'BOTH — left rule on 1ch and the height a whole 3 leads',
    css: '.mt-grp{margin-left:-18px !important;margin-right:-18px !important;'
      + 'padding:18px 18px 10px !important}.mt-gl{left:18px !important}' },
  { id: 'F-fullwidth', label: 'the boxes go FULL-WIDTH — both rules land, right datum becomes possible',
    css: '.mt-grp{margin-left:-15px !important;margin-right:-15px !important;'
      + 'display:flex !important;width:auto !important}'
      + '.mt-ctop>.mt-fl,.mt-ctop>.mt-fr{flex:1 1 100% !important}' },
];

const browser = await chromium.launch();
for (const width of (process.env.WIDTHS || '1440,390').split(',').map(Number)) {
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
    if (cand.css) await page.addStyleTag({ content: cand.css });
    await page.waitForTimeout(180);

    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const qa = (s) => [...document.querySelectorAll(s)];
      const px = (host, e) => { const p = document.createElement('div');
        p.style.cssText = `position:absolute;visibility:hidden;width:${e}`;
        host.appendChild(p); const w = p.getBoundingClientRect().width; p.remove(); return +w.toFixed(3); };
      const pages = q('.mt-pages');
      const LEAD = px(pages, 'var(--lead)'), CH = px(pages, '1ch');
      const CASETOP = px(pages, 'var(--mt-case-top)'), GROUP = px(pages, 'var(--group)');
      const INSET = px(pages, 'var(--mt-inset)');
      const phone = window.innerWidth <= 1001;
      const pb = pages.getBoundingClientRect();
      const originY = phone ? pb.top : pb.top + GROUP;

      const rows = qa('.mt-grp').map((g) => {
        const b = g.getBoundingClientRect();
        const half = g.closest('.mt-half');
        const hb = half.getBoundingClientRect();
        const bw = parseFloat(getComputedStyle(half).borderLeftWidth);
        const padL = hb.left + bw, padR = hb.right - bw;
        // the ink inside, which must not move off the 3ch inset — that datum is already right
        const lbl = g.querySelector('.mt-hd, .rbtn, .vbtn');
        let inkL = null;
        if (lbl) { const rg = document.createRange(); rg.selectNodeContents(lbl);
          const ib = rg.getBoundingClientRect(); if (ib.width) inkL = ib.left; }
        const flushRight = g.classList.contains('mt-fr')
          && Math.abs(padR - b.right) < Math.abs(b.left - padL);
        return {
          topLeads: +((b.top - originY) / LEAD).toFixed(3),
          botLeads: +((b.bottom - originY) / LEAD).toFixed(3),
          hLeads: +(b.height / LEAD).toFixed(3),
          leftCh: +((b.left - padL) / CH).toFixed(3),
          rightCh: +((padR - b.right) / CH).toFixed(3),
          inkCh: inkL == null ? null
            : +(((flushRight ? padR - inkL : inkL - padL)) / CH).toFixed(3),
          flushRight,
          overflowsCase: b.right > padR + 0.5 || b.left < padL - 0.5,
        };
      });
      // do the STACKED meters still sit a whole lead apart? (the constraint that is already
      // load-bearing below 1480)
      const bl = (sel) => { const el = q(sel); if (!el) return null;
        const s = document.createElement('span'); s.textContent = 'x';
        s.style.cssText = 'display:inline-block;width:0;overflow:hidden;font:inherit';
        el.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return y; };
      const b1 = bl('#mt-beats-seg .rbtn'), b2 = bl('#mt-sub-seg .rbtn');
      const gap = (b1 != null && b2 != null) ? b2 - b1 : null;
      return { LEAD, CH, rows, gap,
        stackWhole: gap == null ? null : Math.abs(gap % LEAD) < 0.51,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });

    const whole = (v) => Math.abs(v - Math.round(v)) < 0.02;
    const mark = (v) => (whole(v) ? '✓' : '·');
    const tops = [...new Set(r.rows.map((x) => x.topLeads))];
    const lefts = [...new Set(r.rows.map((x) => x.leftCh))];
    const rights = [...new Set(r.rows.map((x) => x.rightCh))];
    const hs = [...new Set(r.rows.map((x) => x.hLeads))];
    const inks = [...new Set(r.rows.map((x) => x.inkCh))];
    console.log(`  ${cand.label}`);
    console.log(`     box TOPS all on leads: ${r.rows.every((x) => whole(x.topLeads)) ? 'YES' : 'no'}`
      + `   BOTTOMS all on leads: ${r.rows.every((x) => whole(x.botLeads)) ? 'YES' : 'no (' + r.rows.map((x) => x.botLeads).join(', ') + ')'}`);
    console.log(`     heights in leads: ${hs.join(', ')} ${hs.every(whole) ? '✓ all whole' : '· not whole'}`);
    console.log(`     LEFT rule: ${lefts.join(', ')} ch ${lefts.length === 1 && whole(lefts[0]) ? '✓ one whole cell' : lefts.length === 1 ? '· one value, not a whole cell' : '· disagrees'}`);
    console.log(`     RIGHT rule: ${rights.join(', ')} ch ${rights.length === 1 ? '✓ one value — a right datum is possible' : '· ragged, no right datum'}`);
    console.log(`     the INK inside: ${inks.join(', ')} ch ${inks.every((v) => v != null && whole(v)) ? '✓ still on whole cells' : '· MOVED OFF the cell'}`);
    console.log(`     stacked meters ${r.gap}px ${r.stackWhole ? '(a whole lead)' : '(NOT a whole lead)'}`
      + `${r.rows.some((x) => x.overflowsCase) ? '   ← A BOX OVERFLOWS ITS CASE' : ''}`
      + `${r.overflow ? '   PAGE OVERFLOW' : ''}`);
    await ctx.close();
  }
}
await browser.close();
