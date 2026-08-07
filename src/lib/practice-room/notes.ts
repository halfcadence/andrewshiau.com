// Frequency ↔ note math. Pure functions, no audio, no DOM — this is the module the
// tuner's correctness rests on, so everything here is unit-tested in isolation.
//
// The A4 calibration is a parameter everywhere rather than module state: the tuner,
// the tone generator and the tests all pass the same number in, so there is no copy
// of "what is A" that can drift.

// ── THE FIVE BLACK KEYS, SPELLED THE WAY MUSICIANS MEET THEM ─────────────────────
// User call, 2026-08-07: "can u also assume flats/sharps for the more common one? like assume
// eb over d# since its more common in key sigs."
//
// Every one of the five has two names for the same pitch, and the choice is not arbitrary —
// it follows which key signatures actually occur. Counting the standard keys, flats outnumber
// sharps for three of the five and sharps win the other two:
//
//   C♯/D♭ → C♯   (D♭ major has 5 flats; C♯ appears in D, A, E, B major — far commoner)
//   D♯/E♭ → E♭   (E♭ major, B♭ major, C minor, G minor … D♯ needs 6+ sharps)
//   F♯/G♭ → F♯   (G major onward; G♭ major has 6 flats)
//   G♯/A♭ → A♭   (A♭ major, E♭ major, F minor, C minor … G♯ needs 5+ sharps)
//   A♯/B♭ → B♭   (B♭ major, F major, G minor, D minor — the commonest black key of all)
//
// So: C♯ and F♯ stay sharp, and D♯/G♯/A♯ become E♭/A♭/B♭. That is the spelling on a wind
// player's fingering chart and in every string method book, which is the test that matters —
// this drone is for practising against, and a player should not have to translate.
//
// A NOTE ON WHAT THIS IS NOT: correct spelling depends on the KEY, and the instrument has no
// key. B♭ in D major should read A♯. Offering a key selector to fix that would add a mode to
// an instrument that has deliberately avoided them, so this picks the likelier name for each
// pitch and accepts being wrong in sharp keys. The pitch is identical either way; only the
// label moves.
export const NOTE_NAMES = [
  'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B',
] as const;

export const A4_MIN = 400;
export const A4_MAX = 480;
export const A4_DEFAULT = 440;

export interface Reading {
  midi: number;    // nearest MIDI note number (A4 = 69)
  name: string;    // e.g. 'A'
  octave: number;  // scientific pitch: A4 = 4
  cents: number;   // signed offset from the nearest note, -50..+50 (sharp is positive)
  freq: number;    // the input frequency, passed through for display
}

export function freqToMidi(freq: number, a4: number = A4_DEFAULT): number {
  return 69 + 12 * Math.log2(freq / a4);
}

export function midiToFreq(midi: number, a4: number = A4_DEFAULT): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

// Null for anything that isn't a positive finite frequency — the pitch detector
// returns -1 for "no pitch", and that must not render as a note.
export function freqToReading(freq: number, a4: number = A4_DEFAULT): Reading | null {
  if (!Number.isFinite(freq) || freq <= 0) return null;
  const exact = freqToMidi(freq, a4);
  const midi = Math.round(exact);
  if (midi < 0 || midi > 127) return null;
  const cents = (exact - midi) * 100;
  return {
    midi,
    name: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    cents,
    freq,
  };
}

// The cents offset between a frequency and a specific target note — used by the
// direction tests (446 Hz against A4=440 must read sharp, not flat).
export function centsOff(freq: number, midi: number, a4: number = A4_DEFAULT): number {
  return (freqToMidi(freq, a4) - midi) * 100;
}
