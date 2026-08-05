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
    w.__smooth = { degs: [] as number[], sides: [] as string[] };
    const pend = document.getElementById('mt-pend')!;
    const tickL = document.getElementById('mt-tickL')!;
    const tickR = document.getElementById('mt-tickR')!;
    let lastSide = '';
    const sample = () => {
      const m = /rotate\((-?[\d.]+)deg\)/.exec(pend.getAttribute('style') || '');
      if (m) w.__smooth.degs.push(Number(m[1]));
      const l = Number(tickL.getAttribute('stroke-width')) > 0;
      const r = Number(tickR.getAttribute('stroke-width')) > 0;
      const side = l && r ? 'both' : l ? 'L' : r ? 'R' : '';
      // record flash ONSETS only — a flash lasts many frames
      if (side && side !== lastSide) w.__smooth.sides.push(side);
      if (side) lastSide = side; else lastSide = '';
      w.__smooth.raf = requestAnimationFrame(sample);
    };
    w.__smooth.raf = requestAnimationFrame(sample);
  });
}

async function readSampler(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const w = window as any;
    cancelAnimationFrame(w.__smooth.raf);
    return { degs: w.__smooth.degs as number[], sides: w.__smooth.sides as string[] };
  });
}

test('no double sounds: plain running, tap barrage, and the comeback', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
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
  await page.goto('/metrotuner/?e2e');
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

test('the strike flashes alternate sides — never the same end twice', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
  await page.getByTestId('bpm').fill('140');
  await page.getByTestId('bpm').blur();
  await page.getByTestId('metro-toggle').click();
  await startSampler(page);
  await page.waitForTimeout(3000);

  // mid-run tempo change — the old parity math glitched exactly here
  await page.getByTestId('bpm').fill('96');
  await page.getByTestId('bpm').blur();
  await page.waitForTimeout(2500);

  const { sides } = await readSampler(page);
  await page.getByTestId('metro-toggle').click();

  expect(sides.length).toBeGreaterThan(5);
  for (const s of sides) expect(s).not.toBe('both');
  for (let i = 1; i < sides.length; i++) {
    expect(`${sides[i - 1]}→${sides[i]}`).not.toMatch(/^(L→L|R→R)$/);
  }
});

test('the sweep is continuous — no between-frame tears', async ({ page }) => {
  await page.goto('/metrotuner/?e2e');
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
  // At 150bpm one full sweep (108°) takes 400ms ≈ 24 frames — so >30°/frame is
  // not motion, it's a tear. The one sanctioned jump is a tap's strike (the
  // hand re-anchors the phase), so allow isolated jumps but never two in a row:
  // a tear from bad math persists; a strike is one frame.
  let prevJump = false;
  for (let i = 1; i < degs.length; i++) {
    const d = Math.abs(degs[i] - degs[i - 1]);
    const jump = d > 40;
    expect(jump && prevJump).toBe(false);
    prevJump = jump;
  }
});
