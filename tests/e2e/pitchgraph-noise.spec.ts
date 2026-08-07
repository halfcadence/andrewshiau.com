import { test, expect } from '@playwright/test';

// /pitchgraph/ AGAINST ROOM NOISE — the case the four-note fixture cannot reach.
//
// WHY THIS FILE EXISTS. The owner opened the live tool in his office, played nothing, and
// got 24 panels. Eleven of them reported offsets outside ±50¢ — "C2 +909.8¢",
// "G♯1 +626.1¢", "C4 −511.8¢" — which is nine semitones of error drawn in a box one
// semitone tall. The suite was green throughout, because every fixture it had was a clean
// sustained sine: the segmenter never spends frames holding a note the pitch has left, so
// the unclamped mean equalled the clamped one and the missing clamp was invisible.
//
// The fixture here (`room-noise.wav`, this project's launch flag) is 50 Hz mains hum with
// two harmonics, low-frequency rumble, and a broadband floor. No musical tone at all. So:
//
//   · EVERY panel it prints is a false positive. That is the subject of the second test.
//   · The detected pitch jumps between reads, which is the only way to make the panel mean
//     and the axis disagree. That is the subject of the first.
//
// The first test is the INVARIANT and must hold no matter how the noise gates are tuned:
// whatever a panel says, its own axis can draw it. The second measures how many false
// notes get through, and is deliberately written as a RECORDED BASELINE rather than a
// target — the noise-rejection work is not done yet, and a test that asserted "zero false
// panels" today would just be red. When the gates land, tighten the number here.

test.use({ permissions: ['microphone'] });

async function listenAWhile(page: import('@playwright/test').Page, ms: number) {
  await page.goto('/pitchgraph/?e2e');
  await page.getByTestId('listen-toggle').click();
  await expect(page.getByTestId('listen-toggle')).toHaveAttribute('aria-pressed', 'true');
  // Wait on the hook rather than sleeping for the start, then run for a fixed window —
  // this fixture may legitimately produce NO panels once the gates are added, so nothing
  // here may wait on a panel count.
  await page.waitForFunction(() => (window as any).__pg?.reads > 3, null, { timeout: 10_000 });
  await page.waitForTimeout(ms);
  return page.evaluate(() => ({
    panels: (window as any).__pg.panels as { note: string; mean: number; reads: number }[],
    reads: (window as any).__pg.reads as number,
  }));
}

test('THE INVARIANT: no panel reports an offset its own axis cannot hold', async ({ page }) => {
  const { panels, reads } = await listenAWhile(page, 6000);
  expect(reads, 'the read loop must have run').toBeGreaterThan(20);

  const offAxis = panels.filter((p) => Math.abs(p.mean) > 50);
  expect(
    offAxis,
    `${offAxis.length} of ${panels.length} panels are off the ±50¢ axis: `
    + offAxis.map((p) => `${p.note} ${p.mean > 0 ? '+' : ''}${p.mean}¢`).join(', '),
  ).toEqual([]);

  // Read off the DOM too, because the printed number is the product and the hook is only
  // a verification aid. A panel whose data-mean is off scale is a panel a reader can see.
  const printed = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="panel"]')]
      .map((el) => Number((el as HTMLElement).dataset.mean))
      .filter((n) => !Number.isNaN(n)));
  const badPrinted = printed.filter((m) => Math.abs(m) > 50);
  expect(badPrinted, `printed off-axis means: ${badPrinted.join(', ')}`).toEqual([]);
});

test('the live readout never prints an off-scale number either', async ({ page }) => {
  // The readout has been clamped since the proof-sheet work; this is the noise-input
  // counterpart, since noise is a harsher test of it than a held note.
  await page.goto('/pitchgraph/?e2e');
  await page.getByTestId('listen-toggle').click();
  const seen: number[] = [];
  for (let i = 0; i < 50; i++) {
    const t = (await page.getByTestId('cents').textContent()) ?? '';
    const n = parseFloat(t.replace('−', '-').replace('¢', ''));
    if (!Number.isNaN(n)) seen.push(n);
    await page.waitForTimeout(60);
  }
  const over = seen.filter((n) => Math.abs(n) > 50);
  expect(over, `off-scale readings: ${over.join(', ')}`).toEqual([]);
});

test('BASELINE: how much noise currently gets through, recorded not asserted', async ({ page }) => {
  // Not a pass/fail on the count — the noise gates are still being researched, and a test
  // that demanded zero today would be red for a reason that is already known and tracked.
  // What it DOES assert is that the measurement itself works, so the number in the log is
  // real and the next change can be compared against it.
  //
  // Every panel here is a false positive by construction: the fixture contains no note.
  const { panels, reads } = await listenAWhile(page, 8000);
  const perMinute = panels.length / (8000 / 60000);
  const notes = [...new Set(panels.map((p) => p.note))].sort();

  // eslint-disable-next-line no-console
  console.log(
    `[noise baseline] ${panels.length} false panels from ${reads} reads in 8s `
    + `(~${perMinute.toFixed(0)}/min). Notes: ${notes.join(' ')}`,
  );

  expect(reads, 'the read loop must have run').toBeGreaterThan(20);
  // A ceiling loose enough to pass today and tight enough to catch a REGRESSION — if a
  // future change makes the detector twice as credulous, this fails and says so.
  expect(panels.length, 'false panels per 8s went up sharply').toBeLessThan(120);
});
