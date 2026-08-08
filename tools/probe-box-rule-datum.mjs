// PROBE — THE BOX'S OWN RULE AS THE DATUM. Refined from probe-box-datum-candidates, which
// established the two facts that make this tractable:
//
//   1. EVERY BOX'S TOP RULE ALREADY LANDS ON A WHOLE LEAD (1, 2, 4, 26, 27 — exact, every
//      width). The boxes are already on the vertical ladder; nothing has to move. What is wrong
//      is only WHERE THE GUIDE DRAWS: it draws at `case-top + one lead`, which is the row the
//      TEXT used to sit on, one lead BELOW the box's rule.
//   2. THE BOX'S SIDE RULE AND THE INK INSIDE IT CANNOT BOTH BE ON THE CHARACTER CELL unless
//      the box's horizontal padding is a whole number of characters. It is 14px = 1.556ch, so
//      today the ink is on 3ch and the rule is on 1.333ch. At 18px = 2ch both land.
//
// Every candidate is reported on FOUR properties, all measured, none inferred:
//   · the box's top rule on a lead      (the vertical box datum)
//   · the box's bottom rule on a lead   (whether the box CLOSES on the ladder)
//   · the box's side rule on a cell     (the horizontal box datum)
//   · the ink still on 3ch              (the datum that is already correct and must not move)
// plus the two constraints that are already load-bearing: whole-lead chrome (the stacked
// meters), and the drone's narrow case still holding its widest box.
//
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/ node tools/probe-box-rule-datum.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';

const CANDIDATES = [
  { id: '01', label: 'as shipped — pad 18/14/8, pulled back 15px',
    css: '' },
  { id: '02', label: 'the side pad becomes 2ch — pad 18/18/8, pulled back 18px',
    css: '.mt-grp{padding:18px 18px 8px !important;'
      + 'margin-left:-18px !important;margin-right:-18px !important}'
      + '.mt-gl{left:18px !important}' },
  { id: '03', label: 'the box CLOSES on a lead too — pad 18/18/8 and a 3-lead min-height',
    css: '.mt-grp{padding:18px 18px 8px !important;'
      + 'margin-left:-18px !important;margin-right:-18px !important;'
      + 'min-height:calc(var(--lead) * 3) !important;box-sizing:border-box !important}'
      + '.mt-gl{left:18px !important}' },
  { id: '04', label: 'the box\'s rule lands ON the case\'s 3ch inset — no negative margin at all',
    css: '.mt-grp{padding:18px 18px 8px !important;'
      + 'margin-left:0 !important;margin-right:0 !important}'
      + '.mt-gl{left:18px !important}' },
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
      const phone = window.innerWidth <= 1001;
      const pb = pages.getBoundingClientRect();
      const originY = phone ? pb.top : pb.top + GROUP;

      const rows = qa('.mt-grp').map((g) => {
        const b = g.getBoundingClientRect();
        const half = g.closest('.mt-half');
        const hb = half.getBoundingClientRect();
        const hcs = getComputedStyle(half);
        const bw = parseFloat(hcs.borderLeftWidth);
        const padL = hb.left + bw, padR = hb.right - bw;
        // FLUSH SIDE FROM THE LAYOUT, not hardcoded — a flush-right group read from the left
        // invents phantom insets (this project's own recorded trap).
        const flushRight = (padR - b.right) < (b.left - padL);
        const sideCh = flushRight ? (padR - b.right) / CH : (b.left - padL) / CH;
        // the ink: the group's first real control, measured on its glyph
        const lbl = g.querySelector('.mt-hd, .rbtn, .vbtn');
        let inkCh = null;
        if (lbl) {
          const rg = document.createRange(); rg.selectNodeContents(lbl);
          const ib = rg.getBoundingClientRect();
          if (ib.width) inkCh = (flushRight ? padR - ib.right : ib.left - padL) / CH;
        }
        return {
          name: (g.querySelector('.mt-gl') || {}).textContent || '?',
          topLeads: +((b.top - originY) / LEAD).toFixed(3),
          botLeads: +((b.bottom - originY) / LEAD).toFixed(3),
          sideCh: +sideCh.toFixed(3),
          inkCh: inkCh == null ? null : +inkCh.toFixed(3),
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
      return { LEAD, CH, rows, gap,
        stackWhole: gap == null ? null : Math.abs(gap % LEAD) < 0.51,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });

    const whole = (v) => v != null && Math.abs(v - Math.round(v)) < 0.02;
    const uniq = (a) => [...new Set(a)];
    const tops = r.rows.map((x) => x.topLeads);
    const bots = r.rows.map((x) => x.botLeads);
    const sides = uniq(r.rows.map((x) => x.sideCh));
    const inks = uniq(r.rows.map((x) => x.inkCh));
    const bad = r.rows.filter((x) => !x.fits);
    console.log(`  ${cand.id} — ${cand.label}`);
    console.log(`     TOP rules on a lead:    ${tops.every(whole) ? '✓ ALL' : '· ' + tops.filter((v) => !whole(v)).join(', ') + ' off'}`);
    console.log(`     BOTTOM rules on a lead: ${bots.every(whole) ? '✓ ALL — the box closes on the ladder' : '· ' + uniq(bots.filter((v) => !whole(v))).join(', ')}`);
    console.log(`     SIDE rule:  ${sides.join(', ')} ch  ${sides.length === 1 && whole(sides[0]) ? '✓ one whole cell — a box datum exists' : sides.length === 1 ? '· one value, not a whole cell' : '· ' + sides.length + ' values'}`);
    console.log(`     the INK:    ${inks.join(', ')} ch  ${inks.every(whole) ? '✓ still on whole cells' : '· MOVED OFF the cell'}`);
    console.log(`     stacked meters ${r.gap}px ${r.stackWhole ? '✓ whole lead' : '✗ NOT a whole lead'}`
      + `${bad.length ? '   ✗ OVERFLOWS: ' + bad.map((x) => x.name + ' (' + x.w + 'px)').join(', ') : '   ✓ every box fits its case'}`
      + `${r.overflow ? '   PAGE OVERFLOW' : ''}`);
    await ctx.close();
  }
}
await browser.close();
