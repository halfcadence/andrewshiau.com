import { test, expect } from '@playwright/test';

// ── OPENED BY DEEP LINK (2026-08-12). The room is an INDEX now: it opens on the plan, and this
// spec's instrument is a page you navigate to. Every `page.goto` here therefore carries the app's
// own hash. It is not a test affordance — `#changes` is how anyone links to this app — but it is what
// makes real-pointer assertions possible again: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case off-screen the press landed on nothing and the ring's overshoot read as 1.

// ── ARPEGGIATED GRADING (chooser practice-room-apps Q3/02) ───────────────────────────────
// ITS OWN PROJECT because the fake microphone is a browser LAUNCH flag: this file plays
// `arp-dm7.wav` — D3 F3 A3 C4, plucked, 700ms each with a rest between — in place of a real
// mic, so the notes arriving have a truth the grader can be checked against.
//
// WHY ONE NOTE AT A TIME IS THE ONLY HONEST OPTION, restated here because the test looks like
// it is settling for less: the shipped detector is the McLeod Pitch Method and finds ONE
// period. Measured against synthesized plucked voicings, a strummed Dm7 reads as NO PITCH
// (below the 0.6 clarity gate) and a bare fifth reads exactly an octave low (D3+A3 → D2, ÷2).
// A grader that accepted a strum would need a detector the room does not have. Played one note
// at a time it is the detector's home ground — 0.35 cents, C2 to C7, asserted in pitch.test.ts.
//
// THE FIXTURE WAS VERIFIED THROUGH THE SHIPPED DETECTOR BEFORE THIS TEST WAS WRITTEN: at the
// page's own 60ms read cadence and ±35¢ tolerance it yields D3, F3, A3 and C4 with 72 reads
// each and zero spurious notes. A fixture nobody checked makes a test that cannot fail.
test.use({ viewport: { width: 1512, height: 900 } });

test('arpeggiating the voicing lands its notes, one at a time', async ({ page }) => {
  await page.goto('/practice-room/?e2e#changes');

  // Sevenths, and deal until Dm7 — the chord the fixture actually plays.
  await page.getByTestId('deck-sevenths').click();
  let found = false;
  for (let i = 0; i < 40; i++) {
    await page.getByTestId('chord-symbol').click();
    if ((await page.getByTestId('chord-symbol').textContent())?.trim() === 'Dm7') { found = true; break; }
    await page.getByTestId('deal').click();
  }
  expect(found, 'Dm7 must be dealable from the sevenths deck').toBe(true);

  // Stop the sounding chord: the fixture is the input, and the case's own tone would be
  // playing over it. (The mic and the speaker are separate here — the fake device does not
  // hear the page — but leaving it running would muddy what the test is about.)
  const chordToggle = page.getByTestId('chord-toggle');
  if (await chordToggle.getAttribute('aria-pressed') === 'true') await chordToggle.click();

  await page.getByTestId('arp-toggle').click();
  await expect(page.getByTestId('arp-toggle')).toHaveAttribute('aria-pressed', 'true');

  // LISTENING REVEALS THE CHORD, deliberately: grading a chord you have not been told is a
  // memory test, not a chord test, and the note names are what you check your fingers against.
  await expect(page.getByTestId('chord-symbol')).toHaveText('Dm7');

  // The notes land as the arpeggio plays. `<i>` is the accent — "this is happening" — and the
  // fixture is 4 × 880ms per cycle, so one full cycle is under 4s.
  await expect
    .poll(async () => page.evaluate(() =>
      document.querySelectorAll('#mt-answer i').length),
      { timeout: 15000, message: 'every note of the voicing is landed' })
    .toBe(4);

  // and the landed names are the RIGHT ones, spelled from their degrees
  const landed = await page.evaluate(() =>
    [...document.querySelectorAll('#mt-answer i')].map((e) => e.textContent!.trim()));
  expect(landed).toEqual(['D3', 'F3', 'A3', 'C4']);
});

test('the grader lands ONLY the notes the chord contains', async ({ page }) => {
  // THE GRADER MUST DISCRIMINATE, not just count — otherwise "landed" means "heard something"
  // and a wrong voicing grades as correct.
  //
  // MY FIRST VERSION OF THIS TEST WAS IMPOSSIBLE, and the failure was mine: it dealt until
  // `C♯maj7` expecting a chord sharing no pitch class with the fixture's Dm7, and no such card
  // exists — measured across the sevenths deck, every one shares at least one note with
  // D F A C (G7 shares two, B♭maj7 three, Cmaj7 and E7 one each). A chord trainer's deck is
  // full of related chords; that is what a deck IS. So the discriminating claim has to be
  // stated as a SUBSET relation rather than as an empty set.
  //
  // E7 (E G♯ B D) is the sharpest case available: it shares exactly ONE pitch class with the
  // fixture — D — so a working grader lands precisely one of its four notes and a grader that
  // merely reacts to sound lands more.
  await page.goto('/practice-room/?e2e#changes');
  await page.getByTestId('deck-sevenths').click();
  let found = false;
  for (let i = 0; i < 40; i++) {
    await page.getByTestId('chord-symbol').click();
    if ((await page.getByTestId('chord-symbol').textContent())?.trim() === 'E7') { found = true; break; }
    await page.getByTestId('deal').click();
  }
  expect(found, 'E7 must be dealable from the sevenths deck').toBe(true);
  const chordToggle = page.getByTestId('chord-toggle');
  if (await chordToggle.getAttribute('aria-pressed') === 'true') await chordToggle.click();

  await page.getByTestId('arp-toggle').click();
  // Two full cycles of the fixture (4 x 880ms each): every note it plays has been heard twice,
  // so anything that CAN land has landed.
  await page.waitForTimeout(8000);
  const landed = await page.evaluate(() =>
    [...document.querySelectorAll('#mt-answer i')].map((e) => e.textContent!.trim()));

  // Exactly the shared note, and nothing else. The fixture plays D3 F3 A3 C4; of E7's
  // E G♯ B D only the D is in that set, and it is E7's own 7th.
  expect(landed.length, 'only the shared note lands').toBe(1);
  expect(landed[0], 'and it is the D — E7\'s seventh').toMatch(/^D\d$/);

  // ── AND THE GRADER'S OWN STATE, NOT JUST WHAT IT PAINTED ────────────────────────────
  // The DOM assertion above is necessary and not sufficient, and I only found that by trying
  // to break it: deleting the grader's membership test entirely — accept every pitch the
  // detector hears — passed all three of these tests. `paintArp()` renders ONLY the dealt
  // chord's four notes, so a non-member accepted into the landed set never appears on the page.
  // The mechanism is doubly guarded, so a single sabotage cannot flip a DOM-only check, which
  // is exactly the "a doubly-guarded mechanism needs a combined sabotage" trap.
  // Reading the grader's set directly is what closes it: with the membership test gone, this
  // set contains the fixture's F and A too, and the assertion fires.
  const grader = await page.evaluate(() => ({
    landed: (window as any).__mt.arpLanded as number[],
    wanted: (window as any).__mt.arpWanted as number[],
  }));
  const strays = grader.landed.filter((pc) => !grader.wanted.includes(pc));
  expect(strays, 'the grader accepts no pitch class outside the chord').toEqual([]);
  // and it did accept the one it should: D = pitch class 2
  expect(grader.landed, 'the shared D was accepted').toEqual([2]);
});

test('the mic is the TUNER\'s stream — one permission, one indicator', async ({ page }) => {
  // ONE MECHANISM, not two. `startTuner()` already owns the high-pass, the three capture flags
  // and the permission race, so the grader borrows the tuner's analyser rather than opening a
  // second stream. Two streams would mean two prompts and two recording indicators for one
  // instrument.
  await page.addInitScript(() => {
    (window as any).__gum = 0;
    const md = navigator.mediaDevices;
    if (!md) return;
    const real = md.getUserMedia.bind(md);
    md.getUserMedia = (c?: MediaStreamConstraints) => { (window as any).__gum++; return real(c!); };
  });
  await page.goto('/practice-room/?e2e#changes');
  await page.getByTestId('arp-toggle').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gum), { timeout: 5000 })
    .toBe(1);

  // and the TUNER is now running — it is the thing that owns the stream, so it says so
  await expect(page.getByTestId('mic-toggle')).toHaveAttribute('aria-pressed', 'true');

  // turning the grader off does NOT take the tuner's stream away: the tuner is a separate
  // instrument the reader may have wanted on. One more press, still one getUserMedia call.
  await page.getByTestId('arp-toggle').click();
  await expect(page.getByTestId('arp-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => (window as any).__gum),
    'stopping the grader opens no new stream').toBe(1);
});
