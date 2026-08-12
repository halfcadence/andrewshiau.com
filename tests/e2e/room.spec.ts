// THE QUEUE ROOM, on the real page (chooser `practice-room-queue`, 2026-08-11).
//
// What this covers that the unit tests cannot: the arithmetic's output has to survive contact
// with the browser's layout. `fitRoom()` being right about 170px is one claim; the tuner
// RENDERING at 170px with its ink intact is another, and the second is what the reader gets.
//
// The five demands (170/196/170/282/236) are restated here rather than imported, so a test
// cannot agree with a typo in the constant it checks.

import { test, expect, type Page } from '@playwright/test';

const URL = '/practice-room/?e2e=1';
const DEMAND: Record<string, number> = {
  tuner: 170, metronome: 196, drone: 170, changes: 315, loop: 236,
};
const PAD = 56, GAP = 56;
/* THE ROOM SEATS THINGS NOW, not instruments (choosers `practice-room-plan` Q1/02 +
   `practice-room-box`, 2026-08-12): the tuner, drone and metronome are ONE console; the changes
   and the loop are standalones. A thing's demand is its members' plus the gaps between them, so
   the console is 170+170+196+2x56 = 648 and all three still need 1423px. Restated here rather
   than imported so a test cannot agree with a typo in the module it checks. */
const THING_KEYS: Record<string, string[]> = {
  console: ['tuner', 'drone', 'metronome'],
  changes: ['changes'],
  loop: ['loop'],
};
const thingDemand = (id: string) =>
  THING_KEYS[id].reduce((a, k) => a + DEMAND[k], 0) + GAP * (THING_KEYS[id].length - 1);
const ORDER3 = ['console', 'changes', 'loop'];
/* THE PHONE BAND, re-bisected 2026-08-12 for the things model: the console (648px) needs 760
   once the room's padding is counted, so below that the desktop room could only show it
   overflowing. Whole at 760, partial at 759 — and the arithmetic names the same pixel. */
const PHONE_MAX = 759;

const room = (p: Page) => p.locator('#mt-pages');
const shownCases = (p: Page) =>
  p.locator('#mt-pages .mt-half:not([data-queued]):not(.mt-order)');

async function fit(p: Page) {
  return p.evaluate(() => ({
    shown: (window as any).__mt.roomShown as string[],
    widths: (window as any).__mt.roomWidths as number[],
  }));
}

test.describe('the room seats what the width buys', () => {
  // Each row: viewport width → how many cases, checked against the harness's own greedy walk.
  // computed from the harness's own demands, so the expectation is derived not typed
  const seats = (w: number) => {
    let used = PAD * 2, n = 0;
    for (const id of ORDER3) {
      const add = thingDemand(id) + (n ? GAP : 0);
      if (used + add > w) break;
      used += add; n += 1;
    }
    return Math.max(1, n);
  };
  const cases = [1920, 1512, 1440, 1200, 900, 760].map((w) => ({ w, n: seats(w) }));

  for (const { w, n } of cases) {
    test(`${w}px seats ${n}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(URL);
      await page.waitForTimeout(300);
      const f = await fit(page);
      expect(f.shown.length, `things seated at ${w}`).toBe(n);
      // the CASES on screen are the shown things' members, flattened
      const wantCases = f.shown.flatMap((id) => THING_KEYS[id]).length;
      await expect(shownCases(page)).toHaveCount(wantCases);

      // every shown thing gets AT LEAST its own demand, and the room is FULL — Q1/04 shares the
      // leftover rather than leaving air
      f.shown.forEach((id, i) => expect(f.widths[i]).toBeGreaterThanOrEqual(thingDemand(id)));
      const occupied = f.widths.reduce((a, b) => a + b, 0) + GAP * (n - 1) + PAD * 2;
      expect(Math.abs(occupied - w)).toBeLessThanOrEqual(2);

      // AND THE CONSOLE'S OWN SPLIT REACHES EVERY MEMBER. Its extra room is shared in proportion
      // to their demands, so the dial and the pendulum both grow — pooling it in one case was a
      // red-armed defect.
      if (f.shown.includes('console')) {
        const parts = await page.evaluate(() =>
          ['tuner', 'drone', 'metronome'].map((k) => Math.round(
            (document.querySelector(`.mt-half[data-mt-key="${k}"]`) as HTMLElement)
              .getBoundingClientRect().width)));
        parts.forEach((px, i) => expect(px).toBeGreaterThanOrEqual(DEMAND[['tuner', 'drone', 'metronome'][i]] - 1));
        const consoleW = f.widths[f.shown.indexOf('console')];
        expect(Math.abs(parts.reduce((a, b) => a + b, 0) + GAP * 2 - consoleW)).toBeLessThanOrEqual(3);
      }
    });
  }

  test('the queue past the fit is RENDERED, not dropped', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    // at 900 only the console fits (648 + 112 = 760; a second thing needs 1131)
    const f = await fit(page);
    expect(f.shown).toEqual(['console']);
    expect(f.queued).toBeUndefined();     // the hook exposes `shown`; the DOM carries the rest
    // the two standalones stay in the DOM at their own demand, reachable by scrolling
    const queued = page.locator('#mt-pages .mt-half[data-queued]');
    await expect(queued).toHaveCount(2);
    const ws = await queued.evaluateAll((els) => els.map((e) => ({
      k: (e as HTMLElement).dataset.mtKey, w: Math.round(e.getBoundingClientRect().width),
    })));
    for (const { k, w } of ws) expect(w).toBe(DEMAND[k!]);
    const { sw, cw } = await room(page).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(sw).toBeGreaterThan(cw + 100);
  });

  test('A CONSOLE SEATS WHOLE OR NOT AT ALL — never two of its three', async ({ page }) => {
    // the grouping exists to stop a tuner sitting beside a drone with the metronome off-screen,
    // which is the busy room the owner rejected. So at every desktop width the console's three
    // cases are either all shown or all queued — never split.
    for (const w of [1920, 1440, 1100, 900, 760]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(URL);
      await page.waitForTimeout(250);
      const state = await page.evaluate(() => ['tuner', 'drone', 'metronome'].map((k) =>
        (document.querySelector(`.mt-half[data-mt-key="${k}"]`) as HTMLElement).dataset.queued !== undefined));
      expect(new Set(state).size, `console split at ${w}: ${state}`).toBe(1);
    }
  });

  test('THE ORDER CHANGES WHAT IS ON SCREEN — the dealer first evicts the console', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    expect((await fit(page)).shown).toEqual(['console']);   // 648 + 112 = 760; +315 needs 1131

    // move `the changes` to the front through the PLAN's own boxes (press one, press another)
    await page.locator('[data-testid="plan-changes"]').click();
    await page.locator('[data-testid="plan-console"]').click();
    await page.waitForTimeout(300);
    const f = await fit(page);
    expect(f.shown[0]).toBe('changes');
    // AND ONLY IT FITS, because moving `changes` to the front leaves the order
    // changes → console → loop: 315 + 112 = 427 fits, adding the console needs 1131. The console
    // now blocks the loop it used to sit after. My first expectation here said ['changes','loop']
    // — true only if the console had gone to the END, which pressing two boxes does not do.
    expect(f.shown).toEqual(['changes']);
    expect(await page.evaluate(() => (window as any).__mt.order as string[]))
      .toEqual(['changes', 'console', 'loop']);
  });
});

test.describe('the phone band, re-bisected to 760', () => {
  test('760 is the desktop room, seating the console whole at its measured minimums', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const f = await fit(page);
    expect(f.shown).toEqual(['console']);
    expect(f.widths).toEqual([648]);
    const parts = await page.evaluate(() => ['tuner', 'drone', 'metronome'].map((k) =>
      Math.round((document.querySelector(`.mt-half[data-mt-key="${k}"]`) as HTMLElement)
        .getBoundingClientRect().width)));
    expect(parts).toEqual([170, 170, 196]);
  });

  test('759 is the phone: one instrument per page, the whole viewport', async ({ page }) => {
    await page.setViewportSize({ width: PHONE_MAX, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const w = await page.locator('#mt-pages .mt-half').first()
      .evaluate((e) => Math.round(e.getBoundingClientRect().width));
    expect(w).toBe(PHONE_MAX);
  });

  // THE INK MUST HOLD AT THE BOUNDARY. A threshold that seats a console whose contents break is
  // not a threshold — it is the clipped-tap-button defect at a smaller size. The real test of
  // clickability is whether a control's own centre is the topmost thing there.
  test('at 760 no control is clipped and none is unhittable', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      for (const c of document.querySelectorAll('#mt-pages .mt-half:not([data-queued]):not(.mt-order)')) {
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

  test('every case is a snap point, on the room\'s own inset datum', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const first = document.querySelector('#mt-pages > .mt-half') as HTMLElement;
      const pages = document.getElementById('mt-pages')!;
      return { align: getComputedStyle(first).scrollSnapAlign,
               padLeft: getComputedStyle(pages).scrollPaddingLeft };
    });
    expect(r.align).toBe('start');
    // 56px = --group, which is what puts a snapped case's edge on the 3ch inset rather than
    // against the viewport
    expect(r.padLeft).toBe('56px');
  });

  test('NO JS settle remains — the page never writes hook.settled', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    await room(page).evaluate((el) => { el.scrollLeft = 40; el.dispatchEvent(new Event('scrollend')); });
    await page.waitForTimeout(600);
    // the deleted mechanism's own field stays null, and nothing dragged the scroll backwards
    expect(await page.evaluate(() => (window as any).__mt.settled)).toBeNull();
  });

  test('the phone keeps its snap too', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    const snap = await room(page).evaluate((el) => getComputedStyle(el).scrollSnapType);
    expect(snap).toContain('mandatory');
  });
});

test.describe('THE PLAN — one big box, the things inside it', () => {
  // Choosers `practice-room-box` Q1/04 (a room with a doorway), Q2/04 (the screen's thirds),
  // Q3/02 (a figure and a name under it), Q4/04 (there is no outside).

  test('it is ONE box with the things inside it, not boxes side by side', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    await page.locator('[data-testid="plan-word"]').click();
    await page.waitForTimeout(700);
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
      };
    });
    expect(r.boxes).toBe(3);
    expect(r.slots).toBe(3);
    expect(r.escapes, 'a box escaped the room').toBe(0);
    expect(r.walls, 'the walls are 2px ink').toEqual([2, 2, 2]);
    expect(/transparent|rgba\(0, 0, 0, 0\)/.test(r.doorway), 'the doorway leaves the left wall open').toBe(true);
    expect(r.gradients, 'two wall segments either side of the opening').toBe(2);
    expect(r.boxBorder, 'the fittings are hairlines, lighter than the walls').toBe(1);
  });

  test('the slots are the screen\'s thirds', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const cols = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#mt-planroom .mt-pfloor')!).gridTemplateColumns);
    const parts = cols.split(' ').map(parseFloat);
    expect(parts.length).toBe(3);
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThan(1.5);
  });

  test('each little box is a figure and a name — and NO name truncates', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
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
               truncated: rg.getBoundingClientRect().width > box + 0.01,
               w: Math.round(b.getBoundingClientRect().width) };
    }));
    expect(r.map((x) => x.name)).toEqual(['console', 'the changes', 'the loop']);
    // THE CONSOLE DRAWS ALL THREE OF ITS MEMBERS' MARKS — the grouping as a drawing, not a label
    expect(r[0].marks).toBe(3);
    expect(r[1].marks).toBe(1);
    expect(r[2].marks).toBe(1);
    // A WIDTH THREE PIXELS SHORT STILL LOOKS DELIBERATE. At 340 the plan page rendered 80px
    // boxes against the 83 the ink needs and `the changes` truncated to `the chang…` — I had
    // left the slot's own 2px padding out of the arithmetic. This is why it is asserted.
    expect(r.filter((x) => x.truncated), 'a name truncated').toEqual([]);
  });

  test('there is NO outside — every thing is always in the room', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(400);
    // no shelf, and the three boxes account for all five instruments
    expect(await page.locator('#mt-planroom .mt-pbox').count()).toBe(3);
    const keys = await page.evaluate(() =>
      [...document.querySelectorAll('#mt-planroom .mt-pbox')].map((b) => (b as HTMLElement).dataset.pthing));
    expect(keys.sort()).toEqual(['changes', 'console', 'loop']);
  });

  test('THE PLAN IS BEHIND ONE WORD, and that word costs exactly one lead', async ({ page }) => {
    // box chooser `Where` Q2/02 — this REVERSES the no-global-chrome decision, knowingly: the
    // app opens on the instruments and the plan is one press away. The screen is
    // round(down,100dvh,28px), so chrome costs a whole lead or it puts every case off the ladder.
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const chrome = await page.locator('.mt-chrome').evaluate((e) =>
      Math.round(e.getBoundingClientRect().height));
    expect(chrome).toBe(28);
    const word = page.locator('[data-testid="plan-word"]');
    await expect(word).toBeVisible();
    await expect(word).toHaveText('plan');

    // it really scrolls the room to the plan, and back
    // CLAMPED, like the page's own check: the plan is the last page, so its offsetLeft is far
    // past the maximum scroll (1457 against a 405 max at 1512px). Comparing the raw offset was
    // the same defect the old settle had, reintroduced — hence the clamp on both sides.
    const atPlan = async () => page.evaluate(() => {
      const pages = document.getElementById('mt-pages')!;
      const plan = document.querySelector('.mt-order') as HTMLElement;
      const target = Math.min(plan.offsetLeft - 56, Math.max(0, pages.scrollWidth - pages.clientWidth));
      return Math.abs(pages.scrollLeft - target) < 8;
    });
    expect(await atPlan()).toBe(false);
    await word.click();
    await page.waitForTimeout(800);
    expect(await atPlan(), 'the word did not open the plan').toBe(true);
    await word.click();
    await page.waitForTimeout(800);
    expect(await atPlan(), 'pressing it again did not return').toBe(false);
  });

  test('the word is hidden on the phone, where the plan is already a page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    await expect(page.locator('.mt-chrome')).toBeHidden();
  });

  test('nothing in the plan spills its case', async ({ page }) => {
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
      }
      if (!sec.querySelector('.mt-plate')) out.push('no engraved plate');
      return out;
    });
    expect(bad).toEqual([]);
  });
});

test.describe('the plan is drag, with the keyboard path drag cannot have', () => {
  test('press one box then another moves it there, and the room re-seats', async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    expect((await fit(page)).shown).toEqual(['console', 'changes', 'loop']);

    await page.locator('[data-testid="plan-loop"]').click();
    await page.locator('[data-testid="plan-console"]').click();
    await page.waitForTimeout(400);

    const order = await page.evaluate(() => (window as any).__mt.order as string[]);
    expect(order[0]).toBe('loop');
    expect((await fit(page)).shown[0]).toBe('loop');
  });

  test('a picked-up box says so, and pressing it again puts it down', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(400);
    const box = page.locator('[data-testid="plan-changes"]');
    await box.click();
    await expect(box).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-testid="plan-changes"]').click();
    await expect(page.locator('[data-testid="plan-changes"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('the order survives a reload, and a stale INSTRUMENT order does not break it', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(400);
    await page.locator('[data-testid="plan-loop"]').click();
    await page.locator('[data-testid="plan-console"]').click();
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(500);
    expect((await page.evaluate(() => (window as any).__mt.order as string[]))[0]).toBe('loop');

    // yesterday's five-instrument key list must normalise to the default three rather than throw
    await page.evaluate(() => localStorage.setItem('mt:things', 'tuner,metronome,drone,changes,loop'));
    await page.reload();
    await page.waitForTimeout(500);
    const order = await page.evaluate(() => (window as any).__mt.order as string[]);
    expect([...order].sort()).toEqual(['changes', 'console', 'loop']);
    await expect(page.locator('#mt-planroom .mt-pbox')).toHaveCount(3);
  });
});

test.describe('the dots are the instruments\' own figures (Q5/02)', () => {
  test('five glyphs, one line at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const dots = page.locator('#mt-dots .pgdot');
    await expect(dots).toHaveCount(5);
    // ONE LINE is the whole reason the words went: five words measured 568px at 390.
    const tops = await dots.evaluateAll((els) =>
      [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top)))]);
    expect(tops.length).toBe(1);
    const rowW = await page.locator('#mt-dots').evaluate((e) => e.getBoundingClientRect().width);
    expect(rowW).toBeLessThanOrEqual(390);
  });

  // PIXELS, NOT SIGNATURES. `markSignature()` says 4@0 and 3@0 are different marks, and the
  // unit tests are satisfied by that — but two stacks of level bars can be arithmetically
  // distinct and visually the same at 16px. Looking at the rendered row I thought the metronome
  // and the dealer were nearly identical; measured, the closest pair is metronome/drone at 48 of
  // 256 pixels (19% of the box) and metronome/dealer is not even in the closest four. So the
  // eyeball was wrong AND the weaker test was insufficient — this is the instrument that settles
  // it, and it fails if any future fact change pushes two marks together.
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
    expect(res.n).toBe(5);
    expect(res.ink.every((v) => v > 8), `every mark must have ink: ${res.ink}`).toBe(true);
    expect(res.min, `closest pair is ${res.worst}`).toBeGreaterThanOrEqual(32);
  });

  test('five DISTINCT drawings — five identical marks is the failure mode', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(300);
    const paths = await page.locator('#mt-dots .pgdot svg').evaluateAll((els) =>
      els.map((e) => e.innerHTML));
    expect(new Set(paths).size).toBe(5);
  });

  test('each dot carries its instrument\'s NAME for assistive tech', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(300);
    const labels = await page.locator('#mt-dots .pgdot').evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label')));
    // THE ORDER FOLLOWS THE CONSOLE'S OWN KEYS — tuner, drone, metronome — because the room
    // seats things and the console seats its three in that order. It was tuner/metronome/drone
    // when the room held five peers.
    expect(labels).toEqual(['tuner', 'drone', 'metronome', 'the changes', 'the loop']);
  });

  test('every dot is at least a 44px tap target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const boxes = await page.locator('#mt-dots .pgdot').evaluateAll((els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
    for (const b of boxes) expect(b.h).toBeGreaterThanOrEqual(44);
  });

  test('pressing a dot goes to that instrument', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    await page.locator('[data-testid="dot-changes"]').click();
    await page.waitForTimeout(600);
    const idx = await room(page).evaluate((el) => Math.round(el.scrollLeft / el.clientWidth));
    expect(idx).toBe(3);
  });

  test('the row shows on the DESKTOP too — it is how you know the queue continues', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    await expect(page.locator('#mt-dots .pgdot')).toHaveCount(5);
    await expect(page.locator('.mt-foot')).toBeVisible();
  });
});
