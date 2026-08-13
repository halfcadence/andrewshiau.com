// PITCHGRAPH AGAINST THE PRACTICE ROOM — the check that pays for the duplication.
//
// The two tools share a host and are meant to read as one instrument, but they cannot
// share their CSS today: the room's box, notch, switch and scrub handle live in its own
// Astro-scoped <style>, so those selectors compile to a `data-astro-cid` this page's
// elements will never carry, and lifting them into global.css would mean renaming five
// families of class in a 4000-line file that eight harnesses select on.
//
// So the copies are asserted instead of promised. This measures BOTH BUILT PAGES in one
// browser and fails by name when a token, a box measure, the switch's geometry or a datum
// stops agreeing. It is the instrument for the one failure this whole pass was fixing:
// the room moved three times and this page did not, and nothing said so.
//
// It also checks what only THIS page can be wrong about — that it is a screen: a whole
// number of leads tall, not scrolling, its instrument group contiguous, and its verb on
// the case's centre axis.
//
//   npm run build && npx astro preview --host 127.0.0.1 --port 4388
//   VERIFY_BASE=http://127.0.0.1:4388 node tools/verify-pitchgraph-parity.mjs
//
// MEASURE THE PAGE, NEVER THE SOURCE. Every number below is read from a rendered element
// or a computed style. The room's comments are unusually careful and still only prose —
// this project has already shipped a "17px" that measured 18 and a datum harness that
// hardcoded a 28 the page had moved to 27.
import { chromium } from '@playwright/test';

const BASE = process.env.VERIFY_BASE || 'http://127.0.0.1:4388';
// THE FAKE MICROPHONE, because the IDLE PAGE IS NOT THE PAGE. The first version of this harness
// checked the instrument at rest and passed 771 checks while TWO real defects sat in the running
// state, both found by shooting the page mid-phrase instead:
//   · the reading wrapped to two lines at 390 and 360 once a frequency was in it, which took the
//     28px row to 56 and pushed the switch down into the record row;
//   · the switch's 9.5px optical nudge overhung its row by 3.5px, and with panels present that
//     overhang was drawn into a panel's own figure. (That nudge is deleted as of 2026-08-12 — the
//     row was already centring the mark — so this one is history, not a live hazard. Kept because
//     the reason the harness measures the RUNNING page is what it is a record of.)
// Neither is visible without audio, so the harness takes the same phrase fixture the e2e suite
// drives and measures the instrument RUNNING as well as at rest.
const FIXTURE = new URL('../tests/e2e/fixtures/phrase-4.wav', import.meta.url).pathname;
const MIC_ARGS = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
  `--use-file-for-fake-audio-capture=${FIXTURE}`,
];
const TOL = 0.51;               // half a pixel, so a subpixel layout rounds clean
// Both colourways, and widths that bracket this page's own two thresholds (1001/1002 for
// the phone padding, 640/641 for the short screen) plus the room's, so a change on either
// page is sampled from both sides of every switch it could cross.
const WIDTHS = (process.env.VERIFY_WIDTHS || '1728,1512,1440,1280,1100,1002,1001,900,430,429,390,360')
  .split(',').map(Number);
// THE LIVE HALF IS EXPENSIVE — it plays a 2-second phrase per configuration, so the full sweep
// runs ~6 minutes. `VERIFY_LIVE_WIDTHS` narrows which widths get the running-instrument checks
// while every width still gets the (instant) static ones. Default: the four that bracket this
// page's own two thresholds, where every live defect so far has lived. Set it to the same list
// as VERIFY_WIDTHS for the full pass before a deploy.
const LIVE = new Set((process.env.VERIFY_LIVE_WIDTHS || '1440,430,429,390,360')
  .split(',').map(Number));

let bad = 0;
const fail = (msg) => { bad++; console.log(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);
const near = (label, a, b, tol = TOL) => {
  if (Math.abs(a - b) <= tol) pass(`${label} — ${a.toFixed(2)} vs ${b.toFixed(2)}`);
  else fail(`${label}: ${a.toFixed(2)} vs ${b.toFixed(2)} (Δ${(a - b).toFixed(2)})`);
};
const same = (label, a, b) => {
  if (String(a) === String(b)) pass(`${label} — ${a}`);
  else fail(`${label}: "${a}" vs "${b}"`);
};

const browser = await chromium.launch({ args: MIC_ARGS });

// ── WHAT EACH PAGE REPORTS ABOUT ITSELF ────────────────────────────────────────
// The two readers return the SAME SHAPE, so the comparison below is by key rather than by
// a pile of hand-paired selectors — which is what let the old drift go unnoticed: nothing
// ever put the two pages' numbers in one table.
const readRoom = () => {
  const app = document.getElementById('mt-app');
  const cs = getComputedStyle(app);
  const kase = document.querySelector('.mt-half[aria-label="Tuner"]');
  const box = kase.querySelector('.mt-grp');
  const btn = document.getElementById('mt-mic');
  const R = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  return {
    tokens: {
      inset: cs.getPropertyValue('--mt-inset').trim(),
      caseTop: cs.getPropertyValue('--mt-case-top').trim(),
      boxPull: cs.getPropertyValue('--mt-box-pull').trim(),
      boxPad: getComputedStyle(box).getPropertyValue('--mt-box-pad').trim(),
    },
    appH: parseFloat(cs.height),
    // THE FRAME IS ONE LINE DRAWN TWO WAYS, so what is comparable is WHERE IT IS, not which
    // property draws it. The room's cases lose their border below 1002px and get a `::before`
    // drawn 1ch inside instead — a bordered snap page would shift its scroller's geometry —
    // so a naive `borderTopWidth` comparison read 1px against 0px and called a correct phone
    // layout a drift. Report the frame's own stroke and its distance from the viewport, from
    // whichever element is drawing it.
    frame: (() => {
      const cb = getComputedStyle(kase);
      const drawn = getComputedStyle(kase, '::before');
      const r = kase.getBoundingClientRect();
      const bordered = parseFloat(cb.borderTopWidth) > 0;
      return bordered
        ? { stroke: cb.borderTopWidth, x: r.x, by: 'border' }
        : { stroke: drawn.borderTopWidth, x: r.x + parseFloat(drawn.left || '0'), by: '::before' };
    })(),
    casePadX: getComputedStyle(kase).paddingLeft,
    casePadY: getComputedStyle(kase).paddingTop,
    plateTop: getComputedStyle(kase.querySelector('.mt-plate')).top,
    box: { rect: R(box), pad: getComputedStyle(box).padding, margin: getComputedStyle(box).marginLeft },
    notchTop: getComputedStyle(box.querySelector('.mt-gl')).top,
    // the switch: its ink, its target, its optical nudge and its stroke
    sw: {
      ink: R(btn.querySelector('.rd')),
      target: R(btn),
      transform: getComputedStyle(btn.querySelector('.rd')).transform,
      stroke: getComputedStyle(btn.querySelector('.fld')).strokeWidth,
      pad: getComputedStyle(btn).padding,
      hasWord: !!btn.querySelector('.w'),
    },
    // the scrub handle's padded target
    handle: R(box.querySelector('.mt-hd')),
    // the ink datum: where a flush control's first glyph starts, relative to the case box
    caseRect: R(kase),
    fieldFontSize: getComputedStyle(box.querySelector('input')).fontSize,
  };
};

const readPg = () => {
  const app = document.getElementById('pg-app');
  const cs = getComputedStyle(app);
  const kase = document.querySelector('.pg-case');
  const box = kase.querySelector('.pg-grp');
  const btn = document.getElementById('pg-listen');
  const R = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  return {
    tokens: {
      inset: cs.getPropertyValue('--pg-inset').trim(),
      caseTop: cs.getPropertyValue('--pg-case-top').trim(),
      boxPull: cs.getPropertyValue('--pg-box-pull').trim(),
      boxPad: getComputedStyle(box).getPropertyValue('--pg-box-pad').trim(),
    },
    appH: parseFloat(cs.height),
    frame: (() => {
      const cb = getComputedStyle(kase);
      const r = kase.getBoundingClientRect();
      return { stroke: cb.borderTopWidth, x: r.x, by: 'border' };
    })(),
    casePadX: getComputedStyle(kase).paddingLeft,
    casePadY: getComputedStyle(kase).paddingTop,
    plateTop: getComputedStyle(kase.querySelector('.pg-plate')).top,
    box: { rect: R(box), pad: getComputedStyle(box).padding, margin: getComputedStyle(box).marginLeft },
    notchTop: getComputedStyle(box.querySelector('.pg-gl')).top,
    sw: {
      ink: R(btn.querySelector('.pg-rd')),
      target: R(btn),
      transform: getComputedStyle(btn.querySelector('.pg-rd')).transform,
      stroke: getComputedStyle(btn.querySelector('.pg-fld')).strokeWidth,
      pad: getComputedStyle(btn).padding,
      hasWord: !!btn.querySelector('.pg-w'),
    },
    handle: R(box.querySelector('.pg-hd')),
    caseRect: R(kase),
    fieldFontSize: getComputedStyle(box.querySelector('input')).fontSize,
    // ── THIS PAGE'S OWN CONTRACT, which the room has no counterpart for ──────
    screen: {
      lead: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lead')),
      scrollH: document.documentElement.scrollHeight,
      clientH: document.documentElement.clientHeight,
      appScroll: app.scrollHeight - app.clientHeight,
      fig: R(document.getElementById('pg-fig')),
      read: R(kase.querySelector('.pg-read')),
      panels: R(document.getElementById('pg-panels')),
      cap: R(kase.querySelector('.pg-cap')),
      // the two slack rows, read off the resolved track list rather than inferred
      rows: getComputedStyle(document.getElementById('pg-screen')).gridTemplateRows,
      // the figure's drawn viewBox against its box, which is what a stale H would break
      viewBox: document.getElementById('pg-svg').getAttribute('viewBox'),
    },
  };
};

for (const scheme of ['light', 'dark']) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 }, colorScheme: scheme, permissions: ['microphone'],
    });
    const page = await ctx.newPage();

    // THE TUNER HAS ITS OWN ROUTE (2026-08-12). `/practice-room/` is an index of three links now,
    // so this harness had been failing on `#mt-mic .rd` — an uncaught TimeoutError before the first
    // comparison, which reads as the whole pair being unverified rather than as a stale address.
    await page.goto(`${BASE}/practice-room/console/`, { waitUntil: 'load' });
    await page.waitForSelector('#mt-mic .rd', { state: 'attached', timeout: 15000 });
    const room = await page.evaluate(readRoom);

    await page.goto(`${BASE}/pitchgraph/`, { waitUntil: 'load' });
    await page.waitForSelector('#pg-listen .pg-rd', { state: 'attached', timeout: 15000 });
    const pg = await page.evaluate(readPg);

    console.log(`\n── ${scheme} · ${width}px ────────────────────────────────`);

    // ── THE TOKENS ARE THE SAME MEASURES, BY NAME ────────────────────────────
    // Renamed per page (`--pg-` / `--mt-`) so neither can silently inherit the other's,
    // and paired here so a change to one is a red rather than a divergence.
    for (const k of ['inset', 'caseTop', 'boxPull', 'boxPad']) {
      same(`token ${k}`, pg.tokens[k], room.tokens[k]);
    }

    // ── THE CASE ─────────────────────────────────────────────────────────────
    same('the frame is the same hairline', pg.frame.stroke, room.frame.stroke);
    // AND IT SITS THE SAME DISTANCE FROM THE VIEWPORT, however it is drawn. This is the check
    // that caught the phone regression: the room's frame is 9px in at 390 and this page's was
    // 56px in, which cost the trace 58px of ink on the one viewport where x is time.
    near('the frame sits the same distance from the viewport', pg.frame.x, room.frame.x);
    same('case inset (horizontal)', pg.casePadX, room.casePadX);
    same('case vertical padding is the ladder, not padding', pg.casePadY, room.casePadY);
    // THE PLATE'S OFFSET IS COMPARED ONLY WHERE BOTH FRAMES ARE THE CASE'S OWN BORDER. Below
    // 1002px the room's plate drops to straddle its DRAWN frame instead (`1ch - 14px` = −5px),
    // which is a different line in a different place — pairing the two numbers there compares
    // a plate on a border against a plate on a `::before` and fails on correct pages.
    if (room.frame.by === 'border') same('plate straddles the frame at the same offset', pg.plateTop, room.plateTop);
    else pass(`plate offsets not comparable — the room draws its phone frame with ${room.frame.by}`);

    // ── THE GROUP BOX, and the arithmetic that has to hold on both ────────────
    same('box padding', pg.box.pad, room.box.pad);
    same('box pull-back', pg.box.margin, room.box.margin);
    same('notch offset', pg.notchTop, room.notchTop);
    near('box height (its chrome is one lead)', pg.box.rect.h, room.box.rect.h);
    // THE RULE LANDS A WHOLE CHARACTER INSIDE THE FRAME LINE. This is the property the room's
    // box-guide pass derived (rule = case inset − pull) and what the ⌥G side datum draws, so
    // it is measured rather than trusted — it is the exact thing that was reported wrong by a
    // pixel once, 17 against 18, the border.
    // MEASURED FROM THE FRAME'S OWN LINE, not from the case's box, and stated PER PAGE rather
    // than as an equality — because the two pages genuinely differ here and the difference is
    // a fact about the room's phone rather than a defect on either.
    // TWO ADMISSIBLE ANSWERS, and the check names which one it found instead of reducing both
    // to a modulo (the first version did, and reported the room's phone as "-1.00px … not a
    // whole 9px character" at all five narrow widths — a correct layout called wrong, which is
    // the one kind of check that is worse than no check):
    //   · A WHOLE CHARACTER INSIDE IT — the desktop case on both pages, and the property the
    //     box-guide pass derived: the ⌥G side datum is drawn at `inset − pull` = 1ch.
    //   · COINCIDENT WITH IT, within the frame's own stroke — the room's phone, where the
    //     drawn frame is inset 1ch into a case whose padding is 3ch and whose box pulls back
    //     2ch, so the box's side rule lands on the frame line exactly. This page cannot
    //     reproduce that with a border doing the frame's job, and does not try to.
    for (const [who, m] of [['pitchgraph', pg], ['the room', room]]) {
      const stroke = parseFloat(m.frame.stroke);
      const fromFrame = m.box.rect.x - (m.frame.x + stroke);
      const cells = fromFrame / 9;
      if (fromFrame >= -stroke - TOL && fromFrame <= TOL) {
        pass(`${who}: the box rule sits ON the frame line (${fromFrame.toFixed(2)}px, within its ${stroke}px stroke)`);
      } else if (Math.abs(fromFrame % 9) <= TOL || Math.abs((fromFrame % 9) - 9) <= TOL) {
        pass(`${who}: the box rule is ${cells.toFixed(2)}ch inside the frame`);
      } else {
        fail(`${who}: the box rule is ${fromFrame.toFixed(2)}px inside the frame — neither on the line nor a whole 9px character`);
      }
    }

    // ── THE SWITCH ───────────────────────────────────────────────────────────
    // The room's transport is the Rams switch at 1.45×, with NO word. Every one of these
    // was a defect on that page at some point, and each is cheap to re-break by copying an
    // older draft of the control.
    if (pg.sw.hasWord || room.sw.hasWord) fail('the transport must carry no word (treatment 05)');
    else pass('the transport is one mark, no word');
    near('switch ink width', pg.sw.ink.w, room.sw.ink.w);
    near('switch ink height', pg.sw.ink.h, room.sw.ink.h);
    same('switch optical nudge', pg.sw.transform, room.sw.transform);
    same('switch field stroke', pg.sw.stroke, room.sw.stroke);
    same('switch target padding', pg.sw.pad, room.sw.pad);
    // WCAG 2.5.8 on BOTH axes, which is what the room's harness caught when the word was
    // deleted there and the button collapsed to the field's width.
    if (Math.min(pg.sw.target.w, pg.sw.target.h) >= 44) pass(`switch target ${pg.sw.target.w.toFixed(0)}×${pg.sw.target.h.toFixed(0)}`);
    else fail(`switch target is ${pg.sw.target.w.toFixed(1)}×${pg.sw.target.h.toFixed(1)}, under 44`);
    // AND IT MUST NOT INFLATE ITS ROW: a 44px participant in a 28px row shoves the reading
    // 21.50px off the mark. The padding-and-pull idiom is what prevents it.
    near('the reading row keeps its lead', pg.screen.read.h, pg.screen.lead);

    // ── THE SCRUB HANDLE ─────────────────────────────────────────────────────
    if (Math.min(pg.handle.w, pg.handle.h) >= 44) pass(`scrub handle ${pg.handle.w.toFixed(0)}×${pg.handle.h.toFixed(0)}`);
    else fail(`scrub handle is ${pg.handle.w.toFixed(1)}×${pg.handle.h.toFixed(1)}, under 44`);
    near('handle width matches the room\'s', pg.handle.w, room.handle.w);
    same('the field keeps its iOS-safe size', pg.fieldFontSize, room.fieldFontSize);

    // ── AND THAT THIS PAGE IS A SCREEN ───────────────────────────────────────
    const s = pg.screen;
    // `pg.appH`, not `s.appH` — the height is reported on the page, not inside its `screen`
    // sub-object, and the first run of this harness printed "the screen is undefinedpx" for
    // exactly that reason. Worth recording rather than quietly fixing: `undefined % 28` is
    // NaN, `NaN === 0` is false, so the check FAILED — it happened to fail closed. Written as
    // `!Number.isFinite` first now, so a future typo reports "could not read" instead of
    // masquerading as a layout defect.
    if (!Number.isFinite(pg.appH)) fail('could not read the screen height');
    else if (pg.appH % s.lead === 0) pass(`the screen is ${pg.appH / s.lead} whole leads (${pg.appH}px)`);
    else fail(`the screen is ${pg.appH}px — ${(pg.appH % s.lead).toFixed(2)}px off a lead`);
    if (s.scrollH <= s.clientH + 0.5) pass('the document does not scroll');
    else fail(`the document scrolls: ${s.scrollH} against ${s.clientH}`);
    if (s.appScroll <= 0.5) pass('the screen does not overflow its own box');
    else fail(`the screen overflows by ${s.appScroll}px — content is clipped, not scrollable`);

    // THE INSTRUMENT GROUP IS CONTIGUOUS: trace, then the reading+verb, then the record,
    // with no air between them. The room's first ladder gave the figure row all the slack
    // and stranded its readout 215px below the dial; the slack belongs above and below.
    near('the reading sits directly under the trace', s.read.y, s.fig.y + s.fig.h);
    near('the record sits directly under the reading', s.panels.y, s.read.y + s.read.h);

    // THE TWO SLACK ROWS ARE EQUAL — that is what "placed air" means, and an unequal pair
    // means one of the fixed rows changed height without the ladder being re-derived.
    const tracks = s.rows.match(/\[slack-a\]\s*([\d.]+)px[\s\S]*?\[slack-b\]\s*([\d.]+)px/);
    if (!tracks) fail(`could not read the slack rows from: ${s.rows}`);
    else near('the slack above and below the instrument is equal', +tracks[1], +tracks[2]);

    // THE VERB IS ON THE CASE'S CENTRE AXIS. Not the button's box — its INK, which is the
    // mistake the room's own datum harness made (it measured extent, and the extent
    // included a track that pushed the word 17.50px off the axis it claimed to be on).
    const inkMid = pg.sw.ink.x + pg.sw.ink.w / 2;
    near('the verb sits on the case axis', inkMid, pg.caseRect.x + pg.caseRect.w / 2);

    // THE FIGURE'S viewBox MATCHES ITS BOX, so 1px means 1px. A stale height here is the
    // failure mode the measure() floor guards: the drawing keeps an old viewBox on a
    // shorter element and `preserveAspectRatio="none"` stretches every label vertically.
    const vb = (s.viewBox || '').split(/\s+/).map(Number);
    if (vb.length === 4) {
      near('viewBox width is the figure\'s', vb[2], s.fig.w, 1.01);
      near('viewBox height is the figure\'s', vb[3], s.fig.h, 1.01);
    } else fail(`the figure has no viewBox: "${s.viewBox}"`);

    // ── AND NOW WITH THE INSTRUMENT RUNNING ──────────────────────────────────
    // Everything above is the page at rest. These four are the ones the idle page cannot
    // answer, and each of them was a real defect that 771 idle checks passed straight over.
    if (!LIVE.has(width)) { await ctx.close(); continue; }
    await page.getByTestId('listen-toggle').click();
    try {
      // WAIT ON THE DOM, NOT ON THE `?e2e` HOOK. The first version waited on
      // `window.__pg.panels`, which is only installed when the URL carries `?e2e` — and this
      // harness loads the plain page, so the hook never existed and all 18 configurations
      // reported "the fake mic or the engine is not running". The harness was measuring its own
      // missing query string.
      // Waiting on the printed panels is better anyway, and not merely a workaround: the panels
      // are the product and the hook is a verification aid. This way the check also holds on the
      // page a reader actually gets.
      await page.waitForSelector('[data-testid="panel"]:nth-child(2)',
        { state: 'attached', timeout: 20000 });
    } catch {
      fail('the instrument never printed two panels — the fake mic or the engine is not running');
      await ctx.close();
      continue;
    }
    const live = await page.evaluate(() => {
      const R = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
      const panelInk = [...document.querySelectorAll('.pg-panel svg')]
        .map((el) => el.getBoundingClientRect())
        .map((r) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height }));
      const prow = R('#pg-panels');
      return {
        read: R('.pg-read'), ink: R('.pg-rd'), kase: R('.pg-case'),
        panels: { ...prow, figures: panelInk, figH: panelInk.length ? panelInk[0].h : 0 },
        // THE PANEL'S CSS MUST ACTUALLY REACH IT. The rules live in the `is:global` block
        // because a panel is built with `createElement` and carries no scope attribute — and
        // they sat in the scoped block, inert, on the LIVE page: measured `borderLeft: 0px,
        // padding: 0px, minWidth: auto`. Nothing asserted them, so a quieter drawing shipped.
        panelCss: (() => {
          const p = document.querySelectorAll('.pg-panel')[1];
          if (!p) return null;
          const cs = getComputedStyle(p);
          return { borderLeft: cs.borderLeftWidth, padding: cs.paddingLeft, display: cs.display };
        })(),
        hzShown: getComputedStyle(document.getElementById('pg-hz')).display !== 'none',
        hzText: document.getElementById('pg-hz').textContent,
        cents: document.getElementById('pg-cents').textContent,
        note: document.getElementById('pg-note').textContent,
        appOverflow: (() => { const a = document.getElementById('pg-app'); return a.scrollHeight - a.clientHeight; })(),
      };
    });

    // 1. THE READING STAYS ON ONE LINE. Wrapped, it doubles the row and pushes the transport
    //    into the record below — measured at 390 and 360 before the Hz reading was dropped there.
    near('the reading row is one lead while playing', live.read.h, s.lead);

    // 2. THE VERB IS STILL ON THE AXIS WITH A VALUE IN THE ROW. This is the check that killed
    //    the attractive fix: `white-space:nowrap` alone kept the row at one lead and moved the
    //    verb 20px off centre at 390 and 35px at 360, because a nowrapped group raises its
    //    column's floor above what the note column can match.
    near('the verb sits on the case axis while playing',
      live.ink.x + live.ink.w / 2, live.kase.x + live.kase.w / 2);

    // 3. THE TRANSPORT DOES NOT OVERLAP THE RECORD, and this is a check about RECTANGLES, not
    //    about two y values. It USED to be about an overhang: the switch's ink carried a 9.5px
    //    nudge and hung 3.5px past its own row, while the panels' drawings sat at the bottom of
    //    theirs so the overhang fell into the row's slack. The nudge is gone (2026-08-12 — it was
    //    a number derived for an alignment context the control had stopped having), so the switch's
    //    ink is inside its row now and the rectangle check has one less reason to be near-miss.
    //    It stays a rectangle check anyway, for the reason the next paragraph gives.
    //    THE FIRST VERSION COMPARED VERTICAL EDGES ONLY and reported "the transport overlaps
    //    the record by 3.50px" in all ten live configurations — on a page where the panels fill
    //    from the left inset and the switch is centred, so with three panels they were 546px
    //    apart horizontally and could not have touched. A check that fires on marks which do
    //    not share space is a check that will be silenced rather than believed, so it tests the
    //    actual intersection: overlap in BOTH axes, against every panel figure present.
    if (!live.panels.figures.length) fail('no panel figures to check the transport against');
    else {
      const hits = live.panels.figures.filter((f) =>
        live.ink.right > f.left + TOL && live.ink.left < f.right - TOL &&
        live.ink.bottom > f.top + TOL && live.ink.top < f.bottom - TOL);
      if (!hits.length) pass(`the transport clears all ${live.panels.figures.length} panel figures`);
      else fail(`the transport intersects ${hits.length} panel figure(s) — e.g. by `
        + `${(live.ink.bottom - hits[0].top).toFixed(2)}px vertically, `
        + `${(live.ink.right - hits[0].left).toFixed(2)}px horizontally`);
    }
    // AND THE ROW'S OWN SLACK IS AT THE TOP, which is the mechanism that makes the above true
    // for a FULL row rather than only for the three panels this fixture prints. Asserted
    // directly, because "they happen not to touch yet" is not the property being claimed.
    if (live.panels.figures.length) {
      const top = Math.min(...live.panels.figures.map((f) => f.top));
      near('the record\'s drawings sit at the bottom of their row',
        top - live.panels.top, live.panels.h - live.panels.figH);
    }

    // 4. AND THE RUNNING PAGE STILL DOES NOT OVERFLOW. `overflow:hidden` clips rather than
    //    scrolls, so an overflow here means a control is simply not on the page.
    if (live.appOverflow <= 0.5) pass('the running screen does not overflow');
    else fail(`the running screen overflows by ${live.appOverflow}px`);

    // 5. THE PANEL'S CSS REACHES THE PANEL. A rule that compiles to a scope attribute
    //    runtime-built markup never carries is a rule that silently does nothing — this page's
    //    third instance of that trap, and the only one that reached production. The divider
    //    between two readings is the mark it cost.
    if (!live.panelCss) fail('no second panel to check the record\'s own styling against');
    else {
      if (parseFloat(live.panelCss.borderLeft) > 0) pass(`the record's dividers are drawn (${live.panelCss.borderLeft})`);
      else fail('the panels have no divider — their CSS is not reaching them (scoped vs is:global)');
      if (parseFloat(live.panelCss.padding) > 0) pass(`and their gutters (${live.panelCss.padding})`);
      else fail('the panels have no gutters — same cause');
    }

    // The reading's own content, so a "one line" pass cannot be satisfied by an empty row: the
    // note and the cents are what this page is for, and they are present at every width.
    if (/^[A-G][♯♭]?\d$/.test(live.note.trim())) pass(`reading: ${live.note} ${live.cents}${live.hzShown ? ' ' + live.hzText : ' (no hz — narrow)'}`);
    else fail(`the reading printed no note while playing: "${live.note}"`);

    await ctx.close();
  }
}

await browser.close();
console.log(bad === 0
  ? '\n✓ pitchgraph and the practice room agree, and pitchgraph is a screen.'
  : `\n✗ ${bad} check(s) failed.`);
process.exit(bad === 0 ? 0 : 1);
