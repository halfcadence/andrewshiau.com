import { test, expect } from '@playwright/test';

// THE METRONOME MUST NOT MOVE THE TUNER (user report 2026-08-05: "when metronome is
// playing it triggers tuner").
//
// The bug is acoustic: the click is a pure sine at a known frequency, the mic hears it
// out of the speaker, and the NSDF detector reads the metronome as a note. Headless
// Chrome's fake microphone plays a WAV and cannot hear the page's speaker, so the real
// room does not exist here. The test builds a synthetic one: `__mt.bleed` is a GainNode
// that ping() also routes into, and the test connects it to the analyser at a chosen
// attenuation. The page holds no test topology — it exposes the tap, nothing more.
//
// THE INPUT IS A PULSED NOTE, and that is the whole reason this test can fail. The first
// version used the steady 440 Hz sine the other tuner specs use and passed against the
// UNFIXED page: a continuous tone masks the click (measured — with note and click at
// equal level the detector still follows the note), so the symptom never appeared. The
// bug lives in the GAPS between notes, where the click is the only pitch in the window.
// `pulse-440.wav` plays A4 for 1.2s then rests 1.8s, so every run covers both.
//
// WHAT THIS DOES NOT TEST: the real speaker→air→mic path — its level, its comb filtering,
// its reverb tail. BLEED_TAIL (0.06s) is a guess about rooms that only a room can check.
// A human must run the tuner and the metronome together on a laptop with the speakers up
// and confirm the readout holds. That is the one check no harness here covers.

// The click at a tenth of DAC level still reads as a pitch to the detector (measured:
// 0.1 → dead on, 0.05 → under the clarity gate). 0.25 is a loud room, comfortably inside
// the range where the bug is real rather than a knife edge.
const BLEED_GAIN = 0.25;

// The click voices, which are the names the bug prints: G5 sub, C6 beat, G6 downbeat.
const CLICK_NOTES = ['G5', 'C6', 'G6'];

async function startTuner(page: import('@playwright/test').Page) {
  await page.goto('/metrotuner/?e2e');
  await page.getByTestId('mic-toggle').click();
  // wait for a lock on the fixture's first phrase before opening the room
  await expect(page.getByTestId('note')).toHaveText('A4', { timeout: 10_000 });
}

async function wireRoom(page: import('@playwright/test').Page, gain: number) {
  await page.evaluate((g) => {
    const w = window as any;
    const ctx: AudioContext = w.__mt.ctx;
    const analyser: AudioNode = w.__mt.mic;
    const node = ctx.createGain();
    node.gain.value = g;
    node.connect(analyser);      // the speaker, heard by the microphone
    w.__mt.bleed = node;         // ping() joins it from here on
  }, gain);
}

// Sample the RENDERED readout, not the internal reading: what the musician sees is the
// contract. '—' is the dash the tuner shows for silence.
async function watchReadout(page: import('@playwright/test').Page, ms: number) {
  return page.evaluate((dur) => new Promise<string[]>((done) => {
    const el = document.querySelector('[data-testid="note"]')!;
    const seen: string[] = [];
    const t = setInterval(() => seen.push((el.textContent || '').trim()), 40);
    setTimeout(() => { clearInterval(t); done(seen); }, dur);
  }), ms);
}

test('the metronome never prints its own click as a note', async ({ page }) => {
  await startTuner(page);
  await wireRoom(page, BLEED_GAIN);
  await page.getByTestId('bpm').fill('92');
  await page.getByTestId('bpm').blur();
  await page.getByTestId('metro-toggle').click();

  // 6.5s covers two full phrases of the fixture — two played notes and two rests — so
  // both the masked case and the exposed one are in every run.
  const seen = await watchReadout(page, 6500);
  await page.getByTestId('metro-toggle').click();

  expect(seen.length).toBeGreaterThan(120);
  const clicks = seen.filter((s) => CLICK_NOTES.includes(s));
  expect(clicks, `the readout printed the metronome: ${[...new Set(clicks)].join(', ')}`)
    .toEqual([]);
  // Every sample must be either the note being played or the dash — nothing else.
  const junk = seen.filter((s) => s !== 'A4' && s !== '—');
  expect(junk, `unexpected readings: ${[...new Set(junk)].join(', ')}`).toEqual([]);

  // …and the gate must have actually fired. A green from a room that was never wired is
  // the false pass this assertion exists to catch.
  const gated = await page.evaluate(() => (window as any).__mt.gated);
  expect(gated, 'the gate never fired — is the bleed wired?').toBeGreaterThan(0);
});

test('subdivisions at speed do not blind the tuner', async ({ page }) => {
  // The case a TIME-ONLY gate would fail: at 200 bpm with 4 subdivisions a tick sounds
  // every 75ms, so click + tail + one analyser window covers the whole gap. A gate that
  // only asked "is a click sounding?" would drop every frame and the tuner would go
  // blind. The conjunction survives it because the played A4 is not a click frequency.
  await startTuner(page);
  await wireRoom(page, BLEED_GAIN);
  await page.getByTestId('bpm').fill('200');
  await page.getByTestId('bpm').blur();
  await page.locator('[data-sub="4"]').click();
  await page.getByTestId('metro-toggle').click();

  const seen = await watchReadout(page, 4000);
  await page.getByTestId('metro-toggle').click();

  // the fixture plays 1.2s in every 3.0s, so over 4s at least ~1 full phrase is audible
  expect(seen.filter((s) => s === 'A4').length,
    'the tuner went blind while the metronome ran').toBeGreaterThan(20);
  expect(seen.filter((s) => CLICK_NOTES.includes(s))).toEqual([]);
});

test('A/A: with no metronome the readout does not move on its own', async ({ page }) => {
  // The arm that must not move. If this drifts, the comparator above is reading noise
  // and its green means nothing.
  await startTuner(page);
  await wireRoom(page, BLEED_GAIN);   // the room is open; nothing plays into it

  const seen = await watchReadout(page, 6500);

  expect(seen.length).toBeGreaterThan(120);
  const junk = seen.filter((s) => s !== 'A4' && s !== '—');
  expect(junk, `readout moved with nothing playing: ${[...new Set(junk)].join(', ')}`)
    .toEqual([]);
  const gated = await page.evaluate(() => (window as any).__mt.gated);
  expect(gated, 'nothing sounded, so nothing should have been gated').toBe(0);
});
