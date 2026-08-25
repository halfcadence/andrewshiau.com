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

test('the loop length reading is tempo x bars, per song', async ({ page }) => {
  await page.goto(LL);
  // Apocalypse is the default: 90.7 bpm, 4 bars.
  await expect(page.getByTestId('ll-length')).toHaveText('10.58 s');
  await expect(page.getByTestId('ll-run')).toHaveAttribute('aria-pressed', 'false');

  await page.getByTestId('ll-song-sunsetz').click();
  await expect(page.getByTestId('ll-length')).toHaveText('12.45 s');

  await page.getByTestId('ll-song-nothings-gonna-hurt-you-baby').click();
  await expect(page.getByTestId('ll-length')).toHaveText('9.66 s');

  await page.getByTestId('ll-song-apocalypse').click();
  await expect(page.getByTestId('ll-length')).toHaveText('10.58 s');
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
  // The shortest loop in the set, so the wait is one 9.66 s cycle rather than 12.45.
  await page.getByTestId('ll-song-nothings-gonna-hurt-you-baby').click();
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });

  const lane = page.locator('.mt-lllane[data-lane="1"]'); // harmony
  await page.getByTestId('ll-rec-1').click();
  // Armed, waiting for the bar line — this is the state the quantiser exists to produce.
  await expect(lane).toHaveAttribute('data-armed', 'true', { timeout: 5_000 });
  await expect(page.getByTestId('ll-state')).toContainText('recording from the next bar');

  // One bar to land plus one full loop to print. 9.66 s + a bar (2.4 s) + slack.
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
  await page.getByTestId('ll-song-nothings-gonna-hurt-you-baby').click();
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
  await page.getByTestId('ll-song-nothings-gonna-hurt-you-baby').click();
  await expect(page.getByTestId('ll-rec-2')).toHaveText('rec');
  await page.getByTestId('ll-run').click();
  await expect(page.locator('.mt-liveloop')).toHaveAttribute('data-sounding', 'true', { timeout: 15_000 });
  await page.getByTestId('ll-rec-2').click();
  await expect(page.locator('.mt-lllane[data-lane="2"]')).toHaveAttribute('data-has', 'true', { timeout: 25_000 });
  await expect(page.getByTestId('ll-rec-2')).toHaveText('add');
});

test('undo puts back what a take replaced, and a second undo is a redo', async ({ page }) => {
  await page.goto(LL);
  await page.getByTestId('ll-song-nothings-gonna-hurt-you-baby').click();
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
  await page.getByTestId('ll-song-nothings-gonna-hurt-you-baby').click();
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
