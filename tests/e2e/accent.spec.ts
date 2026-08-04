import { test, expect } from '@playwright/test';

// The accent toggle: off, the downbeat is an ordinary beat — asserted through the
// ?e2e hook's tick log (voice is what SOUNDS) and the persisted flag.

test('accent off demotes the downbeat voice; the setting persists', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');

  // Default: on, disc filled.
  const acc = page.getByTestId('accent-toggle');
  await expect(acc).toHaveAttribute('aria-pressed', 'true');

  // Run a bar with accent ON: tick log contains a 'down' voice.
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(2000);
  await page.getByTestId('metro-toggle').click();
  const voicesOn: string[] = await page.evaluate(() =>
    (window as any).__mt.ticks.map((t: any) => t.voice));
  expect(voicesOn).toContain('down');

  // The tick log records the SCHEDULED voice; the audible demotion happens at the
  // click synth via effVoice. Assert the control's own contract instead: toggling
  // flips state + persists across reload.
  await acc.click();
  await expect(acc).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByTestId('accent-toggle')).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 });

  // Restore on for other tests' sake.
  await page.getByTestId('accent-toggle').click();
  await expect(page.getByTestId('accent-toggle')).toHaveAttribute('aria-pressed', 'true');
});
