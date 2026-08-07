import { test, expect } from '@playwright/test';

// THE FIXTURE THAT REPRODUCES THE BUG. Everything else in this suite was green while
// /pitchgraph/ was live-printing "C2 +909.8¢" — nine semitones of error in a box one semitone
// tall — because every other fixture is a clean sustained sine and the defect needs the
// detected pitch to JUMP while one note stays open.
//
// `low-jumps.wav` (this project's launch flag) is low tones hopping between F♯1 and A♯1 and
// their octave-error targets every 99 ms. Derived from the owner's own log rather than
// guessed: held C2 65.4 Hz while detecting 110.6; held G♯1 51.9 while detecting 74.5.
//
// This file's job is ONE invariant, and it must hold however the noise gates are later
// tuned: a panel may not report a number its own axis can draw. Removing the clamp in
// printPanel must turn it red.

test.use({ permissions: ['microphone'] });

test('THE INVARIANT under jumping pitch: no panel off its own ±50¢ axis', async ({ page }) => {
  await page.goto('/pitchgraph/?e2e');
  await page.getByTestId('listen-toggle').click();
  await page.waitForFunction(() => ((window as any).__pg?.panels?.length ?? 0) >= 6,
    null, { timeout: 30_000 });

  const panels = await page.evaluate(() =>
    (window as any).__pg.panels as { note: string; mean: number }[]);
  const offAxis = panels.filter((p) => Math.abs(p.mean) > 50);
  expect(
    offAxis,
    `${offAxis.length} of ${panels.length} panels off axis: `
    + offAxis.map((p) => `${p.note} ${p.mean > 0 ? '+' : ''}${p.mean}¢`).join(', '),
  ).toEqual([]);

  // The DOM too: the printed number is the product.
  const printed = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="panel"]')]
      .map((el) => Number((el as HTMLElement).dataset.mean)).filter((n) => !Number.isNaN(n)));
  expect(printed.filter((m) => Math.abs(m) > 50)).toEqual([]);
});
