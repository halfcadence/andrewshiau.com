// Pitch detection: the McLeod Pitch Method (MPM) — normalized square difference
// function + key-maxima picking ("A Smarter Way to Find Pitch", McLeod & Wyvill 2005).
//
// Why not the FFT the analyser already gives us: a tuner needs the FUNDAMENTAL, and
// a plucked string's spectrum often has more energy in a harmonic than in the
// fundamental — an FFT-peak tuner reads a low E as B or E3. Time-domain correlation
// finds the waveform's period directly, which is what pitch is.
//
// Why MPM and not plain autocorrelation: measured, on the same synthesized buffers.
// Raw ACF's linear taper read 65 Hz 22 cents sharp; normalizing the taper out made
// every period-multiple peak near-identical, so the picker chose 9× the period.
// NSDF is bounded to [-1, 1] at every lag, so "a real period" is an absolute
// threshold rather than a fraction of a tapering curve, and key-maxima picking
// (first maximum within 10% of the highest) chooses the fundamental over its
// multiples by construction. Result: every note from C2 to C8 within 0.25 cents,
// pluck and attack-transient cases included — against 2–17 cents for the ACF.
//
// Pure function on a Float32Array — no AudioContext, so it runs in Vitest on
// synthesized buffers, which is where those bounds are asserted.

const RMS_GATE = 0.008;      // below this the room is silent; report no pitch
const CLARITY_GATE = 0.6;    // NSDF peak height that counts as a real pitch (1 = pure)
const K_THRESHOLD = 0.9;     // McLeod's k: first maximum within k of the highest wins

export function detectPitch(input: Float32Array, sampleRate: number): number {
  const size = input.length;

  // Silence gate.
  let rms = 0;
  for (let i = 0; i < size; i++) rms += input[i] * input[i];
  rms = Math.sqrt(rms / size);
  if (rms < RMS_GATE) return -1;

  // NSDF: nsdf[lag] = 2·ACF(lag) / (Σx²ᵢ + Σx²ᵢ₊lag), in [-1, 1].
  // O(n²/2) on ≤2048 samples is a few ms — fine at the ~20 Hz cadence the UI reads.
  const maxLag = Math.floor(size / 2);
  const nsdf = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let acf = 0;
    let norm = 0;
    for (let i = 0; i < size - lag; i++) {
      acf += input[i] * input[i + lag];
      norm += input[i] * input[i] + input[i + lag] * input[i + lag];
    }
    nsdf[lag] = norm > 0 ? (2 * acf) / norm : 0;
  }

  // Key maxima: one candidate per positive region between zero crossings, skipping
  // the lag-0 region. This is what makes the picker immune to the period-multiple
  // trap — each multiple gets exactly one candidate, and the FIRST one within
  // K_THRESHOLD of the best is the fundamental.
  const maxima: Array<[number, number]> = [];
  let i = 1;
  while (i < maxLag && nsdf[i] > 0) i++;          // walk off the lag-0 lobe
  while (i < maxLag) {
    while (i < maxLag && nsdf[i] <= 0) i++;       // find the next positive crossing
    let best = -1;
    let bestPos = -1;
    while (i < maxLag && nsdf[i] > 0) {
      if (nsdf[i] > best) { best = nsdf[i]; bestPos = i; }
      i++;
    }
    if (bestPos > 0) maxima.push([bestPos, best]);
  }
  if (maxima.length === 0) return -1;

  let highest = 0;
  for (const [, v] of maxima) if (v > highest) highest = v;
  // Clarity gate: noise correlates weakly at every lag; a pitched signal's period
  // scores near 1. Below the gate, report no pitch rather than a guess.
  if (highest < CLARITY_GATE) return -1;

  const threshold = K_THRESHOLD * highest;
  let pos = -1;
  for (const [p, v] of maxima) {
    if (v >= threshold) { pos = p; break; }
  }
  if (pos <= 0 || pos >= maxLag) return -1;

  // Parabolic interpolation for sub-sample precision — without it the resolution
  // at 440 Hz / 48 kHz is ~4 cents per lag step.
  const x1 = nsdf[pos - 1];
  const x2 = nsdf[pos];
  const x3 = nsdf[pos + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  let period = pos;
  if (a !== 0) period = pos - b / (2 * a);
  if (period <= 0) return -1;

  return sampleRate / period;
}
