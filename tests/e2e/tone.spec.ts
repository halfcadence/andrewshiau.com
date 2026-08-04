import { test, expect } from '@playwright/test';

// Tone mode: the oscillator's frequency must follow both the reference note and
// the calibration — the two inputs the tuner itself reads. The ?e2e hook exposes
// the oscillator's set frequency.

test('tone plays the reference note at the set calibration', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  await page.getByTestId('tone-toggle').click();

  let hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz).toBeCloseTo(440, 1);

  // Step the reference up a semitone: A4 → A♯4 = 466.16 Hz. The value IS the
  // control now (steppers chooser Q1/02): click steps up, shift-click steps down.
  await page.getByTestId('refnote').click();
  await expect(page.getByTestId('refnote')).toHaveText('A♯4');
  hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz).toBeCloseTo(466.16, 0);

  // Back to A4 (shift-click), recalibrate to 442 — the tone must move with it.
  await page.getByTestId('refnote').click({ modifiers: ['Shift'] });
  await page.getByTestId('a4').fill('442');
  await page.getByTestId('a4').blur();
  hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz).toBeCloseTo(442, 1);

  await page.getByTestId('tone-toggle').click();
  const off = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(off).toBeNull();
});
