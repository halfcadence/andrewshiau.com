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

test('desktop control: both halves on screen, no dots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/practice-room/');
  const tuner = await page.locator('.mt-half[aria-label="Tuner"]').boundingBox();
  const metro = await page.locator('.mt-half[aria-label="Metronome"]').boundingBox();
  // Equal halves, side by side, both fully in the viewport.
  expect(tuner!.x).toBeLessThan(100);
  expect(metro!.x).toBeGreaterThan(600);
  expect(metro!.x + metro!.width).toBeLessThanOrEqual(1441);
  expect(Math.abs(tuner!.width - metro!.width)).toBeLessThan(10);
  await expect(page.getByTestId('dot-tuner')).toBeHidden();
  // The instrument carries no site chrome: the mark is deleted (2026-08-04).
  await expect(page.getByTestId('home-mark')).toHaveCount(0);
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
