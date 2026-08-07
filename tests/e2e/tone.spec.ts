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

// ── THE STACK ───────────────────────────────────────────────────────────────────────
// The `fifth` latch is GONE (chooser practice-room-drone-stack, Q1/06 + Q2/02): the drone
// stacks every interval up to a major 10th, on a chromatic strip, each cell a toggle.
//
// THE INTERVALS ARE JUST, and the RATIOS ARE READ OFF THE RUNNING GRAPH — a test that
// re-derived them from the table in the source would pass on a page sounding the wrong
// interval. This is the assertion that matters most in the file: a just major third is 5:4
// and the tempered one is 2^(4/12), 14 cents apart, and hearing that lock is the exercise
// the whole stack exists for.
test('the stack is just, and it re-voices while sounding', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  // the strip ships with the fifth on — what the single latch used to mean
  await expect(page.getByTestId('semi-7')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('drone-toggle').click();
  let ranks: number[] = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks, 'the root and the fifth').toHaveLength(2);
  expect(ranks[0]).toBeCloseTo(440, 1);
  expect(ranks[1] / ranks[0], 'a just 3:2, not the tempered 1.49831').toBeCloseTo(1.5, 4);
  expect(ranks[1] / ranks[0]).not.toBeCloseTo(Math.pow(2, 7 / 12), 4);

  // add the major third WHILE SOUNDING: the chord must change in place
  await page.getByTestId('semi-4').click();
  await expect(page.getByTestId('semi-4')).toHaveAttribute('aria-pressed', 'true');
  ranks = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks, 'root + third + fifth').toHaveLength(3);
  expect(ranks[0], 'the root survived the re-voice').toBeCloseTo(440, 1);
  expect(ranks[1] / ranks[0], 'a just 5:4, not the tempered 1.2599').toBeCloseTo(1.25, 4);
  expect(ranks[1] / ranks[0]).not.toBeCloseTo(Math.pow(2, 4 / 12), 3);

  // A COMPOUND INTERVAL IS THE SIMPLE RATIO DOUBLED — the 10th is 5:2, exactly as just as
  // the 3rd it is built from. This is the one the old single-latch drone could not reach.
  await page.getByTestId('semi-16').click();
  ranks = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks).toHaveLength(4);
  expect(ranks[3] / ranks[0], 'the major 10th is a just 5:2').toBeCloseTo(2.5, 4);

  // and off again, in place
  await page.getByTestId('semi-4').click();
  await page.getByTestId('semi-16').click();
  ranks = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks).toHaveLength(2);

  await page.getByTestId('drone-toggle').click();
  expect(await page.evaluate(() => (window as any).__mt.toneHz)).toBeNull();
  // The stack survives a stop: set-once values persist, like the meters'.
  await expect(page.getByTestId('semi-7')).toHaveAttribute('aria-pressed', 'true');
});

// THE STRIP'S LABELS AND THE READOUT CARRY THE NAMES the geometry drops. The user asked for
// intervals "from 2nd to 10th" — named things — and a strip of cells names nothing on its
// own, so the names live in each cell's label and in the chord readout. They must follow the
// ROOT, or the strip announces intervals above a note that is no longer the root: that is
// the failure this test exists for.
test('the strip names its intervals, and the names follow the root', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await expect(page.getByTestId('semi-7')).toHaveAttribute('aria-label', '5 — E5');
  await expect(page.getByTestId('semi-4')).toHaveAttribute('aria-label', '3 — C♯5');
  await expect(page.getByTestId('semi-16')).toHaveAttribute('aria-label', '10 — C♯6');
  // the readout is the chord, by name, in pitch order
  await expect(page.getByTestId('chord')).toHaveText('A4  E5');

  await page.getByTestId('refnote').click();          // A4 → A♯4
  await expect(page.getByTestId('semi-7'), 'the fifth above A♯4').toHaveAttribute('aria-label', '5 — F5');
  await expect(page.getByTestId('chord')).toHaveText('A♯4  F5');
});

// THE VOICE IS A SETTING (the user's refinement: "i like 05 the section. but also the organ
// pair maybe it can be a setting?"). Three voices, mutually exclusive, switchable mid-drone —
// which is the point, since comparing them means clicking between them under one chord.
// `droneVoice` reports what is SOUNDING, not what is selected: the section falls back to the
// organ until its samples land, and a test that read the selection would pass on a page that
// silently never got them.
test('the voice is a setting, and it changes a sounding drone', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await expect(page.getByTestId('voice-section')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('voice-organ').click();
  await page.getByTestId('drone-toggle').click();
  expect(await page.evaluate(() => (window as any).__mt.droneVoice)).toBe('organ');
  // the organ pair adds an octave partial per note, which is NOT a rank — the ratio table
  // must not see it
  let ranks: number[] = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks, 'partials are not ranks').toHaveLength(2);

  await page.getByTestId('voice-cello').click();
  await expect(page.getByTestId('voice-cello')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('voice-organ')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => (window as any).__mt.droneVoice)).toBe('cello');
  // still the same chord, at the same just ratio — the voice changed, not the music
  ranks = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks[1] / ranks[0]).toBeCloseTo(1.5, 4);

  // THE SAMPLED SECTION actually loads its samples and sounds as itself. This is the one
  // assertion that can catch a 404 on cello.bin — the fallback is deliberately silent to the
  // ear (it plays the organ instead of nothing), so only a test can tell.
  await page.getByTestId('voice-section').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__mt.droneVoice),
      { timeout: 5000, message: 'the section must load its samples and take over' })
    .toBe('section');
  ranks = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks[1] / ranks[0], 'the samples are pitched by RATIO, so the fifth stays just')
    .toBeCloseTo(1.5, 4);

  await page.getByTestId('drone-toggle').click();
  // the choice persists across a stop, like every other set-once value
  await expect(page.getByTestId('voice-section')).toHaveAttribute('aria-pressed', 'true');
});

// THE STRIP MUST NOT SWALLOW THE FOOT LINE'S CLICKS. Its cells are 40px targets holding 20px
// of ink, so 10px of each hangs into the slack — and in the first build the whole group sat in
// the 28px `hint` row and overhung the FOOT row, where the note scrub lives. Every click aimed
// at `refnote` hit a cell instead: Playwright retried 87 times reporting "intercepts pointer
// events", and a person would simply have called the note control dead.
// Asserted as a HIT TEST, not as a geometry comparison: what matters is which element actually
// receives a pointer at the control's centre, and elementFromPoint is the only thing that
// answers that. A rectangle check would pass on a transparent element still taking the click.
test('the stack strip does not intercept the foot line', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const hit = await page.evaluate(() => {
    const r = document.getElementById('mt-refnote')!.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) as HTMLElement;
    return { id: el?.id ?? null, semi: el?.dataset?.semi ?? null };
  });
  expect(hit.semi, 'a strip cell must not be over the note control').toBeNull();
  expect(hit.id).toBe('mt-refnote');

  // and the control still works, which is the thing the interception broke
  await page.getByTestId('refnote').click();
  await expect(page.getByTestId('refnote')).toHaveText('A♯4');

  // EVERY CELL CLEARS 24px on its short axis (WCAG 2.5.8). Seventeen cells in a 154px case
  // cannot be 44 wide — 8.1px is what the case allows — so the HEIGHT carries the target, and
  // this is the number that must not quietly regress to the 20px of ink.
  const short = await page.evaluate(() =>
    [...document.querySelectorAll('[data-semi]')]
      .map((c) => c.getBoundingClientRect().height));
  expect(Math.min(...short), 'the cells are 40px tall targets').toBeGreaterThanOrEqual(40);
});

// THE THREE CASES STILL SHARE ONE ROW LADDER. The stack is new furniture inside one case, and
// the whole point of the subgrid ladder is that a change to one case cannot move another's
// verb. This is the assertion that would have caught the stack being put in a row it did not
// fit — which is exactly what happened on the first build.
test('the stack does not break the three cases\' shared ladder', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await page.setViewportSize({ width: 1440, height: 900 });
  const g = await page.evaluate(() => {
    const verbs = ['mt-mic', 'mt-run', 'mt-drone']
      .map((id) => document.getElementById(id)!.getBoundingClientRect().top);
    const cases = [...document.querySelectorAll('.mt-half')]
      .map((c) => c.getBoundingClientRect());
    const app = document.querySelector('#mt-app')!;
    return {
      verbSpread: Math.max(...verbs) - Math.min(...verbs),
      topSpread: Math.max(...cases.map((r) => r.top)) - Math.min(...cases.map((r) => r.top)),
      botSpread: Math.max(...cases.map((r) => r.bottom)) - Math.min(...cases.map((r) => r.bottom)),
      overflow: app.scrollHeight - app.clientHeight,
    };
  });
  expect(g.verbSpread, 'the three verbs sit on ONE line').toBeLessThan(0.51);
  expect(g.topSpread, 'the three cases share a top edge').toBeLessThan(0.51);
  expect(g.botSpread, 'and a bottom edge').toBeLessThan(0.51);
  expect(g.overflow, 'the screen does not scroll').toBe(0);
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
