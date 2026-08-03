import { describe, it, expect } from 'vitest';
import { createTapTempo } from '../../src/lib/metrotuner/tap';

describe('tap tempo', () => {
  it('needs two taps before it says anything', () => {
    const t = createTapTempo();
    expect(t.tap(0)).toBeNull();
    expect(t.tap(500)).toBe(120);
  });

  it('averages a steady 100 bpm tap', () => {
    const t = createTapTempo();
    let out: number | null = null;
    for (let i = 0; i < 5; i++) out = t.tap(i * 600);
    expect(out).toBe(100);
  });

  it('averages out jitter', () => {
    const t = createTapTempo();
    const times = [0, 510, 990, 1505, 2000]; // ~120bpm with human wobble
    let out: number | null = null;
    for (const ms of times) out = t.tap(ms);
    expect(out).toBe(120);
  });

  it('a long pause starts a new phrase instead of averaging the silence', () => {
    const t = createTapTempo(2000);
    t.tap(0); t.tap(500);
    // 10s pause — a naive average would read ~17bpm on the next tap.
    expect(t.tap(10500)).toBeNull();      // first tap of the new phrase
    expect(t.tap(10800)).toBe(200);       // 300ms interval, clean
  });

  it('only the recent window counts, so a tempo drift converges', () => {
    const t = createTapTempo();
    let ms = 0;
    for (let i = 0; i < 8; i++) { t.tap(ms); ms += 1000; } // 60bpm for a while
    let out: number | null = null;
    for (let i = 0; i < 6; i++) { out = t.tap(ms); ms += 500; } // then 120
    expect(out).toBeGreaterThan(110);
  });

  it('reset clears the phrase', () => {
    const t = createTapTempo();
    t.tap(0); t.tap(500);
    t.reset();
    expect(t.tap(1000)).toBeNull();
  });
});
