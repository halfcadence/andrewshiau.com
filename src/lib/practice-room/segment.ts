// Note segmentation: turning a stream of pitch readings into a stream of decisions
// about WHICH NOTE you are playing.
//
// The tuner does not need this. One held note against the nearest semitone is the whole
// job, and `freqToReading` answers it per frame with no memory. A trace over a PHRASE
// does need it, because "cents off the nearest note" is a discontinuous function of
// pitch: move from A4 to B4 and the reading wraps from +49 to −49 without passing
// through zero. Drawn naively that is a full-height vertical line in the middle of a
// clean slur — the same picture a catastrophic intonation error would draw. So something
// has to decide when the note changed, and every possible answer is wrong in some case:
//
//   · Round every frame to the nearest note, and a wide vibrato renames the note at
//     every peak (a singer's ±58 cents crosses the halfway line twice a cycle).
//   · Wait for agreement, and a grace note shorter than the window disappears — worse,
//     its frames are charged to the note you were holding, which then reports an
//     intonation error you did not make.
//   · Lock the note at the attack, and a slur measures the second note against the
//     first, pinning the reading off scale.
//
// There is no default that is right for every instrument and idiom, which is why this
// file is a REGISTRY rather than a function. Each strategy is a named, documented,
// parameterised mechanism; the caller picks one and can tune its constants at runtime.
// A finding — from a paper, from another tool's source, from playing the thing — should
// land here as a new entry or a changed default, not as a rewrite of the drawing code.
//
// Pure and streaming: no AudioContext, no DOM, one reading in and one decision out. That
// is what lets the whole set be asserted against synthesized contours in Vitest, and it
// is why the decision is separable from the detector at all.

/** Semitones per octave, and the width of one semitone in cents. */
const SEMITONE_CENTS = 100;

/**
 * A pitch reading, as exact (fractional) MIDI. `null` is silence.
 *
 * Exact MIDI rather than {note, cents} on purpose: the pair has already thrown away
 * the information a segmenter needs. Once a frame has been rounded to a note, the
 * question "is this the same note as the last frame?" cannot be re-asked.
 */
export type Sample = number | null;

/** What a segmenter decides for one frame: the integer MIDI note it is measured against. */
export type Decision = number | null;

export interface ParamSpec {
  key: string;
  label: string;
  unit: string;
  default: number;
  min: number;
  max: number;
  step: number;
  /** What moving it does, and which failure it trades for which. */
  note: string;
}

export interface Segmenter {
  /** Feed one reading; get the note this frame is measured against. */
  feed(sample: Sample): Decision;
  /** Forget everything — a new take, or a stopped mic. */
  reset(): void;
}

export interface Strategy {
  id: string;
  name: string;
  /** One line: the mechanism, not the marketing. */
  mechanism: string;
  /** What it gets wrong, stated plainly. Every one of these has something. */
  cost: string;
  params: ParamSpec[];
  create(params: Record<string, number>): Segmenter;
}

/** Fill in defaults for anything the caller left out, and clamp what it did pass. */
export function resolveParams(
  strategy: Strategy,
  params: Record<string, number> = {},
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of strategy.params) {
    const v = params[p.key];
    out[p.key] = typeof v === 'number' && Number.isFinite(v)
      ? Math.min(p.max, Math.max(p.min, v))
      : p.default;
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────────
// The strategies.
//
// Every one of them resets on silence. That is not a parameter: no mechanism should
// carry a note decision across a rest, because a rest is the one unambiguous signal
// that the previous note ended. (Locking at the attack depends on it entirely.)
// ────────────────────────────────────────────────────────────────────────────────

/** Round every frame to the nearest semitone. No memory. What the tuner does. */
const nearest: Strategy = {
  id: 'nearest',
  name: 'nearest, every read',
  mechanism: 'Each frame is rounded to whichever semitone it is closest to.',
  cost: 'A vibrato wider than a semitone renames the note at every peak, and a '
    + 'portamento reports every note it passes through.',
  params: [],
  create() {
    return {
      feed(s: Sample) { return s === null ? null : Math.round(s); },
      reset() {},
    };
  },
};

/**
 * A Schmitt trigger on pitch: the reading must get `band` cents PAST the halfway line
 * before the note changes. The halfway line is 50 cents; a band of 62 means a note
 * change is recognised at 62 cents from the note currently held.
 *
 * This is the cheapest mechanism that survives vibrato — one constant, no timer, no
 * history beyond the current note.
 */
const hysteresis: Strategy = {
  id: 'hysteresis',
  name: 'hysteresis band',
  mechanism: 'The pitch must pass `band` cents from the held note before the note '
    + 'changes — a Schmitt trigger on the semitone boundary.',
  cost: 'A genuine semitone move is recognised late, by however far the band exceeds '
    + '50 cents, which draws as a spike at the start of the new note.',
  params: [{
    key: 'band',
    label: 'change threshold',
    unit: 'cents from the held note',
    default: 62,
    min: 50,
    max: 99,
    step: 1,
    note: 'At 50 this is plain nearest-note. Higher tolerates wider vibrato and '
      + 'recognises real changes later. A singer\'s vibrato reaches ±58; above ~70 '
      + 'a semitone trill stops registering at all.',
  }],
  create(p) {
    let cur: number | null = null;
    return {
      feed(s: Sample) {
        if (s === null) { cur = null; return null; }
        if (cur === null) { cur = Math.round(s); return cur; }
        if (Math.abs((s - cur) * SEMITONE_CENTS) > p.band) cur = Math.round(s);
        return cur;
      },
      reset() { cur = null; },
    };
  },
};

/**
 * A new note must appear in `frames` consecutive readings before it is believed.
 * Essentia's PitchContourSegmentation uses the same idea as a minimum DURATION
 * (`minDuration` 0.1 s); expressed in frames it is independent of the read cadence.
 */
const dwell: Strategy = {
  id: 'dwell',
  name: 'dwell — N reads to change',
  mechanism: 'A candidate note must hold for `frames` consecutive readings before the '
    + 'decision moves to it.',
  cost: 'Anything shorter is not merely dropped but REATTRIBUTED: a grace note\'s '
    + 'frames are charged to the note being held, which then reports an intonation '
    + 'error the player did not make. Also adds `frames` − 1 of latency.',
  params: [{
    key: 'frames',
    label: 'reads to agree',
    unit: 'reads',
    default: 2,
    min: 1,
    max: 8,
    step: 1,
    note: 'At 1 this is plain nearest-note. At the instrument\'s 66 ms cadence, 2 is '
      + '132 ms — near Essentia\'s 100 ms minDuration default. Higher rejects faster '
      + 'ornaments and lengthens the reattribution error.',
  }],
  create(p) {
    let cur: number | null = null;
    let cand: number | null = null;
    let agree = 0;
    return {
      feed(s: Sample) {
        if (s === null) { cur = null; cand = null; agree = 0; return null; }
        const near = Math.round(s);
        if (cur === null) { cur = near; cand = null; agree = 0; return cur; }
        if (near === cur) { cand = null; agree = 0; return cur; }
        if (cand === near) agree++; else { cand = near; agree = 1; }
        if (agree >= p.frames) { cur = near; cand = null; agree = 0; }
        return cur;
      },
      reset() { cur = null; cand = null; agree = 0; },
    };
  },
};

/**
 * Both of the above: the pitch must be `band` cents out AND stay there for `frames`
 * reads. The picked default for the trace (proof sheet `practice-room-pitch-change`,
 * question 2, option 05).
 *
 * The honest note on it: the two mechanisms cover for each other, so when the decision
 * is wrong you cannot tell which constant did it. That is the price of it being the
 * one that flickers least.
 */
const hysteresisDwell: Strategy = {
  id: 'hysteresis-dwell',
  name: 'hysteresis and dwell',
  mechanism: 'The pitch must pass `band` cents from the held note AND stay past it for '
    + '`frames` consecutive readings.',
  cost: 'Two constants to tune, and when the decision is wrong the two mechanisms hide '
    + 'which one made it. Inherits dwell\'s reattribution of short notes.',
  params: [
    { ...hysteresis.params[0] },
    { ...dwell.params[0] },
  ],
  create(p) {
    let cur: number | null = null;
    let cand: number | null = null;
    let agree = 0;
    return {
      feed(s: Sample) {
        if (s === null) { cur = null; cand = null; agree = 0; return null; }
        const near = Math.round(s);
        if (cur === null) { cur = near; cand = null; agree = 0; return cur; }
        if (Math.abs((s - cur) * SEMITONE_CENTS) > p.band) {
          if (cand === near) agree++; else { cand = near; agree = 1; }
          if (agree >= p.frames) { cur = near; cand = null; agree = 0; }
        } else { cand = null; agree = 0; }
        return cur;
      },
      reset() { cur = null; cand = null; agree = 0; },
    };
  },
};

/**
 * The note is decided on the first reading after silence and held until silence
 * returns — the long-tone assumption, made explicit.
 *
 * Kept in the registry despite being wrong for phrases, because for the exercise this
 * tool was built around (hold one note against a drone) it is exactly right: it can
 * never rename the note mid-note, so a deliberate slide off pitch reads as a slide off
 * pitch rather than as arrival at the neighbour.
 */
const attackLock: Strategy = {
  id: 'attack-lock',
  name: 'locked at the attack',
  mechanism: 'The first reading after silence names the note; it is held until silence '
    + 'returns.',
  cost: 'A slur is measured against the note before it and pins off scale. Only honest '
    + 'when every note has a rest around it — which is true of a long-tone exercise and '
    + 'false of music.',
  params: [],
  create() {
    let cur: number | null = null;
    return {
      feed(s: Sample) {
        if (s === null) { cur = null; return null; }
        if (cur === null) cur = Math.round(s);
        return cur;
      },
      reset() { cur = null; },
    };
  },
};

/**
 * The note is the MEDIAN of the last `window` readings, rounded. A different family:
 * rather than defending a held decision, it smooths the input and rounds once.
 *
 * Included because it is what the tuner already does to the FREQUENCY (median-of-5,
 * so one chair scrape cannot kick the reading), so it is the mechanism this codebase
 * already trusts, applied one level up. It rejects a single-frame outlier outright
 * instead of arguing with it.
 */
const medianWindow: Strategy = {
  id: 'median',
  name: 'median of the window',
  mechanism: 'The decision is the median of the last `window` readings, rounded — the '
    + 'same defence the tuner already applies to frequency, one level up.',
  cost: 'Symmetric latency: the decision lags the pitch by about half the window at '
    + 'both ends of a note, so both edges of every note are attributed slightly wrong.',
  params: [{
    key: 'window',
    label: 'window',
    unit: 'reads',
    default: 5,
    min: 1,
    max: 15,
    step: 2,
    note: 'Odd values only — an even window has no single median. 5 reads is 330 ms at '
      + 'the instrument\'s cadence, and matches the tuner\'s median-of-5 on frequency.',
  }],
  create(p) {
    const ring: number[] = [];
    const w = Math.max(1, p.window % 2 === 0 ? p.window - 1 : p.window);
    return {
      feed(s: Sample) {
        if (s === null) { ring.length = 0; return null; }
        ring.push(s);
        if (ring.length > w) ring.shift();
        const sorted = [...ring].sort((a, b) => a - b);
        return Math.round(sorted[Math.floor(sorted.length / 2)]);
      },
      reset() { ring.length = 0; },
    };
  },
};

/**
 * Essentia's rule, as close as a streaming implementation gets: a note is a run of
 * readings within `distance` cents of that run's OWN RUNNING MEAN, and a run shorter
 * than `minFrames` is not a note.
 *
 * The difference from hysteresis is the reference. Hysteresis measures from the
 * quantized note (a fixed target); this measures from where you have actually been
 * sitting. A note held 20 cents sharp therefore gets its full ±`distance` of vibrato
 * room, instead of spending 20 cents of it on being sharp.
 *
 * (Essentia: hopSize 128, minDuration 0.1 s, pitchDistanceThreshold 60 cents,
 * rmsThreshold −2. The RMS half is not reproduced here — this stage sees pitch, not
 * energy; silence gating already happened in the detector.)
 */
const contourIsland: Strategy = {
  id: 'contour-island',
  name: 'island from the running mean',
  mechanism: 'A note is a run of readings within `distance` cents of that run\'s own '
    + 'running mean; a run shorter than `minFrames` is not a note. (After Essentia\'s '
    + 'PitchContourSegmentation.)',
  cost: 'The reference drifts with the player, so a slow continuous slide never '
    + 'triggers a change — it is heard as one long note whose mean follows the slide.',
  params: [
    {
      key: 'distance',
      label: 'distance from the run\'s mean',
      unit: 'cents',
      default: 60,
      min: 20,
      max: 120,
      step: 5,
      note: 'Essentia\'s pitchDistanceThreshold default is 60. Measured from where you '
        + 'have been sitting, not from the quantized note, so a sharp note keeps its '
        + 'full vibrato allowance.',
    },
    {
      key: 'minFrames',
      label: 'shortest note',
      unit: 'reads',
      default: 2,
      min: 1,
      max: 8,
      step: 1,
      note: 'Essentia\'s minDuration is 0.1 s; at the instrument\'s 66 ms cadence that '
        + 'is between 1 and 2 reads.',
    },
  ],
  create(p) {
    let cur: number | null = null;   // the note this run is reported as
    let sum = 0;
    let n = 0;                       // the run's own mean, in exact MIDI
    let cand: number | null = null;
    let agree = 0;
    return {
      feed(s: Sample) {
        if (s === null) { cur = null; sum = 0; n = 0; cand = null; agree = 0; return null; }
        if (cur === null) { cur = Math.round(s); sum = s; n = 1; return cur; }
        const mean = sum / n;
        if (Math.abs((s - mean) * SEMITONE_CENTS) > p.distance) {
          const near = Math.round(s);
          if (cand === near) agree++; else { cand = near; agree = 1; }
          if (agree >= p.minFrames) {          // a new island starts here
            cur = near; sum = s; n = 1; cand = null; agree = 0;
            return cur;
          }
          return cur;                          // still the old island, provisionally
        }
        cand = null; agree = 0;
        sum += s; n++;
        return cur;
      },
      reset() { cur = null; sum = 0; n = 0; cand = null; agree = 0; },
    };
  },
};

export const STRATEGIES: Strategy[] = [
  nearest,
  hysteresis,
  dwell,
  hysteresisDwell,
  attackLock,
  medianWindow,
  contourIsland,
];

/**
 * The trace's default: chosen off the `practice-room-pitch-change` proof sheet
 * (question 2, option 05) after watching all five mechanisms draw the same phrase.
 *
 * THE BENCH DISAGREES WITH THIS PICK, and the disagreement is recorded rather than
 * quietly resolved, because the two instruments are measuring different things and the
 * choice is the owner's. `node tools/segment-bench.mjs` over eight hard contours:
 *
 *   hysteresis        0 miscounted notes   worst error 17¢
 *   hysteresis+dwell  1 miscounted note    worst error 50¢
 *
 * The dwell half buys nothing on top of hysteresis and costs the grace note: it refuses
 * a one-read note and charges those reads to the note being held, which then reports an
 * intonation error the player did not make. Swept, `frames=1` — which IS plain
 * hysteresis — scores best, and every higher value is strictly worse. So on the numbers
 * the answer is `hysteresis` with `band` 62.
 *
 * What the bench cannot see, and why the pick stands until the owner moves it: it scores
 * synthetic contours, and the sheet was judged on how the DRAWING read. If the flicker
 * hysteresis alone still admits is visible on a real instrument through a real mic, the
 * dwell half earns its cost. Change one constant to find out:
 *
 *   createSegmenter('hysteresis', { band: 62 })
 */
export const DEFAULT_STRATEGY_ID = 'hysteresis-dwell';

export function getStrategy(id: string): Strategy {
  const s = STRATEGIES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown segmentation strategy: ${id}`);
  return s;
}

/** Build a segmenter by id, with any subset of its parameters overridden. */
export function createSegmenter(
  id: string = DEFAULT_STRATEGY_ID,
  params: Record<string, number> = {},
): Segmenter {
  const s = getStrategy(id);
  return s.create(resolveParams(s, params));
}

/**
 * Run a whole contour through a strategy. The offline form — used by the tests, by the
 * proof sheet, and by anything that re-reads a finished take.
 */
export function segment(
  samples: Sample[],
  id: string = DEFAULT_STRATEGY_ID,
  params: Record<string, number> = {},
): Decision[] {
  const seg = createSegmenter(id, params);
  return samples.map((s) => seg.feed(s));
}

/**
 * What to SHOW for one frame — which is not the same question as what to measure.
 *
 * Every strategy that survives a vibrato does so by holding the old note through a
 * transition, and while it holds, the true offset from that note runs off the ±50 cent
 * scale: measured on the live trace, a slurred A4→B4 prints 141¢ and briefly 187¢, and a
 * numeric readout that says "+141.3¢" on an axis whose whole domain is ±50 is not a
 * precise reading, it is a broken one.
 *
 * So the display contract is explicit and lives beside the mechanism that causes it:
 *
 *   · `cents` is CLAMPED to the axis, because a drawing cannot show what it cannot hold.
 *   · `inTransition` is true when the true offset is off-scale — the frames where the
 *     segmenter is knowingly holding a note the pitch has already left. A readout should
 *     print nothing (or a dash) rather than a number for these; a trace should still draw
 *     them, clamped, because the excursion is real and hiding it would draw a gap where
 *     the player played.
 *   · `trueCents` is kept unclamped for anything that needs the honest value — a test, a
 *     verdict, this file's own bench.
 */
export interface Shown {
  /** The note being measured against; null in silence. */
  midi: number | null;
  /** Offset in cents, clamped to ±`limit`. Null in silence. */
  cents: number | null;
  /** The unclamped offset. Null in silence. */
  trueCents: number | null;
  /** True when |trueCents| exceeds the axis — the segmenter is holding a left note. */
  inTransition: boolean;
  /** Within the in-tune window. */
  inTune: boolean;
}

export const AXIS_LIMIT_CENTS = 50;   // ±50 is one semitone's worth: the whole domain

/**
 * The in-tune window. 3 cents is the value the tuner ships, and it is TIGHTER THAN THE
 * EAR: the published threshold for a musician reliably hearing a pitch error is about
 * 5–7 cents (Clark 2012), so a ±3 window can print "out of tune" for an error nobody
 * can hear. Kept at 3 anyway — a tuner's job is to be more precise than the ear, that
 * is why you look at it — but the trace is a different instrument, and the survey of
 * shipped tools says a practice display should carry TWO bands rather than one
 * threshold: Singing Carrots draws ±5 ("barely noticeable even by most trained ears")
 * inside ±12 ("commonly audible by most untrained ears"), and Tunable makes the band a
 * skill setting (Beginner ±10 / Intermediate ±6 / Advanced ±2).
 *
 * Also worth knowing before treating this as symmetric: sharp and flat are not judged
 * symmetrically, and the asymmetry varies by instrument (Geringer, MacLeod & Sasanfar
 * 2015). A symmetric band is not a perceptually symmetric band.
 */
export const IN_TUNE_CENTS = 3;

/** The two-band practice display, after Singing Carrots. `inner` is "nobody hears it". */
export const PRACTICE_BANDS = { inner: 5, outer: 12 } as const;

export function shown(
  sample: Sample,
  decision: Decision,
  limit = AXIS_LIMIT_CENTS,
  inTuneWindow = IN_TUNE_CENTS,
): Shown {
  if (sample === null || decision === null) {
    return { midi: null, cents: null, trueCents: null, inTransition: false, inTune: false };
  }
  const trueCents = (sample - decision) * SEMITONE_CENTS;
  const cents = Math.max(-limit, Math.min(limit, trueCents));
  return {
    midi: decision,
    cents,
    trueCents,
    inTransition: Math.abs(trueCents) > limit,
    inTune: Math.abs(trueCents) <= inTuneWindow,
  };
}

export interface NoteRun {
  /** The note as decided. */
  midi: number;
  /** Index of the first and last reading attributed to it, inclusive. */
  from: number;
  to: number;
  /** How many readings. */
  reads: number;
  /**
   * The note's pitch offset in cents — weighted toward the middle of the note, which is
   * what a listener hears the note AS. See `centerWeighted`.
   */
  mean: number;
  /** The plain arithmetic mean over every reading, unweighted. */
  flatMean: number;
  /** Standard deviation of the offsets — the wobble. */
  sd: number;
}

/**
 * How much of a note's edges to discount when reporting its pitch.
 *
 * Melodyne computes a note's "fine offset" weighted toward its middle, on the stated
 * grounds that "the central part of a note, as a rule, plays a more decisive role in the
 * listener's perception of pitch" — and Tunable reports Attack / Sustain / Release cents
 * as three separate numbers for the same reason. Both are saying an unweighted mean is
 * the wrong summary of a note.
 *
 * It matters here specifically: a real attack overshoots. In the phrase this tool was
 * built around, the attack is 42 cents sharp before settling, so the flat mean of the
 * first note reports an intonation error that lasted 200 ms out of 1.6 s. The player did
 * not sit sharp; they started sharp.
 *
 * A raised-cosine window rather than a hard trim: a hard trim needs a rule for how many
 * reads to cut and gets it wrong on short notes, whereas this degrades smoothly and is
 * defined for a note of one reading.
 */
export function centerWeighted(cs: number[]): number {
  if (cs.length === 0) return 0;
  if (cs.length <= 2) return cs.reduce((a, b) => a + b, 0) / cs.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < cs.length; i++) {
    // 0 at both edges, 1 in the middle. `(i + 0.5)/n` so the window is symmetric and
    // no reading is weighted exactly zero.
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * (i + 0.5)) / cs.length));
    num += cs[i] * w;
    den += w;
  }
  return den > 0 ? num / den : cs.reduce((a, b) => a + b, 0) / cs.length;
}

/**
 * Group a decided contour into note runs, with each run's intonation.
 *
 * This is what a per-note verdict reads from, and it is deliberately NOT part of the
 * segmenter: the same runs are wanted from every strategy, and computing them once
 * here is what makes two strategies comparable on the same take.
 *
 * The offsets are the TRUE ones, not clamped — `shown()` clamps for drawing, but a
 * verdict that averaged clamped values would report the axis rather than the playing.
 */
export function noteRuns(samples: Sample[], decisions: Decision[]): NoteRun[] {
  const runs: NoteRun[] = [];
  let cur: { midi: number; from: number; to: number; cs: number[] } | null = null;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const d = decisions[i];
    if (s === null || d === null) { cur = null; continue; }
    const cents = (s - d) * SEMITONE_CENTS;
    if (cur && cur.midi === d && cur.to === i - 1) { cur.to = i; cur.cs.push(cents); }
    else {
      cur = { midi: d, from: i, to: i, cs: [cents] };
      runs.push(cur as unknown as NoteRun);
    }
  }
  return runs.map((r) => {
    const cs = (r as unknown as { cs: number[] }).cs;
    const flatMean = cs.reduce((a, b) => a + b, 0) / cs.length;
    const sd = Math.sqrt(cs.reduce((a, b) => a + (b - flatMean) ** 2, 0) / cs.length);
    return {
      midi: r.midi,
      from: r.from,
      to: r.to,
      reads: cs.length,
      mean: centerWeighted(cs),
      flatMean,
      sd,
    };
  });
}
