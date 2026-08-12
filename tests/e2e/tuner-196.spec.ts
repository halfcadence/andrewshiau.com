import { test, expect } from '@playwright/test';

// ── THIS SPEC'S APP HAS ITS OWN ROUTE (2026-08-12). The hash deep link this file used for an hour
// is gone with the scroller: every thing in the room is a standalone page now. Every `page.goto`
// here therefore names the route. It is not a test affordance — it is the app's address — but it is
// what makes real-pointer assertions possible: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case on another page the press landed on nothing and the ring's overshoot read as 1.
// (was: '#tuner` is how anyone links to this app — but it is what
// makes real-pointer assertions possible again: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case off-screen the press landed on nothing and the ring's overshoot read as 1.

// Fake mic = a 196 Hz sine (G3). Different note NAME and octave — this is what
// catches an off-by-one in the name table or the octave floor, which the two
// A-input tests can never see.

test('196 Hz mic reads G3, near 0 cents', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  await page.getByTestId('mic-toggle').click();

  await expect(page.getByTestId('note')).toHaveText('G3', { timeout: 10_000 });
  await page.waitForTimeout(600);

  const r = await page.evaluate(() => (window as any).__mt.reading);
  expect(r.name).toBe('G');
  expect(r.octave).toBe(3);
  expect(Math.abs(r.cents)).toBeLessThan(3);
  expect(Math.abs(r.freq - 196)).toBeLessThan(1);
});
