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

// FIVE CASES, AND THE DESKTOP WIDTH IS NOW 1512 (practice-room-apps Q1/02+03, Q2/01).
// This test ran at 1440 for as long as the room held three cases. The chord dealer and the
// loop take 315 + 236 + two more 56px gaps out of the row, so the metronome's foot line no
// longer fits its case below 1477 — measured, and the failure was not cosmetic: the foot
// wrapped to two lines inside a one-lead track and pushed `tap` past the case's bottom edge,
// where `overflow:hidden` CLIPPED it. So the room swipes below 1477 and 1440 is now a phone
// width. The desktop assertion has to be made at a width the desktop layout exists at.
test('desktop control: five cases on screen, the last three narrow, no dots', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto('/practice-room/');
  const tuner = (await page.locator('.mt-half[aria-label="Tuner"]').boundingBox())!;
  const metro = (await page.locator('.mt-half[aria-label="Metronome"]').boundingBox())!;
  const drone = (await page.locator('.mt-half[aria-label="Drone"]').boundingBox())!;
  const changes = (await page.locator('.mt-half[aria-label="Chord dealer"]').boundingBox())!;
  const loop = (await page.locator('.mt-half[aria-label="Loop"]').boundingBox())!;

  // THE NARROW THIRD (chooser metrotuner-drone-box, Q2/05). The two worked instruments
  // keep equal width; the drone takes only what a letter and a verb need. Widths state
  // importance, and that is the pick — so it is asserted as a RELATION (the drone is
  // materially narrower) plus the token's own value, not as three magic numbers.
  expect(tuner.x).toBeLessThan(100);
  expect(Math.abs(tuner.width - metro.width), 'the two worked cases stay equal').toBeLessThan(10);
  expect(drone.x).toBeGreaterThan(metro.x + metro.width - 1);
  // THE "NARROW THIRD" RELATION IS GONE, and deleting the assertion is the honest move rather
  // than loosening its ratio. It read `drone.width < metro.width * 0.7` — true when the worked
  // pair was 539px, and meaningless now the pair is 208px and the drone is 210px. The drone is
  // no longer narrow RELATIVE to anything; it is narrow ABSOLUTELY, at the 210px its own
  // contents need, which is what the token assertion below actually checks.
  // This is the inversion the owner accepted at Q2/01 — the two worked instruments are now the
  // narrowest cases in the room — and it is asserted explicitly further down rather than left
  // as a stale ratio that happens to be false.
  expect(drone.width, 'the drone keeps the width its contents need').toBe(210);
  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#mt-app')!);
    return {
      drone: cs.getPropertyValue('--mt-drone-w').trim(),
      changes: cs.getPropertyValue('--mt-changes-w').trim(),
      loop: cs.getPropertyValue('--mt-loop-w').trim(),
    };
  });
  // Each fixed width is a MEASURED minimum, not a preference — see the tokens' own comments:
  // 315 is the widest chord symbol at the drone's 72px, 236 is sixteen countable ticks.
  expect(tokens).toEqual({ drone: '210px', changes: '315px', loop: '236px' });
  expect(Math.round(drone.width)).toBe(210);
  expect(Math.round(changes.width)).toBe(315);
  expect(Math.round(loop.width)).toBe(236);

  // the two new cases sit after the drone, in order, and all five are inside the viewport
  expect(changes.x).toBeGreaterThan(drone.x + drone.width - 1);
  expect(loop.x).toBeGreaterThan(changes.x + changes.width - 1);
  expect(loop.x + loop.width).toBeLessThanOrEqual(1513);

  // THE COST THE OWNER ACCEPTED, asserted so it cannot drift silently: the worked pair is
  // 208px at 1512, narrower than either new case. That is the Q2/01 trade — five cases in one
  // room — and if a future change makes it worse this is where it shows up.
  expect(Math.round(tuner.width)).toBe(208);
  expect(tuner.width, 'the worked pair is narrower than the chord dealer — the accepted cost')
    .toBeLessThan(changes.width);

  // AND THE FOOT LINE STAYS INSIDE ITS CASE. This is the assertion the clip bug needed and
  // did not have: the metronome's foot holds `bpm` and `tap` on one line, and a wrap pushes a
  // real control out of a case that clips its overflow.
  const foot = (await page.locator('.mt-half[aria-label="Metronome"] .mt-cfoot').boundingBox())!;
  expect(foot.y + foot.height, 'the foot line must not spill past the case')
    .toBeLessThanOrEqual(metro.y + metro.height);
  const tapBox = (await page.getByTestId('tap').boundingBox())!;
  expect(tapBox.y + tapBox.height, 'tap must be inside the viewport').toBeLessThanOrEqual(900);
  await expect(page.getByTestId('dot-tuner')).toBeHidden();
  // The instrument carries no site chrome: the mark is deleted (2026-08-04).
  await expect(page.getByTestId('home-mark')).toHaveCount(0);
});

// FIVE PAGES, FIVE WORDS — and the words row is what breaks first at 390px, so it is
// measured rather than eyeballed. THE ANSWER CHANGED with two more cases: three words set on
// one line at 390px, five do NOT (measured: 568px of words against a 390px viewport), so the
// row wraps to two lines and the foot takes a second lead. That is the stated cost of naming
// the pages instead of drawing five dots, and it is asserted here rather than left to be
// discovered — what must still hold is that the row does not OVERFLOW its own box, and that
// every word navigates.
test('phone: five pages, five words, wrapped but not overflowing', async ({ page }) => {
  await page.goto('/practice-room/');

  const row = page.locator('#mt-dots');
  const fit = await row.evaluate((el) => {
    const kids = [...el.children];
    // COUNT LINES FROM THE WORDS, not from every child. The `·` separators are `.mt-lb`
    // 11px labels, so their boxes sit ~10px below the buttons' on the SAME line — counting
    // distinct `top` values across all five children reported 2 lines for a row that
    // measured one (every word at y634, the dots at y644). The words are what must not
    // wrap, so the words are what gets measured.
    const words = kids.filter((k) => k.tagName === 'BUTTON');
    const tops = new Set(words.map((k) => Math.round(k.getBoundingClientRect().top)));
    return { lines: tops.size, overflows: el.scrollWidth > el.clientWidth + 1,
             width: Math.round(el.getBoundingClientRect().width),
             // The BUTTONS' own text, not the row's concatenation: the build strips the
             // whitespace between elements, so a joined string is a test of the bundler's
             // formatting rather than of the words. (It failed on exactly that — expected
             // "tuner · metronome · drone", got "tuner·metronome·drone".)
             words: words.map((k) => k.textContent?.trim()) };
  });
  expect(fit.words).toEqual(['tuner', 'metronome', 'drone', 'the changes', 'the loop']);
  // TWO LINES AT 390px — measured, and it is the accepted cost of NAMING five pages.
  expect(fit.lines, 'five words wrap to two lines at 390px').toBe(2);
  expect(fit.overflows, 'the words row must not overflow').toBe(false);
  expect(fit.width).toBeLessThanOrEqual(390);

  // ── AND EVERY WORD IS INSIDE THE VIEWPORT, which is the assertion that actually caught a
  // bug. `lines` and `overflows` BOTH passed on a broken row: the row was `nowrap`, so five
  // words set 414px, the flex centred them, and the row's own box hung from x −12 to 402 with
  // `tuner` and `the loop` clipped by the SCREEN. Nothing scrolled, so no overflow check
  // fired, and one line was exactly what the old assertion wanted. A row can satisfy every
  // box-level check and still have two of its five labels off the glass.
  const inside = await row.evaluate((el) =>
    [...el.children].filter((k) => k.tagName === 'BUTTON').map((k) => {
      const b = k.getBoundingClientRect();
      return { t: k.textContent?.trim(), ok: b.left >= 0 && b.right <= window.innerWidth };
    }));
  expect(inside.filter((w) => !w.ok), 'every page word must be on the screen').toEqual([]);

  // and EVERY word navigates to its own page — the two new ones included, because a page you
  // cannot reach is a case that does not exist on a phone.
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
