import { test, expect } from '@playwright/test';

// ── THIS SPEC'S APP HAS ITS OWN ROUTE (2026-08-12). The hash deep link this file used for an hour
// is gone with the scroller: every thing in the room is a standalone page now. Every `page.goto`
// here therefore names the route. It is not a test affordance — it is the app's address — but it is
// what makes real-pointer assertions possible: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case on another page the press landed on nothing and the ring's overshoot read as 1.
// (was: '#changes` is how anyone links to this app — but it is what
// makes real-pointer assertions possible again: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case off-screen the press landed on nothing and the ring's overshoot read as 1.

// ── THE CHORD DEALER (chooser practice-room-apps Q1/02, grading Q3/02) ──────────────────
// It sounds a voicing; you name it; you press the symbol to reveal what it was.
//
// THE FILE STATES THE DESKTOP WIDTH for the same reason accent.spec.ts does: with five cases
// the room swipes below 1477, and on the phone layout this case is snap page 4 — off screen,
// so every click lands on nothing and the failures read as a broken dealer.
test.use({ viewport: { width: 1512, height: 900 } });

const sym = (p: any) => p.getByTestId('chord-symbol');
const answer = (p: any) => p.getByTestId('chord-answer');

test('the symbol is hidden until you ask, and revealing prints the spelled notes', async ({ page }) => {
  await page.goto('/practice-room/changes/?e2e');
  // THE MECHANIC IS THE WHOLE CASE: the symbol IS the answer, so it must not be readable
  // before you have tried to name it. A dealer that shows the answer is a chord chart.
  await expect(sym(page)).toHaveText('?');
  await expect(answer(page)).toHaveText('');
  // ── THE `?` IS FAINT, NOT INK — the state is drawn rather than explained ──────────────
  // POLLED, not sampled. `.mt-sym` transitions its colour (--dur-fast), so reading it on the
  // frame after load catches the fade: measured rgb(109,108,99) against --faint's
  // rgb(110,109,100), one unit out on every channel. The same trap the drone's own colour test
  // records ("it read ink at 0ms and the letter reaches navy ~140ms later"). Poll for the
  // settled value instead of racing it.
  const faintRGB = await page.evaluate(() => {
    const d = document.createElement('span');
    d.style.color = getComputedStyle(document.documentElement)
      .getPropertyValue('--faint').trim();
    document.body.appendChild(d);
    const c = getComputedStyle(d).color;
    d.remove();
    return c;
  });
  await expect
    .poll(() => sym(page).evaluate((el: Element) => getComputedStyle(el).color),
      { timeout: 2000, message: 'the unrevealed symbol settles on --faint' })
    .toBe(faintRGB);

  await sym(page).click();
  // A real chord symbol, and the notes spelled beneath it.
  await expect(sym(page)).not.toHaveText('?');
  await expect(sym(page)).toHaveText(/^[A-G]/);
  const notes = (await answer(page).textContent())!.trim().split(/\s+/);
  expect(notes.length, 'a seventh chord spells four notes').toBe(4);
  for (const n of notes) expect(n, `${n} is a note name`).toMatch(/^[A-G](♯|♭|𝄪|𝄫)?\d$/u);
});

test('the symbol IS the figure — the drone letter\'s 72px, reused not extended', async ({ page }) => {
  await page.goto('/practice-room/changes/?e2e');
  // "One typeface, one size" survives a fourth case only because this reuses the drone's
  // single above-ramp exception. A NEW size here would be a change to the page's type system,
  // and the sheet's first draft claimed 72px could not fit — measured, it does.
  //
  // IT USED TO READ THE DRONE'S OWN LETTER for the comparison — `#mt-dnote` — which was possible
  // while five cases shared one document. The drone is on /console/ now, so the two elements can
  // never be measured in one page again. The claim did not weaken, it MOVED: the size is asserted
  // as the literal here, and "there is exactly one size above the ramp, and both figures use it"
  // is asserted in tests/unit/practice-room-css.test.ts against the one shared stylesheet — which
  // is a stronger place for it, because a stylesheet cannot disagree with itself per route.
  const size = await page.evaluate(() =>
    getComputedStyle(document.getElementById('mt-sym')!).fontSize);
  expect(size).toBe('72px');

  // AND IT FITS. The widest symbol in these decks is F♯m7♭5; the case is sized for it
  // (--mt-changes-w 315px = 259px of ink + two 3ch insets + hairlines). A symbol that wraps
  // or overflows would read as two chords.
  const fit = await page.evaluate(() => {
    const host = document.querySelector('.mt-changes') as HTMLElement;
    const cs = getComputedStyle(host);
    const content = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;' +
      'font-family:inherit;line-height:1;font-weight:400;font-size:72px';
    document.body.appendChild(probe);
    probe.textContent = 'F♯m7♭5';
    const widest = probe.getBoundingClientRect().width;
    probe.remove();
    return { content: Math.round(content), widest: Math.round(widest),
             wraps: getComputedStyle(document.getElementById('mt-sym')!).whiteSpace };
  });
  expect(fit.widest, 'the widest symbol fits the case').toBeLessThanOrEqual(fit.content);
  expect(fit.wraps, 'a symbol is one token — it must not wrap').toBe('nowrap');
});

test('deal gives a NEW chord and re-hides it', async ({ page }) => {
  await page.goto('/practice-room/changes/?e2e');
  await sym(page).click();                       // reveal
  const first = await sym(page).textContent();
  await page.getByTestId('deal').click();
  // re-hidden, because the next card is a question again
  await expect(sym(page)).toHaveText('?');
  await expect(answer(page)).toHaveText('');
  await sym(page).click();
  const second = await sym(page).textContent();
  // NEVER THE SAME CARD TWICE RUNNING. A dealer that repeats reads as broken even when it is
  // honest randomness, and with seven cards a repeat is common — so it is excluded by
  // construction and asserted here.
  expect(second, 'deal never repeats the card you just had').not.toBe(first);
});

test('the deck is a setting, it persists, and each deck deals its own chords', async ({ page }) => {
  await page.goto('/practice-room/changes/?e2e');
  // `sevenths` is the default — the deck a jazz player lives in.
  await expect(page.getByTestId('deck-sevenths')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('deck-altered').click();
  await expect(page.getByTestId('deck-altered')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('deck-sevenths')).toHaveAttribute('aria-pressed', 'false');
  await sym(page).click();
  // an altered card carries an alteration in its symbol
  await expect(sym(page)).toHaveText(/[♯♭]\d|alt|13/);

  // it survives a reload, like every other set-once value on this screen
  await page.reload();
  await expect(page.getByTestId('deck-altered')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('deck-triads').click();
  await sym(page).click();
  const notes = (await answer(page).textContent())!.trim().split(/\s+/);
  expect(notes.length, 'a triad spells three notes').toBe(3);
});

// ── THE SPELLING IS THE POINT, and it is the finding this case forced into naming.ts ─────
// A chord SYMBOL declares a degree. `F♯m7♭5`'s ♭5 is a fifth lowered, so it must land on the
// letter C — but six semitones read conventionally is an augmented 4th, which spells B♯.
// Measured against the shipped module before the fix: 3 of 11 deck chords disagreed with
// their own symbol. This test is what stops that regressing.
test('an altered chord is spelled from its DEGREE, not from the semitone count', async ({ page }) => {
  await page.goto('/practice-room/changes/?e2e');
  await page.getByTestId('deck-sevenths').click();

  // Deal until F♯m7♭5 comes up — it is in the sevenths deck, and it is the case that breaks
  // a size-only reading.
  let notes: string[] | null = null;
  for (let i = 0; i < 30; i++) {
    await sym(page).click();
    const s = (await sym(page).textContent())!.trim();
    if (s === 'F♯m7♭5') { notes = (await answer(page).textContent())!.trim().split(/\s+/); break; }
    await page.getByTestId('deal').click();
  }
  expect(notes, 'F♯m7♭5 must appear in the sevenths deck').not.toBeNull();
  // F♯ A C E — the fifth on C, NOT B♯.
  expect(notes!.map((n) => n.replace(/\d+$/, ''))).toEqual(['F♯', 'A', 'C', 'E']);
  expect(notes!.join(' '), 'the ♭5 is never spelled B♯').not.toContain('B♯');
});

test('the transport sounds it, and the case reports sounding', async ({ page }) => {
  await page.goto('/practice-room/changes/?e2e');
  const toggle = page.getByTestId('chord-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  // the case carries the running state, the way every other case on this screen does
  await expect(page.locator('.mt-changes')).toHaveAttribute('data-sounding', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.mt-changes')).not.toHaveAttribute('data-sounding', 'true');
});

// ── ONE SUSTAINED SOURCE AT A TIME — NOW ENFORCED BY THE ROUTES, so this test is deleted rather
// than adapted (2026-08-12).
//
// WHAT IT ASSERTED: starting the chord released the DRONE (two sustained stacks in different keys
// is not a practice tool) while leaving the METRONOME running (a click over a chord is a legitimate
// thing to want, and it is percussive rather than sustained). Both were true, and both were claims
// about three cases in ONE document.
//
// The dealer is its own page now. It cannot reach the drone's toggle, and it does not need to: the
// drone's document unloads on the way here and `pagehide` stops every source it owns. The gate in
// the source (`if (droning()) stopTone()`) is kept because it costs a line and stays correct if two
// of these ever share a page again — but there is no cross-page behaviour left to assert.
//
// THE COST, STATED: you cannot run the metronome over the chord dealer any more, and that is not a
// bug in this change — it is what "each thing in the room is a standalone page" means. The console
// is the one page that holds three instruments precisely because those are the three you use at
// once.

test('the arpeggiate latch needs no microphone until you ask for one', async ({ page }) => {
  // THE CASE IS USEFUL WITH NO MIC AT ALL: sound it, name it in your head, reveal. So the
  // permission prompt is opt-in rather than the price of opening the room — the same promise
  // the tuner makes, and the reason `arpeggiate` starts off.
  //
  // COUNT THE REAL CALLS. The first draft of this test read a `__gumCalls` global that does
  // not exist, so it asserted `0 === 0` and could never fail — the exact shape of a test that
  // proves nothing. The counter is installed here, before any page script runs, by wrapping
  // getUserMedia itself.
  await page.addInitScript(() => {
    (window as any).__gum = 0;
    const md = navigator.mediaDevices;
    if (!md) return;
    const real = md.getUserMedia.bind(md);
    md.getUserMedia = (c?: MediaStreamConstraints) => { (window as any).__gum++; return real(c!); };
  });
  await page.goto('/practice-room/changes/?e2e');
  await expect(page.getByTestId('arp-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => (window as any).__gum),
    'opening the room asks for no microphone').toBe(0);

  // and pressing it DOES ask — the control's whole job, and the other half of the claim
  await page.getByTestId('arp-toggle').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__gum), { timeout: 5000 })
    .toBeGreaterThan(0);
});
