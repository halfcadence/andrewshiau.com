import { test, expect, type Page } from '@playwright/test';

// /pitchgraph/ — the intonation trace, driven by a REAL fake microphone playing a real
// phrase. The fixture (`phrase-4.wav`, this project's launch flag) is four notes with
// rests between them, each held at a known offset:
//
//   A4  +20¢    B4  −18¢    C♯5 +12¢    D5  −6¢
//
// Those four are the whole point of the page: they average to about +1¢, so any single
// number for the phrase reports a player who is in tune while every note is wrong. The
// per-note panels exist to defeat exactly that, and this suite asserts they do.
//
// What the fixture cannot test, stated so the coverage is not overclaimed: it is
// synthesized sine, so there is no vibrato, no bow noise and no room tone. The vibrato and
// slur behaviour is asserted on synthesized CONTOURS in tests/unit/segment.test.ts, where
// the input can be shaped precisely; here the job is that the real detector, the real
// segmenter and the real DOM agree end to end.

const TRUTH: Record<string, number> = { A4: 20, B4: -18, 'C♯5': 12, D5: -6 };

test.use({ permissions: ['microphone'] });

async function listen(page: Page) {
  await page.goto('/pitchgraph/?e2e');
  await page.getByTestId('listen-toggle').click();
  await expect(page.getByTestId('listen-toggle')).toHaveAttribute('aria-pressed', 'true');
  // Wait on the hook rather than sleeping: a flat timeout is what made a sibling harness
  // report "the dial: absent" intermittently.
  await page.waitForFunction(() => (window as any).__pg?.reads > 5, null, { timeout: 10_000 });
}

/** Wait until at least `n` panels have printed, then return them. */
async function panelsAfter(page: Page, n: number, timeout = 30_000) {
  await page.waitForFunction(
    (want) => ((window as any).__pg?.panels?.length ?? 0) >= want,
    n, { timeout },
  );
  return page.evaluate(() => (window as any).__pg.panels as
    { note: string; mean: number; reads: number }[]);
}

test('the page reads pitch at all, and names the note it hears', async ({ page }) => {
  await listen(page);
  // ♯ OR ♭ — the naming module spells three of the five black keys flat (E♭/A♭/B♭), so a
  // sharp-only pattern would reject a correct reading. It passed only because this fixture
  // happens to play naturals: a latent failure waiting for the first E♭ anyone tests.
  await expect(page.getByTestId('note')).toHaveText(/^[A-G][♯♭]?\d$/, { timeout: 10_000 });
  const cents = await page.getByTestId('cents').textContent();
  expect(cents).toMatch(/[+−]\d+\.\d¢/);
});

test('a finished note prints its own panel, and the panel names the note', async ({ page }) => {
  await listen(page);
  const panels = await panelsAfter(page, 1);
  expect(panels[0].note).toMatch(/^[A-G][♯♭]?\d$/);   // ♭ too — see the note above
  // The DOM and the hook must agree — the hook is a verification aid, not the product.
  await expect(page.getByTestId('panel').first()).toBeVisible();
  const domNote = await page.getByTestId('panel').first().getAttribute('data-note');
  expect(domNote).toBe(panels[0].note);
});

test('EACH note reports ITS OWN offset, to within 5 cents of the truth', async ({ page }) => {
  // The contract the whole page rests on. Four notes, four different answers.
  await listen(page);
  const panels = await panelsAfter(page, 4);

  const seen = new Map<string, number>();
  for (const p of panels) if (!seen.has(p.note)) seen.set(p.note, p.mean);

  // At least three of the four must have been heard and be right. Three not four because
  // the first note can start mid-fixture depending on when the browser opened the file —
  // the run does not control the wav's playback offset.
  const checked = [...seen.entries()].filter(([n]) => n in TRUTH);
  expect(checked.length, `notes heard: ${[...seen.keys()].join(', ')}`)
    .toBeGreaterThanOrEqual(3);
  for (const [note, mean] of checked) {
    expect(Math.abs(mean - TRUTH[note]), `${note} read ${mean}¢, truth ${TRUTH[note]}¢`)
      .toBeLessThan(5);
  }
});

test('THE AVERAGING TRAP: the phrase averages to in-tune while every note is wrong',
  async ({ page }) => {
    // Not a property of the code — a property of this fixture, asserted so the fixture
    // cannot quietly be replaced with one that does not contain the trap. If this fails,
    // the phrase stopped being a phrase worth testing.
    await listen(page);
    const panels = await panelsAfter(page, 4);
    const means = panels.map((p) => p.mean);
    const whole = means.reduce((a, b) => a + b, 0) / means.length;
    const spread = Math.max(...means) - Math.min(...means);
    expect(Math.abs(whole), `whole-phrase mean ${whole.toFixed(1)}¢`).toBeLessThan(8);
    expect(spread, 'per-note spread').toBeGreaterThan(25);
  });

test('a note change breaks the trace instead of drawing a wrap as a vertical slam',
  async ({ page }) => {
    // The axis defect this page was designed around: cents-off-nearest-note wraps +49 to
    // −49 at a note change, and joined across one it draws a full-height vertical stroke
    // indistinguishable from a catastrophic error. Asserted geometrically on the built
    // SVG: no single path may contain a jump approaching the figure's height.
    await listen(page);
    await panelsAfter(page, 2);
    const worst = await page.evaluate(() => {
      const svg = document.getElementById('pg-svg')!;
      const h = svg.getBoundingClientRect().height;
      let jump = 0;
      svg.querySelectorAll('path.pg-trace').forEach((p) => {
        const n = (p.getAttribute('d') || '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
        for (let i = 3; i < n.length; i += 2) jump = Math.max(jump, Math.abs(n[i] - n[i - 2]));
      });
      return { jump, h };
    });
    expect(worst.jump, `largest in-path jump ${worst.jump.toFixed(0)}px of ${worst.h}px`)
      .toBeLessThan(worst.h * 0.5);
  });

test('NO PANEL reports an offset its own axis cannot hold', async ({ page }) => {
  // FOUND IN THE WILD, 2026-08-07, and it is the counterpart the suite was missing. The
  // readout was guarded (below); the PANELS were not, and the owner's row printed
  // "C2 +909.8¢", "G♯1 +626.1¢", "C4 −511.8¢" — 11 of 24 panels outside ±50¢ on an axis
  // that spans exactly ±50. Nine semitones of error in a box one semitone tall.
  //
  // Why the four-note fixture never caught it: its notes are clean sines held dead steady,
  // so the segmenter never spends frames holding a note the pitch has left, and the
  // unclamped mean equals the clamped one. It took real room noise — where the detected
  // pitch jumps octaves between reads — to separate them. So this test asserts the
  // INVARIANT rather than the fixture's values: whatever a panel says, the axis can draw it.
  await listen(page);
  const panels = await panelsAfter(page, 4);
  const offAxis = panels.filter((p) => Math.abs(p.mean) > 50);
  expect(offAxis, `panels off the ±50¢ axis: ${offAxis.map((p) => `${p.note} ${p.mean}¢`).join(', ')}`)
    .toEqual([]);

  // And the same claim read off the DOM, not the hook — the hook is a verification aid,
  // the printed number is the product.
  const printed = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="panel"]')]
      .map((el) => Number((el as HTMLElement).dataset.mean))
      .filter((n) => !Number.isNaN(n)));
  expect(printed.length).toBeGreaterThan(0);
  expect(printed.filter((m) => Math.abs(m) > 50)).toEqual([]);
});

test('the readout never prints a cents value the axis cannot hold', async ({ page }) => {
  // While the segmenter holds a note the pitch has already left, the true offset leaves
  // the ±50 scale — measured at 141¢ and once 187¢ on the proof sheet. Those frames must
  // print a dash, not a number, and the trace still draws them clamped.
  await listen(page);
  const samples: string[] = [];
  for (let i = 0; i < 40; i++) {
    samples.push((await page.getByTestId('cents').textContent()) ?? '');
    await page.waitForTimeout(60);
  }
  const numeric = samples
    .map((s) => parseFloat(s.replace('−', '-').replace('¢', '')))
    .filter((n) => !Number.isNaN(n));
  expect(numeric.length, 'never printed a number at all').toBeGreaterThan(5);
  const over = numeric.filter((n) => Math.abs(n) > 50);
  expect(over, `off-scale readings: ${over.join(', ')}`).toEqual([]);
});

test('stopping closes the open note and clears the readout', async ({ page }) => {
  await listen(page);
  await panelsAfter(page, 1);
  const before = await page.getByTestId('panel').count();
  await page.getByTestId('listen-toggle').click();
  await expect(page.getByTestId('listen-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('note')).toHaveText('—');
  await expect(page.getByTestId('cents')).toHaveText('–');
  // The record survives a stop — panels are what you came back to read.
  expect(await page.getByTestId('panel').count()).toBeGreaterThanOrEqual(before);
});

test('the A4 field is the one set-once control and it clamps', async ({ page }) => {
  await page.goto('/pitchgraph/?e2e');
  const a4 = page.getByTestId('a4');
  await a4.fill('415');
  await a4.blur();
  await expect(a4).toHaveValue('415');
  // Out of range is refused and the field snaps back rather than holding a value the
  // instrument is not using.
  await a4.fill('900');
  await a4.blur();
  await expect(a4).toHaveValue('415');
});

test('every control clears the 44px tap target', async ({ page }) => {
  await page.goto('/pitchgraph/?e2e');
  for (const id of ['listen-toggle', 'a4']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box!.height, `${id} is ${box!.height}px tall`).toBeGreaterThanOrEqual(44);
  }
});

test('the panel row is empty before you play, and holds its space silently', async ({ page }) => {
  // It used to print "each note you finish prints here". That is the page explaining
  // itself, which is the thing being removed from this tool — so the assertion inverted:
  // no copy, and the row still RESERVES its height so the transport does not jump down
  // when the first panel lands. An empty row that collapses would shift every control
  // below it on the first note played.
  await page.goto('/pitchgraph/?e2e');
  await expect(page.getByTestId('panels')).toBeEmpty();
  const said = await page.evaluate(() =>
    getComputedStyle(document.getElementById('pg-panels')!, '::before').content);
  expect(said, 'the row must not carry instructional copy').toBe('none');
  const h = await page.getByTestId('panels').evaluate((el) => el.getBoundingClientRect().height);
  expect(h, 'the empty row must still hold its height').toBeGreaterThan(40);
});

test('the transport is the site-wide verb, and the word sits on the case axis', async ({ page }) => {
  // The newer practice-room style: the track is positioned OUTSIDE the button so the WORD
  // is centred, not the word-plus-track pair — which otherwise pushes the verb off the
  // axis of the figure it captions by half the track's width. Measured, because this is a
  // geometry claim and the old version looked fine while being 13px off.
  await page.goto('/pitchgraph/?e2e');
  const btn = page.getByTestId('listen-toggle');
  await expect(btn.locator('.pg-w')).toHaveText('start');
  const m = await page.evaluate(() => {
    const b = document.getElementById('pg-listen')!;
    const w = b.querySelector('.pg-w')!.getBoundingClientRect();
    const c = document.querySelector('.pg-case')!.getBoundingClientRect();
    const t = b.querySelector('.pg-tk')!.getBoundingClientRect();
    return {
      offAxis: Math.abs((w.left + w.width / 2) - (c.left + c.width / 2)),
      trackOutside: t.right <= b.getBoundingClientRect().left + 0.5,
      height: b.getBoundingClientRect().height,
    };
  });
  expect(m.offAxis, 'the verb must sit on the case centre').toBeLessThan(1);
  expect(m.trackOutside, 'the track belongs outside the button box').toBe(true);
  // The geometry change must not cost the tap target.
  expect(m.height).toBeGreaterThanOrEqual(44);
});
