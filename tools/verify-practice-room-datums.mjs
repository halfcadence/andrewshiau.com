// THE TWO DATUMS, checked on the built page. This is the instrument the alignment system is
// judged by, and it is the whole system:
//
//   THE AXIS   — the case's centre line. Everything the instrument radiates from sits on it:
//                the dial, the reading, the verb.
//   THE INSET  — `--mt-inset` (3ch = 27px, the font's own character) from the case's box.
//                Everything else sits on it, flush left or flush right.
//
// Run against a loopback `astro preview` (never 0.0.0.0 — see CLAUDE.md rule 1):
//   npm run build && npx astro preview --host 127.0.0.1 --port 4321
//   VERIFY_URL=http://127.0.0.1:4321/practice-room/ node tools/verify-practice-room-datums.mjs
//
// MEASURE INK, NOT BOXES. Every control here pads out to a tap target with matching negative
// margins, so its box edge is nowhere near its visible edge — and an <input>'s value is not a
// text node, so a naive TreeWalker skips the digits entirely and reports the NEXT visible thing
// as the mark's edge. Both mistakes produced wrong conclusions in this project before the
// harness was fixed (a phantom "97px inset" that was really 48, and a phantom off-grid bpm).
import { chromium } from '@playwright/test';

const URL = process.env.VERIFY_URL || 'http://127.0.0.1:4321/practice-room/';
// THE INSET IS READ FROM THE PAGE, not hardcoded. It was `28` here, and when the datum moved
// to 3ch (27px) the harness failed 28 configurations while reporting the CORRECT new number in
// its own message — a check that has to be hand-edited to follow the thing it checks is a check
// that will eventually be edited wrong. `--mt-inset` is declared on `#mt-app`; whatever it
// resolves to IS the datum, so the assertion becomes "every flush mark sits on the token" and
// stays true across a future change of value.
// TWO datums, two values, and conflating them is a real bug this caught: the HORIZONTAL inset
// is `--mt-inset` (3ch = 27px) and the VERTICAL rhythm is `--lead` (28px). They were equal until
// the inset moved to the character cell, and the vertical checks then failed on 27 while
// reporting the right number — "the reading and the verb are 28.00px apart, not one lead", which
// is the check calling a correct layout wrong. Both are resolved from the page below.
let INSET = null;   // --mt-inset, the horizontal datum
let LEAD = null;    // --lead, the vertical rhythm
const TOL = 0.51; // half a pixel, so a subpixel layout rounds clean
// The list brackets every threshold in the sheet, from both sides — a boundary that is only
// sampled on one side is a boundary nobody checked. 1480/1479 is the meter-stacking switch
// (it moved from 1240 when the drone's 210px column narrowed the metronome), and 1002/1001 is
// the phone switch (it moved from 901 because three cases need 964px before the metronome's
// own meter fits — see the note in practice-room.astro).
const WIDTHS = [2560, 1728, 1512, 1480, 1479, 1440, 1280, 1100, 1024, 1002, 1001, 940, 901, 430, 390, 360];

const browser = await chromium.launch();
let bad = 0;

for (const scheme of ['light', 'dark']) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    // WAIT FOR THE INSTRUMENT, don't sleep at it. A flat 260ms timeout intermittently
    // measured a page that had not finished laying out, and the harness then reported
    // "the tuner's dial: absent" as a DATUM FAILURE — a false red that is worse than no
    // check, because the next person reads it as the alignment breaking at phone width.
    // Wait on the marks themselves, and let a genuine absence fail on its own merit.
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForSelector('#mt-dial', { state: 'attached', timeout: 15000 });
    // `#mt-mic .rd` — the Rams field, not `.w`. The transports have no word since the
    // chooser's treatment 05; waiting on `.w` here would have timed out and taken every
    // check with it.
    await page.waitForSelector('#mt-mic .rd', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(() => {
      const g = document.querySelector('.mt-half[aria-label="Tuner"] .mt-gauge');
      return g && g.getBoundingClientRect().width > 10;
    }, null, { timeout: 15000 });
    await page.waitForTimeout(120); // one frame for the fonts to settle the ink

    // resolve the token from the live page — one source of truth for the datum's value
    ({ INSET, LEAD } = await page.evaluate(() => {
      const app = document.querySelector('#mt-app');
      const px = (expr) => {
        const probe = document.createElement('div');
        probe.style.cssText = `position:absolute;visibility:hidden;width:${expr}`;
        app.appendChild(probe);
        const w = probe.getBoundingClientRect().width;
        probe.remove();
        return +w.toFixed(3);
      };
      return { INSET: px('var(--mt-inset)'), LEAD: px('var(--lead)') };
    }));

    const r = await page.evaluate(({ INSET, LEAD, TOL }) => {
      // ── ink: text ranges + drawn SVG + an input's rendered value ──────────
      const ink = (el) => {
        if (!el) return null;
        let l = Infinity, r = -Infinity;
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let t = w.nextNode(); t; t = w.nextNode()) {
          if (!t.textContent.trim()) continue;
          const rg = document.createRange();
          rg.selectNodeContents(t);
          const b = rg.getBoundingClientRect();
          if (b.width) { l = Math.min(l, b.left); r = Math.max(r, b.right); }
        }
        for (const s of el.querySelectorAll('svg')) {
          const b = s.getBoundingClientRect();
          if (b.width) { l = Math.min(l, b.left); r = Math.max(r, b.right); }
        }
        // an <input>'s value: measure the glyphs and place them per text-align
        const inputs = el.matches?.('input') ? [el] : [...el.querySelectorAll('input')];
        for (const i of inputs) {
          const cs = getComputedStyle(i), b = i.getBoundingClientRect();
          if (!b.width || !i.value) continue;
          const c = document.createElement('canvas').getContext('2d');
          c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
          const tw = c.measureText(i.value).width;
          const cl = b.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
          const cr = b.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
          const tl = (cs.textAlign === 'right' || cs.textAlign === 'end') ? cr - tw
            : cs.textAlign === 'center' ? cl + (cr - cl - tw) / 2
              : cl;
          l = Math.min(l, tl); r = Math.max(r, tl + tw);
        }
        return l > r ? null : { l, r, c: (l + r) / 2 };
      };

      const caseOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el), b = el.getBoundingClientRect();
        return {
          L: b.left + parseFloat(cs.borderLeftWidth),
          R: b.right - parseFloat(cs.borderRightWidth),
          axis: (b.left + b.right) / 2,
        };
      };
      const T = caseOf('.mt-half[aria-label="Tuner"]');
      const M = caseOf('.mt-half[aria-label="Metronome"]');
      const q = (s) => document.querySelector(s);

      // ── THE AXIS ─────────────────────────────────────────────────────────
      // THE TWO VERBS ARE CHECKED BY THEIR WORD, not here — see the WORD block below. Their
      // ink EXTENT is deliberately 17.50px off this axis now, because `.tbtn` is
      // [track][gap][word] and it is the WORD that must sit on the figure's pivot. Checking
      // both would be checking two incompatible things: the extent was centred for two passes
      // while the word visibly was not, which is exactly the defect the word check exists for.
      const axis = [
        ['the tuner’s dial', '.mt-half[aria-label="Tuner"] .mt-gauge', T],
        ['the reading', '.mt-read', T],
        ['the pendulum', '.mt-half[aria-label="Metronome"] .mt-gauge', M],
      ];
      const axisFails = [];
      for (const [name, sel, c] of axis) {
        const v = ink(q(sel));
        if (!v || !c) { axisFails.push(`${name}: absent`); continue; }
        const off = v.c - c.axis;
        if (Math.abs(off) > TOL) axisFails.push(`${name} ${off.toFixed(2)}px off axis`);
      }

      // ── THE INSET ────────────────────────────────────────────────────────
      // The metronome's spec row is one line on a wide screen (its right group flush RIGHT)
      // and two stacked lines below 1240 (both flush LEFT). Read which from the layout rather
      // than hardcoding a width — a hardcoded side is what made an earlier sweep report
      // phantom 267/927px insets.
      const fl = q('.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fl');
      const fr = q('.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fr');
      const stacked = fl && fr
        && Math.abs(fl.getBoundingClientRect().top - fr.getBoundingClientRect().top) > 2;

      const insets = [
        ['a4 · the tuner’s spec', '.mt-half[aria-label="Tuner"] .mt-ctop > .mt-fr', T, 'L'],
        ['play tone · the tuner’s foot', '.mt-half[aria-label="Tuner"] .mt-cfoot > .mt-fr', T, 'L'],
        ['beats', '.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fl', M, 'L'],
        // SUBDIVIDE IS CHECKED AT GLYPH LEVEL BELOW, not here. Its meter is shifted right by
        // the digit cell's dead tail (`1ch - 20px`) so the `7`'s glyph lands on the datum; that
        // necessarily puts the group's BOX 11px past it, which this box-level check would read
        // as a 17px inset and fail. The box was never the thing the eye reads — measuring it is
        // exactly what let the 11px gap ship green. One check per mark, at the level that
        // matters.
        ...(stacked ? [['subdivide', '.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fr', M, 'L']] : []),
        ['bpm · the metronome’s foot', '.mt-half[aria-label="Metronome"] .mt-cfoot > .mt-fr', M, 'L'],
        ['the hint line', '.mt-hintline', T, 'L'],
      ];
      const insetFails = [];
      const seen = new Set();
      for (const [name, sel, c, side] of insets) {
        const v = ink(q(sel));
        if (!v || !c) continue; // the hint line is empty unless the mic was refused
        const d = side === 'L' ? v.l - c.L : c.R - v.r;
        seen.add(+d.toFixed(1));
        if (Math.abs(d - INSET) > TOL) insetFails.push(`${name} at ${d.toFixed(2)}px`);
      }

      // ── THE MARK ON THE PIVOT ─────────────────────────────────────────────
      // WAS "the word on the axis". The axis check above measures each mark's ink EXTENT and
      // centres that; for the old two-mark transport ([track][gap][word]) the extent centred
      // at 0.00 while the word sat 17.50px right of it, which hid a real defect for two
      // passes. Then the fix for THAT (track out of flow) left the track hanging 17.50px
      // LEFT — the "not aligned and ugly" this round started from.
      // Treatment 05 removes the cause rather than re-positioning the symptom: the control is
      // ONE mark, so extent and mark are the same thing and there is nothing left to disagree.
      // What still has to be proven is that the mark lands on the FIGURE'S PIVOT, computed
      // from the drawing rather than from the case box — instrument-panel practice makes the
      // pointer the datum its furniture aligns to (14 CFR 25.1321(b); MIL-STD-1472G
      // §5.2.2.5.3c(7)). Measured on the FIELD's rect, which is the whole control's ink.
      // All THREE cases now, not two: the drone case has a verb on the same row.
      const wordFails = [];
      for (const [name, btn, fig] of [
        ['the tuner’s verb', '#mt-mic', '#mt-dial'],
        ['the metronome’s verb', '#mt-run', '#mt-metro-fig'],
      ]) {
        const mark = q(`${btn} .rd`);
        const svg = q(fig);
        if (!mark || !svg) continue;
        const sb = svg.getBoundingClientRect();
        const pivot = sb.left + sb.width * (160 / 320);   // viewBox 320x184, pivot at x=160
        const mb = mark.getBoundingClientRect();
        const off = (mb.left + mb.right) / 2 - pivot;
        if (Math.abs(off) > TOL) {
          wordFails.push(`${name} reads ${off.toFixed(2)}px off its figure’s pivot`);
        }
      }
      // The drone's figure is a 72px LETTER, not the arc-and-bob, so there is no viewBox
      // pivot to derive — its datum is the case axis, which is what the letter is centred on.
      {
        const mark = q('#mt-drone .rd');
        const half = q('.mt-half.mt-drone');
        if (mark && half) {
          const hb = half.getBoundingClientRect(), mb = mark.getBoundingClientRect();
          const off = (mb.left + mb.right) / 2 - (hb.left + hb.right) / 2;
          if (Math.abs(off) > TOL) {
            wordFails.push(`the drone’s verb reads ${off.toFixed(2)}px off its case axis`);
          }
        }
      }

      // ── THE POINTER MAY NOT CROSS THE SCALE ───────────────────────────────
      // Inside each figure the marks are placed by RADIUS from the pivot, and one rule governs
      // the pair that matters: the pointer reaches the scale and stops. MIL-STD-1472G
      // §5.2.2.5.3b(5)(a) — "shall extend to, but not overlap, the shortest scale graduation
      // marks." Measured in viewBox units, from the SVG the page actually ships:
      //   bob outer  = 160 − cy + r      (the disc's far edge)
      //   tick inner = 160 − tick.y2     (where the scale mark begins)
      // The bob was at r 122 against a scale at r 118, so at exact tune the disc hid 25% of the
      // in-tune tick. Chosen fix: the arm ends at 48 instead of 44, putting the bob's edge ON
      // the scale (both 118). Asserted for BOTH figures, because they share the drawing and a
      // fix that landed on one would split the pair.
      const radiiFails = [];
      for (const [name, figSel, needleSel, tickSel] of [
        ['the tuner’s needle', '#mt-dial', '#mt-needle', '#mt-tick'],
        // the metronome has no tick of its own — its strike flashes are the end ticks — so the
        // pendulum is checked against the SAME scale radius the tuner states, which is the
        // point of them being one drawing.
        ['the pendulum', '#mt-metro-fig', '#mt-pend', null],
      ]) {
        const fig = q(figSel);
        const needle = q(needleSel);
        if (!fig || !needle) continue;
        const bob = needle.querySelector('circle');
        const arm = needle.querySelector('line');
        if (!bob || !arm) continue;
        const cy = parseFloat(bob.getAttribute('cy'));
        const r = parseFloat(bob.getAttribute('r'));
        const bobOuter = 160 - cy + r;
        // the scale: the tuner's own tick, or the tuner's value for the shared drawing
        const tickEl = tickSel ? q(tickSel) : q('#mt-tick');
        if (!tickEl) continue;
        const tickInner = 160 - parseFloat(tickEl.getAttribute('y2'));
        if (bobOuter > tickInner + 0.01) {
          radiiFails.push(`${name}: the bob reaches r ${bobOuter} past a scale at r ${tickInner}`
            + ` — it crosses by ${(bobOuter - tickInner)} viewBox units`);
        }
        // and the arm must still REACH the scale — "extend to" is half the rule, so a bob that
        // stops short is as wrong as one that overshoots, just less visibly.
        if (bobOuter < tickInner - 0.01) {
          radiiFails.push(`${name}: the bob stops at r ${bobOuter}, short of the scale at`
            + ` r ${tickInner}`);
        }
      }

      // ── THE INSET IS A WHOLE CHARACTER ────────────────────────────────────
      // Reading the token from the page made every other check follow it automatically — and
      // red-cased, that meant reverting the token to 28px PASSED: the sheet was internally
      // consistent at the wrong value. Self-consistency is not the property being asserted.
      // The property is that the frame's clearance is a whole number of the font's own
      // characters, so the frame and the type ladder are one ladder (MIL-STD-1472G
      // §5.2.3.14.12 states legend clearance in the width of the letter H; here 1ch = 9px).
      // 28px = 3.111ch fails this; 3ch = 27px passes.
      const unitFails = [];
      {
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;font:inherit;width:10ch';
        document.body.appendChild(probe);
        const ch = probe.getBoundingClientRect().width / 10;
        probe.remove();
        const inCh = INSET / ch;
        if (Math.abs(inCh - Math.round(inCh)) > 0.02) {
          unitFails.push(`the inset is ${INSET}px = ${inCh.toFixed(3)}ch, not a whole character`);
        }
      }

      // ── THE GLYPH, NOT THE GROUP'S BOX ────────────────────────────────────
      // The check above measures each flush GROUP's ink extent, and that is not enough: it
      // read 28.00px for the subdivide meter while the `7` glyph ended 11.00px short of the
      // datum, because a digit cell is 20px wide and holds a 9px numeral — the group's ink
      // box ended at the cell's edge, not the glyph's. The user caught it by eye
      // ("subdivide doesnt seem to be right aligned to its datum") against a green harness.
      // So the flush mark's OWN outermost glyph is checked too, and which glyph that is
      // depends on the layout: stacked, both meters read flush LEFT from their LABEL (like
      // the tuner's `a4`); on one line, subdivide reads flush RIGHT from its LAST DIGIT.
      const glyphFails = [];
      {
        const el = stacked
          // The notch, not the hidden label — same reason as the top datum above. The
          // `.mt-lb` still carries the accessible name but has no box, so its glyph rect was
          // the page origin and this read −662px off the datum.
          ? q('.mt-half[aria-label="Metronome"] .mt-ctop > .mt-fr > .mt-gl')
          : [...document.querySelectorAll('#mt-sub-seg .rbtn')].pop();
        if (el && M) {
          const rg = document.createRange();
          rg.selectNodeContents(el);
          const g = rg.getBoundingClientRect();
          // THE NOTCH CARRIES 1ch OF PAPER KNOCK-OUT, which is 9px at this type size, and the
        // datum is about INK not boxes — the same lesson this file already records for the
        // controls that pad out to a tap target. `.mt-plate` does exactly this too, so the
        // case's own name has always been inset by its own knock-out. Measured, not assumed:
        // the notch's glyph starts 9.00px inside its box's left edge at every width.
        const KNOCKOUT = stacked ? 9 : 0;
        const d = stacked ? g.left - (M.L + INSET + KNOCKOUT) : (M.R - INSET) - g.right;
          if (Math.abs(d) > TOL) {
            glyphFails.push(`subdivide's ${stacked ? 'label' : 'last digit'} ` +
              `${d.toFixed(2)}px off the ${stacked ? 'left' : 'right'} datum`);
          }
        }
        // and the rule under the digits must still sit under the digits it counts — the
        // rejected fix for the nit above (right-aligning the glyphs inside their cells) put
        // the numerals on the datum and left the rule 10px behind, so this pins both.
        const rule = q('#mt-sub-seg .rm-rule');
        const on = [...document.querySelectorAll('#mt-sub-seg .rbtn.on')];
        if (rule && on.length) {
          const segs = [...rule.querySelectorAll('line')].map((l) => l.getBoundingClientRect());
          if (segs.length) {
            const ruleR = Math.max(...segs.map((s) => s.right));
            const inkR = Math.max(...on.map((d) => {
              const rg2 = document.createRange();
              rg2.selectNodeContents(d);
              return rg2.getBoundingClientRect().right;
            }));
            if (Math.abs(ruleR - inkR) > 2) {
              glyphFails.push(`the subdivide rule is ${(ruleR - inkR).toFixed(1)}px out of ` +
                'register with the digits it measures');
            }
          }
        }
      }

      // ── THE THREE VERTICAL DATUMS ─────────────────────────────────────────
      // The 28px row ladder places the content, but only three of its lines can be DATUMS:
      // measured, the first `1fr` slack row resolves to a fraction (214.938px) and every line
      // after it is 9.06px off a lead, because the middle of this screen is elastic by design.
      // So the vertical system is: TOP (the spec line), CENTRE (the reading and the verb, one
      // lead apart), BOTTOM (the played controls). Baselines, not boxes.
      const baseline = (sel) => {
        const el = q(sel);
        if (!el) return null;
        const s = document.createElement('span');
        s.textContent = 'x';
        s.style.cssText = 'display:inline-block;width:0;overflow:hidden;font:inherit';
        el.appendChild(s);
        const y = s.getBoundingClientRect().bottom;
        s.remove();
        return y;
      };
      const vertFails = [];
      {
        const uniq = (a) => [...new Set(a.filter((v) => v != null).map((v) => +v.toFixed(1)))];
        // TOP — the spec row's CONTROLS share one line. This used to measure the a4 and
        // subdivide LABELS against the beats digits, which worked while every label sat on
        // its control's baseline. The sub-cases treatment (2026-08-07) moved the labels into
        // notches, and a notch is 14px ABOVE its box's top edge by construction — outside it,
        // knocked out of the rule. So a notch and a digit CANNOT share a baseline, and
        // asserting they do asserted the treatment away.
        // Measured before rewriting: notch 71px, digits 105px, a 34px gap that is the
        // treatment working rather than failing. What still has to hold — and is the thing
        // the row was always about — is that the CONTROLS line up: the a4 field, the beats
        // digits and the subdivide digits. The notches' own alignment is covered by the
        // inset check, since they are all 14px from their own box's left edge.
        const top = stacked
          // NOT `#mt-a4` itself: `baseline()` appends a probe span, and an <input> cannot
          // hold a child, so it returned 0 — a silent zero that read as a second datum. The
          // wrapper's own `hz` text sits on the field's baseline, which is what the label
          // used to provide.
          ? uniq([baseline('#mt-a4-scrub .mt-hd'), baseline('#mt-beats-seg .rbtn')])
          : uniq([baseline('#mt-a4-scrub .mt-hd'), baseline('#mt-beats-seg .rbtn'),
            baseline('#mt-sub-seg .rbtn')]);
        if (top.length !== 1) vertFails.push(`the top datum is ${top.length} lines: ${top.join(', ')}`);
        if (stacked) {
          const gap = baseline('#mt-sub-seg .rbtn') - baseline('#mt-beats-seg .rbtn');
          if (Math.abs(gap % LEAD) > TOL) {
            vertFails.push(`stacked subdivide sits ${gap.toFixed(2)}px below beats, not a whole lead`);
          }
        }
        // CENTRE — ONE LINE NOW, not a pair a lead apart (transport chooser Q1/02).
        // It used to assert `verb − reading == LEAD`, because the verb had its own row below.
        // The verb moved INTO the reading's row, so that assertion would now be checking that
        // two things on one line are 28px apart — it would fail on the correct layout, which
        // is the worst kind of check. What has to hold instead:
        //   · the three verbs' marks sit on ONE horizontal line (they are one row across three
        //     cases; this is the original complaint, "the start uui ... not veritcally aligned")
        //   · the tuner's reading and its verb share that line, since they are the same row
        // Measured on the MARK's box, not a baseline: the field is an svg with no text, and an
        // svg's baseline is its bottom edge, which is not where its ink centres.
        const midY = (sel) => {
          const e = q(sel);
          if (!e) return null;
          const b = e.getBoundingClientRect();
          return b.height ? b.top + b.height / 2 : null;
        };
        const verbs = uniq([midY('#mt-mic .rd'), midY('#mt-run .rd'), midY('#mt-drone .rd')]);
        if (verbs.length !== 1) {
          vertFails.push(`the verbs sit on ${verbs.length} lines: ${verbs.join(', ')}`);
        }
        // The reading shares the verb's row: its x-height band must contain the mark's centre.
        // (Baseline-to-centre is not zero — the dot is optically centred on the x-height, which
        // is what `translateY(1px)` tunes — so this asserts the band, not an exact equality.)
        const read = baseline('#mt-note');
        const vT = midY('#mt-mic .rd');
        if (read != null && vT != null && (read - vT) > LEAD / 2) {
          vertFails.push(`the reading sits ${(read - vT).toFixed(2)}px below the verb, not on its row`);
        }
        // BOTTOM — the played controls share one line. `#mt-tone`/`#mt-refnote` left the tuner
        // with the drone split; the drone's own foot carries them now.
        // THE DRONE'S NOTE LEFT THIS DATUM ENTIRELY, and the harness had to be corrected
        // rather than the page. `#mt-refnote` was a foot-line scrub control, so it belonged
        // on the bottom datum. It became `#mt-dnote` when the drone's FIGURE was promoted to
        // be the pitch control — and a figure is not a foot control: measured, it is a 72px
        // letter whose box sits at y405 while the foot line sits at y784. Asserting the two
        // share a baseline is asserting the case has no middle.
        // The failure this produced is worth recording because it arrived in two disguises:
        // first as `MISSING CONTROLS: #mt-refnote` (the id moved, the testid did not, so the
        // e2e specs never noticed), and once that was pointed at the new id, as a genuine
        // "bottom datum is 2 lines: 444, 784". Both times 32/32 red, neither time about
        // alignment. A harness that outlives the layout it measures reports on a page that
        // no longer exists.
        const bot = uniq([baseline('#mt-bpm-scrub .mt-lb'), baseline('#mt-tap .w')]);
        if (bot.length !== 1) vertFails.push(`the bottom datum is ${bot.length} lines: ${bot.join(', ')}`);
      }

      // ── nothing may regress while satisfying the datums ───────────────────
      // `Infinity` for a MISSING node is a silent pass, and the treatment-05 change proved it:
      // `#mt-tone` no longer exists (it left the tuner with the drone), and this check would
      // have gone on reporting a healthy smallest target while measuring one fewer control
      // every run. A named control that is absent is now a FAILURE, not a skip.
      const missing = [];
      const tgt = (s) => {
        const e = q(s);
        if (!e) { missing.push(s); return Infinity; }
        const b = e.getBoundingClientRect();
        return Math.min(b.width, b.height);
      };
      const smallest = Math.min(...['#mt-mic', '#mt-run', '#mt-drone', '#mt-tap', '#mt-dnote',
        '#mt-a4', '#mt-bpm'].map(tgt));

      return {
        axisFails, insetFails, glyphFails, vertFails, wordFails, unitFails, radiiFails,
        distinct: [...seen].sort((a, b) => a - b),
        smallest, missing,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        // the reading must still be able to SHOW a frequency — the `:empty` rule must not
        // have hidden it outright
        hzExists: !!q('#mt-hz'),
      };
    }, { INSET, LEAD, TOL });

    const ok = !r.axisFails.length && !r.insetFails.length && !r.glyphFails.length
      && !r.vertFails.length && !r.wordFails.length && !r.unitFails.length
      && !r.radiiFails.length && !r.overflow && r.smallest >= 24 && r.hzExists
      && !r.missing.length;
    if (!ok) bad++;
    const notes = [
      r.axisFails.length ? `AXIS: ${r.axisFails.join('; ')}` : '',
      r.insetFails.length ? `INSET: ${r.insetFails.join('; ')}` : '',
      r.glyphFails.length ? `GLYPH: ${r.glyphFails.join('; ')}` : '',
      r.vertFails.length ? `VERTICAL: ${r.vertFails.join('; ')}` : '',
      r.wordFails.length ? `WORD: ${r.wordFails.join('; ')}` : '',
      r.unitFails.length ? `UNIT: ${r.unitFails.join('; ')}` : '',
      r.radiiFails.length ? `RADII: ${r.radiiFails.join('; ')}` : '',
      r.distinct.length > 1 ? `insets seen: ${r.distinct.join(', ')}` : '',
      r.overflow ? 'HORIZONTAL OVERFLOW' : '',
      r.smallest < 24 ? `target ${r.smallest}px < 24` : '',
      !r.hzExists ? 'the reading’s Hz element is gone' : '',
      r.missing.length ? `MISSING CONTROLS: ${r.missing.join(', ')}` : '',
    ].filter(Boolean).join('  |  ');
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${scheme.padEnd(5)} ${String(width).padStart(4)}` +
      (notes ? `  ${notes}` : ''));
    await ctx.close();
  }
}

await browser.close();
// THE MESSAGE NAMES WHAT THIS ASSERTS, NOT WHAT ⌥G DRAWS. It used to end "and the three
// vertical lines", which described the overlay — and the overlay has since changed twice. A
// green summary describing a guide that no longer exists is the same class of lie this harness
// exists to catch, one level up. What is asserted HERE is the LAYOUT: the axis, the ink's inset,
// and the three horizontal baselines the marks share. What ⌥G draws — the axis plus a line on
// each group box's side rule, one character inside the frame — is asserted in
// tests/unit/practice-room-css.test.ts, which counts the marks.
console.log(bad
  ? `\n${bad} failing configuration(s)`
  : `\nall datums hold — the axis, the ${INSET}px inset (--mt-inset) the ink sits on, and the`
    + ' three shared baselines — at every width, both colourways.'
    + '\n(⌥G draws the axis plus the box-rule pair; the box rules are checked by'
    + ' tools/probe-box-both-datums.mjs.)');
process.exit(bad ? 1 : 0);
