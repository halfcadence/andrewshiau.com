import { test, expect } from '@playwright/test';

// THE DRONE (chooser metrotuner-drone-box, Q1/02 — it has its own case now; this file
// tested the tuner's second job, the reference tone, before the split).
//
// The oscillator's frequency must follow both the drone's note and the calibration — and
// the calibration now lives on TWO fields that are one value, so this suite drives the
// DRONE's own field to prove the sync reaches the audio. The ?e2e hook exposes the
// fundamental's set frequency and every sounding rank's.

test('the drone sounds its note at the set calibration', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await page.getByTestId('drone-toggle').click();

  let hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz).toBeCloseTo(440, 1);

  // Step the note up a semitone: A4 → A♯4 = 466.16 Hz. The value IS the control
  // (steppers chooser Q1/02): click steps up, shift-click steps down.
  await page.getByTestId('refnote').click();
  await expect(page.getByTestId('refnote')).toHaveText('A♯4');
  hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz).toBeCloseTo(466.16, 0);

  // Back to A4 (shift-click), then recalibrate FROM THE DRONE'S OWN FIELD — the one this
  // case gained. Driving the tuner's field would exercise the old wiring; driving this one
  // proves the synced value reaches the oscillator.
  await page.getByTestId('refnote').click({ modifiers: ['Shift'] });
  await page.getByTestId('a4-drone').fill('442');
  await page.getByTestId('a4-drone').blur();
  hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz).toBeCloseTo(442, 1);

  await page.getByTestId('drone-toggle').click();
  const off = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(off).toBeNull();
});

// THE NOTE APPEARS TWICE, at two precisions — the 72px figure carries the LETTER (what you
// read from a music stand) and the foot control carries letter + octave (the value you set).
// One function writes both, so the failure this catches is the two drifting: a figure naming
// a different note than the one sounding.
// It was three places for one build. The exact reading between them was deleted after looking
// at the render — three copies of one note inside a 210px case.
test('the note is one value at two precisions', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await expect(page.getByTestId('refnote')).toHaveText('A4');
  await expect(page.locator('#mt-dnote')).toHaveText('A');
  // and the octave lives ONLY on the control — the case does not state its note a third time
  await expect(page.getByTestId('drone-note')).toHaveCount(0);

  await page.getByTestId('refnote').click();          // → A♯4
  await expect(page.getByTestId('refnote')).toHaveText('A♯4');
  await expect(page.locator('#mt-dnote')).toHaveText('A♯');

  // an octave step moves the control and NOT the letter — the letter is pitch class
  await page.getByTestId('refnote').click({ modifiers: ['Shift'] });   // back to A4
  for (let i = 0; i < 12; i++) await page.getByTestId('refnote').click();
  await expect(page.getByTestId('refnote')).toHaveText('A5');
  await expect(page.locator('#mt-dnote'), 'the figure is the pitch class').toHaveText('A');
});

// THE FIFTH IS JUST (3:2), not the tempered 2^(7/12) = 1.49831. Those two cents are the
// difference between a drone you can tune a third against and one that beats against
// itself, so the RATIO is read off the running oscillators — a test that re-derived it from
// the constant in the source would pass on a page sounding the wrong interval.
test('the fifth is just, and it re-voices a sounding drone', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const fifth = page.getByTestId('fifth-toggle');
  await expect(fifth).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('drone-toggle').click();
  // Two ranks at rest: the fundamental and the octave (the organ pair).
  let ranks: number[] = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks).toHaveLength(2);
  expect(ranks[1] / ranks[0]).toBeCloseTo(2, 3);

  await fifth.click();
  await expect(fifth).toHaveAttribute('aria-pressed', 'true');

  ranks = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks, 'the fifth adds a third rank').toHaveLength(3);
  // The fundamental survived the re-voice — a restart that lost the root is the bug here.
  expect(ranks[0]).toBeCloseTo(440, 1);
  const ratio = ranks[2] / ranks[0];
  expect(ratio, 'the fifth must be a just 3:2, not the tempered 1.49831').toBeCloseTo(1.5, 4);
  expect(ratio).not.toBeCloseTo(Math.pow(2, 7 / 12), 4);

  await page.getByTestId('drone-toggle').click();
  expect(await page.evaluate(() => (window as any).__mt.toneHz)).toBeNull();
  // The latch survives a stop: a set-once choice, persisted like the meter values.
  await expect(fifth).toHaveAttribute('aria-pressed', 'true');
});

// THE RUNNING STATE IS ON THE FIGURE. The tuner says "live" by taking its needle from
// --line to --ink; the drone's letter is always ink (it names the note whether or not it
// sounds), so the state is carried by the accent instead.
test('the letter carries the sounding state', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const letter = page.locator('#mt-dnote');
  const colour = () => letter.evaluate((el) => getComputedStyle(el).color);
  // THE COLOUR IS TRANSITIONED (--dur-fast), so reading it on the frame after the click
  // samples the fade, not the state — which is how the first version of this test failed
  // while the page was correct: it read ink at 0ms and the letter reaches navy ~140ms later.
  // Poll for the settled value instead of sleeping at it.
  const rest = await colour();

  await page.getByTestId('drone-toggle').click();
  await expect
    .poll(colour, { timeout: 2000, message: 'the letter must change colour while sounding' })
    .not.toBe(rest);

  await page.getByTestId('drone-toggle').click();
  await expect
    .poll(colour, { timeout: 2000, message: 'and return to ink when stopped' })
    .toBe(rest);
});

// THE FIGURE IS THE SWITCH, the same shortcut the dial and the pendulum carry — and the
// foot line must NOT fire it. Both halves asserted, because the caption latch sits INSIDE
// the click target and only stopPropagation keeps a press on `start` from toggling twice
// and netting to nothing.
test('the figure starts and stops it; the foot line does not', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const toggle = page.getByTestId('drone-toggle');

  await page.locator('#mt-dnote').click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#mt-dnote').click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // The caption latch: one press, one net change.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // The note scrub sits in the foot line, OUTSIDE .mt-mid — stepping the note must not
  // start the drone.
  await page.getByTestId('refnote').click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
