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

test('the A4 field types, and clamps to the range the instrument uses', async ({ page }) => {
  await page.goto('/pitchgraph/?e2e');
  const a4 = page.getByTestId('a4');
  await a4.fill('415');
  await a4.blur();
  await expect(a4).toHaveValue('415');
  // Out of range is CLAMPED now, not refused — the practice room's behaviour, where one
  // `setA4()` clamps and repaints, so an out-of-range entry is corrected in place rather than
  // snapping back to the last good value. The two tools' calibration used to disagree about
  // this while looking identical, which is the whole reason for the alignment pass.
  await a4.fill('900');
  await a4.blur();
  await expect(a4).toHaveValue('480');
  await a4.fill('12');
  await a4.blur();
  await expect(a4).toHaveValue('400');
  // and the BINDING moved, not just the field's text — a paint that skips the setter would
  // satisfy every assertion above. The room's suite learned this one the same way.
  expect(await page.evaluate(() => (window as any).__pg.a4)).toBe(400);
});

// THE UNIT IS THE SCRUBBER, THE FIELD ONLY TYPES (chooser metrotuner-scrub-target pick 03).
// New on this page with the alignment pass: `a4` and `hz` were inert labels here while the
// identical-looking control in the practice room was a drag handle. Two controls that look the
// same and behave differently is worse than either choice on its own.
test('the hz label scrubs the calibration, and answers the arrows', async ({ page }) => {
  await page.goto('/pitchgraph/?e2e');
  const handle = page.getByTestId('a4-handle');
  const field = page.getByTestId('a4');
  const box = (await handle.boundingBox())!;

  // 4px per unit, the room's rate on every value it scrubs: +40px is +10 Hz.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(field).toHaveValue('450');
  expect(await page.evaluate(() => (window as any).__pg.a4)).toBe(450);

  // A handle is a control, so it takes focus and steps.
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(field).toHaveValue('451');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(field).toHaveValue('449');

  // and it announces itself as one, with a range and a live value
  await expect(handle).toHaveAttribute('role', 'slider');
  await expect(handle).toHaveAttribute('aria-valuemin', '400');
  await expect(handle).toHaveAttribute('aria-valuemax', '480');
  await expect(handle).toHaveAttribute('aria-valuenow', '449');
});

test('every control clears the 44px tap target, on BOTH axes', async ({ page }) => {
  await page.goto('/pitchgraph/?e2e');
  // BOTH AXES, and that is the room's finding rather than thoroughness: when the transport's
  // word was deleted there, `min-height:44px` still held the height while the box collapsed to
  // the field's 22px width — under WCAG 2.5.8's floor, and invisible in a screenshot. The
  // scrub handles are the other narrow case: `hz` is 2ch = 18px of ink.
  for (const id of ['listen-toggle', 'a4', 'a4-handle']) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(Math.min(box.width, box.height),
      `${id} is ${box.width.toFixed(1)}×${box.height.toFixed(1)}`).toBeGreaterThanOrEqual(44);
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

test('the transport is the practice room\'s switch, on the case axis', async ({ page }) => {
  // REWRITTEN with the alignment pass, and the rewrite is the point rather than a rename.
  // This test used to assert the OLD control: a two-pocket track plus the word `start`, with
  // the track absolutely positioned outside the button so the WORD would land on the axis.
  // The room deleted that control (transport chooser treatment 05, "the snow-white dot") —
  // one mark, no word — which makes the whole track-outside-the-button apparatus a fix for a
  // problem this treatment does not have. The right repair was to stop having two marks.
  // So what is asserted now is the mark's INK on the axis, and that no word came back.
  await page.goto('/pitchgraph/?e2e');
  const btn = page.getByTestId('listen-toggle');
  await expect(btn.locator('.pg-w'), 'treatment 05 has no word').toHaveCount(0);
  const m = await page.evaluate(() => {
    const b = document.getElementById('pg-listen')!;
    const ink = b.querySelector('.pg-rd')!.getBoundingClientRect();
    const c = document.querySelector('.pg-case')!.getBoundingClientRect();
    const box = b.getBoundingClientRect();
    const read = document.querySelector('.pg-read')!.getBoundingClientRect();
    return {
      offAxis: Math.abs((ink.left + ink.width / 2) - (c.left + c.width / 2)),
      ink: { w: ink.width, h: ink.height },
      target: { w: box.width, h: box.height },
      readH: read.height,
    };
  });
  // MEASURE THE INK, NOT THE BOX. The room's own datum harness missed a 17.50px error for
  // exactly this reason: it measured the button's extent, and the extent included a track.
  expect(m.offAxis, 'the mark must sit on the case centre').toBeLessThan(1);
  // The 1.45× size (chooser practice-room-control-size pick 02), so the state reads from a
  // music stand.
  expect(m.ink).toEqual({ w: 32, h: 16 });
  // The target is padding pulled back, so it clears 44 on both axes WITHOUT inflating the
  // 28px row it now shares with the reading — the two facts are independent and both were
  // defects on the room when this treatment first shipped there.
  expect(Math.min(m.target.w, m.target.h)).toBeGreaterThanOrEqual(44);
  expect(m.readH, 'the reading row keeps its lead').toBeCloseTo(28, 0);

  // THE STATE IS FORM AND HUE, not hue alone: the dot travels to the far pocket and takes the
  // accent. Colour alone measures 3.54:1 between --ink and --faint, which the room's
  // accent-clarity chooser rejected at small sizes.
  const rest = await btn.locator('.pg-dt').evaluate((el) => {
    const s = getComputedStyle(el);
    return { fill: s.fill, transform: s.transform };
  });
  expect(rest.transform, 'at rest the dot sits in the near pocket').toBe('none');
});

// THE SCREEN IS A SCREEN. The strongest single claim of the alignment pass, and the one the
// old page failed: it sat inside `.wrap`'s 1120px document measure with the wrap's own bottom
// padding, so at 1440×900 the case was 1064px wide and the document scrolled 10px — an
// instrument whose transport can leave the viewport. The room escapes the measure and snaps its
// height to a whole number of leads.
test('the page is a screen: whole leads tall, and it does not scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pitchgraph/?e2e');
  const m = await page.evaluate(() => {
    const app = document.getElementById('pg-app')!;
    const lead = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lead'));
    const h = parseFloat(getComputedStyle(app).height);
    return {
      lead, h, offLead: h % lead,
      docScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      appOverflow: app.scrollHeight - app.clientHeight,
      caseW: document.querySelector('.pg-case')!.getBoundingClientRect().width,
    };
  });
  expect(m.offLead, `the screen is ${m.h}px — ${m.offLead}px off a lead`).toBe(0);
  expect(m.docScroll, 'the document must not scroll').toBeLessThanOrEqual(0);
  // `overflow:hidden` on the screen means an overflow CLIPS rather than scrolls, so the
  // transport would simply not be on the page. Asserted separately from the document's scroll.
  expect(m.appOverflow, 'the screen must not overflow its own box').toBeLessThanOrEqual(0);
  // and it escaped the document measure: 1120 − 56 of padding is 1064, which is what the case
  // used to be at this viewport.
  expect(m.caseW, 'the case must not be held to the document measure').toBeGreaterThan(1100);
});

// THE INSTRUMENT GROUP IS CONTIGUOUS — trace, then reading+verb, then the record, with the
// slack placed above and below. The room's first ladder gave the figure row all the leftover
// and its readout ended up 215px under the dial it describes: "three rows that are one figure
// group read as three unrelated things."
test('the trace, the reading and the record sit against each other', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pitchgraph/?e2e');
  const g = await page.evaluate(() => {
    const R = (s: string) => document.querySelector(s)!.getBoundingClientRect();
    const rows = getComputedStyle(document.getElementById('pg-screen')!).gridTemplateRows;
    const m = rows.match(/\[slack-a\]\s*([\d.]+)px[\s\S]*?\[slack-b\]\s*([\d.]+)px/);
    return {
      figBottom: R('#pg-fig').bottom, readTop: R('.pg-read').top,
      readBottom: R('.pg-read').bottom, panelsTop: R('#pg-panels').top,
      slackA: m ? +m[1] : null, slackB: m ? +m[2] : null,
    };
  });
  expect(g.readTop - g.figBottom, 'no air between the trace and its reading').toBeCloseTo(0, 0);
  expect(g.panelsTop - g.readBottom, 'no air between the reading and the record').toBeCloseTo(0, 0);
  // THE PLACED AIR IS EQUAL, which is what "placed" means — an unequal pair means a fixed row
  // changed height without the ladder being re-derived.
  expect(g.slackA).not.toBeNull();
  expect(g.slackA!).toBeCloseTo(g.slackB!, 0);
});
