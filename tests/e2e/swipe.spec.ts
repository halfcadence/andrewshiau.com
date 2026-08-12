import { test, expect } from '@playwright/test';

// The phone mode switch (chooser: metrotuner-two-pages, Q3/02): under 900px the
// halves are snap-scroll pages and the ring/disc dots both indicate and navigate.
// Wide viewports show both halves and no dots — asserted as the control.

test.use({ viewport: { width: 390, height: 720 } });

test('phone: the page words navigate; the current page reads ink', async ({ page }) => {
  await page.goto('/practice-room/');

  // Page 1 is the tuner; both words visible, "tuner" is current.
  await expect(page.getByTestId('dot-tuner')).toBeVisible();
  await expect(page.getByTestId('dot-tuner')).toHaveClass(/cur/);

  // The metronome half exists but is off-screen to the right.
  const metroBefore = await page.locator('.mt-half[aria-label="Metronome"]').boundingBox();
  expect(metroBefore!.x).toBeGreaterThanOrEqual(390);

  // Click "metronome" → the pages scroll, the current word moves.
  await page.getByTestId('dot-metro').click();
  await page.waitForTimeout(700); // smooth scroll settles
  const metroAfter = await page.locator('.mt-half[aria-label="Metronome"]').boundingBox();
  expect(Math.abs(metroAfter!.x)).toBeLessThan(30);
  await expect(page.getByTestId('dot-metro')).toHaveClass(/cur/);
  await expect(page.getByTestId('dot-tuner')).not.toHaveClass(/cur/);

  // A real swipe (drag the scroller) navigates back and the words follow.
  await page.locator('#mt-pages').evaluate((el) => el.scrollTo({ left: 0, behavior: 'auto' }));
  await page.waitForTimeout(300);
  await expect(page.getByTestId('dot-tuner')).toHaveClass(/cur/);
});

test('phone: the metronome still runs while the tuner page is shown', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await page.getByTestId('dot-metro').click();
  await page.waitForTimeout(700);
  await page.getByTestId('metro-toggle').click();
  // swipe back to the tuner — the scheduler must keep scheduling
  await page.getByTestId('dot-tuner').click();
  await page.waitForTimeout(1500);
  const ticks: unknown[] = await page.evaluate(() => (window as any).__mt.ticks);
  expect(ticks.length).toBeGreaterThanOrEqual(2);
  await page.getByTestId('dot-metro').click();
  await page.waitForTimeout(700);
  await page.getByTestId('metro-toggle').click();
});

// ── THE DESKTOP CONTROL, REWRITTEN FOR THE QUEUE ─────────────────────────────────────────
// WHAT THIS USED TO ASSERT: five cases on screen at 1512, the last three at their fixed
// `--mt-drone-w / --mt-changes-w / --mt-loop-w` widths, the worked pair squeezed to 208px, and
// NO dots (on the desktop every case was on screen, so an indicator pointed at nothing).
// Every one of those is a statement about a layout that no longer exists. What replaced them,
// and what still has to be true:
//   · the room seats what the width buys and SHARES the leftover, so a case's width is
//     `demand + share` — asserted as ">= its own measured demand", never as a fixed number;
//   · the cases are in the QUEUE's order, left to right;
//   · the foot line stays inside its case, which is the assertion the old clip bug needed;
//   · the dots row now shows on the desktop TOO, because the queue continues off-screen and
//     the row is the only thing that says so. That inverts the old "no dots" control exactly.
// 1512 is kept as the width because it is where all five fit (they need 1423), so this is
// still the "whole room visible" case the control was written to cover.
test('desktop: all five seated in queue order, each at least its own demand', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto('/practice-room/?e2e=1');
  await page.waitForTimeout(300);

  const DEMAND: Record<string, number> = {
    tuner: 170, metronome: 196, drone: 170, changes: 315, loop: 236,
  };
  const boxes: Record<string, { x: number; width: number; y: number; height: number }> = {};
  for (const [key, label] of [
    ['tuner', 'Tuner'], ['metronome', 'Metronome'], ['drone', 'Drone'],
    ['changes', 'Chord dealer'], ['loop', 'Loop'],
  ] as Array<[string, string]>) {
    boxes[key] = (await page.locator(`.mt-half[aria-label="${label}"]`).boundingBox())!;
  }

  // all five on screen, none queued
  await expect(page.locator('#mt-pages .mt-half[data-queued]')).toHaveCount(0);

  // EACH AT LEAST ITS OWN MEASURED DEMAND. This is the invariant the fixed widths used to
  // state as three magic numbers: a case may be wider than its demand (it took a share) but
  // never narrower, because below the demand its own ink breaks.
  for (const [key, d] of Object.entries(DEMAND)) {
    expect(Math.round(boxes[key].width), `${key} keeps at least its ${d}px`)
      .toBeGreaterThanOrEqual(d);
  }

  // IN THE QUEUE'S ORDER, left to right, each clear of the last.
  const seq = ['tuner', 'metronome', 'drone', 'changes', 'loop'];
  expect(boxes.tuner.x).toBeLessThan(100);
  for (let n = 1; n < seq.length; n += 1) {
    const prev = boxes[seq[n - 1]], cur = boxes[seq[n]];
    expect(cur.x, `${seq[n]} sits after ${seq[n - 1]}`).toBeGreaterThan(prev.x + prev.width - 1);
  }

  // THE MEASURED TOKENS SURVIVE — they are what the phone's cases are drawn from, and what
  // room.ts's demands were derived from. 315 is the widest chord symbol at 72px; 236 is
  // sixteen countable ticks.
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#mt-app')!);
    return {
      drone: cs.getPropertyValue('--mt-drone-w').trim(),
      changes: cs.getPropertyValue('--mt-changes-w').trim(),
      loop: cs.getPropertyValue('--mt-loop-w').trim(),
    };
  });
  expect(tokens).toEqual({ drone: '210px', changes: '315px', loop: '236px' });

  // AND THE FOOT LINE STAYS INSIDE ITS CASE. This is the assertion the clip bug needed and did
  // not have: the metronome's foot holds `bpm` and `tap` on one line, and a wrap pushes a real
  // control out of a case that clips its overflow.
  const foot = (await page.locator('.mt-half[aria-label="Metronome"] .mt-cfoot').boundingBox())!;
  expect(foot.y + foot.height, 'the foot line must not spill past the case')
    .toBeLessThanOrEqual(boxes.metronome.y + boxes.metronome.height);
  const tapBox = (await page.getByTestId('tap').boundingBox())!;
  expect(tapBox.y + tapBox.height, 'tap must be inside the viewport').toBeLessThanOrEqual(900);

  // THE DOTS SHOW ON THE DESKTOP NOW — the inversion of the old control. The order page is
  // always off-screen (it is the room's last page), so the queue always continues and the row
  // is how you know, and how you jump.
  await expect(page.getByTestId('dot-tuner')).toBeVisible();
  // The instrument still carries no site chrome: the mark is deleted (2026-08-04), and Q3/01
  // is what kept it that way — the way to the order page is the room's own scroll.
  await expect(page.getByTestId('home-mark')).toHaveCount(0);
});

// ── THE ROW HOLDS GLYPHS NOW (queue chooser, Q5/02) ──────────────────────────────────────
// WHAT THIS TEST USED TO SAY, and why the answer changed rather than the question: the five
// pages were NAMED, and the words row was what broke first at 390px — measured at 568px of
// words against a 390px viewport, so it wrapped to two lines and the foot took a second lead.
// That was the accepted cost of naming five pages, and a sixth would have made it three lines.
// The queue can grow, so the words went and each page is marked by its own case's drawing at
// 16px. The question is unchanged and still the sharpest one about this row: does it FIT, and
// is every page reachable? A page you cannot reach is a case that does not exist on a phone.
test('phone: five pages, five glyphs, one line', async ({ page }) => {
  await page.goto('/practice-room/');

  const row = page.locator('#mt-dots');
  const fit = await row.evaluate((el) => {
    const dots = [...el.querySelectorAll('.pgdot')];
    const tops = new Set(dots.map((k) => Math.round(k.getBoundingClientRect().top)));
    return { n: dots.length, lines: tops.size,
             overflows: el.scrollWidth > el.clientWidth + 1,
             width: Math.round(el.getBoundingClientRect().width),
             // five DISTINCT drawings: five identical marks would be a working-looking row
             // that says nothing, which is the failure mode a glyph set has and words do not
             drawings: new Set(dots.map((k) => k.querySelector('svg')?.innerHTML)).size,
             // the NAME has to survive the words going, for anyone not looking at the screen
             labels: dots.map((k) => k.getAttribute('aria-label')) };
  });
  expect(fit.n).toBe(5);
  expect(fit.drawings, 'five distinct drawings').toBe(5);
  expect(fit.labels).toEqual(['tuner', 'metronome', 'drone', 'the changes', 'the loop']);
  // ONE LINE AT 390px — the whole reason the words went. Measured: 148px of glyphs.
  expect(fit.lines, 'five glyphs set on one line at 390px').toBe(1);
  expect(fit.overflows, 'the row must not overflow').toBe(false);
  expect(fit.width).toBeLessThanOrEqual(390);

  // ── AND EVERY GLYPH IS INSIDE THE VIEWPORT, which is the assertion that caught a real bug
  // on the words version and is kept verbatim in spirit: the row was `nowrap`, five words set
  // 414px, the flex centred them, and the row hung from x −12 to 402 with two labels clipped
  // by the SCREEN. `lines` and `overflows` BOTH passed on it — nothing scrolled, and one line
  // was exactly what the assertion wanted. A row can satisfy every box-level check and still
  // have two of its five marks off the glass.
  const inside = await row.evaluate((el) =>
    [...el.querySelectorAll('.pgdot')].map((k) => {
      const b = k.getBoundingClientRect();
      return { t: k.getAttribute('aria-label'), ok: b.left >= 0 && b.right <= window.innerWidth };
    }));
  expect(inside.filter((w) => !w.ok), 'every glyph must be on the screen').toEqual([]);

  // and EVERY glyph navigates to its own page — the order page included, since it is the last
  // page of the room and unreachable means the order cannot be changed on a phone.
  for (const [testid, label] of [
    ['dot-drone', 'Drone'],
    ['dot-changes', 'Chord dealer'],
    ['dot-loop', 'Loop'],
    ['dot-tuner', 'Tuner'],
  ] as Array<[string, string]>) {
    await page.getByTestId(testid).click();
    await page.waitForTimeout(700);
    const box = (await page.locator(`.mt-half[aria-label="${label}"]`).boundingBox())!;
    expect(Math.abs(box.x), `${label} snapped into view`).toBeLessThan(30);
    await expect(page.getByTestId(testid)).toHaveClass(/cur/);
  }

  // THE ORDER PAGE IS REACHABLE BY SWIPING PAST THE LAST INSTRUMENT (Q3/01). This is the only
  // way in — there is no chrome — so if it is unreachable the queue is read-only on a phone.
  await page.locator('#mt-pages').evaluate((el) => {
    el.scrollTo({ left: el.clientWidth * 5, behavior: 'auto' });
  });
  await page.waitForTimeout(400);
  const orderBox = (await page.locator('.mt-order').boundingBox())!;
  expect(Math.abs(orderBox.x), 'the order page snaps into view past the fifth instrument')
    .toBeLessThan(30);
  await expect(page.locator('#mt-olist .mt-orow')).toHaveCount(5);
});

test('phone: the accent mark clears the plate it sits under', async ({ page }) => {
  // User nit, 2026-08-05: "the accent is too close to the text metronome on mobile —
  // vertically". It was worse than close: measured on the live page at 360/390/430 the
  // plate's line box ran y 0→28 and the mark's ink y 20→28, overlapping by 8px in the same
  // band. Two things moved opposite ways on the phone — the plate drops to straddle the
  // inset frame while the mark reaches 8px above its own row — and only the phone put them
  // in the same place, which is why desktop always looked right (5px clear).
  // Asserted as a positive clearance rather than a pixel count, so the composition can be
  // retuned without editing the test; the companion assertion is that the mark still TOUCHES
  // the digits, because it is the accent over the 1 and must not drift off the thing it marks.
  await page.goto('/practice-room/');
  const pages = page.locator('#mt-pages');
  await pages.evaluate((el) => { el.scrollLeft = el.clientWidth; });
  await page.waitForTimeout(400);

  const box = await page.evaluate(() => {
    const plate = [...document.querySelectorAll('.mt-plate')]
      .find((e) => e.textContent?.trim() === 'metronome')!;
    const mark = document.getElementById('mt-acc-mark')!;
    const digits = document.querySelector('#mt-beats-seg .rm-digits')!;
    const p = plate.getBoundingClientRect();
    const m = mark.getBoundingClientRect();
    const d = digits.getBoundingClientRect();
    return { clearance: m.top - p.bottom, markToDigits: d.top - m.bottom };
  });

  expect(box.clearance,
    'the accent mark overlaps or crowds the "metronome" plate').toBeGreaterThanOrEqual(12);
  expect(box.markToDigits,
    'the mark drifted off the digits it annotates').toBeLessThanOrEqual(4);
});
