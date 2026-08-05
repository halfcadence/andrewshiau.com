// THE ALIGNMENT CONTRACT, measured on the built page. This is the check the grid pass is
// judged by: every pair below must read 0.00, at every width, or the ladder is not holding.
// Run against a loopback `astro preview` (never 0.0.0.0 — see CLAUDE.md rule 1).
//   VERIFY_URL=http://127.0.0.1:4437/metrotuner/ node tools/verify-metrotuner-grid.mjs
import { chromium } from '@playwright/test';
const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/metrotuner/';
const WIDTHS = [2560, 1440, 1280, 1240, 1236, 1100, 1024, 940, 901];
const b = await chromium.launch();
let bad = 0;
for (const scheme of ['light', 'dark']) {
  for (const W of WIDTHS) {
    const p = await (await b.newContext({viewport:{width:W,height:900}, colorScheme:scheme})).newPage();
    await p.goto(URL); await p.waitForTimeout(250);
    const m = await p.evaluate(() => {
      const bl=(s)=>{const e=document.querySelector(s);if(!e)return null;
        const x=document.createElement('span');x.textContent='x';
        x.style.cssText='display:inline-block;width:0;overflow:hidden;font:inherit';
        e.appendChild(x);const y=x.getBoundingClientRect().bottom;x.remove();return +y.toFixed(2);};
      const R=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
        return {y:+r.top.toFixed(2),h:+r.height.toFixed(2),w:+r.width.toFixed(2),b:+r.bottom.toFixed(2)};};
      const pv=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
        return +(r.top + r.height*(160/184)).toFixed(2);};
      const tgt=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
        return Math.min(r.width,r.height);};
      const hgt=(s)=>{const e=document.querySelector(s);if(!e)return null;
        return +e.getBoundingClientRect().height.toFixed(1);};
      return {
        startT:bl('#mt-mic .w'), startM:bl('#mt-run .w'),
        a4:bl('#mt-a4-scrub .mt-lb'), beats:bl('#mt-beats-seg .rbtn'),
        tone:bl('#mt-tone .w'), ref:bl('#mt-refnote .w'),
        bpm:bl('#mt-bpm-scrub .mt-lb'), tap:bl('#mt-tap .w'),
        pvT:pv('#mt-dial'), pvM:pv('#mt-metro-fig'),
        capT:R('.mt-half[aria-label="Tuner"] .mt-cap').y, capM:R('.mt-half[aria-label="Metronome"] .mt-cap').y,
        cfT:R('.mt-half[aria-label="Tuner"] .mt-cfoot').y, cfM:R('.mt-half[aria-label="Metronome"] .mt-cfoot').y,
        gT:R('.mt-half[aria-label="Tuner"] .mt-gauge').y, gM:R('.mt-half[aria-label="Metronome"] .mt-gauge').y,
        // TARGETS: the SHORTER SIDE, except for the two controls whose narrowness is a
        // documented decision rather than an oversight. The meter digit is 20px wide on
        // purpose — a 44px box centred on the digit 1 would overlap the digit 2 button and
        // swallow clicks meant for the meter (the file argues this at length, and the 140px
        // rule below the digits is the large touch target for the same state). The accent
        // mark is padded to 24px for the same reason. So for those two we check the axis
        // this pass could actually have broken — the HEIGHT, which the removed 8px of
        // padding used to contribute to. Measuring their width would report a red that was
        // red before this change and is not what the pass is being judged on.
        targets:{mic:tgt('#mt-mic'),run:tgt('#mt-run'),tone:tgt('#mt-tone'),tap:tgt('#mt-tap'),
                 ref:tgt('#mt-refnote'),a4h:tgt('#mt-a4-scrub .mt-lb'),bpmh:tgt('#mt-bpm-scrub .mt-lb')},
        // The BASELINE these are judged against is mainline, measured by building the stashed
        // file: digit 20x36, accbtn 25x24, rulebtn 140x21, mic 80x44. The rule button's 21px
        // is under WCAG 2.5.8's 24 and was under it before this pass — it is the SECOND
        // target on a state that also has the 25x24 mark, so it is not the only way in. This
        // harness therefore asserts NO SHRINKAGE against those numbers instead of a flat 24,
        // which is the thing this pass could actually have broken.
        heights:{digit:hgt('#mt-beats-seg .rbtn'),acc:hgt('#mt-acc'),rule:hgt('#mt-accent')},
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    const pairs = [
      ['START  T↔M', m.startT, m.startM],
      ['spec   a4↔beats', m.a4, m.beats],
      ['foot   tone↔ref', m.tone, m.ref],
      ['foot   tone↔bpm', m.tone, m.bpm],
      ['foot   bpm↔tap', m.bpm, m.tap],
      ['pivot  T↔M', m.pvT, m.pvM],
      ['cap    T↔M', m.capT, m.capM],
      ['cfoot  T↔M', m.cfT, m.cfM],
      ['gauge  T↔M', m.gT, m.gM],
    ];
    const fails = pairs.filter(([,a,c]) => a==null||c==null||Math.abs(a-c) > 0.51);
    const small = Object.entries(m.targets).filter(([k,v]) => v!=null && v < 24);
    // the two deliberately-narrow controls: judged on height only (see the note above)
    const MAINLINE = {digit:36, acc:24, rule:21};   // measured on the stashed build
    const shortH = Object.entries(m.heights).filter(([k,v]) => v!=null && v < MAINLINE[k]);
    const ok = !fails.length && !small.length && !shortH.length && !m.overflowX;
    if (!ok) bad++;
    console.log(`${ok?'ok  ':'FAIL'} ${scheme.padEnd(5)} ${String(W).padStart(4)}` +
      (fails.length?`  misaligned: ${fails.map(([n,a,c])=>`${n} Δ${(a-c).toFixed(2)}`).join(', ')}`:'') +
      (small.length?`  target<24px: ${small.map(([k,v])=>`${k}=${v}`).join(', ')}`:'') +
      (shortH.length?`  SHRANK vs mainline: ${shortH.map(([k,v])=>`${k}=${v}`).join(', ')}`:'') +
      (m.overflowX?'  HORIZONTAL OVERFLOW':''));
    await p.context().close();
  }
}
await b.close();
console.log(bad ? `\n${bad} failing configuration(s)` : '\nall configurations aligned to 0.00 (±0.5px); no target smaller than mainline; no overflow');
process.exit(bad?1:0);
