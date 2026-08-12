import { test, expect } from '@playwright/test';

// ── THIS SPEC'S APP HAS ITS OWN ROUTE (2026-08-12). The hash deep link this file used for an hour
// is gone with the scroller: every thing in the room is a standalone page now. Every `page.goto`
// here therefore names the route. It is not a test affordance — it is the app's address — but it is
// what makes real-pointer assertions possible: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case on another page the press landed on nothing and the ring's overshoot read as 1.
// (was: '#metronome` is how anyone links to this app — but it is what
// makes real-pointer assertions possible again: `page.mouse.move()` takes VIEWPORT coordinates, so
// with the case off-screen the press landed on nothing and the ring's overshoot read as 1.

// The metronome's e2e truth is the ?e2e hook: the page records every scheduled
// tick with its audio-clock time and voice. DOM polling can't see 10 ms of
// scheduling jitter; the tick log can.

test('ticks land on the audio-clock grid at the set tempo', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  await page.getByTestId('bpm').fill('120');
  await page.getByTestId('bpm').blur();
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(3000);
  await page.getByTestId('metro-toggle').click();

  const ticks: Array<{ time: number; voice: string; n: number }> =
    await page.evaluate(() => (window as any).__mt.ticks);

  // 3 s at 120 bpm ≈ 6 quarters (plus the lookahead's head start).
  expect(ticks.length).toBeGreaterThanOrEqual(5);

  // Spacing: every gap is 0.5 s on the AUDIO clock, exact to the float — the
  // scheduler computes times, it doesn't accumulate them.
  for (let i = 1; i < ticks.length; i++) {
    expect(ticks[i].time - ticks[i - 1].time).toBeCloseTo(0.5, 3);
  }
  // No duplicates, strictly ordered.
  const ns = ticks.map((t) => t.n);
  expect(new Set(ns).size).toBe(ns.length);
});

test('4/4 with eighths: voices cycle down/sub/beat/sub…', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  await page.getByTestId('bpm').fill('160');
  await page.getByTestId('bpm').blur();
  await page.locator('#mt-sub-seg button[data-sub="2"]').click();
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(3200);
  await page.getByTestId('metro-toggle').click();

  const ticks: Array<{ voice: string; n: number }> =
    await page.evaluate(() => (window as any).__mt.ticks);
  expect(ticks.length).toBeGreaterThanOrEqual(8);

  // 4 beats × 2 subdivisions = 8 ticks per bar: down at 0, beat at even, sub at odd.
  for (const t of ticks) {
    const pos = t.n % 8;
    const want = pos === 0 ? 'down' : pos % 2 === 0 ? 'beat' : 'sub';
    expect(t.voice).toBe(want);
  }
});

test('tap tempo sets the bpm field', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  const tap = page.getByTestId('tap');
  // Four taps ~500 ms apart → ~120 bpm. Wall-clock taps carry jitter, so the
  // assertion is a band, not a value.
  for (let i = 0; i < 4; i++) {
    await tap.click();
    if (i < 3) await page.waitForTimeout(500);
  }
  const bpm = Number(await page.getByTestId('bpm').inputValue());
  expect(bpm).toBeGreaterThan(100);
  expect(bpm).toBeLessThan(140);
});

test('the pendulum swings while running and parks when stopped', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(900);
  // Running: the rotation changes between frames (the swing is rAF-driven).
  const r1 = await page.locator('#mt-pend').getAttribute('style');
  await page.waitForTimeout(200);
  const r2 = await page.locator('#mt-pend').getAttribute('style');
  expect(r1).not.toBe(r2);
  await expect(page.locator('#mt-pend')).toHaveClass(/live/);

  await page.getByTestId('metro-toggle').click();
  // The sweep under way FINISHES into an end (nit 1) — allow up to a full beat at
  // 120bpm plus slack, then assert it rests at ±54°, not mid-air and not centre.
  await page.waitForTimeout(900);
  const parked = await page.locator('#mt-pend').getAttribute('style');
  expect(parked).toMatch(/rotate\((-?54|54)deg\)/);
  await expect(page.locator('#mt-pend')).toHaveClass(/rest/);
});

test('idle, the pendulum rests at the left end — not centre', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  const style = await page.locator('#mt-pend').getAttribute('style');
  expect(style).toContain('rotate(-54deg)');
});

test('settings persist across a reload', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  await page.getByTestId('bpm').fill('144');
  await page.getByTestId('bpm').blur();
  await page.locator('#mt-beats-seg button[data-beats="5"]').click();
  await page.reload();
  await expect(page.getByTestId('bpm')).toHaveValue('144');
  await expect(page.locator('#mt-beats-seg button[data-beats="5"]')).toHaveAttribute('aria-pressed', 'true');
});

test('tapping while running takes over, then returns on the downbeat', async ({ page }) => {
  await page.goto('/practice-room/console/?e2e');
  await page.getByTestId('bpm').fill('120');
  await page.getByTestId('bpm').blur();
  await page.getByTestId('metro-toggle').click();
  await page.waitForTimeout(1200);
  // tap ~150 bpm over the running click — the scheduler yields to the hand.
  // NO wait after the final tap: the comeback lands one tapped interval
  // (~400ms) after it, and the snapshot below must beat it.
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('tap').dispatchEvent('pointerdown');
    if (i < 3) await page.waitForTimeout(400);
  }
  // snapshot NOW: everything logged after this point is the comeback.
  const ticksDuring: number = await page.evaluate(() => (window as any).__mt.ticks.length);
  // during the takeover the transport still reads as running (stop works)
  await expect(page.getByTestId('metro-toggle')).toHaveAttribute('aria-pressed', 'true');

  // one tapped interval after the last tap it COMES BACK, at the tapped tempo,
  // and the comeback tick is the downbeat — the bar re-anchors to the hand.
  await page.waitForTimeout(1500);
  const bpm = Number(await page.getByTestId('bpm').inputValue());
  expect(bpm).toBeGreaterThan(130);
  expect(bpm).toBeLessThan(170);
  const after: Array<{ time: number; voice: string }> = await page.evaluate(
    (n) => (window as any).__mt.ticks.slice(n), ticksDuring);
  expect(after.length).toBeGreaterThanOrEqual(2); // it did come back on its own
  expect(after[0].voice).toBe('down');            // ...and on the downbeat
  await page.getByTestId('metro-toggle').click();

  // the whole log stays monotonic — takeover and comeback never overlapped
  const ticks: Array<{ time: number }> =
    await page.evaluate(() => (window as any).__mt.ticks);
  for (let i = 1; i < ticks.length; i++) {
    expect(ticks[i].time).toBeGreaterThan(ticks[i - 1].time);
  }
});
