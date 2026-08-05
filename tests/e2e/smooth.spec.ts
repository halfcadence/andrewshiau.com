import { test, expect } from '@playwright/test';

// THE SMOOTHNESS HARNESS. "Buttery" made measurable, via two instruments:
//
//  __mt.sounds — every sound the page schedules (ping() logs; cancelled
//    lookahead clicks are REMOVED). The double-tap bug is two sounds inside
//    one perceptual instant, so the assertion is a minimum spacing: no two
//    sounds within 60ms unless one is a subdivision voice.
//
//  A rotation sampler — reads the pendulum's transform every frame via rAF
//    inside the page. A tear is a between-frame jump bigger than the swing
//    could produce; a glitching strike flash is the same side firing twice
//    in a row. Both are asserted, not eyeballed.

const SOUND_GAP_MS = 60;

async function soundGaps(page: import('@playwright/test').Page) {
  const sounds: Array<{ at: number; voice: string }> = await page.evaluate(
    () => (window as any).__mt.sounds);
  const beats = sounds.filter((s) => s.voice !== 'sub').sort((a, b) => a.at - b.at);
  const gaps: number[] = [];
  for (let i = 1; i < beats.length; i++) gaps.push((beats[i].at - beats[i - 1].at) * 1000);
  return { beats, gaps };
}

function startSampler(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const w = window as any;
    w.__smooth = { degs: [] as number[], ends: [] as string[] };
    const pend = document.getElementById('mt-pend')!;
    // THE END TICKS ARE GONE (2026-08-05), so the sampler reads the ARM's own reversals
    // instead of two flashing marks. This mattered more than swapping one assertion: the
    // old sampler took `document.getElementById('mt-tickL')!` and threw on the first
    // frame once the element was deleted, which starved the SWEEP test of samples — it
    // failed with 1 deg instead of 60 and read like a sweep regression rather than a
    // harness break. An end is recorded when the arm turns round: the sign of its travel
    // flips. Same alternation contract, one element.
    // A REVERSAL MUST HAPPEN AT AN END, and that qualifier is the whole test. Counting
    // sign changes alone scores a TELEPORT as a reversal: an arm that runs −54→+54 then
    // snaps back to −54 changes sign at the snap, so a naive detector logs a flawless
    // R,L,R,L… and the assertion passes on an arm that never swings back. Proven with a
    // sabotage that pins sweepDir — it produced exactly that teleport and 12 clean
    // alternating "ends". So a reversal counts only if the arm was NEAR the end it turned
    // at (|deg| within 6° of the 54° extreme); a mid-arc jump is not an end, it is a tear,
    // and the sweep-continuity test owns it.
    const SWEEP = 54, NEAR = 6;
    let prev: number | null = null;
    let dir = 0;
    const sample = () => {
      const m = /rotate\((-?[\d.]+)deg\)/.exec(pend.getAttribute('style') || '');
      if (m) {
        const deg = Number(m[1]);
        w.__smooth.degs.push(deg);
        if (prev !== null && deg !== prev) {
          const d = Math.sign(deg - prev);
          if (dir !== 0 && d !== 0 && d !== dir && Math.abs(Math.abs(prev) - SWEEP) <= NEAR) {
            w.__smooth.ends.push(prev > 0 ? 'R' : 'L');
          }
          if (d !== 0) dir = d;
        }
        prev = deg;
      }
      w.__smooth.raf = requestAnimationFrame(sample);
    };
    w.__smooth.raf = requestAnimationFrame(sample);
  });
}

async function readSampler(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__smooth.raf);
    return { degs: w.__smooth.degs as number[], ends: w.__smooth.ends as string[] };
  });
}

test('no double sounds: plain running, tap barrage, and the comeback', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await page.getByTestId('bpm').fill('120');
  await page.getByTestId('bpm').blur();
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(1500);

  // the barrage: 6 taps at ~140 bpm over the running click
  for (let i = 0; i < 6; i++) {
    await page.getByTestId('tap').dispatchEvent('pointerdown');
    if (i < 5) await page.waitForTimeout(428);
  }
  // let the comeback land and run a bar
  await page.waitForTimeout(2200);
  await page.getByTestId('metro-toggle').click();

  const { beats, gaps } = await soundGaps(page);
  expect(beats.length).toBeGreaterThan(8);
  for (const g of gaps) expect(g).toBeGreaterThan(SOUND_GAP_MS);
});

test('rapid re-tapping never stacks sounds or timers', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(900);
  // hammer: 10 taps at 150ms (a nervous hand, faster than any real tempo set)
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('tap').dispatchEvent('pointerdown');
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(2500); // one comeback only
  await page.getByTestId('metro-toggle').click();

  const { gaps } = await soundGaps(page);
  for (const g of gaps) expect(g).toBeGreaterThan(SOUND_GAP_MS);
});

test('the arm alternates ends — never the same end twice', async ({ page }) => {
  // The end ticks that used to carry this assertion are deleted; the ARM's reversals carry
  // it now. The property under test is unchanged and is the one the sweep-parity bug broke:
  // a pendulum that hits the same end twice in a row is not swinging, and a mid-run tempo
  // change is exactly where the old clock-derived parity produced it.
  await page.goto('/practice-room/?e2e');
  await page.getByTestId('bpm').fill('140');
  await page.getByTestId('bpm').blur();
  await page.getByTestId('metro-toggle').click();
  await startSampler(page);
  await page.waitForTimeout(3000);

  // mid-run tempo change — the old parity math glitched exactly here
  await page.getByTestId('bpm').fill('96');
  await page.getByTestId('bpm').blur();
  await page.waitForTimeout(2500);

  const { ends } = await readSampler(page);
  await page.getByTestId('metro-toggle').click();

  expect(ends.length, 'the arm never reversed — is it swinging?').toBeGreaterThan(5);
  for (let i = 1; i < ends.length; i++) {
    expect(`${ends[i - 1]}→${ends[i]}`).not.toMatch(/^(L→L|R→R)$/);
  }
});

test('the sweep is continuous — no between-frame tears', async ({ page }) => {
  await page.goto('/practice-room/?e2e');
  await page.getByTestId('bpm').fill('120');
  await page.getByTestId('bpm').blur();
  await page.getByTestId('metro-toggle').click();
  await startSampler(page);
  await page.waitForTimeout(1500);

  // the worst case: a takeover starts (tap), runs, and hands back
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('tap').dispatchEvent('pointerdown');
    if (i < 3) await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1800);

  const { degs } = await readSampler(page);
  await page.getByTestId('metro-toggle').click();

  expect(degs.length).toBeGreaterThan(60);
  // At 150bpm one full sweep (108°) takes 400ms ≈ 24 frames — so >40°/frame is
  // not motion, it's a tear. NO exemptions since the parked takeover: taps no
  // longer strike the arm (it finishes its sweep and rests), and the comeback
  // relaunches from the parked end, so every frame-to-frame delta is bounded.
  for (let i = 1; i < degs.length; i++) {
    expect(Math.abs(degs[i] - degs[i - 1])).toBeLessThan(40);
  }
});
