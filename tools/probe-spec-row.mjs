// PROBE — every horizontal and vertical position in the spec row, so a datum can be CHOSEN
// from measured candidates rather than proposed and then measured.
//   VERIFY_URL=... node tools/probe-spec-row.mjs
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';
const WIDTHS = (process.env.WIDTHS || '1440,1024,390').split(',').map(Number);

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
  await page.waitForTimeout(200);

  const r = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const px = (e) => { const p = document.createElement('div');
      p.style.cssText = `position:absolute;visibility:hidden;width:${e}`;
      q('#mt-app').appendChild(p); const w = p.getBoundingClientRect().width; p.remove(); return +w.toFixed(3); };
    const INSET = px('var(--mt-inset)'), LEAD = px('var(--lead)'), GROUP = px('var(--group)');
    const phone = window.innerWidth <= 1001;
    const pb = q('.mt-pages').getBoundingClientRect();
    const oT = phone ? pb.top : pb.top + GROUP;
    const oB = phone ? pb.bottom : pb.bottom - LEAD;

    const tuner = q('.mt-half[aria-label="Tuner"]');
    const tb = tuner.getBoundingClientRect(), tcs = getComputedStyle(tuner);
    const padL = tb.left + parseFloat(tcs.borderLeftWidth);

    const grp = q('#mt-a4-scrub');
    const gb = grp.getBoundingClientRect();
    const notch = grp.querySelector('.mt-gl');
    const nb = notch.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(notch);
    const ng = rg.getBoundingClientRect();
    const plate = tuner.querySelector('.mt-plate');
    const pbx = plate.getBoundingClientRect();
    const rg2 = document.createRange(); rg2.selectNodeContents(plate);
    const pg = rg2.getBoundingClientRect();

    const baseline = (el) => {
      if (!el) return null;
      const s = document.createElement('span'); s.textContent = 'x';
      s.style.cssText = 'display:inline-block;width:0;overflow:hidden;font:inherit';
      el.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return y;
    };
    const lbl = q('#mt-a4-scrub .mt-hd');
    const lb = lbl.getBoundingClientRect();

    const rel = (y) => ({ abs: +y.toFixed(2), fromOrigin: +(y - oT).toFixed(2),
      leads: +((y - oT) / LEAD).toFixed(3) });
    const relX = (x) => ({ abs: +x.toFixed(2), fromPad: +(x - padL).toFixed(2),
      ch: +((x - padL) / (INSET / 3)).toFixed(3) });

    return { INSET, LEAD, GROUP, phone,
      originTop: +oT.toFixed(2), originBot: +oB.toFixed(2),
      drawnTopLine: rel(oT + LEAD * 2),
      V: {
        'box top rule': rel(gb.top),
        'notch glyph top': rel(ng.top),
        'notch baseline': rel(baseline(notch)),
        'notch glyph bottom': rel(ng.bottom),
        'box content top': rel(gb.top + parseFloat(getComputedStyle(grp).borderTopWidth)
          + parseFloat(getComputedStyle(grp).paddingTop)),
        'digits baseline': rel(baseline(lbl)),
        'digits ink bottom': rel(lb.bottom),
        'box bottom rule': rel(gb.bottom),
      },
      H: {
        'case padding edge': relX(padL),
        'drawn inset line': relX(padL + INSET),
        'control ink (a4)': relX((() => { const r3 = document.createRange();
          r3.selectNodeContents(lbl.firstChild ? lbl : lbl); return r3.getBoundingClientRect().left; })()),
        'plate box': relX(pbx.left),
        'plate glyph': relX(pg.left),
        'box left rule': relX(gb.left),
        'notch box': relX(nb.left),
        'notch glyph': relX(ng.left),
      } };
  });

  const L = r.LEAD;
  console.log(`\n════ ${width}px ${r.phone ? '(phone)' : ''}  lead ${L}  inset ${r.INSET}  origin y=${r.originTop}`);
  console.log(`  the guide DRAWS its top line at ${r.drawnTopLine.abs} (${r.drawnTopLine.leads} leads from origin)`);
  console.log('  VERTICAL candidates, y from the ladder origin:');
  for (const [k, v] of Object.entries(r.V)) {
    const whole = Math.abs(v.leads - Math.round(v.leads)) < 0.02;
    console.log(`    ${String(k).padEnd(18)} y${String(v.fromOrigin).padStart(7)}  ${String(v.leads).padStart(7)} leads ${whole ? '← on the ladder' : ''}`);
  }
  console.log('  HORIZONTAL candidates, x from the case padding edge:');
  for (const [k, v] of Object.entries(r.H)) {
    const whole = Math.abs(v.ch - Math.round(v.ch)) < 0.02;
    console.log(`    ${String(k).padEnd(18)} x${String(v.fromPad).padStart(7)}  ${String(v.ch).padStart(7)} ch ${whole ? '← a whole character' : ''}`);
  }
  await ctx.close();
}
await browser.close();
