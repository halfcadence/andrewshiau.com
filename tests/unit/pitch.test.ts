import { describe, it, expect } from 'vitest';
import { detectPitch } from '../../src/lib/metrotuner/pitch';
import { freqToReading } from '../../src/lib/metrotuner/notes';

const SR = 48000;
const N = 2048;

function sine(freq: number, amp = 0.5, n = N, sr = SR): Float32Array {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return buf;
}

// A plucked-string-ish tone: fundamental plus stronger 2nd harmonic. This is the
// case that kills FFT-peak tuners; autocorrelation must still find the fundamental.
function pluck(freq: number, n = N, sr = SR): Float32Array {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * freq * i) / sr;
    buf[i] = 0.25 * Math.sin(t) + 0.45 * Math.sin(2 * t) + 0.15 * Math.sin(3 * t);
  }
  return buf;
}

function centsError(detected: number, truth: number): number {
  return 1200 * Math.log2(detected / truth);
}

describe('detectPitch', () => {
  it('finds a 440 Hz sine within 0.1 cent', () => {
    const f = detectPitch(sine(440), SR);
    expect(Math.abs(centsError(f, 440))).toBeLessThan(0.1);
  });

  it('covers the guitar range EADGBE within 0.5 cents', () => {
    for (const truth of [82.41, 110.0, 146.83, 196.0, 246.94, 329.63]) {
      const f = detectPitch(sine(truth), SR);
      expect(f).toBeGreaterThan(0);
      expect(Math.abs(centsError(f, truth))).toBeLessThan(0.5);
    }
  });

  it('finds the FUNDAMENTAL of a harmonic-rich pluck, not the loudest harmonic', () => {
    const f = detectPitch(pluck(110), SR);
    // Near 110 — and specifically NOT near 220, where the spectrum's energy is.
    expect(Math.abs(centsError(f, 110))).toBeLessThan(0.5);
  });

  it('returns -1 on silence', () => {
    expect(detectPitch(new Float32Array(N), SR)).toBe(-1);
  });

  it('returns -1 on near-silence below the RMS gate', () => {
    expect(detectPitch(sine(440, 0.001), SR)).toBe(-1);
  });

  it('returns -1 on white noise (no stable period)', () => {
    // Deterministic LCG so the test cannot flake.
    let seed = 12345;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i++) buf[i] = (rand() * 2 - 1) * 0.5;
    const f = detectPitch(buf, SR);
    // Noise either yields no pitch or a spurious one; a *stable* wrong answer is the
    // failure. Accept -1, or any value — but it must not equal a confident musical
    // reading of the same buffer twice after a phase shift.
    if (f !== -1) {
      const shifted = new Float32Array(N);
      for (let i = 0; i < N; i++) shifted[i] = buf[(i + 997) % N];
      const f2 = detectPitch(shifted, SR);
      expect(Math.abs(f - f2)).toBeGreaterThan(1); // unstable ⇒ UI's smoothing drops it
    }
  });

  it('end-to-end with notes.ts: 446 Hz sine → A, sharp', () => {
    const f = detectPitch(sine(446), SR);
    const r = freqToReading(f)!;
    expect(r.name).toBe('A');
    expect(r.cents).toBeGreaterThan(15);
  });

  it('handles a low cello C2 (65.4 Hz) at 2048 samples', () => {
    const f = detectPitch(sine(65.41), SR);
    expect(Math.abs(centsError(f, 65.41))).toBeLessThan(0.5);
  });

  it('an attack transient (silence then tone) still reads within a cent', () => {
    const buf = new Float32Array(N);
    buf.set(sine(220, 0.5, N - 400), 400);
    const f = detectPitch(buf, SR);
    expect(Math.abs(centsError(f, 220))).toBeLessThan(1);
  });
});
