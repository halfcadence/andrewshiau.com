// WHAT THE TWO PAGES ACTUALLY MEASURE, side by side — read off the built pages before
// copying a single number out of the practice room's comments into /pitchgraph/.
// The comments in practice-room.astro are unusually careful, but they are still prose;
// the ladder, the box chrome and the switch's geometry are facts the page can be asked for.
//
//   npm run build && npx astro preview --host 127.0.0.1 --port 4321
//   node tools/probe-room-vs-pitchgraph.mjs
import { chromium } from '@playwright/test';

const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:4321';
const W = Number(process.env.PROBE_W || 1440);
const H = Number(process.env.PROBE_H || 900);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H } });
const page = await ctx.newPage();

const probe = async (path, fn) => {
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return page.evaluate(fn);
};

const room = await probe('/practice-room/console/', () => {
  const cs = getComputedStyle(document.getElementById('mt-app'));
  const pages = document.getElementById('mt-pages');
  const tuner = document.querySelector('.mt-half[aria-label="Tuner"]');
  const R = (el) => { const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  const box = tuner.querySelector('.mt-grp');
  const rd = document.querySelector('#mt-mic .rd');
  const fld = document.querySelector('#mt-mic .fld');
  const note = document.getElementById('mt-note');
  return {
    tokens: {
      lead: getComputedStyle(document.documentElement).getPropertyValue('--lead').trim(),
      inset: cs.getPropertyValue('--mt-inset').trim(),
      caseTop: cs.getPropertyValue('--mt-case-top').trim(),
      boxPull: cs.getPropertyValue('--mt-box-pull').trim(),
      boxPadTok: getComputedStyle(box).getPropertyValue('--mt-box-pad').trim(),
      appH: cs.height,
    },
    pagesPad: getComputedStyle(pages).padding,
    ladder: getComputedStyle(pages).gridTemplateRows,
    app: R(document.getElementById('mt-app')),
    pages: R(pages),
    case: R(tuner),
    casePad: getComputedStyle(tuner).padding,
    plate: R(tuner.querySelector('.mt-plate')),
    boxRect: R(box),
    boxPad: getComputedStyle(box).padding,
    boxMargin: getComputedStyle(box).margin,
    notch: R(box.querySelector('.mt-gl')),
    a4Label: R(box.querySelector('label')),
    gauge: R(tuner.querySelector('.mt-gauge')),
    read: R(tuner.querySelector('.mt-read')),
    readCols: getComputedStyle(tuner.querySelector('.mt-read')).gridTemplateColumns,
    cap: R(tuner.querySelector('.mt-cap')),
    btn: R(document.getElementById('mt-mic')),
    btnPad: getComputedStyle(document.getElementById('mt-mic')).padding,
    btnMargin: getComputedStyle(document.getElementById('mt-mic')).margin,
    rd: R(rd),
    rdTransform: getComputedStyle(rd).transform,
    fldStroke: getComputedStyle(fld).strokeWidth,
    dotTravel: getComputedStyle(document.querySelector('#mt-mic .dt')).transform,
    note: R(note),
    hint: R(tuner.querySelector('.mt-hintline')),
    // the reading's cap centre, which is what `.rd`'s 9.5px translate was derived against
    fontSize: getComputedStyle(note).fontSize,
  };
});

const pg = await probe('/pitchgraph/', () => {
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  const kase = document.querySelector('.pg-case');
  return {
    case: R(kase),
    casePad: getComputedStyle(kase).padding,
    plate: R(kase.querySelector('.pg-plate')),
    ctop: R(kase.querySelector('.pg-ctop')),
    a4: R(kase.querySelector('.pg-a4')),
    fig: R(document.getElementById('pg-fig')),
    read: R(kase.querySelector('.pg-read')),
    note: R(document.getElementById('pg-note')),
    panels: R(document.getElementById('pg-panels')),
    cap: R(kase.querySelector('.pg-cap')),
    btn: R(document.getElementById('pg-listen')),
    hint: R(document.getElementById('pg-hint')),
    foot: R(document.querySelector('.pg-foot')),
    docH: document.documentElement.scrollHeight,
  };
});

console.log(`viewport ${W}x${H}`);
console.log('\n── PRACTICE ROOM ─────────────────────────────');
console.dir(room, { depth: null });
console.log('\n── PITCHGRAPH (today) ────────────────────────');
console.dir(pg, { depth: null });

await browser.close();
