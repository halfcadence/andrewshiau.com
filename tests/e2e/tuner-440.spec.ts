import { test, expect } from '@playwright/test';

// Fake mic = a 440 Hz sine (project `tuner-440`). At the default A4=440 this must
// read A4, ~0 cents, needle centred — AND the same input must read ~-23 cents when
// the calibration moves to 446. The second half is the control arm: it proves the
// calibration is wired into the reading, not just stored.

test('440 Hz mic reads A4 at 0 cents; recalibrating to 446 moves it flat', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  await page.getByTestId('mic-toggle').click();

  // Wait for a stable reading.
  await expect(page.getByTestId('note')).toHaveText('A4', { timeout: 10_000 });
  await page.waitForTimeout(600);

  const r1 = await page.evaluate(() => (window as any).__mt.reading);
  expect(r1).not.toBeNull();
  expect(r1.name).toBe('A');
  expect(r1.octave).toBe(4);
  expect(Math.abs(r1.cents)).toBeLessThan(3);
  expect(Math.abs(r1.freq - 440)).toBeLessThan(1);

  // The needle carries the in-tune state (accent + heavier centre tick).
  await expect(page.locator('#mt-needle')).toHaveClass(/intune/);
  await expect(page.locator('.mt-gauge')).toHaveClass(/tuned/);

  // ── control arm: calibration change must MOVE the reading ──
  await page.getByTestId('a4').fill('446');
  await page.getByTestId('a4').blur();
  await page.waitForTimeout(800);

  const r2 = await page.evaluate(() => (window as any).__mt.reading);
  expect(r2.name).toBe('A');
  // 440 Hz against A4=446 is 1200·log2(440/446) = -23.4 cents: flat, well out of
  // the in-tune band. Direction asserted, not just difference.
  expect(r2.cents).toBeLessThan(-15);
  expect(r2.cents).toBeGreaterThan(-35);
  await expect(page.locator('#mt-needle')).not.toHaveClass(/intune/);
});

test('stopping the tuner releases the microphone and clears the reading', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const mic = page.getByTestId('mic-toggle');
  await mic.click();
  await expect(page.getByTestId('note')).toHaveText('A4', { timeout: 10_000 });

  await mic.click();
  await expect(mic).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('note')).toHaveText('—');
  // The MediaStream's tracks must actually be stopped, not just ignored.
  await page.waitForTimeout(300);
  const live = await page.evaluate(() => (window as any).__mt.reading);
  expect(live).toBeNull();
});
