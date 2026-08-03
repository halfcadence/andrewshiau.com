import { test, expect } from '@playwright/test';

// Fake mic = a 196 Hz sine (G3). Different note NAME and octave — this is what
// catches an off-by-one in the name table or the octave floor, which the two
// A-input tests can never see.

test('196 Hz mic reads G3, near 0 cents', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  await page.getByTestId('mic-toggle').click();

  await expect(page.getByTestId('note')).toHaveText('G3', { timeout: 10_000 });
  await page.waitForTimeout(600);

  const r = await page.evaluate(() => (window as any).__mt.reading);
  expect(r.name).toBe('G');
  expect(r.octave).toBe(3);
  expect(Math.abs(r.cents)).toBeLessThan(3);
  expect(Math.abs(r.freq - 196)).toBeLessThan(1);
});
