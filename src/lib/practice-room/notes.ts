// Frequency ↔ note math. Pure functions, no audio, no DOM — this is the module the
// tuner's correctness rests on, so everything here is unit-tested in isolation.
//
// The A4 calibration is a parameter everywhere rather than module state: the tuner,
// the tone generator and the tests all pass the same number in, so there is no copy
// of "what is A" that can drift.

// ── NAMING LIVES IN ITS OWN MODULE ────────────────────────────────────────────────
// `NOTE_NAMES` was declared here and read by the tuner, the pitch graph and the drone, which
// made this file the de-facto owner of two unrelated jobs: frequency↔MIDI arithmetic, and how a
// pitch is SPELLED. Spelling turned out to need real music theory (an interval's letter depends
// on the root — a minor third above E♭ is G♭, not F♯), so it moved to `naming.ts` and is
// re-exported here. One place decides a note's name; this file keeps the maths.
// (User call, 2026-08-07: "make some kind of centralized naming module and use it everywhere
// like in the tuner".)
export { NOTE_NAMES, nameOf, pitchClassOf, nameInChord, chordNames, octaveOf } from './naming';
import { NOTE_NAMES as NAMES } from './naming';

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
    // THE NAME COMES FROM `naming.ts`, so the tuner, the graph and the drone cannot disagree
    // about what a pitch is called. A reading has no chord context — it is one pitch heard on
    // its own — so it takes the context-free spelling.
    name: NAMES[((midi % 12) + 12) % 12],
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
