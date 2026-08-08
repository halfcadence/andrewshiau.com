// PROBE — try candidate box geometries on the REAL page and report where each one puts the
// three marks the spec row now contains: the box's top rule, the notch's glyph, the digits.
// The point is to CHOOSE a datum from measured candidates instead of proposing one and
// measuring afterwards.
//   VERIFY_URL=... node tools/probe-box-candidates.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';

// Each candidate is a patch over `.mt-grp` / `.mt-gl`. `chrome` is stated so a candidate that
// breaks the whole-lead rule is visible rather than implied.
const CANDIDATES = [
  { id: 'as-shipped', label: 'as shipped — 18/8 pad, notch at 14px', css: '' },
  {
    id: 'content-on-lead',
    label: 'content on the ladder — 27/27 pad (chrome 2 leads)',
    css: '.mt-grp{padding:27px 14px !important}',
  },
  {
    id: 'chrome-one-lead-top13',
    label: 'chrome one lead, 13/13 pad (content 14px in)',
    css: '.mt-grp{padding:13px 14px !important}',
  },
  {
    id: 'smaller-box-9-9',
    label: 'smaller box — 9/9 pad, notch tighter',
    css: '.mt-grp{padding:9px 9px !important;margin-left:-10px !important;margin-right:-10px !important}'
      + '.mt-gl{left:9px !important}',
  },
  {
    id: 'no-negative-margin-inset-1ch',
    label: 'the case inset shrinks to 1ch; the box sits INSIDE it, no negative margin',
    css: '#mt-app{--mt-inset:1ch !important}'
      + '.mt-grp{margin-left:0 !important;margin-right:0 !important;padding:18px 18px 8px !important}'
      + '.mt-gl{left:18px !important}',
  },
  {
    id: 'notch-glyph-on-datum',
    label: 'the notch GLYPH on the inset datum (left:14px → 5px, knock-out accounted)',
    css: '.mt-gl{left:5px !important}',
  },
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
      const px = (e) => { const p = document.createElement('div');
        p.style.cssText = `position:absolute;visibility:hidden;width:${e}`;
        q('#mt-app').appendChild(p); const w = p.getBoundingClientRect().width; p.remove(); return +w.toFixed(3); };
      const INSET = px('var(--mt-inset)'), LEAD = px('var(--lead)'), GROUP = px('var(--group)');
      const CH = px('1ch');
      const phone = window.innerWidth <= 1001;
      const pb = q('.mt-pages').getBoundingClientRect();
      const oT = phone ? pb.top : pb.top + GROUP;

      const tuner = q('.mt-half[aria-label="Tuner"]');
      const tb = tuner.getBoundingClientRect();
      const padL = tb.left + parseFloat(getComputedStyle(tuner).borderLeftWidth);
      const grp = q('#mt-a4-scrub'), gb = grp.getBoundingClientRect();
      const gcs = getComputedStyle(grp);
      const notch = grp.querySelector('.mt-gl');
      const rgN = document.createRange(); rgN.selectNodeContents(notch);
      const ng = rgN.getBoundingClientRect();
      const lbl = q('#mt-a4-scrub .mt-hd');
      const rgD = document.createRange(); rgD.selectNodeContents(lbl);
      const dg = rgD.getBoundingClientRect();
      const bl = (el) => { const s = document.createElement('span'); s.textContent = 'x';
        s.style.cssText = 'display:inline-block;width:0;overflow:hidden;font:inherit';
        el.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return y; };

      const chrome = parseFloat(gcs.paddingTop) + parseFloat(gcs.paddingBottom)
        + parseFloat(gcs.borderTopWidth) + parseFloat(gcs.borderBottomWidth);
      const leads = (y) => +((y - oT) / LEAD).toFixed(3);
      const chs = (x) => +((x - padL) / CH).toFixed(3);
      return {
        INSET, LEAD, CH, chrome, chromeLeads: +(chrome / LEAD).toFixed(3),
        boxRuleLeads: leads(gb.top),
        notchGlyphLeads: leads(ng.top),
        digitsBaselineLeads: leads(bl(lbl)),
        boxRuleCh: chs(gb.left),
        notchGlyphCh: chs(ng.left),
        digitsInkCh: chs(dg.left),
        boxW: +gb.width.toFixed(1),
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        // does the box still fit its case?
        fits: gb.right <= tb.right + 0.5 && gb.left >= tb.left - 0.5,
      };
    });

    const whole = (v) => (Math.abs(v - Math.round(v)) < 0.02 ? '✓' : ' ');
    console.log(`  ${cand.label}`);
    console.log(`     chrome ${r.chrome}px = ${r.chromeLeads} leads ${whole(r.chromeLeads)}` +
      `   box ${r.boxW}px  ${r.fits ? 'fits' : 'OVERFLOWS ITS CASE'}${r.overflow ? '  PAGE OVERFLOW' : ''}`);
    console.log(`     V leads: box rule ${r.boxRuleLeads}${whole(r.boxRuleLeads)}` +
      `  notch ${r.notchGlyphLeads}${whole(r.notchGlyphLeads)}` +
      `  digits ${r.digitsBaselineLeads}${whole(r.digitsBaselineLeads)}`);
    console.log(`     H ch:    box rule ${r.boxRuleCh}${whole(r.boxRuleCh)}` +
      `  notch glyph ${r.notchGlyphCh}${whole(r.notchGlyphCh)}` +
      `  digits ${r.digitsInkCh}${whole(r.digitsInkCh)}   (inset ${r.INSET}px = ${(r.INSET / r.CH).toFixed(0)}ch)`);
    await ctx.close();
  }
}
await browser.close();
