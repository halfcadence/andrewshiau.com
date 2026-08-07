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

  // A3 = 220 Hz IS THE DEFAULT (user, 2026-08-07) — the register a cello drones in, and the
  // samples' own A. It was A4/440, inherited from when this was the tuner's reference pip.
  let hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz).toBeCloseTo(220, 1);

  // Step the note up a semitone: A3 → B♭3 = 233.08 Hz. THE FIGURE is the control now — one
  // 72px target that both names the note and sets it.
  // B♭ AND NOT A♯ (user, 2026-08-07): the five black keys are spelled the way key signatures
  // spell them, so D♯/G♯/A♯ read E♭/A♭/B♭ while C♯ and F♯ stay sharp. Same pitch, likelier name.
  await page.getByTestId('refnote').click();
  await expect(page.getByTestId('refnote')).toHaveText('B♭3');
  hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz).toBeCloseTo(233.08, 0);

  // Back to A4 (shift-click), then recalibrate FROM THE DRONE'S OWN FIELD — the one this
  // case gained. Driving the tuner's field would exercise the old wiring; driving this one
  // proves the synced value reaches the oscillator.
  await page.getByTestId('refnote').click({ modifiers: ['Shift'] });
  await page.getByTestId('a4-drone').fill('442');
  await page.getByTestId('a4-drone').blur();
  hz = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(hz, 'A3 at a4=442 is 221 Hz').toBeCloseTo(221, 1);

  await page.getByTestId('drone-toggle').click();
  const off = await page.evaluate(() => (window as any).__mt.toneHz);
  expect(off).toBeNull();
});

// ══ THE PITCH THAT COMES OUT IS THE PITCH ON THE FIGURE ══════════════════════════════
// THE TEST THE OCTAVE BUG GOT PAST, and the reason it got past: every other assertion here is a
// RATIO (rank ÷ root) or a report of what the code intended to schedule. The cello samples were
// tagged an octave below their real pitch, so every playbackRate came out 2×, the whole voice
// played an octave high, and the ratios were untouched because a constant factor cancels. The
// user heard it; nothing in CI could.
// So this measures the SIGNAL, in absolute Hz, per voice — autocorrelation off an analyser on
// the drone's own output. It is the only check here that can catch a transposition, and it also
// pins the per-sample cent correction (the B3 loop is 27.5¢ flat and the page divides that out).
for (const voice of ['organ', 'cello', 'section'] as const) {
  test(`the ${voice} voice sounds the pitch the figure names`, async ({ page }) => {
    await page.goto('/practice-room/?e2e');
    await page.getByTestId(`voice-${voice}`).click();
    // root alone, so there is one fundamental to find
    await page.evaluate(() => {
      document.querySelectorAll('[data-semi]').forEach((c) => {
        if (c.getAttribute('aria-pressed') === 'true') (c as HTMLButtonElement).click();
      });
    });
    await expect(page.getByTestId('refnote')).toHaveText('A3');

    await page.getByTestId('drone-toggle').click();
    // the section swells over 1.2s; measure once it is up
    await page.waitForTimeout(voice === 'section' ? 2200 : 1200);
    if (voice === 'section') {
      await expect
        .poll(() => page.evaluate(() => (window as any).__mt.droneVoice), { timeout: 6000 })
        .toBe('section');
      await page.waitForTimeout(1500);
    }

    const hz = await page.evaluate(() => (window as any).__mt.droneHz());
    expect(hz, 'something must be sounding').not.toBeNull();
    const cents = 1200 * Math.log2(hz! / 220);
    // ±12 CENTS, tightened from the ±25 the biased detector needed. The detector is now exact
    // to 0.000¢ on synthetic tones (see build-cello-samples.py's self_check), so the only
    // slack the window has to allow is the real vibrato of a real string section — and the
    // samples' own detune is corrected out, so the target is a true 220.
    // THE WINDOW IS THE ASSERTION. At ±25 this still caught the octave (1200¢), but it would
    // have passed a 20-cent sample error — which is exactly the class of bug that shipped once.
    expect(Math.abs(cents), `${voice}: A3 is 220 Hz, got ${hz!.toFixed(2)} (${cents.toFixed(1)}¢)`)
      .toBeLessThan(12);
  });
}

// THE ORGAN IS THE CALIBRATION REFERENCE, and this test is here because its absence cost a
// shipped 30-cent detune. The organ voice is pure oscillators at exactly midiToFreq(57) =
// 220.000 Hz — no sample, no vibrato, nothing to drift — so a correct measurement MUST read
// 220.00. When the old detector read 221.0 here, that was the instrument confessing its own
// bias, and I read it as the organ being fine. A known-value check on the measuring tool is
// worth more than any number of readings taken with it.
test('the organ voice is exactly 220 Hz — the detector\'s own calibration', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await page.getByTestId('voice-organ').click();
  await page.evaluate(() => {
    document.querySelectorAll('[data-semi]').forEach((c) => {
      if (c.getAttribute('aria-pressed') === 'true') (c as HTMLButtonElement).click();
    });
  });
  await page.getByTestId('drone-toggle').click();
  await page.waitForTimeout(1200);
  const hz = await page.evaluate(() => (window as any).__mt.droneHz());
  const cents = 1200 * Math.log2(hz! / 220);
  expect(Math.abs(cents), `pure 220 Hz sines must measure 220.00, got ${hz!.toFixed(3)}`)
    .toBeLessThan(1);
});

// ── A CHORD IS SPELLED FROM ITS ROOT, WHICH IS NOT THE SAME AS SPELLING EACH PITCH ────
// User call, 2026-08-07: "E♭4 F♯4 should actually read like eb gb, so for chords can u spell
// based on the implied key of the root?" — correct theory, not a preference. An interval's name
// is fixed by the LETTERS it spans: E to G is a third, E to F is a second, so nothing called a
// third can be spelled F-anything above an E. The context-free table gives F♯ for that pitch,
// which is right on its own and wrong inside an E♭ chord.
// Driven through the REAL UI rather than the module's own unit tests (which cover the theory
// exhaustively): the question here is whether the PAGE asks the right question — the strip and
// readout using the chord-aware call, the figure deliberately not.
test('the stack spells its intervals from the root, and the root keeps its own name', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const figure = page.locator('#mt-dnote');
  for (let i = 0; i < 6; i++) await page.getByTestId('refnote').click();   // A3 → E♭4
  await expect(figure, 'the ROOT keeps the context-free spelling').toHaveText('E♭4');

  // the user's exact example: a minor third above E♭ is G♭, never F♯
  await expect(page.getByTestId('semi-3')).toHaveAttribute('aria-label', '♭3 — G♭4');
  const third = await page.getByTestId('semi-3').getAttribute('aria-label');
  expect(third, 'no F♯ in an E♭ chord').not.toContain('F♯');

  // the readout agrees with the labels — one module names both, so a disagreement would mean
  // one of them is calling the wrong function
  await page.evaluate(() => document.querySelectorAll('[data-semi]').forEach((c) => {
    if (c.getAttribute('aria-pressed') === 'true') (c as HTMLButtonElement).click();
  }));
  await page.getByTestId('semi-3').click();
  await page.getByTestId('semi-7').click();
  await expect(page.getByTestId('chord'), 'E♭ minor, spelled').toHaveText('E♭4  G♭4  B♭4');

  // THREE MEMBERS, THREE LETTERS — what makes it read as a chord rather than a cluster, and the
  // invariant that catches an enharmonically-correct spelling a musician would still call wrong.
  const letters = (await page.getByTestId('chord').textContent())!.trim().split(/\s+/)
    .map((n) => n[0]);
  expect(new Set(letters).size, 'three letters').toBe(3);
});

// ── THE BLACK KEYS ARE SPELLED THE WAY KEY SIGNATURES SPELL THEM ────────────────────
// User call, 2026-08-07: "assume eb over d# since its more common in key sigs". Three of the
// five flip to flats and two stay sharp, and the split is not a preference — it follows which
// keys occur: E♭/A♭/B♭ appear in the common flat keys, while C♯ and F♯ appear in D/A/E/B major
// and their enharmonics need six flats. Asserted note by note because a single wrong entry in
// the table is invisible until a player reads it and translates.
test('the five black keys use their commonest spelling', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const figure = page.locator('#mt-dnote');
  const step = () => page.getByTestId('refnote').click();

  // A3 up through the octave, checking every semitone's name
  const want = ['B♭3', 'B3', 'C4', 'C♯4', 'D4', 'E♭4', 'E4', 'F4', 'F♯4', 'G4', 'A♭4', 'A4'];
  for (const name of want) {
    await step();
    await expect(figure).toHaveText(name);
  }
  // ── AND THE STRIP IS *NOT* HELD TO THIS TABLE, which is the point of the chord-aware
  // naming and the reason this assertion changed. It used to demand no D♯/G♯/A♯ anywhere on the
  // strip, and that was wrong once intervals are spelled from the root: above an A root, the
  // raised fourth MUST read D♯, because A to D is a fourth and A to E♭ is a fifth. The
  // context-free table (which this test covers, above) and the interval spelling (covered by
  // `naming.test.ts` and the chord test) answer two different questions.
  // What the strip owes is INTERNAL CONSISTENCY: each label's accidental must belong to the
  // interval it names, so a "4" is always spelled on the fourth letter up. Asserted as the
  // letter-count rule rather than as a list of forbidden strings.
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('[data-semi]')].map((c) => ({
      semi: Number((c as HTMLElement).dataset.semi),
      label: c.getAttribute('aria-label')!,
    })));
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const STEPS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 8, 8, 9, 9];
  const rootLetter = (await page.locator('#mt-dnote').textContent())!.trim()[0];
  const li = LETTERS.indexOf(rootLetter);
  for (const { semi, label } of rows) {
    const name = label.split('—')[1].trim();
    expect(name[0], `${semi} semitones above ${rootLetter} must be spelled on a ${
      LETTERS[(li + STEPS[semi]) % 7]}`).toBe(LETTERS[(li + STEPS[semi]) % 7]);
  }
});

// ── THE STRIP'S MARKS NAME THE PERFECT INTERVALS, they do not count cells ────────────
// The user asked "what do the lil vertical lines under notes mean?", and the answer was
// nothing: they fell on every 5th cell, so they marked the 4th, the minor 7th and the minor
// 10th — no set anyone thinks in. A mark that has to be explained is a mark that is wrong.
// They now sit under the 4th, the 5th and the octave, and this test pins the POSITIONS because
// the whole failure was a plausible-looking row of ticks in musically meaningless places.
test('the strip marks the fourth, the fifth and the octave', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const marks = await page.evaluate(() =>
    [...document.querySelectorAll('.mt-scale i')].map((n, i) => ({
      i,
      kind: n.className || null,
      title: n.getAttribute('title'),
      h: Math.round(n.getBoundingClientRect().height),
    })).filter((m) => m.kind));

  expect(marks.map((m) => m.i), 'the perfect intervals: 4th, 5th, octave').toEqual([5, 7, 12]);
  expect(marks.map((m) => m.title)).toEqual(['the fourth', 'the fifth', 'the octave']);
  // the octave is the taller stroke — it halves the strip and is the strongest landmark
  const octave = marks.find((m) => m.i === 12)!;
  const fifth = marks.find((m) => m.i === 7)!;
  expect(octave.h, 'the octave mark is taller than the others').toBeGreaterThan(fifth.h);

  // A MARK MUST SIT UNDER THE CELL IT NAMES. The stroke is a left border on the mark's own
  // grid track, so its x must line up with that cell's left edge — a mark centred between two
  // cells would name neither, and at 8px cells that error is invisible by eye.
  const aligned = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.mt-strip > *')];
    const marks = [...document.querySelectorAll('.mt-scale i')];
    return [5, 7, 12].map((i) => Math.abs(
      cells[i].getBoundingClientRect().left - marks[i].getBoundingClientRect().left));
  });
  for (const off of aligned) expect(off, 'the mark lines up with its cell').toBeLessThan(1.5);

  // and the marks must not steal the cells' clicks — the row sits below their 40px targets
  const hit = await page.evaluate(() => {
    const m = document.querySelectorAll('.mt-scale i')[7].getBoundingClientRect();
    const el = document.elementFromPoint(m.left + 1, m.top + 2) as HTMLElement;
    return el?.className ?? null;
  });
  expect(String(hit), 'the scale row is not over a cell').not.toContain('mt-cell');
});

// ── THE NOTE IS STATED ONCE, ON THE FIGURE ──────────────────────────────────────────
// This test asserted the opposite until 2026-08-07: the note appeared in two places at two
// precisions (the 72px letter carried `A`, a small foot control carried `A4`) and the test's
// job was to prove they could not drift. The user's call retired the premise — "can you not
// repeat a3 3 times, maybe the big one in center can say a3 and delete the other two" — so
// there is nothing left to drift, and what has to be proven now is that the duplicates are
// GONE and the survivor carries the whole value.
test('the note is stated once, with its octave, on the figure', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  // ONE element states the note, and it is the figure — 72px, and also the control
  const figure = page.locator('#mt-dnote');
  await expect(figure).toHaveText('A3');
  await expect(figure).toHaveAttribute('data-testid', 'refnote');
  const size = await figure.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size, 'the figure is the 72px break of the one-size rule').toBeCloseTo(72, 0);

  // and NOTHING ELSE in the case names the pitch. Counting nodes whose text is a note name is
  // the assertion that survives a refactor: a future third copy fails this without anyone
  // having to remember to add a check for it.
  const copies = await page.evaluate(() => {
    const c = document.querySelector('.mt-drone')!;
    return [...c.querySelectorAll('*')]
      .filter((el) => !el.children.length && /^[A-G][♯♭]?\d$/.test((el.textContent || '').trim()))
      .map((el) => `${el.tagName}#${el.id || ''}.${el.className}`);
  });
  expect(copies, 'exactly one element names the note').toHaveLength(1);

  // the octave is part of the value: an octave step changes what the figure reads
  for (let i = 0; i < 12; i++) await page.getByTestId('refnote').click();
  await expect(figure, 'the figure carries the octave, so it moves').toHaveText('A4');
});

// THE FIGURE SCRUBS THE PITCH (user: "use the big one in center to change pitch too like left
// to right sliding"). A real pointer drag, not a synthetic event: the whole point is the
// gesture, and `setPointerCapture` + the click-suppression only behave correctly under real
// pointer sequences.
test('dragging the figure scrubs the pitch, and does not start the drone', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const figure = page.locator('#mt-dnote');
  await expect(figure).toHaveText('A3');
  const box = (await figure.boundingBox())!;
  const y = box.y + box.height / 2;
  const cx = box.x + box.width / 2;

  // right is higher, at 14px per semitone — a bigger step than the small handles use, because
  // the target is a 72px glyph and an 8px step made a casual drag cross nine semitones
  await page.mouse.move(cx, y);
  await page.mouse.down();
  await page.mouse.move(cx + 42, y, { steps: 8 });
  await page.mouse.up();
  await expect(figure, '+42px = +3 semitones').toHaveText('C4');

  // and left is lower
  await page.mouse.move(cx, y);
  await page.mouse.down();
  await page.mouse.move(cx - 28, y, { steps: 6 });
  await page.mouse.up();
  await expect(figure, '−28px = −2 semitones').toHaveText('B♭3');

  // THE DRAG MUST NOT TOGGLE THE SOUND. The figure sits inside `.mt-mid`, which is itself a
  // click-to-start target, so without stopPropagation every pitch change would also start or
  // stop the drone — and a drag ends in a click.
  await expect(page.getByTestId('drone-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => (window as any).__mt.toneHz), 'still silent').toBeNull();

  // A STEP MUST NOT EITHER — same mechanism, and it is the one a user hits constantly.
  await figure.click();
  await expect(figure).toHaveText('B3');
  await expect(page.getByTestId('drone-toggle')).toHaveAttribute('aria-pressed', 'false');

  // but the AIR around the figure still starts it — that shortcut is unchanged. The point has
  // to be genuinely inside `.mt-mid` and clear of the letter: `+8,+8` is the case's own corner
  // and hit nothing (the first version of this assertion failed for that reason, not because
  // the shortcut was broken). Take the middle's left edge at the figure's own vertical centre.
  const mid = (await page.locator('.mt-drone .mt-mid').boundingBox())!;
  const fig = (await page.locator('#mt-dnote').boundingBox())!;
  const px = (mid.x + fig.x) / 2;                       // between the case edge and the glyph
  expect(px, 'the point is left of the figure').toBeLessThan(fig.x);
  await page.mouse.click(px, fig.y + fig.height / 2);
  await expect(page.getByTestId('drone-toggle')).toHaveAttribute('aria-pressed', 'true');
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
  expect(ranks[0], 'the root is A3 = 220 Hz').toBeCloseTo(220, 1);
  expect(ranks[1] / ranks[0], 'a just 3:2, not the tempered 1.49831').toBeCloseTo(1.5, 4);
  expect(ranks[1] / ranks[0]).not.toBeCloseTo(Math.pow(2, 7 / 12), 4);

  // add the major third WHILE SOUNDING: the chord must change in place
  await page.getByTestId('semi-4').click();
  await expect(page.getByTestId('semi-4')).toHaveAttribute('aria-pressed', 'true');
  ranks = await page.evaluate(() => (window as any).__mt.droneRanks);
  expect(ranks, 'root + third + fifth').toHaveLength(3);
  expect(ranks[0], 'the root survived the re-voice').toBeCloseTo(220, 1);
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
  await expect(page.getByTestId('semi-7')).toHaveAttribute('aria-label', '5 — E4');
  await expect(page.getByTestId('semi-4')).toHaveAttribute('aria-label', '3 — C♯4');
  await expect(page.getByTestId('semi-16')).toHaveAttribute('aria-label', '10 — C♯5');
  // the readout is the chord, by name, in pitch order
  await expect(page.getByTestId('chord')).toHaveText('A3  E4');

  await page.getByTestId('refnote').click();          // A3 → A♯3
  await expect(page.getByTestId('semi-7'), 'the fifth above B♭3').toHaveAttribute('aria-label', '5 — F4');
  await expect(page.getByTestId('chord')).toHaveText('B♭3  F4');
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
  // WHAT IS ON THE FOOT LINE CHANGED (the note control moved onto the figure and the foot's
  // copy was deleted), so what the strip must not cover is the VOICE selector. The claim is
  // unchanged: a 40px cell in a row above must not steal clicks from the row below.
  const hit = await page.evaluate(() => {
    const r = document.querySelector('[data-testid="voice-cello"]')!.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) as HTMLElement;
    return { id: el?.dataset?.testid ?? el?.id ?? null, semi: el?.dataset?.semi ?? null };
  });
  expect(hit.semi, 'a strip cell must not be over the voice selector').toBeNull();
  expect(hit.id).toBe('voice-cello');

  // and the control still works, which is the thing the interception broke
  await page.getByTestId('voice-cello').click();
  await expect(page.getByTestId('voice-cello')).toHaveAttribute('aria-pressed', 'true');

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

// THE MIDDLE'S AIR IS THE SWITCH — the figure inside it is NOT, any more.
// This test asserted the opposite until 2026-08-07, and the reversal is the point of the
// change: the 72px letter became the PITCH control ("use the big one in center to change pitch
// too like left to right sliding"), so a click on it must step the note and must NOT toggle the
// sound. One 72px target cannot mean both — and of the two meanings, pitch is the one the user
// asked for and the one that needs the big target.
// The shortcut itself survives on the air AROUND the letter, which is what the dial and the
// pendulum offer on their own cases.
test('the middle toggles it; the figure sets the pitch instead', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  const toggle = page.getByTestId('drone-toggle');
  const figure = page.locator('#mt-dnote');

  // the air beside the figure, inside `.mt-mid`
  const mid = (await page.locator('.mt-drone .mt-mid').boundingBox())!;
  const fig = (await figure.boundingBox())!;
  const air = { x: (mid.x + fig.x) / 2, y: fig.y + fig.height / 2 };

  await page.mouse.click(air.x, air.y);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.click(air.x, air.y);
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // The caption latch: one press, one net change. It sits INSIDE the click target, so only
  // stopPropagation keeps a press on it from toggling twice and netting to nothing.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // THE FIGURE STEPS THE PITCH AND LEAVES THE SOUND ALONE — the same stopPropagation contract,
  // on the control that replaced the foot line's.
  await expect(figure).toHaveText('A3');
  await figure.click();
  await expect(figure, 'the click stepped the pitch').toHaveText('B♭3');
  await expect(toggle, 'and did not start the drone').toHaveAttribute('aria-pressed', 'false');
});
