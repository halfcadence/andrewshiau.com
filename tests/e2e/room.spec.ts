// THE ROOM IS AN INDEX OF PAGES (2026-08-12, the owner's second correction).
//
// "i want to remove the scroll concept entirely (except on mobile console), each thing in the room
// is a standalone page with its own routing like practice.andrewshiau/console and you need to go
// back to room to get the other things."
//
// WHAT THIS FILE USED TO ASSERT, AND WHY MOST OF IT IS GONE. Two designs died here in one day. The
// QUEUE: how many things a width bought, what spilled past the fit, drag to reorder. Then the
// one-page INDEX: the plan as page 0 of a scroller, `goTo`, `#console` hash deep links, a hash that
// followed the scroll, a back mark that hid itself when the plan was on screen, `data-snap`. Every
// one of those was true when written and every one described a mechanism that no longer runs — so
// they are deleted rather than adapted. A test that pins a deleted design is a second copy of it.
//
// WHAT REPLACES THEM is smaller because the browser does the work: four routes, three links, one
// scroller left (the console on a phone). The claims worth a test are the ones a route cannot
// enforce by existing — which cases each page renders, that the ONE remaining scroller still snaps,
// that the room's boxes are real links, and that the plan still reads as a plan.
//
// The five demands (170/196/170/315/236) are restated here rather than imported, so a test cannot
// agree with a typo in the constant it checks.

import { test, expect, type Page } from '@playwright/test';

const ROOM = '/practice-room/';
const CONSOLE = '/practice-room/console/?e2e=1';
const DEMAND: Record<string, number> = { tuner: 170, metronome: 196, drone: 170, changes: 315, loop: 236 };
const PAD = 56, GAP = 56;
/* THE CONSOLE IS THE ONE PAGE THAT HOLDS THREE, and 648 + 2×56 = 760 is why the phone band is
   there: below it the three cannot sit side by side at their measured minimums. */
const CONSOLE_KEYS = ['tuner', 'drone', 'metronome'];
const THINGS3 = ['console', 'changes', 'loop'];
const PHONE_MAX = 759;

const room = (p: Page) => p.locator('#mt-pages');
// WHICH PAGE THE URL NAMES, on either host. The room is `/practice-room/` on the apex and on
// `astro preview`, and `/` on practice.andrewshiau.com — the same file, two addresses, because the
// vhost maps the pretty URL to the directory the build writes. A Playwright path glob therefore
// passes locally and fails on the live pass, which is the worst way round: green where it does not
// matter. Predicates over the pathname read the same on both.
//
// AND THESE ARE LINE COMMENTS, not a block. The block version quoted the glob it was replacing —
// two stars then a slash — which CLOSES a `/* */` comment at that point. Everything after it became
// code, and the parser reported "Missing semicolon" thirteen lines further down on a template
// literal that had been valid all along. Same trap as a CSS comment inside a CSS comment.
const atRoom = (u: URL) => /^\/(practice-room\/)?$/.test(u.pathname);
const atThing = (t: string) => (u: URL) => new RegExp('^/(practice-room/)?' + t + '/$').test(u.pathname);
const caseKeys = (p: Page) => p.evaluate(() =>
  [...document.querySelectorAll('[data-mt-key]')].map((e) => (e as HTMLElement).dataset.mtKey));

test.describe('EACH THING IS A PAGE', () => {
  const ROUTES: Array<[string, string, string[]]> = [
    ['the room', ROOM, []],
    ['the console', CONSOLE, CONSOLE_KEYS],
    ['the changes', '/practice-room/changes/?e2e=1', ['changes']],
    ['the loop', '/practice-room/loop/?e2e=1', ['loop']],
  ];

  for (const [name, url, keys] of ROUTES) {
    test(`${name} renders its own cases and nothing else`, async ({ page }) => {
      await page.setViewportSize({ width: 1512, height: 900 });
      await page.goto(url);
      await page.waitForTimeout(300);
      expect(await caseKeys(page)).toEqual(keys);
      // AND THE ROOM'S OWN SECTION IS ON THE ROOM ONLY. `caseKeys` cannot see it — the index has no
      // instrument and therefore no `data-mt-key` — so a red arm that rendered it on every route
      // left this test green while the console's columns silently gained a fourth child and the
      // dealer's case rendered at 1189px beside a 155px sliver. Counting the boxes is what sees it.
      await expect(page.locator('.mt-pbox'), `boxes on ${name}`).toHaveCount(url === ROOM ? 3 : 0);
      await expect(page.locator('.mt-order'), `the room's case on ${name}`).toHaveCount(url === ROOM ? 1 : 0);
      // AND NO SCROLLER. This is the whole ask: "remove the scroll concept entirely (except on
      // mobile console)". `scrollWidth > clientWidth` on a page you cannot navigate is a flick that
      // does nothing, and it is how the previous two designs felt broken.
      const over = await room(page).evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(over, `${name} must not scroll sideways at 1512`).toBe(0);
    });
  }

  test('THE ROOM IS THREE LINKS, and they are the only way between the things', async ({ page }) => {
    await page.goto(ROOM);
    const boxes = page.locator('.mt-pbox');
    await expect(boxes).toHaveCount(3);
    // ANCHORS, NOT BUTTONS: each thing is a URL now, so the honest element is a link — it works
    // with JS off, it middle-clicks into a new tab, and the browser's Back comes back here.
    const hrefs = await boxes.evaluateAll((els) => els.map((e) => ({
      tag: e.tagName, href: e.getAttribute('href'), thing: (e as HTMLElement).dataset.pthing })));
    expect(hrefs.map((h) => h.tag)).toEqual(['A', 'A', 'A']);
    expect(hrefs.map((h) => h.thing)).toEqual(THINGS3);
    // RELATIVE, because the room is `/` on the practice host and `/practice-room/` on the apex —
    // an absolute `/console/` is correct on one and a 404 on the other. Caught by this test failing
    // to navigate at all on the preview server.
    expect(hrefs.map((h) => h.href)).toEqual(['console/', 'changes/', 'loop/']);
    // and the room has no way back to itself
    await expect(page.locator('[data-testid="plan-word"]')).toHaveCount(0);
  });

  test('THE WAY BACK IS A LINK on every thing, and it costs one lead', async ({ page }) => {
    for (const url of ['/practice-room/console/', '/practice-room/changes/', '/practice-room/loop/']) {
      await page.setViewportSize({ width: 1512, height: 900 });
      await page.goto(url);
      const back = page.locator('[data-testid="plan-word"]');
      await expect(back).toHaveText('← the room');
      // AN ANCHOR to `/`, which on the practice host IS the room. It was a button that scrolled,
      // and it had to hide itself when the plan was already on screen; a link has no such state.
      expect(await back.evaluate((e) => [e.tagName, e.getAttribute('href')])).toEqual(['A', '../']);
      // the screen is round(down,100dvh,28px), so chrome costs a whole lead or every case leaves
      // the ladder
      const h = await page.locator('.mt-chrome').evaluate((e) => Math.round(e.getBoundingClientRect().height));
      expect(h, `the chrome row on ${url}`).toBe(28);
    }
  });

  test('and it really goes there — press a box, come back, twice', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    for (const t of THINGS3) {
      await page.goto(ROOM);
      await page.locator(`[data-testid="plan-${t}"]`).click();
      await page.waitForURL(atThing(t));
      expect(await caseKeys(page)).toEqual(t === 'console' ? CONSOLE_KEYS : [t]);
      await page.locator('[data-testid="plan-word"]').click();
      await page.waitForURL(atRoom);
      await expect(page.locator('.mt-pbox')).toHaveCount(3);
    }
  });

  test('the browser\'s own Back walks the room, because these are real navigations', async ({ page }) => {
    // The one-page version had to choose between `pushState` (Back walks the room and traps anyone
    // who arrived from elsewhere) and `replaceState` (Back leaves, and the room's own mark is the
    // only way up). Routes make it moot: this is ordinary history.
    await page.goto(ROOM);
    await page.locator('[data-testid="plan-changes"]').click();
    await page.waitForURL(atThing('changes'));
    await page.goBack();
    await page.waitForURL(atRoom);
    await expect(page.locator('.mt-pbox')).toHaveCount(3);
  });
});

test.describe('THE CONSOLE: three cases, one page', () => {
  for (const w of [1920, 1512, 1200, 900, 760]) {
    test(`${w}px seats the three in proportion to their measured demands`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(CONSOLE);
      await page.waitForTimeout(250);
      const parts = await page.evaluate((keys) => keys.map((k) =>
        (document.querySelector(`.mt-half[data-mt-key="${k}"]`) as HTMLElement).getBoundingClientRect().width),
        CONSOLE_KEYS);
      // EACH AT LEAST ITS OWN MEASURED DEMAND — below it the case's own ink breaks.
      parts.forEach((px, i) => expect(px, `${CONSOLE_KEYS[i]} at ${w}`)
        .toBeGreaterThanOrEqual(DEMAND[CONSOLE_KEYS[i]] - 1));
      // AND THE PAGE IS FULL: the three plus their two gaps are the room's width less its padding.
      expect(Math.abs(parts.reduce((a, b) => a + b, 0) + GAP * 2 - (w - PAD * 2))).toBeLessThanOrEqual(3);
      // THE RATIOS ARE THE DEMANDS. `170fr 170fr 196fr` in CSS is what `splitThing()` computed at
      // runtime, so this is the same claim the deleted arithmetic made — the drone and the tuner
      // are equal, and the metronome is wider by exactly its own ratio.
      expect(Math.abs(parts[0] - parts[1]), 'tuner and drone are equal').toBeLessThan(0.6);
      expect(parts[2] / parts[0]).toBeCloseTo(196 / 170, 2);
    });
  }

  test('760 is the narrowest desktop console, at the measured minimums', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto(CONSOLE);
    await page.waitForTimeout(250);
    const parts = await page.evaluate(() => ['tuner', 'drone', 'metronome'].map((k) =>
      Math.round((document.querySelector(`.mt-half[data-mt-key="${k}"]`) as HTMLElement)
        .getBoundingClientRect().width)));
    expect(parts).toEqual([170, 170, 196]);
  });

  // THE INK MUST HOLD AT THE BOUNDARY. A threshold that seats three cases whose contents break is
  // not a threshold. The real test of clickability is whether a control's own centre is the topmost
  // thing there.
  test('at 760 no control is clipped and none is unhittable', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto(CONSOLE);
    await page.waitForTimeout(400);
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      for (const c of document.querySelectorAll('#mt-pages .mt-half')) {
        const cb = c.getBoundingClientRect();
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

test.describe('THE ONE SCROLLER LEFT: the console on a phone', () => {
  test('759 swipes three full-viewport pages, and 760 does not scroll at all', async ({ page }) => {
    await page.setViewportSize({ width: PHONE_MAX, height: 844 });
    await page.goto(CONSOLE);
    await page.waitForTimeout(300);
    const phone = await room(page).evaluate((el) => ({
      over: el.scrollWidth - el.clientWidth, w: el.clientWidth,
      snap: getComputedStyle(el).scrollSnapType, pad: getComputedStyle(el).scrollPaddingLeft }));
    expect(phone.over, 'two pages of overflow for three pages').toBe(phone.w * 2);
    expect(phone.snap).toContain('mandatory');
    // 56px HERE WAS A REAL DEFECT: every page rested 56px off its own edge with a slice of the
    // previous one showing. A phone page IS the viewport; the 3ch inset datum needs a room.
    expect(phone.pad).toBe('0px');

    await page.setViewportSize({ width: 760, height: 844 });
    await page.waitForTimeout(300);
    expect(await room(page).evaluate((el) => el.scrollWidth - el.clientWidth)).toBe(0);
  });

  test('the other three routes have no snap and nothing to swipe, at any width', async ({ page }) => {
    for (const url of [ROOM, '/practice-room/changes/', '/practice-room/loop/']) {
      for (const w of [1512, 390]) {
        await page.setViewportSize({ width: w, height: 844 });
        await page.goto(url);
        await page.waitForTimeout(200);
        const r = await room(page).evaluate((el) => ({
          over: el.scrollWidth - el.clientWidth, snap: getComputedStyle(el).scrollSnapType }));
        expect(r.over, `${url} at ${w} must not scroll`).toBe(0);
        // A scroller with one child still eats a flick and reports overflow — that is how a page
        // that cannot move ends up feeling stuck.
        expect(r.snap, `${url} at ${w} must declare no snap`).toBe('none');
      }
    }
  });

  test('THE DOT ROW IS THE CONSOLE\'S, ON A PHONE, AND NOWHERE ELSE', async ({ page }) => {
    // His annotation on the desktop room: "this bar is no longer needd dleete form desktop, maybe
    // leave for cnosle mobile where we need app switching". It was a page indicator for a scroller;
    // there is one scroller left, so there is one place for it.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CONSOLE);
    await page.waitForTimeout(300);
    const dots = page.locator('#mt-dots .pgdot');
    await expect(dots).toHaveCount(3);
    expect(await dots.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.testid)))
      .toEqual(['dot-tuner', 'dot-drone', 'dot-metro']);
    expect(await dots.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))))
      .toEqual(['tuner', 'drone', 'metronome']);
    // ONE LINE, and every mark on the glass — the assertion that caught a row hanging from x −12
    await expect(page.locator('.mt-foot')).toBeVisible();
    const row = await page.locator('#mt-dots').evaluate((el) => {
      const ds = [...el.querySelectorAll('.pgdot')];
      return { lines: new Set(ds.map((d) => Math.round(d.getBoundingClientRect().top))).size,
               off: ds.filter((d) => { const b = d.getBoundingClientRect();
                 return b.left < 0 || b.right > window.innerWidth; }).length,
               tap: Math.min(...ds.map((d) => d.getBoundingClientRect().height)) };
    });
    expect(row.lines).toBe(1);
    expect(row.off, 'every mark on the screen').toBe(0);
    expect(row.tap, '44px tap targets').toBeGreaterThanOrEqual(44);

    // ON THE DESKTOP CONSOLE THERE IS NOTHING TO INDICATE: all three are on screen at once, which
    // is the same argument that made this row phone-only the first time.
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.waitForTimeout(300);
    await expect(page.locator('.mt-foot')).toBeHidden();

    // and it does not exist on the other routes at all
    for (const url of [ROOM, '/practice-room/changes/', '/practice-room/loop/']) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(url);
      await expect(page.locator('#mt-dots'), `${url} has no dot row`).toHaveCount(0);
    }
  });

  test('the dot in ink is the page on screen, and pressing one goes there', async ({ page }) => {
    // `round(scrollLeft / clientWidth)` as a page index is TRUE here — a phone page is the viewport
    // — and was wrong everywhere else it was used (the chord dealer lit the DRONE's mark), so the
    // geometric test stayed: more than half the case inside the scrollport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CONSOLE);
    await page.waitForTimeout(400);
    const cur = () => page.locator('#mt-dots .pgdot.cur').evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.testid));
    expect(await cur(), 'the console opens on the tuner').toEqual(['dot-tuner']);
    for (const [id, key] of [['dot-metro', 'metronome'], ['dot-drone', 'drone'], ['dot-tuner', 'tuner']] as const) {
      await page.locator(`[data-testid="${id}"]`).click();
      await page.waitForTimeout(800);
      const x = await room(page).evaluate((el) => el.scrollLeft);
      const want = await page.evaluate((k) =>
        (document.querySelector(`[data-mt-key="${k}"]`) as HTMLElement).offsetLeft, key);
      expect(Math.abs(x - want), `${id} landed on ${key}`).toBeLessThan(8);
      expect(await cur()).toEqual([id]);
    }
  });

  test('NO JS settle remains — the page never writes hook.settled', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CONSOLE);
    await page.waitForTimeout(300);
    await room(page).evaluate((el) => { el.scrollLeft = 40; el.dispatchEvent(new Event('scrollend')); });
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as any).__mt.settled)).toBeNull();
  });
});

test.describe('THE ROOM READS AS A PLAN', () => {
  // Choosers `practice-room-box` Q1/04 (a room with a doorway), Q2/04 (the screen's thirds),
  // Q3/02 (a figure and a name under it), Q4/04 (there is no outside).

  test('ONE box, and the CASE\'S OWN FRAME is it', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(ROOM);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const sec = document.querySelector('.mt-order') as HTMLElement;
      const rb = sec.getBoundingClientRect();
      const boxes = [...sec.querySelectorAll('.mt-pbox')];
      const cs = getComputedStyle(sec);
      return {
        // there is no second container: his annotation, "dont need this container if the room has
        // one" — two nested bordered boxes drew one room
        inner: document.querySelectorAll('#mt-planroom').length,
        boxes: boxes.length, slots: sec.querySelectorAll('.mt-pslot').length,
        escapes: boxes.filter((b) => {
          const q = b.getBoundingClientRect();
          return q.left < rb.left - 0.5 || q.right > rb.right + 0.5
              || q.top < rb.top - 0.5 || q.bottom > rb.bottom + 0.5;
        }).length,
        // the WALLS are heavier than the fittings — that weight difference IS the containment
        walls: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth].map((v) => Math.round(parseFloat(v))),
        doorway: cs.borderLeftColor,
        gradients: (cs.backgroundImage.match(/linear-gradient/g) || []).length,
        fitting: boxes.length ? Math.round(parseFloat(getComputedStyle(boxes[0]).borderTopWidth)) : null,
        // and the floor is inset from the walls by the room's own 3ch datum. `var(--inset)` — a
        // token that does not exist — silently dropped this whole declaration once.
        pad: [cs.paddingTop, cs.paddingLeft].map((v) => Math.round(parseFloat(v))),
      };
    });
    expect(r.inner, 'the doubled container is gone').toBe(0);
    expect(r.boxes).toBe(3);
    expect(r.slots).toBe(3);
    expect(r.escapes, 'a room escaped the room').toBe(0);
    expect(r.walls, 'the walls are 2px ink').toEqual([2, 2, 2]);
    expect(/transparent|rgba\(0, 0, 0, 0\)/.test(r.doorway), 'the doorway leaves the left wall open').toBe(true);
    expect(r.gradients, 'two wall segments either side of the opening').toBe(2);
    expect(r.fitting, 'the fittings are hairlines, lighter than the walls').toBe(1);
    expect(r.pad, 'the floor is inset one lead and one 3ch datum').toEqual([28, 27]);
  });

  test('THE ROOMS FILL THE FLOOR — a plan is not a strip of chips', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(ROOM);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const sec = document.querySelector('.mt-order')!;
      const floor = sec.querySelector('.mt-pfloor')!;
      const box = sec.querySelector('.mt-pbox')!;
      const mid = sec.querySelector('.mt-mid')!;
      return { sec: sec.getBoundingClientRect().height, floor: floor.getBoundingClientRect().height,
               box: box.getBoundingClientRect().height, mid: mid.getBoundingClientRect().height,
               app: document.getElementById('mt-app')!.getBoundingClientRect().height };
    });
    // A CHAIN OF FOUR, because two was not enough and the third had the wrong denominator. `room/
    // page` and `box/floor` both passed while the floor had collapsed to its content inside a
    // stretched room — they shrink together. Then measuring the floor against the room's whole
    // content box read 0.78 for a correct layout, because the ladder reserves `case-top`, `spec`,
    // `hint` and `case-bot` above and below the band the floor is allowed. The band is `.mt-mid`.
    expect(r.sec / r.app, 'the room fills its page').toBeGreaterThan(0.85);
    expect(r.floor / r.mid, 'the floor fills the band the ladder gives it').toBeGreaterThan(0.99);
    expect(r.box / r.floor, 'the rooms fill the floor').toBeGreaterThan(0.95);
    // and the thing the whole assertion exists for: 62px chips in a 742px case read as a shelf
    expect(r.box / r.sec, 'the rooms are most of the room').toBeGreaterThan(0.6);
  });

  test('thirds on the desktop, stacked on a phone — and the figures fit either way', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(ROOM);
    await page.waitForTimeout(300);
    const cols = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.mt-pfloor')!).gridTemplateColumns);
    const parts = cols.split(' ').map(parseFloat);
    expect(parts.length).toBe(3);
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThan(1.5);

    // A PLAN OF A NARROW ROOM DRAWS ITS ROOMS DOWN THE FLOOR. Three across 390px is what the stack
    // exists for — and it is NOT about the names (they wrap), it is the console's three 32px marks:
    // 3×32 plus two 14px gaps is 124px against about 93px of room.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const r2 = await page.evaluate(() => {
      const floor = document.querySelector('.mt-pfloor')!;
      return { cols: getComputedStyle(floor).gridTemplateColumns.split(' ').length,
               rows: new Set([...floor.querySelectorAll('.mt-pbox')]
                 .map((b) => Math.round(b.getBoundingClientRect().top))).size,
               spill: [...floor.querySelectorAll('.mt-pbox')].filter((b) => {
                 const bb = b.getBoundingClientRect();
                 const m = b.querySelector('.mt-pmarks')!.getBoundingClientRect();
                 return m.width > bb.width + 0.5 || m.left < bb.left - 0.5 || m.right > bb.right + 0.5;
               }).length };
    });
    expect(r2.cols, 'the phone stacks one room per row').toBe(1);
    expect(r2.rows, 'three distinct rows').toBe(3);
    expect(r2.spill, "a room's figure spilled its box at 390").toBe(0);
  });

  test('each room is a figure and a name — and NO name truncates, at any width', async ({ page }) => {
    for (const [w, h] of [[1512, 900], [760, 900], [390, 844]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(ROOM);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => [...document.querySelectorAll('.mt-pbox')].map((b) => {
        const nm = b.querySelector('.mt-pnm') as HTMLElement;
        // MEASURE THE PAINTED INK, SUBPIXEL. `scrollWidth <= clientWidth` said `the changes` fitted
        // while the page rendered `the chang…`: those properties are integer-rounded and the
        // overflow was 0.33px. A Range over the text node gives the real painted width.
        const rg = document.createRange();
        rg.selectNodeContents(nm);
        const cs = getComputedStyle(nm);
        const box = nm.getBoundingClientRect().width
          - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return { name: nm.textContent, marks: b.querySelectorAll('svg').length,
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

  test('the marks are 32px here and 16px in the dot row, at ONE stroke weight', async ({ page }) => {
    // Scaling the generated output is not a second drawing — but without
    // `vector-effect:non-scaling-stroke` the 1.8 weight doubles with the box and the plan's mark
    // becomes a fatter object than the same mark in the dot row. One weight, every size.
    // THE TWO LIVE ON DIFFERENT ROUTES NOW, so this reads them from two page loads.
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(ROOM);
    await page.waitForTimeout(300);
    const plan = await page.evaluate(() => {
      const svg = document.querySelector('.mt-pmarks svg') as SVGElement;
      const p = svg.querySelector('path')!;
      return { w: Math.round(svg.getBoundingClientRect().width), box: svg.getAttribute('viewBox'),
               effect: getComputedStyle(p).vectorEffect, stroke: p.getAttribute('stroke-width') };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CONSOLE);
    await page.waitForTimeout(300);
    const dot = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="dot-tuner"] svg') as SVGElement;
      const p = svg.querySelector('path')!;
      return { w: Math.round(svg.getBoundingClientRect().width), box: svg.getAttribute('viewBox'),
               stroke: p.getAttribute('stroke-width') };
    });
    expect(plan.w).toBe(32);
    expect(dot.w).toBe(16);
    expect(plan.effect, 'the plan scales the drawing, not its weight').toBe('non-scaling-stroke');
    expect(plan.stroke, 'one declared weight').toBe(dot.stroke);
    expect(plan.box, 'the same generated mark, not a second drawing').toBe(dot.box);
  });

  test('nothing on the room spills its case, and the labels that said nothing are gone', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(ROOM);
    await page.waitForTimeout(300);
    // his annotation: "dont need this hint" — `press a box`, and the `3 things` counter under it,
    // told you what three labelled boxes already say
    await expect(page.locator('#mt-order-hint')).toHaveCount(0);
    await expect(page.locator('#mt-order-fit')).toHaveCount(0);
    const bad = await page.evaluate(() => {
      const sec = document.querySelector('.mt-order')!;
      const sb = sec.getBoundingClientRect();
      const out: string[] = [];
      for (const e of sec.querySelectorAll('.mt-pfloor, .mt-pbox, .mt-pnm')) {
        const q = e.getBoundingClientRect();
        if (q.right > sb.right + 0.5) out.push(`${e.className} past the right edge`);
        if (q.left < sb.left - 0.5) out.push(`${e.className} past the left edge`);
        if (q.top < sb.top - 0.5) out.push(`${e.className} above the case top`);
        if (q.bottom > sb.bottom + 0.5) out.push(`${e.className} below the case bottom`);
      }
      if (!sec.querySelector('.mt-plate')) out.push('no engraved plate');
      return out;
    });
    expect(bad).toEqual([]);
    expect(await page.locator('.mt-order .mt-plate').innerText()).toBe('the room');
  });

  test('the room needs no script — it renders with JS off', async ({ browser }) => {
    // The boxes were written by `drawPlan()` on every layout because the plan was a page of a
    // scroller whose widths changed. A static index of three fixed things needs none of that, and
    // this is the assertion that keeps it that way.
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 1512, height: 900 });
    await p.goto(ROOM);
    await expect(p.locator('.mt-pbox')).toHaveCount(3);
    expect(await p.locator('.mt-pbox').evaluateAll((els) => els.map((e) => e.getAttribute('href'))))
      .toEqual(['console/', 'changes/', 'loop/']);
    await ctx.close();
  });
});

test.describe('THE MECHANISMS ARE GONE, not merely idle', () => {
  // CSS for a state nothing sets, and JS for a page that no longer exists, both describe a design
  // that is not there — which is what the next person to read this file would believe.
  test('no queue attributes, no snap attribute, no runtime column properties', async ({ page }) => {
    for (const url of [ROOM, CONSOLE, '/practice-room/changes/?e2e=1', '/practice-room/loop/?e2e=1']) {
      for (const w of [1512, 390]) {
        await page.setViewportSize({ width: w, height: 844 });
        await page.goto(url);
        await page.waitForTimeout(200);
        const r = await page.evaluate(() => ({
          queued: document.querySelectorAll('[data-queued]').length,
          snapped: document.querySelectorAll('[data-snap]').length,
          cols: (document.getElementById('mt-pages') as HTMLElement).style.getPropertyValue('--mt-cols'),
          pcols: (document.getElementById('mt-pages') as HTMLElement).style.getPropertyValue('--mt-pcols'),
          order: [...document.querySelectorAll('[data-mt-key]')]
            .map((e) => getComputedStyle(e).order),
        }));
        expect(r.queued, `data-queued on ${url} at ${w}`).toBe(0);
        expect(r.snapped, `data-snap on ${url} at ${w}`).toBe(0);
        expect(r.cols, `--mt-cols on ${url} at ${w}`).toBe('');
        expect(r.pcols, `--mt-pcols on ${url} at ${w}`).toBe('');
        // SOURCE ORDER IS LAYOUT ORDER. `order:` let the queue re-sequence cases without moving
        // nodes; with one thing per page there is nothing to re-sequence, and a tab order that
        // disagrees with the screen is what that arrangement risked.
        expect(new Set(r.order).size, `order: is unused on ${url} at ${w}`).toBeLessThanOrEqual(1);
      }
    }
  });

  test('the hash deep links are gone, and an unknown hash is inert', async ({ page }) => {
    // `#console` / `#changes` / `#loop` opened a page of the scroller for one hour. A fragment is
    // never sent to a server, so those links cannot be redirected — they are simply dead, which is
    // acceptable for an hour-old mechanism nobody had linked to. What must NOT happen is a hash
    // moving a page that no longer scrolls.
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(`${ROOM}#loop`);
    await page.waitForTimeout(300);
    expect(await caseKeys(page)).toEqual([]);
    expect(await room(page).evaluate((el) => el.scrollLeft)).toBe(0);
    await page.goto(`${CONSOLE}#nope`);
    await page.waitForTimeout(300);
    expect(await room(page).evaluate((el) => el.scrollLeft)).toBe(0);
  });
});
