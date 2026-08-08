// PROBE — vertical candidates for the boxed spec row. The question: the box adds top chrome,
// which pushes the digits off the ladder they used to sit on (measured: +19px, and 0.00 with the
// chrome neutralised). Every candidate here is a different answer to "where does the lead go".
//
// Reports, per candidate: where the box's top RULE lands, where the DIGITS land, whether the
// notch still clears the box's rule, and whether the notch collides with the case's own plate.
//   VERIFY_URL=... node tools/probe-box-vertical.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';

const CANDIDATES = [
  { id: '01-shipped', label: 'as shipped — 18/8 pad, box in flow', css: '' },
  {
    id: '02-whole-lead-chrome',
    label: 'whole-lead chrome each side — 27/27 pad, content drops one lead',
    css: '.mt-grp{padding:27px 14px !important}',
  },
  {
    id: '03-hoist-a-lead',
    label: 'hoist the box a lead — 27/27 pad + margin-top:-28px, content stays put',
    css: '.mt-grp{padding:27px 14px !important;margin-top:-28px !important}',
  },
  {
    id: '04-hoist-19',
    label: 'hoist exactly the chrome — 18/8 pad + margin-top:-19px (content stays, rule off-ladder)',
    css: '.mt-grp{margin-top:-19px !important}',
  },
  {
    id: '05-no-box-top',
    label: 'the box loses its top rule — the notch line IS the top (3-sided box)',
    css: '.mt-grp{border-top:0 !important;padding-top:0 !important}.mt-gl{position:static !important;display:block !important;background:none !important;padding:0 !important}',
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
      // MEASURE THE TOKEN WHERE THE OVERLAY READS IT — inside `.mt-pages`, not `#mt-app`.
      // `--mt-case-top` is re-declared on `.mt-pages` in the phone media query, so a probe that
      // resolves it against `#mt-app` gets the DESKTOP value at phone width: it reported the
      // digits +47px off when the painted pixels say +20. The overlay is a `.mt-pages::before`,
      // so `.mt-pages` is the only correct scope to resolve its tokens in.
      const px = (e) => { const p = document.createElement('div');
        p.style.cssText = `position:absolute;visibility:hidden;width:${e}`;
        q('.mt-pages').appendChild(p); const w = p.getBoundingClientRect().width; p.remove(); return +w.toFixed(3); };
      const LEAD = px('var(--lead)'), GROUP = px('var(--group)');
      const phone = window.innerWidth <= 1001;
      const pb = q('.mt-pages').getBoundingClientRect();
      const oT = phone ? pb.top : pb.top + GROUP;
      // `--mt-case-top` + one lead, the SAME expression the overlay now uses — read from the
      // page, not retyped, so this probe cannot describe a guide that no longer exists. It was
      // `LEAD * 2`, which was the hardcoded premise the overlay itself had just been fixed for.
      const drawnTop = oT + px('var(--mt-case-top)') + LEAD;

      const tuner = q('.mt-half[aria-label="Tuner"]');
      const grp = q('#mt-a4-scrub'), gb = grp.getBoundingClientRect();
      const notch = grp.querySelector('.mt-gl');
      const rgN = document.createRange(); rgN.selectNodeContents(notch);
      const ng = rgN.getBoundingClientRect();
      const plate = tuner.querySelector('.mt-plate');
      const pgr = plate.getBoundingClientRect();
      const lbl = q('#mt-a4-scrub .mt-hd');
      const bl = (el) => { const s = document.createElement('span'); s.textContent = 'x';
        s.style.cssText = 'display:inline-block;width:0;overflow:hidden;font:inherit';
        el.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return y; };
      const digits = bl(lbl);

      // does the metronome's second meter still stack onto a whole lead below the first?
      const beats = q('#mt-beats-seg .rbtn'), sub = q('#mt-sub-seg .rbtn');
      const stackGap = (beats && sub) ? bl(sub) - bl(beats) : null;

      const leads = (y) => +((y - oT) / LEAD).toFixed(3);
      return {
        LEAD,
        digitsOffDrawn: +(digits - drawnTop).toFixed(2),
        digitsLeads: leads(digits),
        boxRuleLeads: leads(gb.top),
        // the notch must clear the box's own top rule, or it prints on it
        notchClearsRule: +(gb.top - ng.bottom).toFixed(2),
        // and it must not collide with the case's engraved plate above it
        plateGap: +(ng.top - pgr.bottom).toFixed(2),
        stackGap: stackGap == null ? null : +stackGap.toFixed(2),
        stackWholeLead: stackGap == null ? null : Math.abs(stackGap % LEAD) < 0.51,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    const w = (v) => (Math.abs(v - Math.round(v)) < 0.02 ? '✓' : '·');
    console.log(`  ${cand.label}`);
    console.log(`     digits: ${r.digitsOffDrawn === 0 ? 'ON the drawn line' : `${r.digitsOffDrawn > 0 ? '+' : ''}${r.digitsOffDrawn}px off the drawn line`}` +
      `   at ${r.digitsLeads} leads ${w(r.digitsLeads)}`);
    console.log(`     box top rule at ${r.boxRuleLeads} leads ${w(r.boxRuleLeads)}` +
      `   notch clears its rule by ${r.notchClearsRule}px   plate gap ${r.plateGap}px` +
      `   ${r.plateGap < 0 ? '← COLLIDES WITH THE PLATE' : ''}`);
    console.log(`     stacked meters ${r.stackGap}px apart ${r.stackWholeLead ? '(a whole lead)' : '(NOT a whole lead)'}` +
      `${r.overflow ? '   PAGE OVERFLOW' : ''}`);
    await ctx.close();
  }
}
await browser.close();
