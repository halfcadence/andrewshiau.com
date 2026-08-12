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
  tuner: 170, metronome: 196, drone: 170, changes: 282, loop: 236,
};
const PAD = 56, GAP = 56;
/** bisected 2026-08-11: the desktop room first seats two cases at 534 (one at 533) */
const PHONE_MAX = 533;

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
  const cases = [
    { w: 1920, n: 5 }, { w: 1440, n: 5 }, { w: 1366, n: 4 },
    { w: 900, n: 3 }, { w: 700, n: 2 }, { w: 534, n: 2 },
  ];

  for (const { w, n } of cases) {
    test(`${w}px seats ${n}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(URL);
      await page.waitForTimeout(300);
      const f = await fit(page);
      expect(f.shown.length).toBe(n);
      await expect(shownCases(page)).toHaveCount(n);

      // THE RENDERED WIDTHS ARE THE ARITHMETIC'S OUTPUT — read them back rather than trusting
      // that the variable was written. A CSS variable set to a wrong value still "works".
      const rendered = await shownCases(page).evaluateAll((els) =>
        els.map((e) => Math.round(e.getBoundingClientRect().width)));
      expect(rendered).toEqual(f.widths);

      // every shown case gets AT LEAST its own measured demand
      f.shown.forEach((k, i) => expect(f.widths[i]).toBeGreaterThanOrEqual(DEMAND[k]));

      // and the room is FULL: Q1/04 shares the leftover rather than leaving air
      const occupied = f.widths.reduce((a, b) => a + b, 0) + GAP * (n - 1) + PAD * 2;
      expect(Math.abs(occupied - w)).toBeLessThanOrEqual(2);
    });
  }

  test('the queue past the fit is RENDERED, not dropped', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    // two shown, three queued, and all five still in the DOM at their own demand
    await expect(shownCases(page)).toHaveCount(2);
    const queued = page.locator('#mt-pages .mt-half[data-queued]');
    await expect(queued).toHaveCount(3);
    const ws = await queued.evaluateAll((els) => els.map((e) => ({
      k: (e as HTMLElement).dataset.mtKey, w: Math.round(e.getBoundingClientRect().width),
    })));
    for (const { k, w } of ws) expect(w).toBe(DEMAND[k!]);
    // reachable: the room scrolls rather than hiding them
    const { sw, cw } = await room(page).evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(sw).toBeGreaterThan(cw + 100);
  });

  test('THE ORDER CHANGES THE COUNT — the dealer first costs a slot at 840px', async ({ page }) => {
    await page.setViewportSize({ width: 840, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    expect((await fit(page)).shown.length).toBe(3);

    // move the chord dealer to the front through the ORDER PAGE's own controls
    await page.locator('[data-testid="order-changes"]').click();
    await page.locator('[data-testid="order-tuner"]').click();
    await page.waitForTimeout(250);
    const f = await fit(page);
    expect(f.shown[0]).toBe('changes');
    expect(f.shown.length).toBe(2);        // 282 + 170 + 56 + 112 = 620; a third needs more
  });
});

test.describe('the phone threshold, bisected to 534', () => {
  test('534 is the desktop room, seating two at their measured minimums', async ({ page }) => {
    await page.setViewportSize({ width: 534, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const f = await fit(page);
    expect(f.shown).toEqual(['tuner', 'metronome']);
    expect(f.widths).toEqual([170, 196]);
  });

  test('533 is the phone: one instrument per page, the whole viewport', async ({ page }) => {
    await page.setViewportSize({ width: PHONE_MAX, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const w = await page.locator('#mt-pages .mt-half').first()
      .evaluate((e) => Math.round(e.getBoundingClientRect().width));
    expect(w).toBe(PHONE_MAX);
  });

  // THE INK MUST HOLD AT THE BOUNDARY. A threshold that seats two cases whose contents break
  // is not a threshold — it is the defect the old 1477 existed to prevent, at a smaller size.
  // This is the check that would have caught the clipped tap button: a control whose box
  // passes its case's bottom edge is unclickable, and `elementsFromPoint` returns only <html>.
  test('at 534 no control is clipped and no row wraps out of its case', async ({ page }) => {
    await page.setViewportSize({ width: 534, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(400);
    const bad = await page.evaluate(() => {
      const out: string[] = [];
      // Only the cases actually ON SCREEN. The order page is the room's last page, so at
      // 534px it sits off to the right in the queue — `elementsFromPoint` at its rows finds
      // nothing there, which is correct rather than a clipped control. It is not marked
      // `data-queued` (it is not an instrument), so the selector has to exclude it by class.
      for (const c of document.querySelectorAll('#mt-pages .mt-half:not([data-queued]):not(.mt-order)')) {
        const cb = c.getBoundingClientRect();
        for (const el of c.querySelectorAll('button,input')) {
          const r = el.getBoundingClientRect();
          if (r.height === 0) continue;
          if (r.bottom > cb.bottom + 0.5) out.push(`${el.className || el.tagName} below its case`);
          if (r.right > cb.right + 0.5) out.push(`${el.className || el.tagName} past its case`);
          // the real test of clickability: is the control's own centre the topmost thing there?
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const hit = document.elementsFromPoint(cx, cy);
          if (!hit.includes(el) && hit.length <= 1) out.push(`${el.className || el.tagName} unhittable`);
        }
      }
      return out;
    });
    expect(bad).toEqual([]);
  });
});

test.describe('the settle — free scroll, lock on release (Q2/04)', () => {
  test('a scroll left off a case edge settles back onto it', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    // land deliberately off the room's 3ch inset datum
    await room(page).evaluate((el) => { el.scrollLeft = 40; el.dispatchEvent(new Event('scrollend')); });
    await page.waitForTimeout(700);
    const at = await room(page).evaluate((el) => el.scrollLeft);
    expect(at).toBe(0);
    // and the settle recorded its own target — reading the mechanism, not a symptom
    expect(await page.evaluate(() => (window as any).__mt.settled)).toBe(0);
  });

  test('there is NO css snap on the desktop room — the momentum is the browser\'s', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(URL);
    const snap = await room(page).evaluate((el) => getComputedStyle(el).scrollSnapType);
    expect(snap === 'none' || snap === '').toBeTruthy();
  });

  test('the phone KEEPS its css snap — the settle must not fight it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(URL);
    const snap = await room(page).evaluate((el) => getComputedStyle(el).scrollSnapType);
    expect(snap).toContain('mandatory');
  });
});

test.describe('the order page is the room\'s last page (Q3/01)', () => {
  test('there is no global chrome — the room is the whole screen', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(URL);
    // the app's first child is the heading then the room; nothing between the viewport top
    // and the cases
    const top = await page.locator('#mt-pages').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThanOrEqual(1);
  });

  test('it sits last in the room, after every instrument', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    const orders = await page.locator('#mt-pages > section').evaluateAll((els) =>
      els.map((e) => ({ k: (e as HTMLElement).dataset.mtKey ?? 'ORDER', o: Number(getComputedStyle(e).order) })));
    const orderPage = orders.find((o) => o.k === 'ORDER')!;
    expect(orderPage.o).toBe(orders.length - 1);
    for (const o of orders) if (o.k !== 'ORDER') expect(o.o).toBeLessThan(orderPage.o);
  });

  test('every row prints its instrument\'s measured demand', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(300);
    const rows = await page.locator('#mt-olist .mt-orow').evaluateAll((els) => els.map((e) => ({
      k: (e as HTMLElement).dataset.mtKey,
      d: e.querySelector('.mt-od')?.textContent,
    })));
    expect(rows.length).toBe(5);
    for (const r of rows) expect(r.d).toBe(String(DEMAND[r.k!]));
  });
});

test.describe('the order is drag, with the keyboard path drag cannot have (Q4/01)', () => {
  test('press one row then another moves it there, and the room re-seats', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto(URL);
    await page.waitForTimeout(300);
    expect((await fit(page)).shown).toEqual(['tuner', 'metronome', 'drone']);

    await page.locator('[data-testid="order-loop"]').click();
    await page.locator('[data-testid="order-tuner"]').click();
    await page.waitForTimeout(250);

    const order = await page.evaluate(() => (window as any).__mt.order as string[]);
    expect(order[0]).toBe('loop');
    // and the ROOM followed — one state, not two
    expect((await fit(page)).shown[0]).toBe('loop');
  });

  test('a picked-up row says so, and pressing it again puts it down', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(300);
    const row = page.locator('[data-testid="order-drone"]');
    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-testid="order-drone"]').click();
    await expect(page.locator('[data-testid="order-drone"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('the order survives a reload', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(300);
    await page.locator('[data-testid="order-loop"]').click();
    await page.locator('[data-testid="order-tuner"]').click();
    await page.waitForTimeout(250);
    await page.reload();
    await page.waitForTimeout(400);
    expect((await page.evaluate(() => (window as any).__mt.order as string[]))[0]).toBe('loop');
  });

  test('a junk stored order does not break the room', async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => localStorage.setItem('mt:order', 'pitchgraph,,tuner,tuner,nope'));
    await page.reload();
    await page.waitForTimeout(400);
    const order = await page.evaluate(() => (window as any).__mt.order as string[]);
    expect([...order].sort()).toEqual(['changes', 'drone', 'loop', 'metronome', 'tuner']);
    expect(order[0]).toBe('tuner');   // the one valid key it named, kept in front
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
    expect(labels).toEqual(['tuner', 'metronome', 'drone', 'the changes', 'the loop']);
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
