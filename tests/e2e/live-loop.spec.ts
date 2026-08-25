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
  // Uncalibrated is the honest default and the state line has to say so, because a player who
  // does not know it is uncompensated will blame their timing for the engine's offset.
  await expect(page.getByTestId('ll-state')).toContainText('UNCOMPENSATED');
  await expect(page.getByTestId('ll-latency')).toHaveText('0 ms');
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
