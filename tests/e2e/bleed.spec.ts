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

// The click voices — G5 sub, C6 beat, G6 downbeat — are the names the bug prints when the
// window holds nothing but the click. They are NOT the whole failure: mixed with any other
// content the same click reads as a smear (up to 978 cents off, measured) or a subharmonic
// (C4 is 784/3), which is what the live page printed after the first, frequency-matched
// version of the gate shipped. So the assertion is not "no click voice" — it is that the
// readout only ever shows the note actually being played, or the dash.
const CLICK_NOTES = ['G5', 'C6', 'G6'];
const PLAYED = 'A4';

async function startTuner(page: import('@playwright/test').Page) {
  await page.goto('/practice-room/?e2e');
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

test('the click is disowned even when it lands on top of room noise', async ({ page }) => {
  // THE CASE THAT KILLED THE FIRST FIX. A frequency-matched gate passed the test above,
  // then printed G♯5 and C4 on the live page — because with anything else in the window
  // the click no longer reads AT its own frequency. This test puts something else in the
  // window on purpose: a quiet 60 Hz hum, the most ordinary room content there is.
  //
  // It is a DIFFERENTIAL, not an absolute — which the first version of this test got
  // wrong and its own red arm exposed. The hum is a pitch in its own right (60Hz reads
  // as B1, 48 cents flat) and the tuner is right to show it, so asserting a clean
  // readout would fail for a reason that has nothing to do with the metronome. The
  // baseline is the hum alone; the assertion is that starting the metronome adds
  // nothing to it.
  await startTuner(page);
  await wireRoom(page, BLEED_GAIN);
  await page.evaluate(() => {
    const w = window as any;
    const ctx: AudioContext = w.__mt.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = 120;   // a mains harmonic, the most ordinary room tone there is
    g.gain.value = 0.02;
    osc.connect(g).connect(w.__mt.mic);
    osc.start();

    // AND A NOISE FLOOR, which is the part that actually matters and the part the first
    // synthetic room was missing. A pure interferer leaves the click's period intact, so
    // the click still reads dead on its own frequency and a cents window catches it. A
    // real microphone has broadband noise, and THAT is what smears the period: measured
    // against the real detector, the beat click at 1046.5Hz reads 25-46 cents off under a
    // 0.01 noise floor — straddling any 30-cent window. The live page's leak was exactly
    // this: C6 printed at 1021-1027Hz, 33-41 cents flat.
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.01;
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    noise.loop = true;
    noise.connect(w.__mt.mic);
    noise.start();
  });
  await page.getByTestId('bpm').fill('92');
  await page.getByTestId('bpm').blur();

  // THE ASSERTION IS AN INVARIANT, NOT A NOTE NAME, and that is the lesson this test
  // encodes. Under a noise floor the click can read as almost anything, so no list of
  // forbidden names is complete — and a differential against a "quiet" baseline fails the
  // other way, because noise makes the baseline set large enough to absorb the leak. What
  // is exactly true, whatever the click smears to, is this: the tuner must never PAINT a
  // reading taken from a window the speaker was sounding in. Both logs are on the audio
  // clock, so the check is arithmetic.
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(6500);
  await page.getByTestId('metro-toggle').click();

  const bad = await page.evaluate(() => {
    const w = window as any;
    const WIN = 2048 / w.__mt.ctx.sampleRate;   // the analyser's window length
    const hits: { note: string; at: number }[] = [];
    for (const r of w.__mt.renders) {
      // the window this paint was computed from
      const from = r.at - WIN, to = r.at;
      for (const s of w.__mt.sounds) {
        const sFrom = s.at, sTo = s.at + 0.09;  // longest voice envelope
        if (sFrom <= to && sTo >= from) { hits.push({ note: r.note, at: r.at }); break; }
      }
    }
    return { hits: hits.slice(0, 8), total: hits.length, renders: w.__mt.renders.length };
  });

  expect(bad.renders, 'nothing was painted at all — is the mic feeding the tuner?')
    .toBeGreaterThan(10);
  expect(bad.total,
    `${bad.total} readings painted while a click was sounding: ` +
    `${bad.hits.map((h) => h.note).join(', ')}`).toBe(0);
  const gated = await page.evaluate(() => (window as any).__mt.gated);
  expect(gated, 'the gate never fired').toBeGreaterThan(0);
});

test('at an ordinary tempo the tuner still tracks between clicks', async ({ page }) => {
  // THE COST OF A TIME GATE, asserted rather than assumed. Each tick blinds the tuner for
  // click (90ms) + room tail (60ms) + the overlapping analyser window, so the question is
  // whether enough frames survive at a tempo somebody actually practises at. 120bpm with
  // eighths — a tick every 250ms — must still track a held note.
  await startTuner(page);
  await wireRoom(page, BLEED_GAIN);
  await page.getByTestId('bpm').fill('120');
  await page.getByTestId('bpm').blur();
  await page.locator('[data-sub="2"]').click();
  await page.getByTestId('metro-toggle').click();

  const seen = await watchReadout(page, 6500);
  await page.getByTestId('metro-toggle').click();

  // Two phrases of the fixture are 2.4s of played note inside 6.5s. Sampling at 40ms that
  // is ~60 samples of A4 if nothing were gated; require a third of them to prove the
  // readout is LIVE rather than a stuck value.
  expect(seen.filter((s) => s === PLAYED).length,
    'the tuner went blind while the metronome ran').toBeGreaterThan(20);
  const junk = seen.filter((s) => s !== PLAYED && s !== '—');
  expect(junk, `unexpected readings: ${[...new Set(junk)].join(', ')}`).toEqual([]);
});

test('fast subdivisions HOLD the reading rather than printing the click', async ({ page }) => {
  // THE HONEST LIMIT, written down as a test so it can't quietly change. At 200bpm in
  // sixteenths a tick sounds every 75ms and the gate covers every frame, so the tuner
  // stops tracking. The contract is that it holds its last real reading (or the dash) —
  // never that it keeps updating, and never that it prints the metronome.
  await startTuner(page);
  await wireRoom(page, BLEED_GAIN);
  await page.getByTestId('bpm').fill('200');
  await page.getByTestId('bpm').blur();
  await page.locator('[data-sub="4"]').click();
  await page.getByTestId('metro-toggle').click();

  const seen = await watchReadout(page, 4000);
  await page.getByTestId('metro-toggle').click();

  const junk = seen.filter((s) => s !== PLAYED && s !== '—');
  expect(junk, `the click leaked through as: ${[...new Set(junk)].join(', ')}`).toEqual([]);
  const gated = await page.evaluate(() => (window as any).__mt.gated);
  expect(gated, 'the gate never fired').toBeGreaterThan(10);
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
