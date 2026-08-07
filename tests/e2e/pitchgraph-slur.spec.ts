import { test, expect } from '@playwright/test';

// THE SLUR — /pitchgraph/ against two notes with NO silence between them.
//
// WHY THIS FILE EXISTS, and it is the more useful half of the story: the four-note
// fixture in pitchgraph.spec.ts rests between every note, and a rest is the one
// unambiguous signal that a note ended. Every segmenter in the registry resets on
// silence, so with rests everywhere they ALL behave identically — swapping the page's
// segmenter to `attack-lock`, which is the wrong mechanism for phrases, passed all ten
// tests. A suite that cannot distinguish the right mechanism from the wrong one is not
// testing the mechanism, however green it is.
//
// The fixture here is A4 (+20¢) → 60 ms glide → B4 (−18¢), no rest between, phase
// integrated so there is no click at the join for an onset detector to lean on. With
// nothing to reset on, the decision has to be made from the pitch alone:
//
//   hysteresis + dwell   two notes, each reported against itself      ← what ships
//   attack-lock          one note; B4 measured against A4, ~180¢ off scale
//   nearest, every read  two notes, but a vibrato would shatter them
//
// So: two panels, both offsets right, and nothing off scale.

test.use({ permissions: ['microphone'] });

test('a slurred pair prints TWO panels, each measured against its own note',
  async ({ page }) => {
    await page.goto('/pitchgraph/?e2e');
    await page.getByTestId('listen-toggle').click();
    // Two notes plus a rest is ~2.8s per repeat; wait for two panels, not a clock.
    await page.waitForFunction(
      () => ((window as any).__pg?.panels?.length ?? 0) >= 2,
      null, { timeout: 30_000 },
    );
    const panels = await page.evaluate(() => (window as any).__pg.panels as
      { note: string; mean: number; reads: number }[]);

    // The two notes must be DIFFERENT — one panel spanning both is the attack-lock
    // failure, and it is the specific thing this fixture exists to catch.
    const names = new Set(panels.map((p) => p.note));
    expect(names.size, `only heard: ${[...names].join(', ')}`).toBeGreaterThanOrEqual(2);
    expect([...names].some((n) => /^A4$/.test(n))).toBe(true);
    expect([...names].some((n) => /^B4$/.test(n))).toBe(true);

    // And each must report ITS OWN offset. Measured against A4 instead of itself, B4
    // would come back ~180¢ out, so 8¢ of tolerance is a wide margin on a sharp line.
    const truth: Record<string, number> = { A4: 20, B4: -18 };
    for (const p of panels) {
      if (!(p.note in truth)) continue;
      expect(Math.abs(p.mean - truth[p.note]), `${p.note} read ${p.mean}¢`).toBeLessThan(8);
    }
  });

test('no panel reports an offset the axis cannot hold', async ({ page }) => {
  // The attack-lock signature, asserted directly: a note measured against its neighbour
  // lands outside ±50¢, which is not a large reading but a meaningless one.
  await page.goto('/pitchgraph/?e2e');
  await page.getByTestId('listen-toggle').click();
  await page.waitForFunction(
    () => ((window as any).__pg?.panels?.length ?? 0) >= 3,
    null, { timeout: 30_000 },
  );
  const means = await page.evaluate(() =>
    ((window as any).__pg.panels as { mean: number }[]).map((p) => p.mean));
  const offScale = means.filter((m) => Math.abs(m) > 50);
  expect(offScale, `off-scale panel means: ${offScale.join(', ')}`).toEqual([]);
});

test('the glide is absorbed, not printed as a third note', async ({ page }) => {
  // 60 ms is under the 100 ms a note needs to earn a panel, so the slide itself must not
  // become a panel. Two notes per repeat, so panel names must alternate A4/B4 rather
  // than admitting an A♯4 between them.
  await page.goto('/pitchgraph/?e2e');
  await page.getByTestId('listen-toggle').click();
  await page.waitForFunction(
    () => ((window as any).__pg?.panels?.length ?? 0) >= 4,
    null, { timeout: 30_000 },
  );
  const notes = await page.evaluate(() =>
    ((window as any).__pg.panels as { note: string }[]).map((p) => p.note));
  const strays = notes.filter((n) => n !== 'A4' && n !== 'B4');
  expect(strays, `notes between the pair: ${strays.join(', ')}`).toEqual([]);
});
