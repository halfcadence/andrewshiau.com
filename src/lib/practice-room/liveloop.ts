// THE LOOPER'S ARITHMETIC: where the next bar line falls, how long a loop is, and how late
// the recording arrives.
//
// A live overdub looper fails in exactly one way — DRIFT. Lane B comes out a few frames
// longer than lane A, and after a dozen passes the strum sits ahead of the click. So every
// length here is an INTEGER number of frames, rounded ONCE, and a loop is a bar length
// MULTIPLIED by a bar count rather than a sum of per-bar rounds:
//
//     loopFrames(bpm, bars, sr) === barFrames(bpm, sr) * bars      // exact, by construction
//
// That identity is the whole point of the module. It is what lets a lane recorded in the
// second minute line up sample-for-sample with one recorded in the first, on any device
// clock, without a correction pass.
//
// Pure functions on numbers. No DOM, no Web Audio, no CSS — so the arithmetic is asserted in
// tests/unit/liveloop.test.ts rather than eyeballed. It has to be: 3 frames of error in
// 466,768 is invisible on a waveform at any zoom and plainly audible after ten passes.

/**
 * One song the looper knows: a chord cell, a tempo, and how many bars the cell spans.
 *
 * `bpm` vs `countedBpm` exists because a half-time song has two honest tempos. See the
 * SONGS block below for the one case where they differ and which one the loop length uses.
 */
export interface Song {
  /** stable id — the URL fragment, the picker's key, the test's handle */
  slug: string;
  /** the title as the record prints it */
  title: string;
  /** the FELT pulse in bpm — what your foot does. Measured; see SONGS. */
  bpm: number;
  /**
   * The pulse you'd COUNT the cell in. Equal to `bpm` except in half-time, where the felt
   * pulse is half the counted one. Loop length uses this — see the note in SONGS.
   */
  countedBpm: number;
  /** the chord cell, in order, one symbol per chord */
  cell: string[];
  /** how many bars of `countedBpm` the cell spans — the loop is exactly this long */
  bars: number;
  /** the key, with the evidence for it, because two of these are contested */
  keyNote: string;
  /** anything a player needs that the numbers above don't say */
  note?: string;
}

/**
 * All four songs are in 4/4, so this is the default rather than a per-song field. Exported so
 * the page, the tests and any future 3/4 tune share one constant instead of four literal 4s.
 */
export const BEATS_PER_BAR = 4;

/**
 * Frames in one bar, as an integer.
 *
 * ROUNDED ONCE, AT THE END. Rounding per beat and summing puts up to 0.5 frames of error into
 * every beat — 2 frames a bar, 8 in a 4-bar loop — and because `Math.round` of a fixed
 * fractional part errs the SAME direction every time, that error accumulates instead of
 * cancelling. One multiply then one round caps the total error at half a frame per bar,
 * which is 11 µs at 44.1 kHz and cannot accumulate at all: every bar of a given tempo gets
 * the identical integer.
 *
 * Floored at 1 frame: a zero-length bar makes `nextBarBoundary` divide by zero and spin.
 */
export function barFrames(bpm: number, sampleRate: number, beatsPerBar: number = BEATS_PER_BAR): number {
  return Math.max(1, Math.round((60 / bpm) * beatsPerBar * sampleRate));
}

/**
 * Frames in a whole loop — `barFrames * bars`, and nothing else.
 *
 * NOT `Math.round(loopSeconds * sampleRate)`, which would be a second independent rounding
 * and could land one frame off `barFrames * bars`. One frame is enough: the lane that
 * recorded its length from the bar grid and the lane that recorded it from the loop grid
 * would disagree, and disagreement is drift with extra steps.
 *
 * `bars` is a count; a fractional one is a caller bug, rounded here so the integer promise
 * in the return type still holds for it.
 */
export function loopFrames(bpm: number, bars: number, sampleRate: number, beatsPerBar: number = BEATS_PER_BAR): number {
  const n = Math.max(1, Math.round(bars));
  return barFrames(bpm, sampleRate, beatsPerBar) * n;
}

/**
 * Loop length in seconds — the IDEAL, in floating point, for display and for the FX ceiling.
 *
 * Deliberately not `loopFrames / sampleRate`: that is this number rounded to a particular
 * device clock, and it differs by under half a frame per bar (≤11 µs at 44.1 kHz). Scheduling
 * uses frames; anything a human reads uses this, so the printed figure doesn't change when
 * the same page is opened on a 48 kHz interface.
 */
export function loopSeconds(bpm: number, bars: number, beatsPerBar: number = BEATS_PER_BAR): number {
  return (60 / bpm) * beatsPerBar * bars;
}

/**
 * The frame of the next bar line AT OR AFTER `frame`, on the grid anchored at `originFrame`.
 *
 * "At or after" is load-bearing: a press that lands exactly on a boundary must return that
 * boundary, not the next one. A `Math.floor(...)+1` formulation skips a whole bar in that
 * case, which reads to the player as the looper ignoring a dead-on punch — the one press they
 * are certain they got right.
 *
 * Works for `frame` before `originFrame` too: the grid extends backwards, so a press 1.5 bars
 * early quantises to one bar before the origin rather than clamping to it.
 */
export function nextBarBoundary(
  frame: number,
  originFrame: number,
  bpm: number,
  sampleRate: number,
  beatsPerBar: number = BEATS_PER_BAR,
): number {
  const bf = barFrames(bpm, sampleRate, beatsPerBar);
  const barsAhead = Math.ceil((frame - originFrame) / bf);
  return originFrame + barsAhead * bf;
}

/**
 * WHAT A PUNCH ACTUALLY COMMITS: the player presses roughly, the loop lands exactly.
 *
 * The span starts on the next bar line and lasts exactly `loopFrames` — never "from the press
 * to the press", which is what makes a hand-timed loop unusable. The recorded head between
 * the press and the boundary is thrown away by the caller; the player hears a loop that
 * starts on the bar because the maths, not their thumb, decided where it starts.
 */
export function quantiseSpan(
  pressFrame: number,
  originFrame: number,
  bpm: number,
  bars: number,
  sampleRate: number,
  beatsPerBar: number = BEATS_PER_BAR,
): { startFrame: number; endFrame: number; frames: number } {
  const startFrame = nextBarBoundary(pressFrame, originFrame, bpm, sampleRate, beatsPerBar);
  const frames = loopFrames(bpm, bars, sampleRate, beatsPerBar);
  return { startFrame, endFrame: startFrame + frames, frames };
}

/**
 * Shift a committed start EARLIER by the measured round trip.
 *
 * Recorded audio arrives LATE: the sound left the string, went out through the speaker, came
 * back through the mic, and crossed both buffers before the frame index the input callback
 * reports. So the audio the player heard on the bar line sits `latencyFrames` further into the
 * buffer, and the start has to move back by exactly that much to undo it.
 *
 * CLAMPED AT 0, and the clamp is a real trade: on the very first bar there may be fewer than
 * `latencyFrames` of buffer behind the boundary, so that one lane keeps an uncompensated head
 * — a few ms of pre-roll — instead of reading before the start of the buffer, which is either
 * a crash or someone else's samples. Later punches never hit the clamp.
 */
export function compensate(startFrame: number, latencyFrames: number): number {
  return Math.max(0, startFrame - latencyFrames);
}

/**
 * The longest reverb/delay decay that still fits the loop: half the loop length.
 *
 * From the looper FX doctrine — keep decay under 50% of loop length, or the tail of pass N is
 * still sounding under pass N+1 and every repeat gets muddier by exactly the amount that
 * overlapped. At these tempos the rule is GENEROUS and worth stating so nobody tunes to it: a
 * 4-bar cell here is 9.66–12.45 s of loop, buying a 4.83–6.23 s ceiling against hall presets
 * that decay in 2–6 s. It only binds on a ONE-BAR loop — one bar of "Apocalypse" is 2.65 s,
 * ceiling 1.32 s, under every hall preset there is.
 */
export function reverbCeilingSeconds(loopSecs: number): number {
  return loopSecs / 2;
}

/* ══════════════════════════════════════════════════════════════════════════════════════
   THE SONGS — four Cigarettes After Sex tunes
   ══════════════════════════════════════════════════════════════════════════════════════
   THE TEMPOS ARE MEASURED, NOT LOOKED UP. Each `bpm` came out of librosa's beat tracker run
   over the 30-second catalog preview of that track — hence one decimal place, and hence
   90.7 rather than a tidy 90. Nothing here was copied off a tempo site, so a number that
   looks odd is a measurement to re-run, not a typo to tidy. Re-measuring is the only way to
   change one.

   THE CELLS ARE WEAKER EVIDENCE. They come from published fan transcriptions — no audio
   analysis behind them — which is why two `keyNote`s record a disagreement instead of a key.
   Tune to the record, not to this table.

   LOOP LENGTH USES `countedBpm` × `bars`, ALWAYS. It matters for exactly one song here.
   "Nothing's Gonna Hurt You Baby" is half-time: the felt pulse is 49.7, the count is 99.4,
   and the cell's four chords are four counted bars. Using the felt pulse with the same bar
   count would give a 19.3 s loop — double the audio the cell actually occupies — so the
   looper counts fast and gets 9.66 s. `bpm` stays on the record for the metronome, which
   should click where the foot goes. */
export const SONGS: readonly Song[] = [
  {
    slug: 'apocalypse',
    title: 'Apocalypse',
    bpm: 90.7,
    countedBpm: 90.7,
    cell: ['F', 'Dm', 'Am', 'C'],
    bars: 4,
    keyNote: 'A minor (detected); transcriptions read F major — same diatonic set, different tonic call',
  },
  {
    slug: 'k',
    title: 'K.',
    bpm: 92.3,
    countedBpm: 92.3,
    cell: ['Em', 'A', 'D', 'G'],
    bars: 4,
    keyNote: 'transcribed in Em shapes but two independent detectors say E♭/D♯ major — unresolved, tune to the record',
  },
  {
    slug: 'nothings-gonna-hurt-you-baby',
    title: "Nothing's Gonna Hurt You Baby",
    bpm: 49.7,
    countedBpm: 99.4,
    cell: ['E', 'B', 'F♯m', 'A'],
    bars: 4,
    keyNote: 'E major',
    note: 'felt pulse 49.7, counted at 99.4 — four bars counted fast is the same 9.66 s of audio as two bars felt slow',
  },
  {
    slug: 'sunsetz',
    title: 'Sunsetz',
    bpm: 77.1,
    countedBpm: 77.1,
    cell: ['F', 'Am', 'Dm', 'C'],
    bars: 4,
    keyNote: 'A minor',
  },
];

const SONG_BY_SLUG: Readonly<Record<string, Song>> =
  Object.fromEntries(SONGS.map((s) => [s.slug, s]));

/** `undefined` for an unknown slug — a bad URL fragment should render the picker, not throw. */
export function songBySlug(slug: string): Song | undefined {
  return SONG_BY_SLUG[slug];
}
