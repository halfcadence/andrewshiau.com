import { test, expect } from '@playwright/test';

// Fake mic = a 446 Hz sine. This is the direction test the unit suite runs on
// buffers, now end-to-end through a real getUserMedia → AnalyserNode → detector
// chain: sharp must read SHARP. A tuner with a flipped sign passes every
// "|cents| ≈ 23" assertion and tunes every string the wrong way.

test('446 Hz mic reads A4 SHARP (+); calibrated to 446 it reads in tune', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  await page.getByTestId('mic-toggle').click();

  await expect(page.getByTestId('note')).toHaveText('A4', { timeout: 10_000 });
  await page.waitForTimeout(600);

  const r1 = await page.evaluate(() => (window as any).__mt.reading);
  expect(r1.name).toBe('A');
  expect(r1.cents).toBeGreaterThan(15);   // sharp — SIGNED
  expect(r1.cents).toBeLessThan(35);      // and about the right amount (+23.4)
  expect(Math.abs(r1.freq - 446)).toBeLessThan(1);

  // The rendered cents string carries the sign the user reads.
  await expect(page.getByTestId('cents')).toHaveText(/^\+/);
  await expect(page.getByTestId('note')).not.toHaveClass(/intune/);

  // ── the A/B pair: at A4=446 the same input is 0 cents ──
  await page.getByTestId('a4').fill('446');
  await page.getByTestId('a4').blur();
  await page.waitForTimeout(800);

  const r2 = await page.evaluate(() => (window as any).__mt.reading);
  expect(r2.name).toBe('A');
  expect(Math.abs(r2.cents)).toBeLessThan(3);
  await expect(page.getByTestId('note')).toHaveClass(/intune/);
});
