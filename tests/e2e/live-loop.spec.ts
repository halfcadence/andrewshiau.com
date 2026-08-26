import { test, expect } from '@playwright/test';

// /live-loop/ — the room's overdub looper. Two of these assertions are the ones that matter and
// the rest are furniture:
//
//   · THE LOOP LENGTH READING. It is tempo × bars, and it is also the reverb budget halved, so a
//     wrong number here is wrong in two places at once. The figures are pinned against
//     liveloop.ts's unit tests AND against the numbers published in the field-guide document —
//     if this test and that document disagree, one of them is lying to a reader.
//   · THE PUNCH ACTUALLY PRINTS. Arm a lane, wait one full loop, and the lane must report that it
//     holds audio. That is the only assertion here that exercises the AudioWorklet at all: the
//     ring buffer, the bar-quantised start, the write offset and the end-of-take message. Everything
//     else on this page could be correct with a processor that records silence.
//
// The fake mic is `sine-440.wav` (project `live-loop` in playwright.config.ts) rather than the
// fake device's default, because a lane recorded from silence would still report `has: true` and
// the test could not tell a working recorder from a broken one.

const LL = '/practice-room/live-loop/';

test('the loop length reading is tempo x meter x bars — no songs involved', async ({ page }) => {
  await page.goto(LL);
  // Default grid: 90 bpm, 4/4, 4 bars = 16 beats at 0.6667 s = 10.67 s
  await expect(page.getByTestId('ll-length')).toHaveText('10.67 s');
  await expect(page.getByTestId('ll-run')).toHaveAttribute('aria-pressed', 'false');

  // bars halve the loop
  await page.getByTestId('ll-bars-2').click();
  await expect(page.getByTestId('ll-length')).toHaveText('5.33 s');

  // beats per bar changes it too — 3 beats is three quarters of 4
  await page.getByTestId('ll-beats-3').click();
  await expect(page.getByTestId('ll-length')).toHaveText('4.00 s');

  // and the tempo field
  await page.getByTestId('ll-bpm').fill('120');
  await page.getByTestId('ll-bpm').blur();
  await expect(page.getByTestId('ll-length')).toHaveText('3.00 s');
});

test('a loop longer than the buffer is refused, not silently truncated', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  // 8 bars of 7/4 at 40 bpm is 84 s, far past the 16 s of buffer.
  await page.getByTestId('ll-bpm').fill('40');
  await page.getByTestId('ll-bpm').blur();
  await page.getByTestId('ll-beats-7').click();
  await page.getByTestId('ll-bars-8').click();
  await expect(page.getByTestId('ll-state')).toContainText('longer than the', { timeout: 5_000 });
});

test('sections are three whole sets of lanes, and a switch is armed to the bar', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-bars-1').click();          // 2.67 s, so a bar comes round fast
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  await expect(page.getByTestId('ll-sect-A')).toHaveAttribute('aria-pressed', 'true');

  // record into A
  await page.getByTestId('ll-rec-0').click();
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-has', 'true', { timeout: 20_000 });

  // switch to B: armed first, then it lands and B's lanes are EMPTY — a different set, not a mute
  await page.getByTestId('ll-sect-B').click();
  await expect(page.getByTestId('ll-state')).toContainText('armed');
  await expect(page.getByTestId('ll-sect-B')).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-has', 'false');

  // and A still holds its take when you come back
  await page.getByTestId('ll-sect-A').click();
  await expect(page.getByTestId('ll-sect-A')).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-has', 'true');
});

test('the keyboard drives it — space runs, digits punch, q mutes, z undoes', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-bars-1').click();
  await page.locator('.mt-liveloop').click({ position: { x: 5, y: 5 } });   // focus the page, not a field
  await page.keyboard.press('Space');
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });

  await page.keyboard.press('1');
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-has', 'true', { timeout: 20_000 });
  await page.keyboard.press('q');
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-muted', 'true');
  await page.keyboard.press('q');
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-muted', 'false');
  await page.keyboard.press('z');
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-has', 'false', { timeout: 5_000 });
});

test('typing a tempo does not punch a lane', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  // '1' inside the field must reach the field, not the lane keymap.
  await page.getByTestId('ll-bpm').click();
  await page.keyboard.type('1');
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-armed', 'false');
});

test('the four lanes are named by input and start empty', async ({ page }) => {
  await page.goto(LL);
  const lanes = page.locator('.mt-lllane');
  await expect(lanes).toHaveCount(4);
  for (const name of ['drums', 'harmony', 'voice', 'spare']) {
    await expect(page.locator('.mt-llnm', { hasText: name })).toBeVisible();
  }
  // Nothing holds audio before anything is recorded — the red arm for the punch test below.
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(`.mt-lllane[data-lane="${i}"]`)).not.toHaveAttribute('data-has', 'true');
  }
});

test('run opens the microphone and the transport reports it is sounding', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-run').click();
  await expect(page.getByTestId('ll-run')).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  // UNMEASURED IS THE HONEST DEFAULT AND THE PAGE HAS TO SAY SO, because a player who does not
  // know the offset is unmeasured will blame their own timing for the engine's.
  //
  // Asserted on the STAR rather than on a number: the engine seeds the offset from
  // ctx.baseLatency + ctx.outputLatency, which is real on a Mac with an interface and is 42 ms in
  // this headless browser — so pinning "0 ms" pinned the test environment, not the behaviour.
  // The star means "not measured", and it is the thing that must be true either way.
  await expect(page.getByTestId('ll-latency')).toContainText('*');
  // and whichever state it is in, it names the fix rather than just the problem
  const said = await page.getByTestId('ll-state').textContent();
  expect(said).toMatch(/UNCOMPENSATED|OUTPUT latency only/);
  expect(said).toContain('measure');
});

test('a punch prints audio into the armed lane on the next bar', async ({ page }) => {
  await page.goto(LL);
  // One bar, so the wait is one short cycle.
  await page.getByTestId('ll-bars-1').click();   // 2.67 s at the default grid
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });

  const lane = page.locator('.mt-lllane[data-lane="1"]'); // harmony
  await page.getByTestId('ll-rec-1').click();
  // Armed, waiting for the bar line — this is the state the quantiser exists to produce.
  await expect(lane).toHaveAttribute('data-armed', 'true', { timeout: 5_000 });
  await expect(page.getByTestId('ll-state')).toContainText('recording from the next bar');

  // One bar to land plus one full loop to print, plus slack.
  await expect(lane).toHaveAttribute('data-has', 'true', { timeout: 25_000 });

  // AND IT PRINTED SIGNAL, NOT AN EMPTY BUFFER. `data-has` is true the moment a take ends,
  // whatever it contains, so this is the assertion that can actually fail: writing zeros in the
  // processor's record branch keeps every other check on this page green. Red-armed by doing
  // exactly that — see the note in the processor.
  const peak = await lane.getAttribute('data-peak');
  expect(Number(peak)).toBeGreaterThan(0.01);
  await expect(page.getByTestId('ll-state')).toContainText('printed, peak');
  // And only that lane — a punch that bleeds into its neighbours is the mud this design exists
  // to prevent, and it would show up here.
  for (const i of [0, 2, 3]) {
    await expect(page.locator(`.mt-lllane[data-lane="${i}"]`)).not.toHaveAttribute('data-has', 'true');
  }
});

test('mute is per lane and reports its state', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  const mute = page.getByTestId('ll-mute-2');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.mt-lllane[data-lane="2"]')).toHaveAttribute('data-muted', 'true');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
});

test('the room lists live loop and not changes, but /changes/ still loads', async ({ page }) => {
  await page.goto('/practice-room/');
  await expect(page.getByTestId('plan-live-loop')).toBeVisible();
  await expect(page.getByTestId('plan-console')).toBeVisible();
  await expect(page.getByTestId('plan-loop')).toBeVisible();
  // The visibility system unlists a thing; it does not delete it.
  await expect(page.getByTestId('plan-changes')).toHaveCount(0);

  const res = await page.goto('/practice-room/changes/');
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator('[data-mt-key="changes"]')).toBeVisible();
});

/* ══ WHAT A REVIEW FOUND, PINNED SO IT CANNOT COME BACK ═══════════════════════════════════════
   Each of these covers a defect that shipped in the first version. The first one is the reason
   this block exists: the page said "stopped. the lanes keep what they hold." and then erased
   them on the next press. */

test('STOP THEN RUN KEEPS THE LANES — the page promises it, so it is a test', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-bars-1').click();   // 2.67 s at the default grid
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });

  const lane = page.locator('.mt-lllane[data-lane="1"]');
  await page.getByTestId('ll-rec-1').click();
  await expect(lane).toHaveAttribute('data-has', 'true', { timeout: 25_000 });
  const peakBefore = Number(await lane.getAttribute('data-peak'));
  expect(peakBefore).toBeGreaterThan(0.01);

  // stop
  await page.getByTestId('ll-run').click();
  await expect(page.getByTestId('ll-run')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('ll-state')).toContainText('lanes keep what they hold');
  await expect(lane).toHaveAttribute('data-has', 'true');

  // and run again — the take must still be there. It was not: `applySong()` re-sent `config`,
  // which reallocated every lane buffer, so a 12-second performance died on a transport press.
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  await expect(lane).toHaveAttribute('data-has', 'true');
  expect(Number(await lane.getAttribute('data-peak'))).toBeCloseTo(peakBefore, 3);
});

test('the rec button says ADD once a lane holds audio, because it overdubs then', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-bars-1').click();   // 2.67 s at the default grid
  await expect(page.getByTestId('ll-rec-2')).toHaveText('rec');
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  await page.getByTestId('ll-rec-2').click();
  await expect(page.locator('.mt-lllane[data-lane="2"]')).toHaveAttribute('data-has', 'true', { timeout: 25_000 });
  await expect(page.getByTestId('ll-rec-2')).toHaveText('add');
});

test('undo puts back what a take replaced, and a second undo is a redo', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-bars-1').click();   // 2.67 s at the default grid
  await expect(page.getByTestId('ll-undo')).toBeDisabled();
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });

  const lane = page.locator('.mt-lllane[data-lane="0"]');
  await page.getByTestId('ll-rec-0').click();
  await expect(lane).toHaveAttribute('data-has', 'true', { timeout: 25_000 });
  await expect(page.getByTestId('ll-undo')).toBeEnabled();

  // undo → the lane is empty again (it was empty before the take)
  await page.getByTestId('ll-undo').click();
  await expect(lane).toHaveAttribute('data-has', 'false', { timeout: 5_000 });
  // undo again → the take comes back, which is what one level of undo gives you for free
  await page.getByTestId('ll-undo').click();
  await expect(lane).toHaveAttribute('data-has', 'true', { timeout: 5_000 });
});

test('cancelling a punch keeps whatever the lane already had', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-bars-1').click();   // 2.67 s at the default grid
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  const lane = page.locator('.mt-lllane[data-lane="3"]');
  await page.getByTestId('ll-rec-3').click();
  await expect(lane).toHaveAttribute('data-armed', 'true', { timeout: 5_000 });
  await page.getByTestId('ll-rec-3').click();     // cancel while armed
  await expect(page.getByTestId('ll-state')).toContainText('keeps what it had');
  await expect(lane).toHaveAttribute('data-armed', 'false', { timeout: 5_000 });
  await expect(lane).toHaveAttribute('data-has', 'false');
});

test('the playhead tracks the strips, not the whole figure', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  // The head must sit inside the strip column at every position it can take. Measured, because
  // the head used to be positioned off the CONTAINER and so sat over the lane name at pos 0.
  const geo = await page.evaluate(() => {
    const strip = document.querySelector('.mt-llstrip')!.getBoundingClientRect();
    const head = document.querySelector('.mt-llhead')!.getBoundingClientRect();
    const lanes = getComputedStyle(document.querySelector('.mt-lllanes')!);
    return {
      stripL: strip.left, stripR: strip.right, headL: head.left,
      x: lanes.getPropertyValue('--ll-strip-x').trim(),
      w: lanes.getPropertyValue('--ll-strip-w').trim(),
    };
  });
  expect(geo.x).not.toBe('');
  expect(geo.w).not.toBe('');
  expect(geo.headL).toBeGreaterThanOrEqual(geo.stripL - 1.5);
  expect(geo.headL).toBeLessThanOrEqual(geo.stripR + 1.5);
});

test('calibration refuses while the transport runs — chirps would print into a take', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  await page.getByTestId('ll-calibrate').click();
  await expect(page.getByTestId('ll-state')).toContainText('stop the transport first', { timeout: 10_000 });
});

test('each lane picks which input it records from — the per-track input matrix', async ({ page }) => {
  // The RC-505's least-advertised feature and the one a 2-in rig most needs: with a mic on
  // channel 1 and an instrument on channel 2, a lane that records BOTH is not a mix, it is a pile.
  //
  // WHAT THIS PROVES AND WHAT IT DOES NOT. It proves the selector cycles, reports itself, and
  // reaches the processor. It does NOT prove the channels are actually kept apart, because the
  // fake device feeds the same file to both — that needs a real interface with different signals
  // on 1 and 2, and it is listed as unverified.
  await page.goto(LL);
  const name = page.getByTestId('ll-src-0');
  const suffix = page.locator('.mt-lllane[data-lane="0"] .mt-llsrc');

  await name.click();                       // both -> channel 1
  await expect(page.getByTestId('ll-state')).toContainText('records from channel 1', { timeout: 15_000 });
  await expect(suffix).toHaveText('1');

  await name.click();                       // -> channel 2
  await expect(page.getByTestId('ll-state')).toContainText('records from channel 2');
  await expect(suffix).toHaveText('2');

  await name.click();                       // -> both, and the suffix goes away because it is the default
  await expect(page.getByTestId('ll-state')).toContainText('both channels');
  await expect(suffix).toHaveText('');

  // the other lanes were not touched
  await expect(page.locator('.mt-lllane[data-lane="1"] .mt-llsrc')).toHaveText('');
});

test('a section switch repaints its lanes immediately, not on the next tick', async ({ page }) => {
  // The walkthrough caught this: the `section` message did not carry the incoming section's lane
  // state, so for up to 33 ms the rows showed the OUTGOING section — a row reading "rec" for a
  // lane that holds a take. Asserted with no wait at all after the switch lands.
  await page.goto(LL);
  await page.getByTestId('ll-bars-1').click();
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  await page.getByTestId('ll-rec-0').click();
  await expect(page.locator('.mt-lllane[data-lane="0"]')).toHaveAttribute('data-has', 'true', { timeout: 20_000 });

  await page.getByTestId('ll-sect-B').click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid=ll-sect-B]')?.getAttribute('aria-pressed') === 'true',
    null, { timeout: 15_000 });
  // read in the SAME turn the indicator flipped — no polling, no retry
  const state = await page.evaluate(() => ({
    section: document.querySelector('[data-testid=ll-sect-B]')?.getAttribute('aria-pressed'),
    laneHas: (document.querySelector('.mt-lllane[data-lane="0"]') as HTMLElement).dataset.has,
    recWord: document.querySelector('[data-testid=ll-rec-0]')?.textContent?.trim(),
  }));
  expect(state.section).toBe('true');
  expect(state.laneHas).toBe('false');
  expect(state.recWord).toBe('rec');
});

test('the grid reuses the metronome\'s own controls — scrub, tap and the ruled measure', async ({ page }) => {
  // Not a cosmetic point: two cases in one room that both set a tempo must not have two ways to
  // set one. These assert the SHARED idioms are actually present and wired, not merely similar.
  await page.goto(LL);

  // the draggable bpm handle, same `.mt-hd` the tuner and metronome use
  const handle = page.getByTestId('ll-bpm-handle');
  await expect(handle).toBeVisible();
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  const after = Number(await page.getByTestId('ll-bpm').inputValue());
  expect(after).toBeGreaterThan(90);        // dragged right, tempo went up

  // the ruled measure: digits are buttons and the rule GROWS to the one picked
  await page.getByTestId('ll-beats-3').click();
  const lines = await page.locator('#mt-ll-beats-seg .rm-rule line').count();
  expect(lines).toBe(1);                    // `grow` draws one straight line
  await expect(page.getByTestId('ll-beats-3')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('ll-beats-2')).toHaveClass(/on/);   // filled up to the pick
  await expect(page.getByTestId('ll-beats-5')).not.toHaveClass(/on/);

  // and tap is the metronome's tap, with its draining ring
  await expect(page.getByTestId('ll-tap')).toBeVisible();
  await page.getByTestId('ll-tap').click();
  await expect(page.getByTestId('ll-state')).toContainText('keep tapping');
});

test('the ruler divides the loop into its bars and beats, and refuses an impossible grid', async ({ page }) => {
  await page.goto(LL);
  const ruler = page.locator('#mt-ll-ruler');
  await expect(ruler).toBeAttached();

  // The divisions are custom properties the script writes, because CSS cannot ask for a number.
  const read = () => page.evaluate(() => {
    const st = getComputedStyle(document.querySelector('.mt-lllanes')!);
    return { bars: st.getPropertyValue('--ll-bars').trim(), beats: st.getPropertyValue('--ll-beats-total').trim() };
  });
  expect(await read()).toEqual({ bars: '4', beats: '16' });

  await page.getByTestId('ll-beats-3').click();
  await page.getByTestId('ll-bars-2').click();
  expect(await read()).toEqual({ bars: '2', beats: '6' });
  await expect(page.getByTestId('ll-length')).toHaveText('4.00 s');

  // AND THE REFUSAL WORKS WITH NO MICROPHONE OPEN. The engine's own check compares frames against
  // an allocated buffer, so it can only answer once the mic is open — which meant you could set an
  // impossible grid, watch the reading agree, and only find out on the downbeat. Seconds against
  // seconds needs no device, so this asserts it before anything is armed.
  await page.getByTestId('ll-beats-7').click();
  await page.getByTestId('ll-bars-8').click();
  await expect(page.getByTestId('ll-state')).toContainText('longer than the 16 s buffer');
  // and it rolled back rather than half-applying
  expect((await read()).bars).not.toBe('8');
});
