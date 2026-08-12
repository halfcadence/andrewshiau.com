import { test, expect } from '@playwright/test';

// ── OPENED BY DEEP LINK (2026-08-12). The room is an INDEX now: it opens on the plan, and this
// spec's instrument is a page you navigate to. Every `page.goto` here therefore carries the app's
// own hash. It is not a test affordance — `#tuner` is how anyone links to this app — but it is what
// makes real-pointer assertions possible again: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case off-screen the press landed on nothing and the ring's overshoot read as 1.

// The mic permission is GRANTED at the context level — the state a returning
// visitor is in, and what the open-started resume gate queries. The fake-UI flag
// alone auto-accepts prompts but leaves permissions.query reading 'prompt', which
// the gate correctly refuses to auto-start into (found red: resume never fired).
test.use({ permissions: ['microphone'] });

// Fake mic = a 440 Hz sine (project `tuner-440`). At the default A4=440 this must
// read A4, ~0 cents, needle centred — AND the same input must read ~-23 cents when
// the calibration moves to 446. The second half is the control arm: it proves the
// calibration is wired into the reading, not just stored.

test('440 Hz mic reads A4 at 0 cents; recalibrating to 446 moves it flat', async ({ page }) => {
  await page.goto('/practice-room/?e2e#tuner');
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

  // The in-tune state is the invert on the note reading (chooser Q2/02).
  await expect(page.getByTestId('note')).toHaveClass(/intune/);

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
  await expect(page.getByTestId('note')).not.toHaveClass(/intune/);
});

test('open started: a tuner left running resumes on reload; one stopped stays stopped', async ({ page }) => {
  await page.goto('/practice-room/?e2e#tuner');
  await page.getByTestId('mic-toggle').click();
  await expect(page.getByTestId('note')).toHaveText('A4', { timeout: 10_000 });

  // Leave with the tuner RUNNING → it must come back listening on its own.
  // (The fake-UI flag makes the permission 'granted', which is the gate.)
  await page.reload();
  await expect(page.getByTestId('mic-toggle')).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
  await expect(page.getByTestId('note')).toHaveText('A4', { timeout: 10_000 });

  // Stop it BY CHOICE, reload → it must stay stopped (the control arm: the resume
  // flag follows the reader's last decision, not merely the last state).
  await page.getByTestId('mic-toggle').click();
  await page.reload();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('mic-toggle')).toHaveAttribute('aria-pressed', 'false');
});

test('stopping the tuner releases the microphone and clears the reading', async ({ page }) => {
  await page.goto('/practice-room/?e2e#tuner');
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
