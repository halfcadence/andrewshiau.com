import { test, expect } from '@playwright/test';

// The phone mode switch (chooser: metrotuner-two-pages, Q3/02): under 900px the
// halves are snap-scroll pages and the ring/disc dots both indicate and navigate.
// Wide viewports show both halves and no dots — asserted as the control.

test.use({ viewport: { width: 390, height: 720 } });

test('phone: dots navigate between tuner and metronome, disc marks the page', async ({ page }) => {
  await page.goto('/metrotuner/');

  // Page 1 is the tuner; both dots visible, first is the disc.
  await expect(page.getByTestId('dot-tuner')).toBeVisible();
  const fill0 = await page.getByTestId('dot-tuner').locator('[data-dot]').getAttribute('fill');
  expect(fill0).toBe('currentColor');

  // The metronome half exists but is off-screen to the right.
  const metroBefore = await page.locator('.mt-half[aria-label="Metronome"]').boundingBox();
  expect(metroBefore!.x).toBeGreaterThanOrEqual(390);

  // Click the metronome dot → the pages scroll, the disc moves.
  await page.getByTestId('dot-metro').click();
  await page.waitForTimeout(700); // smooth scroll settles
  const metroAfter = await page.locator('.mt-half[aria-label="Metronome"]').boundingBox();
  expect(Math.abs(metroAfter!.x)).toBeLessThan(30);

  const fillMetro = await page.getByTestId('dot-metro').locator('[data-dot]').getAttribute('fill');
  expect(fillMetro).toBe('currentColor');
  const fillTuner = await page.getByTestId('dot-tuner').locator('[data-dot]').getAttribute('fill');
  expect(fillTuner).toBe('none');

  // A real swipe (drag the scroller) navigates back and the dots follow.
  await page.locator('#mt-pages').evaluate((el) => el.scrollTo({ left: 0, behavior: 'auto' }));
  await page.waitForTimeout(300);
  const fillBack = await page.getByTestId('dot-tuner').locator('[data-dot]').getAttribute('fill');
  expect(fillBack).toBe('currentColor');
});

test('phone: the metronome still runs while the tuner page is shown', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
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
  await page.goto('/metrotuner/');
  const tuner = await page.locator('.mt-half[aria-label="Tuner"]').boundingBox();
  const metro = await page.locator('.mt-half[aria-label="Metronome"]').boundingBox();
  // Equal halves, side by side, both fully in the viewport.
  expect(tuner!.x).toBeLessThan(100);
  expect(metro!.x).toBeGreaterThan(600);
  expect(metro!.x + metro!.width).toBeLessThanOrEqual(1441);
  expect(Math.abs(tuner!.width - metro!.width)).toBeLessThan(10);
  await expect(page.getByTestId('dot-tuner')).toBeHidden();
  // The way to the case study is the one word at the foot.
  await expect(page.locator('.mt-about a')).toHaveAttribute('href', '/work/metrotuner/');
});
