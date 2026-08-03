import { test, expect } from '@playwright/test';

// Page-level checks that don't need audio: the document loads, the controls are
// reachable, nothing threw on boot, and the A4 field clamps its range.

test('page boots clean: no console errors, controls present', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/metrotuner/');
  await expect(page.getByTestId('mic-toggle')).toBeVisible();
  await expect(page.getByTestId('metro-toggle')).toBeVisible();
  await expect(page.getByTestId('tone-toggle')).toBeVisible();
  await expect(page.getByTestId('a4')).toHaveValue('440');
  expect(errors).toEqual([]);
});

test('A4 calibration clamps to 400–480', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  const a4 = page.getByTestId('a4');
  await a4.fill('999');
  await a4.blur();
  await expect(a4).toHaveValue('480');
  await a4.fill('12');
  await a4.blur();
  await expect(a4).toHaveValue('400');
});

test('bpm clamps to 20–320', async ({ page }) => {
  await page.goto('/metrotuner/');
  const bpm = page.getByTestId('bpm');
  await bpm.fill('999');
  await bpm.blur();
  await expect(bpm).toHaveValue('320');
  await bpm.fill('1');
  await bpm.blur();
  await expect(bpm).toHaveValue('20');
});

test('the controls are keyboard-reachable in order', async ({ page }) => {
  await page.goto('/metrotuner/');
  // Tab from the top of the document; the mic toggle is the first control after
  // the panel's link home.
  const mic = page.getByTestId('mic-toggle');
  await mic.focus();
  await expect(mic).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('tone-toggle')).toBeFocused();
});
