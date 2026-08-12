// THE ROOM IS AN INDEX, on the real page (2026-08-12, the owner's correction).
//
// "i thought what i wanted was for the plan to be like the app homepage / the practice room.
// positions are fixed. and its just like the index page and you press it and go to one of the
// aps. and theres like a buton to go back to the full room."
//
// WHAT THIS FILE USED TO ASSERT, and why it is gone. It checked a QUEUE: how many things a width
// bought, which ones spilled past the fit, that the console seated whole or not at all, that
// dragging a box re-seated the room, that the order survived a reload. Every one of those was a
// true statement about a design the owner rejected — "the snapping and settling don't work quite
// right, i also think its a bit concerningly busy on desktop". None of it can be adapted, because
// the mechanism it measured (fit by demand, then share what's left) no longer runs at any width.
//
// What replaces it is smaller and flatter: the plan is page 0, each thing is ONE full page, you
// press a box to go there and a mark to come back. So the claims worth a test are the index's:
// the page count and their widths, that the room OPENS on the plan, that press-and-back is a
// round trip at both widths, that the console's three cases still fit their measured demands on
// one page, and that nothing of the queue is left behind.
//
// The five demands (170/196/170/315/236) are restated here rather than imported, so a test cannot
// agree with a typo in the constant it checks.

import { test, expect, type Page } from '@playwright/test';

const URL = '/practice-room/?e2e=1';
const DEMAND: Record<string, number> = {
  tuner: 170, metronome: 196, drone: 170, changes: 315, loop: 236,
};
const PAD = 56, GAP = 56;
/* THE ROOM HOLDS THINGS, not instruments: the tuner, drone and metronome are ONE console; the
   changes and the loop are standalones. A thing's demand is its members' plus the gaps between
   them, so the console is 170+170+196+2x56 = 648 — which is now the DESKTOP FLOOR rather than a
   fitting constraint, since every thing gets a whole page. */
const THING_KEYS: Record<string, string[]> = {
  console: ['tuner', 'drone', 'metronome'],
  changes: ['changes'],
  loop: ['loop'],
};
const thingDemand = (id: string) =>
  THING_KEYS[id].reduce((a, k) => a + DEMAND[k], 0) + GAP * (THING_KEYS[id].length - 1);
const THINGS3 = ['console', 'changes', 'loop'];
/* THE PHONE BAND: 760 is the narrowest desktop room, because the console's three cases need 648
   plus the room's 2x56 padding. Below it the phone layout takes over, one instrument per page. */
const PHONE_MAX = 759;

const room = (p: Page) => p.locator('#mt-pages');
/** The fragment of a URL string. NOT `new URL(...)` — this file's own `URL` constant shadows the
    global constructor, which fails as `URL is not a constructor` rather than as a name clash. */
const hashOf = (u: string) => { const i = u.indexOf('#'); return i < 0 ? '' : u.slice(i); };
const pageLog = (p: Page) => p.evaluate(() =>
  (window as any).__mt.roomPages as Array<{ id: string; keys: string[]; w: number }>);
/** Where a page's content sits inside the scroller, independent of the current scroll. */
const contentLeft = (p: Page, sel: string) => p.evaluate((s) => {
  const pages = document.getElementById('mt-pages')!;
  const el = document.querySelector(s) as HTMLElement;
  return Math.round(el.getBoundingClientRect().left - pages.getBoundingClientRect().left + pages.scrollLeft);
}, sel);

test.describe('THE ROOM IS AN INDEX AND ITS PAGES', () => {
  for (const w of [1920, 1512, 1200, 900, 760]) {
    test(`${w}px is the plan plus one page per thing`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(URL);
      await page.waitForTimeout(300);
      const log = await pageLog(page);
      // FOUR PAGES AT EVERY DESKTOP WIDTH. The queue's whole variable — how many things a width
      // buys — is gone: it is always all of them, one at a time.
      expect(log.map((p) => p.id)).toEqual(['plan', ...THINGS3]);
      // and each page is the viewport less the room's own padding
      for (const p of log) expect(Math.abs(p.w - (w - PAD * 2))).toBeLessThanOrEqual(1);

      // THE CONSOLE'S THREE CASES SPLIT THEIR PAGE BY DEMAND, not into equal thirds: at 760 a
      // third is 178 and the metronome needs 196, so equal thirds would break the case at the
      // very width the band was bisected for.
      const parts = await page.evaluate(() => ['tuner', 'drone', 'metronome'].map((k) =>
        (document.querySelector(`.mt-half[data-mt-key="${k}"]`) as HTMLElement)
          .getBoundingClientRect().width));
      parts.forEach((px, i) =>
        expect(px, `${['tuner', 'drone', 'metronome'][i]} at ${w}`)
          .toBeGreaterThanOrEqual(DEMAND[['tuner', 'drone', 'metronome'][i]] - 1));
      // the three plus their gaps ARE the page — the console page is full, like every other
      expect(Math.abs(parts.reduce((a, b) => a + b, 0) + GAP * 2 - (w - PAD * 2)))
        .toBeLessThanOrEqual(3);
    });
  }

  test('THE ROOM OPENS ON THE PLAN — at every width', async ({ page }) => {
    // This is the finding that needed a line of code, not a comment: every phone load rested at
    // scrollLeft 390 with the index behind it. Not our JS (patching scrollTo/scrollLeft/focus
    // caught nothing) and not scroll anchoring — the snap container was following the ELEMENT it
    // had snapped to before `order` moved the plan into column 1. An index has an entry point, so
    // the entry point is written down rather than inferred from the browser's initial snap.
    for (const w of [1512, 900, 760, 390]) {
      await page.setViewportSize({ width: w, height: 844 });
      await page.goto(URL);
      await page.waitForTimeout(400);
      const x = await room(page).evaluate((el) => el.scrollLeft);
      expect(x, `the room opened mid-scroll at ${w}`).toBe(0);
      // and the plan is what page 0 IS
      expect(await contentLeft(page, '.mt-order')).toBe(w < 760 ? 0 : PAD);
    }
  });

  test('NOTHING IS QUEUED any more — the mechanism is gone, not merely unused', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    // at 900 the queue seated ONE thing and marked the other two `data-queued` at their bare
    // demand. Every page is whole now, so the attribute must appear nowhere at any width.
    for (const w of [1512, 900, 760, 390]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(250);
      await expect(page.locator('#mt-pages [data-queued]'), `queued at ${w}`).toHaveCount(0);
    }
    // and the room still scrolls — four pages of content in one viewport
    const { sw, cw } = await room(page).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(sw).toBeGreaterThan(cw * 2);
  });
});

test.describe('the phone band at 760', () => {
  test('760 is the desktop room, its console at the measured minimums', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const parts = await page.evaluate(() => ['tuner', 'drone', 'metronome'].map((k) =>
      Math.round((document.querySelector(`.mt-half[data-mt-key="${k}"]`) as HTMLElement)
        .getBoundingClientRect().width)));
    expect(parts).toEqual([170, 170, 196]);
    expect((await pageLog(page)).length).toBe(4);
  });

  test('759 is the phone: the plan plus one instrument per page', async ({ page }) => {
    await page.setViewportSize({ width: PHONE_MAX, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const log = await pageLog(page);
    // SIX pages there, because the console's grouping is a DESKTOP statement: a phone case has
    // the whole viewport and no neighbour to be narrow beside.
    expect(log.map((p) => p.id)).toEqual(['plan', 'tuner', 'drone', 'metronome', 'changes', 'loop']);
    for (const p of log) expect(p.w).toBe(PHONE_MAX);
  });

  // THE INK MUST HOLD AT THE BOUNDARY. A threshold that seats a console whose contents break is
  // not a threshold. The real test of clickability is whether a control's own centre is the
  // topmost thing there.
  test('at 760 no control is clipped and none is unhittable', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    // OPEN THE CONSOLE FIRST, and test only what is on screen. `elementsFromPoint` returns
    // nothing for a point outside the viewport, so with the queue gone — every case rendered,
    // three pages of them off to the right — the old sweep called 58 perfectly good controls
    // "unhittable". It was reading the harness's own scroll position, not the page.
    await page.locator('[data-testid="plan-console"]').click();
    await page.waitForTimeout(900);
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      const vp = document.getElementById('mt-pages')!.getBoundingClientRect();
      for (const c of document.querySelectorAll('#mt-pages .mt-half:not(.mt-order)')) {
        const cb = c.getBoundingClientRect();
        if (cb.right <= vp.left + 1 || cb.left >= vp.right - 1) continue;   // not on screen
        for (const el of c.querySelectorAll('button,input')) {
          const r = el.getBoundingClientRect();
          if (r.height === 0) continue;
          if (r.bottom > cb.bottom + 0.5) out.push(`${el.className || el.tagName} below its case`);
          if (r.right > cb.right + 0.5) out.push(`${el.className || el.tagName} past its case`);
          const hit = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!hit.includes(el) && hit.length <= 1) out.push(`${el.className || el.tagName} unhittable`);
        }
      }
      return out;
    });
    expect(bad).toEqual([]);
  });
});

test.describe('THE SNAP IS CSS, AND THE JS SETTLE IS GONE (plan Q2/03)', () => {
  // WHAT THIS REPLACES: a `scrollend` listener that settled to the nearest case edge. It never
  // worked — it only knew the cases already on screen, so scrolling toward the queue threw you
  // back to one you had passed (measured live at 1280px: candidates 0/263/553/816/1516 against a
  // maximum scroll of 574). The owner picked the browser's own mechanism, which deletes the whole
  // class of bug rather than fixing one instance of it.
  test('the desktop room uses css mandatory snap', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(URL);
    const snap = await room(page).evaluate((el) => getComputedStyle(el).scrollSnapType);
    expect(snap).toContain('mandatory');
  });

  test('ONLY A PAGE\'S FIRST CASE IS A SNAP POINT — the console does not stop at the drone', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const get = (s: string) => {
        const el = document.querySelector(s) as HTMLElement;
        return { snap: getComputedStyle(el).scrollSnapAlign, marked: el.dataset.snap !== undefined };
      };
      return {
        plan: get('.mt-order'),
        tuner: get('.mt-half[data-mt-key="tuner"]'),
        drone: get('.mt-half[data-mt-key="drone"]'),
        metronome: get('.mt-half[data-mt-key="metronome"]'),
        changes: get('.mt-half[data-mt-key="changes"]'),
        loop: get('.mt-half[data-mt-key="loop"]'),
        padLeft: getComputedStyle(document.getElementById('mt-pages')!).scrollPaddingLeft,
      };
    });
    // the plan, the console's FIRST case, and each standalone
    for (const k of ['plan', 'tuner', 'changes', 'loop'] as const) {
      expect((r as any)[k].snap, `${k} should be a snap point`).toBe('start');
      expect((r as any)[k].marked, `${k} should carry data-snap`).toBe(true);
    }
    // and NOT the console's other two — a scroll across that page must not stop inside it
    for (const k of ['drone', 'metronome'] as const) {
      expect(r[k].snap, `${k} must not be a snap point`).toBe('none');
      expect(r[k].marked).toBe(false);
    }
    // 56px = --group, which is what puts a snapped page's edge on the 3ch inset datum
    expect(r.padLeft).toBe('56px');
  });

  test('the phone snaps too, and with NO inset — a page there is the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const r = await room(page).evaluate((el) => ({
      snap: getComputedStyle(el).scrollSnapType, pad: getComputedStyle(el).scrollPaddingLeft }));
    expect(r.snap).toContain('mandatory');
    // 56px HERE WAS A REAL DEFECT: every phone page rested 56px off its own edge with a slice of
    // the previous one showing, and the room opened at scrollLeft 334 on a 390px page.
    expect(r.pad).toBe('0px');
  });

  test('NO JS settle remains — the page never writes hook.settled', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    await room(page).evaluate((el) => { el.scrollLeft = 40; el.dispatchEvent(new Event('scrollend')); });
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => (window as any).__mt.settled)).toBeNull();
  });
});

test.describe('THE PLAN — one big box, the things inside it', () => {
  // Choosers `practice-room-box` Q1/04 (a room with a doorway), Q2/04 (the screen's thirds),
  // Q3/02 (a figure and a name under it), Q4/04 (there is no outside).

  test('it is ONE box with the things inside it, not boxes side by side', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const room = document.getElementById('mt-planroom')!;
      const rb = room.getBoundingClientRect();
      const boxes = [...room.querySelectorAll('.mt-pbox')];
      // CONTAINMENT is the whole claim — every little box's rectangle inside the room's
      const escapes = boxes.filter((b) => {
        const q = b.getBoundingClientRect();
        return q.left < rb.left - 0.5 || q.right > rb.right + 0.5
            || q.top < rb.top - 0.5 || q.bottom > rb.bottom + 0.5;
      }).length;
      const cs = getComputedStyle(room);
      return {
        boxes: boxes.length, slots: room.querySelectorAll('.mt-pslot').length, escapes,
        // the WALLS are heavier than the fittings — that weight difference is the containment
        walls: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth].map((v) => Math.round(parseFloat(v))),
        // THE DOORWAY: the left wall is transparent, and two gradients paint its segments
        doorway: cs.borderLeftColor,
        gradients: (cs.backgroundImage.match(/linear-gradient/g) || []).length,
        // the fittings inside are hairlines
        boxBorder: boxes.length ? Math.round(parseFloat(getComputedStyle(boxes[0]).borderTopWidth)) : null,
        // AND THE FLOOR IS INSET FROM THE WALLS. `padding:var(--lead) var(--inset)` shipped
        // reading a token that does not exist (`--mt-inset` is the real name), so the whole
        // declaration was dropped as invalid and the first and last room stood hard against the
        // 2px walls. CSS fails by doing nothing; only the computed value shows it.
        pad: [cs.paddingTop, cs.paddingLeft].map((v) => Math.round(parseFloat(v))),
      };
    });
    expect(r.boxes).toBe(3);
    expect(r.slots).toBe(3);
    expect(r.escapes, 'a box escaped the room').toBe(0);
    expect(r.walls, 'the walls are 2px ink').toEqual([2, 2, 2]);
    expect(/transparent|rgba\(0, 0, 0, 0\)/.test(r.doorway), 'the doorway leaves the left wall open').toBe(true);
    expect(r.gradients, 'two wall segments either side of the opening').toBe(2);
    expect(r.boxBorder, 'the fittings are hairlines, lighter than the walls').toBe(1);
    expect(r.pad, 'the floor is inset one lead and one 3ch datum').toEqual([28, 27]);
  });

  test('THE ROOMS FILL THE FLOOR — a plan is not a strip of chips', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const room = document.getElementById('mt-planroom')!;
      const floor = room.querySelector('.mt-pfloor')!;
      const box = room.querySelector('.mt-pbox')!;
      const page0 = document.querySelector('.mt-order')!;
      return { room: room.getBoundingClientRect().height,
               floor: floor.getBoundingClientRect().height,
               box: box.getBoundingClientRect().height,
               page: page0.getBoundingClientRect().height,
               // the room's own vertical padding, read rather than assumed — the ratio below has
               // to discount it or a correct floor scores 0.89 and the test lies in the other
               // direction
               pad: parseFloat(getComputedStyle(room).paddingTop) };
    });
    // The first build drew 62px boxes in a 742px case: the 2px walls enclosed a strip floating in
    // a much larger faint box, so the case's own border read as the room.
    //
    // THREE RATIOS, BECAUSE TWO WERE NOT ENOUGH. `box/floor` passes when the box and the floor
    // shrink TOGETHER, which is exactly what the red arm did: `align-content:start` on the room
    // collapsed the floor to its content while the room itself still stretched, and both
    // assertions stayed green over a 116px strip inside a 516px room. The middle link — the floor
    // filling the room's own content box — is the one that was missing.
    expect(r.room / r.page, 'the room floats inside its page').toBeGreaterThan(0.6);
    expect(r.floor / (r.room - 2 * (r.pad + 2)), 'the floor does not fill the room')
      .toBeGreaterThan(0.95);
    expect(r.box / r.floor, 'the rooms do not fill the floor').toBeGreaterThan(0.95);
  });

  test('the slots are the screen\'s thirds on the desktop, and stack on the phone', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const cols = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#mt-planroom .mt-pfloor')!).gridTemplateColumns);
    const parts = cols.split(' ').map(parseFloat);
    expect(parts.length).toBe(3);
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThan(1.5);

    // A PLAN OF A NARROW ROOM DRAWS ITS ROOMS DOWN THE FLOOR. Three across 390px truncated the
    // middle name to `the chang…` — a clipped word on the one screen whose job is naming things.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const r2 = await page.evaluate(() => {
      const floor = document.querySelector('#mt-planroom .mt-pfloor')!;
      const tops = [...floor.querySelectorAll('.mt-pbox')].map((b) => Math.round(b.getBoundingClientRect().top));
      return { cols: getComputedStyle(floor).gridTemplateColumns.split(' ').length, tops };
    });
    expect(r2.cols, 'the phone stacks one room per row').toBe(1);
    expect(new Set(r2.tops).size, 'three distinct rows').toBe(3);

    // AND WHAT THE STACK ACTUALLY BUYS is room for the console's three marks. Three rooms across
    // 390px leaves each about 93px, and the console's figure is 3x32px plus two 14px gaps = 124 —
    // so the marks row would overflow its own box. It does NOT truncate a name (the names wrap
    // now), which is why the truncation test cannot defend this and this assertion has to.
    const spill = await page.evaluate(() => [...document.querySelectorAll('#mt-planroom .mt-pbox')]
      .filter((b) => {
        const bb = b.getBoundingClientRect();
        const m = b.querySelector('.mt-pmarks')!.getBoundingClientRect();
        return m.width > bb.width + 0.5 || m.left < bb.left - 0.5 || m.right > bb.right + 0.5;
      }).length);
    expect(spill, "a box's figure spilled its box at 390").toBe(0);
  });

  test('each little box is a figure and a name — and NO name truncates, at either width', async ({ page }) => {
    for (const [w, h] of [[1512, 900], [760, 900], [390, 844]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(URL);
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => [...document.querySelectorAll('#mt-planroom .mt-pbox')].map((b) => {
        const nm = b.querySelector('.mt-pnm') as HTMLElement;
        // MEASURE THE PAINTED INK, SUBPIXEL. `scrollWidth <= clientWidth` said `the changes`
        // fitted while the page rendered `the chang…`: those properties are integer-rounded and
        // the overflow was 0.33px. A Range over the text node gives the real painted width.
        const rg = document.createRange();
        rg.selectNodeContents(nm);
        const cs = getComputedStyle(nm);
        const box = nm.getBoundingClientRect().width
          - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return { name: nm.textContent, marks: b.querySelectorAll('svg').length,
                 lines: Math.round(rg.getClientRects().length),
                 truncated: rg.getClientRects().length === 1 && rg.getBoundingClientRect().width > box + 0.01 };
      }));
      expect(r.map((x) => x.name), `names at ${w}`).toEqual(['console', 'the changes', 'the loop']);
      // THE CONSOLE DRAWS ALL THREE OF ITS MEMBERS' MARKS — the grouping as a drawing, not a label
      expect(r[0].marks).toBe(3);
      expect(r[1].marks).toBe(1);
      expect(r[2].marks).toBe(1);
      expect(r.filter((x) => x.truncated), `a name truncated at ${w}`).toEqual([]);
    }
  });

  test('the marks are drawn at 32px here and the stroke STAYS 1.8', async ({ page }) => {
    // Scaling the generated output is not a second drawing — but without
    // `vector-effect:non-scaling-stroke` the 1.8 weight doubles with the box and the plan's mark
    // becomes a fatter object than the same mark in the dot row. One weight, every size.
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const plan = document.querySelector('#mt-planroom .mt-pmarks svg') as SVGElement;
      // NOT `.pgdot svg` — the FIRST dot is the room's box, drawn as a `<rect>`, so
      // `querySelector('path')` on it is null and getComputedStyle threw. Ask for the tuner's,
      // which is the same generated mark the plan's first figure is.
      const dot = document.querySelector('[data-testid="dot-tuner"] svg') as SVGElement;
      const p = plan.querySelector('path')!, d = dot.querySelector('path')!;
      return { planW: Math.round(plan.getBoundingClientRect().width),
               dotW: Math.round(dot.getBoundingClientRect().width),
               effect: getComputedStyle(p).vectorEffect,
               strokes: [getComputedStyle(p).strokeWidth, getComputedStyle(d).strokeWidth],
               // the same formula output, not a second drawing
               sameBox: plan.getAttribute('viewBox') === dot.getAttribute('viewBox') };
    });
    expect(r.planW).toBe(32);
    expect(r.dotW).toBe(16);
    expect(r.effect).toBe('non-scaling-stroke');
    expect(r.strokes[0]).toBe(r.strokes[1]);
    expect(r.sameBox).toBe(true);
  });

  test('there is NO outside — every thing is always in the room', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(400);
    expect(await page.locator('#mt-planroom .mt-pbox').count()).toBe(3);
    const keys = await page.evaluate(() =>
      [...document.querySelectorAll('#mt-planroom .mt-pbox')].map((b) => (b as HTMLElement).dataset.pthing));
    expect(keys).toEqual(THINGS3);
  });

  test('nothing in the plan spills its page', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const bad = await page.evaluate(() => {
      const sec = document.querySelector('.mt-order')!;
      const sb = sec.getBoundingClientRect();
      const out: string[] = [];
      for (const sel of ['#mt-order-hint', '#mt-order-fit', '#mt-planroom']) {
        const e = sec.querySelector(sel);
        if (!e) { out.push(`${sel} absent`); continue; }
        const q = e.getBoundingClientRect();
        if (q.right > sb.right + 0.5) out.push(`${sel} past the right edge`);
        if (q.left < sb.left - 0.5) out.push(`${sel} past the left edge`);
        if (q.top < sb.top - 0.5) out.push(`${sel} above the case top`);
        if (q.bottom > sb.bottom + 0.5) out.push(`${sel} below the case bottom`);
      }
      if (!sec.querySelector('.mt-plate')) out.push('no engraved plate');
      return out;
    });
    expect(bad).toEqual([]);
  });
});

test.describe('PRESS A BOX, AND A MARK COMES BACK', () => {
  // The owner's model, in his words: "you press it and go to one of the aps. and theres like a
  // buton to go back to the full room." So the plan is an index and the only two gestures are
  // press-to-open and press-to-return. The drag, the lift, the reorder and the persisted order
  // are all deleted — positions are fixed.

  for (const [w, h] of [[1512, 900], [390, 844]] as const) {
    test(`${w}px: pressing each box opens that thing, and the mark returns to the room`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(URL);
      await page.waitForTimeout(400);

      // THE TARGET IS CLAMPED TO THE SCROLLABLE RANGE, exactly as the page's own `goTo` clamps
      // it. The last page's content offset is past the maximum scroll — at 1512 the loop sits at
      // 4424 while the room can only reach 4368 — so an unclamped comparison reports "not there"
      // about a page that is fully in view. This is the third time that same off-by-a-clamp has
      // bitten: it killed the old JS settle and then the first version of the plan word.
      const at = async (sel: string) => {
        const [x, want, geo] = await Promise.all([
          room(page).evaluate((el) => el.scrollLeft), contentLeft(page, sel),
          room(page).evaluate((el) => ({
            pad: parseFloat(getComputedStyle(el).scrollPaddingLeft),
            max: Math.max(0, el.scrollWidth - el.clientWidth) })),
        ]);
        return Math.abs(x - Math.min(Math.max(0, want - geo.pad), geo.max)) < 8;
      };
      // the way back: the chrome word on the desktop, the room's own dot on the phone (the chrome
      // is display:none under 760, so the dot row IS the navigation there)
      const back = w < 760 ? '[data-testid="dot-plan"]' : '[data-testid="plan-word"]';

      // POLL FOR THE SCROLL TO STOP, don't sleep at it. A smooth scroll from the plan to the loop
      // crosses 4368px at 1512, which takes longer than the 900ms this test first waited — so it
      // measured a scroll still in flight and reported the navigation broken. Same class of
      // mistake as asserting on a tween: wait for the value to stop moving.
      const rest = async () => {
        let last = -1;
        for (let i = 0; i < 40; i += 1) {
          const x = await room(page).evaluate((el) => el.scrollLeft);
          if (x === last) return x;
          last = x;
          await page.waitForTimeout(100);
        }
        return last;
      };

      for (const t of THINGS3) {
        await page.locator(`[data-testid="plan-${t}"]`).click();
        await rest();
        expect(await at(`.mt-half[data-mt-key="${THING_KEYS[t][0]}"]`), `press ${t} at ${w}`).toBe(true);
        await page.locator(back).click();
        await rest();
        expect(await at('.mt-order'), `back from ${t} at ${w}`).toBe(true);
      }
    });
  }

  test('the back mark is HIDDEN on the plan and shown in an app, and costs one lead', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    // The screen is round(down,100dvh,28px), so chrome costs a whole lead or every case leaves
    // the ladder. A control that points at the page you are already on is chrome doing nothing —
    // but the ROW keeps its height, or the ladder would shift by a lead mid-scroll.
    const chrome = await page.locator('.mt-chrome').evaluate((e) =>
      Math.round(e.getBoundingClientRect().height));
    expect(chrome).toBe(28);
    const word = page.locator('[data-testid="plan-word"]');
    await expect(word).toHaveText('← the room');
    const vis = () => word.evaluate((e) => ({
      v: getComputedStyle(e).visibility, h: Math.round(e.getBoundingClientRect().height) }));
    expect((await vis()).v, 'the mark points at the page you are on').toBe('hidden');
    await page.locator('[data-testid="plan-changes"]').click();
    await page.waitForTimeout(900);
    const inApp = await vis();
    expect(inApp.v).toBe('visible');
    expect(inApp.h, 'the row must not change height when the mark appears').toBe(
      (await word.evaluate((e) => Math.round(e.getBoundingClientRect().height))));
    // and its words are the plate's words — "the room" in both places, nothing to translate
    const plate = await page.locator('.mt-order .mt-plate').innerText();
    expect(plate).toBe('the room');
  });

  test('THE DRAG AND THE PERSISTED ORDER ARE GONE — positions are fixed', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    // a box is a link, not a handle: no pick-up state, no grab cursor, nothing draggable
    const r = await page.evaluate(() => [...document.querySelectorAll('#mt-planroom .mt-pbox')].map((b) => ({
      pressed: b.getAttribute('aria-pressed'), draggable: (b as HTMLElement).draggable,
      cursor: getComputedStyle(b).cursor, label: b.getAttribute('aria-label') })));
    for (const b of r) {
      expect(b.pressed, 'a box still reports a pick-up state').toBeNull();
      expect(b.draggable).toBe(false);
      expect(b.cursor).toBe('pointer');
      expect(b.label).toMatch(/^Open /);
    }
    // pressing two boxes must NOT reorder anything — it opens the first, then the second
    const before = (await pageLog(page)).map((p) => p.id);
    await page.locator('[data-testid="plan-loop"]').click();
    await page.waitForTimeout(600);
    await page.locator('[data-testid="plan-word"]').click();
    await page.waitForTimeout(900);
    await page.locator('[data-testid="plan-console"]').click();
    await page.waitForTimeout(600);
    expect((await pageLog(page)).map((p) => p.id)).toEqual(before);

    // AND A STALE PERSISTED ORDER CANNOT MOVE ANYTHING. Yesterday's key must be inert, not
    // merely absent from the code: localStorage outlives the code that wrote it.
    await page.evaluate(() => localStorage.setItem('mt:things', 'loop,changes,console'));
    await page.reload();
    await page.waitForTimeout(500);
    expect((await pageLog(page)).map((p) => p.id)).toEqual(['plan', ...THINGS3]);
    const keys = await page.evaluate(() =>
      [...document.querySelectorAll('#mt-planroom .mt-pbox')].map((b) => (b as HTMLElement).dataset.pthing));
    expect(keys).toEqual(THINGS3);
  });
});

test.describe('THE PAGES HAVE URLS', () => {
  // An index whose entries cannot be linked to is a room you can only enter through the front
  // door. `#console`, `#changes`, `#loop` open straight into a thing; a bare instrument key opens
  // the page that HOLDS it, which is the console on a desktop and the instrument's own page on a
  // phone. The specs for every instrument open this way now, which is also what made their
  // real-pointer assertions possible again — `page.mouse.move` takes viewport coordinates, and a
  // case on another page has none worth pressing.

  for (const [hash, want] of [
    ['console', 'tuner'], ['changes', 'changes'], ['loop', 'loop'],
    // a MEMBER of a thing resolves to that thing's page, not to its own offset
    ['metronome', 'tuner'], ['drone', 'tuner'],
  ] as const) {
    test(`1512px: #${hash} opens the page holding ${want}`, async ({ page }) => {
      await page.setViewportSize({ width: 1512, height: 900 });
      await page.goto(`${URL}#${hash}`);
      await page.waitForTimeout(500);
      // THE LINK MUST LAND ON THE PAGE'S SNAP POINT. `#metronome` first resolved to the
      // metronome's own case — the third of three on the console page — so the room scrolled to
      // 2385, which is not a snap point, and mandatory snap pulled it forward to 2912: the CHORD
      // DEALER. The assertion is therefore about what is on screen, not about the scroll offset.
      const on = await page.evaluate((k) => {
        const pages = document.getElementById('mt-pages')!;
        const el = document.querySelector(`.mt-half[data-mt-key="${k}"]`) as HTMLElement;
        const p = pages.getBoundingClientRect(), r = el.getBoundingClientRect();
        return (Math.min(p.right, r.right) - Math.max(p.left, r.left)) > r.width / 2;
      }, want);
      expect(on, `#${hash} did not open ${want}'s page`).toBe(true);
      // and the plan is NOT on screen — a deep link skips the index
      const planOn = await page.evaluate(() => {
        const pages = document.getElementById('mt-pages')!;
        const el = document.querySelector('.mt-order') as HTMLElement;
        const p = pages.getBoundingClientRect(), r = el.getBoundingClientRect();
        return (Math.min(p.right, r.right) - Math.max(p.left, r.left)) > r.width / 2;
      });
      expect(planOn, 'a deep link should not land on the index').toBe(false);
      // the back mark is therefore showing, because you are in an app
      await expect(page.locator('[data-testid="plan-word"]')).toBeVisible();
    });
  }

  test('an unknown hash falls back to the room rather than to nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(`${URL}#nope`);
    await page.waitForTimeout(500);
    expect(await room(page).evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test('THE HASH FOLLOWS THE SCROLL — the URL never lies about the page', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    // the index has no hash
    expect(hashOf(page.url())).toBe('');
    for (const t of THINGS3) {
      await page.locator(`[data-testid="plan-${t}"]`).click();
      await page.waitForTimeout(1200);
      expect(hashOf(page.url()), `after pressing ${t}`).toBe(`#${t}`);
      await page.locator('[data-testid="plan-word"]').click();
      await page.waitForTimeout(1400);
      expect(hashOf(page.url()), `after coming back from ${t}`).toBe('');
    }
    // AND AFTER A SWIPE, not only after a press. Writing the hash inside goTo() would leave it
    // lying whenever you scrolled by hand, which is most of the time on a phone.
    await room(page).evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'auto' }));
    await page.waitForTimeout(600);
    expect(hashOf(page.url()), 'a hand scroll must update the URL too').toBe('#loop');
  });

  test('it is replaceState, not pushState — Back leaves the room, it does not walk it', async ({ page }) => {
    // The browser's Back button belongs to the site's history: anyone who arrived from another
    // page must be able to leave with it. The room's own way back is the mark.
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto('/');
    await page.goto(URL);
    await page.waitForTimeout(400);
    await page.locator('[data-testid="plan-changes"]').click();
    await page.waitForTimeout(1200);
    await page.locator('[data-testid="plan-word"]').click();
    await page.waitForTimeout(1400);
    await page.goBack();
    await page.waitForTimeout(600);
    // one entry for the room, whatever we visited inside it
    expect(page.url().replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0]).toBe('/');
  });
});

test.describe('the dots are the pages\' own figures (Q5/02)', () => {
  test('SIX dots — the room, then the five instruments — on one line at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const dots = page.locator('#mt-dots .pgdot');
    // THE FIRST DOT IS THE ROOM. Five dots over six pages is an indicator that lies: standing on
    // the plan lit the tuner's. The room's mark is a plain box — the plan's outer box reduced —
    // and it is not an exception to "the formula's output ships, always", because the room is not
    // an app: it counts nothing.
    await expect(dots).toHaveCount(6);
    const labels = await dots.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(labels).toEqual(['the room', 'tuner', 'drone', 'metronome', 'the changes', 'the loop']);
    // ONE LINE is the whole reason the words went: five words measured 568px at 390.
    const tops = await dots.evaluateAll((els) =>
      [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top)))]);
    expect(tops.length).toBe(1);
    const rowW = await page.locator('#mt-dots').evaluate((e) => e.getBoundingClientRect().width);
    expect(rowW).toBeLessThanOrEqual(390);
  });

  // PIXELS, NOT SIGNATURES. `markSignature()` says 4@0 and 3@0 are different marks, and the unit
  // tests are satisfied by that — but two stacks of level bars can be arithmetically distinct and
  // visually the same at 16px. Measured, the closest pair is metronome/drone at 48 of 256 pixels.
  test('every pair of marks differs by at least 32 of 256 pixels at 16px', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(400);
    const res = await page.evaluate(async () => {
      const dots = [...document.querySelectorAll('#mt-dots .pgdot')];
      const ras = (svgEl: Element) => new Promise<string | null>((resolve) => {
        const src = new XMLSerializer().serializeToString(svgEl).replace(/currentColor/g, '#000');
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 16; c.height = 16;
          const x = c.getContext('2d')!;
          x.drawImage(img, 0, 0);
          const d = x.getImageData(0, 0, 16, 16).data;
          let out = '';
          for (let i = 3; i < d.length; i += 4) out += d[i] > 96 ? '1' : '0';
          resolve(out);
        };
        img.onerror = () => resolve(null);
        img.src = 'data:image/svg+xml;base64,' + btoa(src);
      });
      const names = dots.map((d) => d.getAttribute('aria-label'));
      const bits: (string | null)[] = [];
      for (const d of dots) bits.push(await ras(d.querySelector('svg')!));
      let min = Infinity; let worst = '';
      for (let i = 0; i < bits.length; i += 1) {
        for (let j = i + 1; j < bits.length; j += 1) {
          if (!bits[i] || !bits[j]) continue;
          let diff = 0;
          for (let k = 0; k < bits[i]!.length; k += 1) if (bits[i]![k] !== bits[j]![k]) diff += 1;
          if (diff < min) { min = diff; worst = `${names[i]} vs ${names[j]}`; }
        }
      }
      return { min, worst, n: bits.filter(Boolean).length,
               ink: bits.map((b) => (b ? (b.match(/1/g) || []).length : 0)) };
    });
    // six now, including the room's box — which must also be distinct from every instrument
    expect(res.n).toBe(6);
    expect(res.ink.every((v) => v > 8), `every mark must have ink: ${res.ink}`).toBe(true);
    expect(res.min, `closest pair is ${res.worst}`).toBeGreaterThanOrEqual(32);
  });

  test('six DISTINCT drawings — identical marks is the failure mode', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(300);
    const paths = await page.locator('#mt-dots .pgdot svg').evaluateAll((els) =>
      els.map((e) => e.innerHTML));
    expect(new Set(paths).size).toBe(6);
  });

  test('every dot is at least a 44px tap target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const boxes = await page.locator('#mt-dots .pgdot').evaluateAll((els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
    for (const b of boxes) expect(b.h).toBeGreaterThanOrEqual(44);
  });

  test('THE CURRENT DOT IS THE PAGE ON SCREEN — at both widths', async ({ page }) => {
    // The defect this replaces: `round(scrollLeft / clientWidth)` as a page index. That is only
    // true where a page IS the viewport. On the desktop a page is `clientWidth − 112`, so the
    // index drifted one page every three — standing on the chord dealer lit the DRONE's dot and
    // the loop lit the metronome's. Measuring rectangles cannot drift.
    for (const [w, h] of [[1512, 900], [390, 844]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(URL);
      await page.waitForTimeout(400);
      const cur = () => page.locator('#mt-dots .pgdot.cur').evaluateAll((els) =>
        els.map((e) => (e as HTMLElement).dataset.testid));
      expect(await cur(), `on the plan at ${w}`).toEqual(['dot-plan']);
      for (const [t, want] of [
        ['console', w < 760 ? ['dot-tuner'] : ['dot-tuner', 'dot-drone', 'dot-metro']],
        ['changes', ['dot-changes']],
        ['loop', ['dot-loop']],
      ] as const) {
        await page.locator(`[data-testid="plan-${t}"]`).click();
        await page.waitForTimeout(1000);
        // ON THE DESKTOP THE CONSOLE IS ONE PAGE OF THREE CASES, so all three are genuinely on
        // screen and all three read as current. The phone shows one.
        expect(await cur(), `on ${t} at ${w}`).toEqual(want);
        await page.locator(w < 760 ? '[data-testid="dot-plan"]' : '[data-testid="plan-word"]').click();
        await page.waitForTimeout(1100);
      }
    }
  });

  test('pressing a dot goes to that instrument', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    await page.locator('[data-testid="dot-changes"]').click();
    await page.waitForTimeout(700);
    const idx = await room(page).evaluate((el) => Math.round(el.scrollLeft / el.clientWidth));
    // page 4: plan, tuner, drone, metronome, changes
    expect(idx).toBe(4);
  });

  test('the row shows on the DESKTOP too — it is how you know the room continues', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    await expect(page.locator('#mt-dots .pgdot')).toHaveCount(6);
    await expect(page.locator('.mt-foot')).toBeVisible();
  });
});
