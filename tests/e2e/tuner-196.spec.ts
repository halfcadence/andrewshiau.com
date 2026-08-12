import { test, expect } from '@playwright/test';

// ── OPENED BY DEEP LINK (2026-08-12). The room is an INDEX now: it opens on the plan, and this
// spec's instrument is a page you navigate to. Every `page.goto` here therefore carries the app's
// own hash. It is not a test affordance — `#tuner` is how anyone links to this app — but it is what
// makes real-pointer assertions possible again: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case off-screen the press landed on nothing and the ring's overshoot read as 1.

// Fake mic = a 196 Hz sine (G3). Different note NAME and octave — this is what
// catches an off-by-one in the name table or the octave floor, which the two
// A-input tests can never see.

test('196 Hz mic reads G3, near 0 cents', async ({ page }) => {
  await page.goto('/practice-room/?e2e#tuner');
  await page.getByTestId('mic-toggle').click();

  await expect(page.getByTestId('note')).toHaveText('G3', { timeout: 10_000 });
  await page.waitForTimeout(600);

  const r = await page.evaluate(() => (window as any).__mt.reading);
  expect(r.name).toBe('G');
  expect(r.octave).toBe(3);
  expect(Math.abs(r.cents)).toBeLessThan(3);
  expect(Math.abs(r.freq - 196)).toBeLessThan(1);
});
