import { describe, it, expect } from 'vitest';
import {
  STRATEGIES, DEFAULT_STRATEGY_ID, createSegmenter, getStrategy, resolveParams,
  segment, noteRuns, shown, centerWeighted, AXIS_LIMIT_CENTS, IN_TUNE_CENTS,
  PRACTICE_BANDS, type Sample,
} from '../../src/lib/practice-room/segment';

// The read cadence the instrument actually uses, so durations here are the durations
// on the page rather than abstract frame counts.
const STEP_MS = 66;

// ── contour builders ────────────────────────────────────────────────────────────
// Exact MIDI, one entry per read. Written as generators rather than literals so a
// change of cadence or vibrato rate doesn't need 40 numbers retyped.

function hold(midi: number, cents: number, reads: number): Sample[] {
  return Array.from({ length: reads }, () => midi + cents / 100);
}
function rest(reads: number): Sample[] {
  return Array.from({ length: reads }, () => null);
}
/** A vibrato of the given rate and extent, sampled at the read cadence. */
function vibrato(midi: number, rateHz: number, extentCents: number, reads: number): Sample[] {
  return Array.from({ length: reads }, (_, i) => {
    const t = (i * STEP_MS) / 1000;
    return midi + (extentCents / 100) * Math.sin(2 * Math.PI * rateHz * t);
  });
}
/** A continuous slide between two notes over `reads` readings. */
function slide(from: number, to: number, reads: number): Sample[] {
  return Array.from({ length: reads }, (_, i) => from + (to - from) * (i / (reads - 1)));
}

const centsOf = (s: Sample, d: number | null) =>
  s === null || d === null ? null : (s - d) * 100;

// ── the registry's own contract ─────────────────────────────────────────────────

describe('the strategy registry', () => {
  it('every strategy is documented: mechanism, cost, and a note per parameter', () => {
    for (const s of STRATEGIES) {
      expect(s.id, 'id').toBeTruthy();
      expect(s.name, `${s.id} name`).toBeTruthy();
      // A strategy with no stated cost is a strategy whose cost nobody found yet.
      expect(s.mechanism.length, `${s.id} mechanism`).toBeGreaterThan(20);
      expect(s.cost.length, `${s.id} cost`).toBeGreaterThan(20);
      for (const p of s.params) {
        expect(p.note.length, `${s.id}.${p.key} note`).toBeGreaterThan(20);
        expect(p.default).toBeGreaterThanOrEqual(p.min);
        expect(p.default).toBeLessThanOrEqual(p.max);
      }
    }
  });

  it('ids are unique, and the default exists', () => {
    const ids = STRATEGIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(() => getStrategy(DEFAULT_STRATEGY_ID)).not.toThrow();
  });

  it('an unknown id throws rather than silently falling back', () => {
    // Silently substituting a default would make a typo in a stored preference
    // look like a segmenter that behaves oddly.
    expect(() => createSegmenter('no-such-strategy')).toThrow(/unknown/i);
  });

  it('parameters are clamped to their range and filled from defaults', () => {
    const h = getStrategy('hysteresis');
    expect(resolveParams(h, { band: 999 }).band).toBe(h.params[0].max);
    expect(resolveParams(h, { band: 0 }).band).toBe(h.params[0].min);
    expect(resolveParams(h, {}).band).toBe(h.params[0].default);
    // NaN is the interesting one: it comes from an empty number input.
    expect(resolveParams(h, { band: NaN }).band).toBe(h.params[0].default);
  });

  it('every strategy returns null for silence and never carries a note across a rest',
    () => {
      for (const s of STRATEGIES) {
        const contour = [...hold(69, 0, 5), ...rest(3), ...hold(71, 0, 5)];
        const out = segment(contour, s.id);
        expect(out.slice(5, 8), `${s.id} on silence`).toEqual([null, null, null]);
        // After the rest it must name B4, never still be holding A4.
        expect(out[out.length - 1], `${s.id} after the rest`).toBe(71);
      }
    });

  it('feed() streaming and segment() offline agree, for every strategy', () => {
    const contour = [...hold(69, 12, 8), ...slide(69, 71, 3), ...hold(71, -8, 8),
      ...rest(2), ...vibrato(74, 6, 58, 20)];
    for (const s of STRATEGIES) {
      const seg = createSegmenter(s.id);
      const streamed = contour.map((x) => seg.feed(x));
      expect(streamed, s.id).toEqual(segment(contour, s.id));
    }
  });

  it('reset() returns a segmenter to its initial state', () => {
    for (const s of STRATEGIES) {
      const seg = createSegmenter(s.id);
      const first = hold(69, 0, 6).map((x) => seg.feed(x));
      seg.reset();
      const second = hold(69, 0, 6).map((x) => seg.feed(x));
      expect(second, s.id).toEqual(first);
    }
  });
});

describe('the default, and the finding recorded against it', () => {
  // `tools/segment-bench.mjs` scores hysteresis ALONE better than the picked
  // hysteresis+dwell on eight hard contours (0 miscounted notes / 17¢ worst error
  // against 1 / 50¢). The pick stands because it was made by watching the drawing, not
  // by scoring contours — but the numbers are pinned here so that if anyone changes the
  // default they meet the argument instead of discovering it later.
  it('is hysteresis+dwell — the sheet\'s pick, not the bench\'s', () => {
    expect(DEFAULT_STRATEGY_ID).toBe('hysteresis-dwell');
  });

  it('dwell=1 collapses the default to plain hysteresis, which is the bench\'s answer',
    () => {
      const contour = [...hold(69, 12, 10), ...vibrato(74, 6, 58, 20), ...hold(71, -8, 10)];
      expect(segment(contour, DEFAULT_STRATEGY_ID, { frames: 1 }))
        .toEqual(segment(contour, 'hysteresis', { band: 62 }));
    });

  it('the documented band plateau holds: 58 and 62 both survive a wide vibrato, 55 does not',
    () => {
      const contour = vibrato(74, 6, 58, 40);
      expect(new Set(segment(contour, 'hysteresis', { band: 58 })).size).toBe(1);
      expect(new Set(segment(contour, 'hysteresis', { band: 62 })).size).toBe(1);
      expect(new Set(segment(contour, 'hysteresis', { band: 55 })).size).toBeGreaterThan(1);
    });
});

// ── the four hard cases, per strategy ───────────────────────────────────────────
//
// Each of these asserts a strategy's DOCUMENTED cost. A weakness written in a comment
// and never tested is a claim; asserted, it is a property — and it fails loudly if
// someone "fixes" one mechanism into another.

describe('a wide vibrato (6 Hz, ±58 cents — a singer\'s)', () => {
  // ±58 crosses the 50-cent halfway line, so nearest-note must rename the note at the
  // peaks. This is the case that motivates every other strategy in the file.
  const contour = vibrato(74, 6, 58, 40);

  it('nearest renames the note at the peaks', () => {
    const notes = new Set(segment(contour, 'nearest'));
    expect(notes.size).toBeGreaterThan(1);
    expect(notes.has(74)).toBe(true);
  });

  it('hysteresis holds one note throughout', () => {
    expect(new Set(segment(contour, 'hysteresis'))).toEqual(new Set([74]));
  });

  it('hysteresis+dwell — the picked default — holds one note throughout', () => {
    expect(new Set(segment(contour, DEFAULT_STRATEGY_ID))).toEqual(new Set([74]));
  });

  it('the running-mean island holds one note throughout', () => {
    expect(new Set(segment(contour, 'contour-island'))).toEqual(new Set([74]));
  });

  it('a hysteresis band BELOW the vibrato extent fails — the constant is the mechanism',
    () => {
      // Red case for the parameter itself: 55 < 58, so the peaks get through.
      const tight = new Set(segment(contour, 'hysteresis', { band: 55 }));
      expect(tight.size).toBeGreaterThan(1);
    });
});

describe('a grace note of one read (66 ms), slurred on both sides', () => {
  // C♯5 held sharp, one read of B4, then a leap down to A4. No silence anywhere.
  const contour: Sample[] = [
    ...hold(73, 14, 10),
    73 - 2 / 100 + (71 - 73),   // the grace: one read at B4
    ...hold(69, -6, 10),
  ];

  it('nearest admits it as its own note', () => {
    expect(segment(contour, 'nearest')[10]).toBe(71);
  });

  it('dwell refuses it — and CHARGES its read to the note being held', () => {
    const dec = segment(contour, 'dwell');
    expect(dec[10]).toBe(73);                     // still C♯5, not B4
    const runs = noteRuns(contour, dec);
    const cSharp = runs.find((r) => r.midi === 73)!;
    // The documented cost, made numeric: C♯5 was played +14, and the refused read is
    // charged to it. On the FLAT mean that is a 36¢ lie — the note comes back 22¢ flat.
    expect(cSharp.flatMean).toBeLessThan(0);
    expect(Math.abs(cSharp.flatMean - 14)).toBeGreaterThan(30);
  });

  it('centre-weighting PARTLY REPAIRS that reattribution — an unplanned interaction', () => {
    // Found by adding the weighting: the refused read sits at the END of C♯5's run, so a
    // window that discounts the edges discounts most of the damage too. The reported
    // offset goes from 22¢ flat to about 7¢ sharp against a truth of +14¢ — a 36¢ lie
    // becomes a 7¢ one. Asserted because it is a real property of the pair, and because
    // it means the two fixes must be judged together rather than one at a time.
    const runs = noteRuns(contour, segment(contour, 'dwell'));
    const cSharp = runs.find((r) => r.midi === 73)!;
    expect(cSharp.mean).toBeGreaterThan(0);
    expect(Math.abs(cSharp.mean - 14)).toBeLessThan(Math.abs(cSharp.flatMean - 14) / 3);
  });

  it('the picked default inherits that reattribution', () => {
    // Stated plainly in hysteresisDwell.cost — asserted here so it can't be forgotten.
    expect(segment(contour, DEFAULT_STRATEGY_ID)[10]).toBe(73);
  });

  it('dwell with frames=1 is nearest-note, by construction', () => {
    expect(segment(contour, 'dwell', { frames: 1 })).toEqual(segment(contour, 'nearest'));
  });

  it('the median window rejects the single-read outlier outright', () => {
    expect(segment(contour, 'median')[10]).toBe(73);
  });
});

describe('Tartini\'s self-widening band — measured, both ways', () => {
  // The most relevant precedent that exists for this page: Tartini is the MPM author's
  // own violin intonation trainer, so it is the same detector solving the same problem.
  // Its band is base + √(local sd) × stretch, which means vibrato widens the tolerance
  // that would otherwise split it — no vibrato parameter anywhere. Measured on Tartini's
  // constants: ~12 cents on a steady tone, ~113 under a ±50 cent vibrato.
  //
  // It is in the registry because it is the best mechanism on a slur, and NOT the default
  // because it is the worst on a trill. Both halves are asserted; the bench found both.
  it('holds one note through a vibrato wider than a semitone', () => {
    expect(new Set(segment(vibrato(74, 6, 58, 40), 'adaptive'))).toEqual(new Set([74]));
  });

  it('SWALLOWS a semitone trill — the cost, and no parameter fixes it', () => {
    // 7.6 notes/sec, playable, 12 real note events. The adaptive band reports one.
    const trill = Array.from({ length: 24 }, (_, i) => (Math.floor(i / 2) % 2 ? 72 : 71));
    expect(new Set(segment(trill, 'adaptive')).size).toBe(1);
    // Swept in the bench across every window and jump gate: invariant. Two samples here.
    expect(new Set(segment(trill, 'adaptive', { shortMs: 66 })).size).toBeLessThan(4);
    expect(new Set(segment(trill, 'adaptive', { jumpCents: 100 })).size).toBeLessThan(4);
    // Where hysteresis gets it right, which is why hysteresis is the recommendation.
    expect(new Set(segment(trill, 'hysteresis')).size).toBe(2);
  });

  it('absorbs a slide into the note it left, rather than into the note it arrives at',
    () => {
      // I first asserted here that adaptive beats hysteresis on a slur, because the bench
      // reports 3 cents against 17 on ITS slur case. Measured on a contour with an
      // explicit 3-read slide, that is false — hysteresis is exact (0.0¢) and adaptive is
      // off by 4.9¢. The bench's slur has no slide segment, so the two cases are not the
      // same case, and the earlier claim was over-read from one number.
      //
      // What IS true, and is the useful property: the slide's reads are charged to the
      // note being left, so the ARRIVED-AT note is reported cleanly. Every strategy here
      // gets the second note exactly right; they differ on how badly the first is
      // polluted, and centre-weighting is what rescues it (flat 32.2 → weighted 6.9).
      const contour = [...hold(69, 2, 12), ...slide(69, 71, 3), ...hold(71, -8, 12)];
      const runs = noteRuns(contour, segment(contour, 'adaptive'))
        .filter((r) => r.reads >= 4);
      const arrived = runs.find((r) => r.midi === 71)!;
      expect(arrived.mean).toBeCloseTo(-8, 1);

      const left = runs.find((r) => r.midi === 69)!;
      expect(left.flatMean).toBeGreaterThan(25);      // the slide, charged to A4
      expect(left.mean).toBeLessThan(left.flatMean / 3);  // and mostly weighted away
    });

  it('rescales its windows to this page\'s 66 ms cadence, not Tartini\'s 23 ms', () => {
    // Tartini's 80 ms short window is 1.2 reads here — the mean would be one sample and
    // the mechanism would collapse. The default is one period of a 5 Hz vibrato instead.
    const s = getStrategy('adaptive');
    const shortMs = s.params.find((p) => p.key === 'shortMs')!;
    expect(shortMs.default).toBeGreaterThanOrEqual(3 * 66);
    expect(shortMs.default).toBeGreaterThanOrEqual(1000 / 6);   // ≥ one 6 Hz period
  });
});

describe('a slur — two notes with no silence between them', () => {
  const contour = [...hold(69, 2, 10), ...slide(69, 71, 2), ...hold(71, -8, 10)];

  it('locking at the attack measures the second note against the first', () => {
    const dec = segment(contour, 'attack-lock');
    expect(new Set(dec)).toEqual(new Set([69]));
    // And that pins the reading off the ±50 scale entirely — the stated cost.
    const worst = Math.max(...contour.map((s, i) => Math.abs(centsOf(s, dec[i]) ?? 0)));
    expect(worst).toBeGreaterThan(150);
  });

  it('every other strategy finds both notes', () => {
    for (const s of STRATEGIES) {
      if (s.id === 'attack-lock') continue;
      const notes = new Set(segment(contour, s.id).filter((x) => x !== null));
      expect(notes, s.id).toEqual(new Set([69, 71]));
    }
  });
});

describe('a slow continuous slide (a portamento across 4 semitones)', () => {
  const contour = slide(69, 73, 40);

  it('nearest reports every note it passes through', () => {
    expect(new Set(segment(contour, 'nearest')).size).toBe(5);   // 69..73
  });

  it('the running-mean island follows the slide instead of splitting it cleanly', () => {
    // contourIsland's documented cost: the reference drifts with the player. It finds
    // FEWER notes than nearest — it is not tracking the semitones the slide crosses.
    const island = new Set(segment(contour, 'contour-island')).size;
    expect(island).toBeLessThan(5);
  });
});

// ── the display contract ────────────────────────────────────────────────────────

describe('shown() — what a readout may print', () => {
  // FOUND ON THE LIVE SHEET, not in a test: the picked mechanism holds the old note
  // through a slur (that is how it survives vibrato), and while it holds, the true
  // offset leaves the ±50 axis. The trace printed "+141.3¢" and once "+187¢" on a scale
  // whose entire domain is ±50. Clamping is not cosmetic here — an unclamped number is
  // a wrong number.
  it('clamps a mid-slur excursion to the axis and flags it', () => {
    const s = shown(70.41, 69);                  // measured off the live page
    expect(s.trueCents).toBeCloseTo(141.3, 0);
    expect(s.cents).toBe(AXIS_LIMIT_CENTS);
    expect(s.inTransition).toBe(true);
    expect(s.inTune).toBe(false);
  });

  it('does not flag an ordinary in-range reading', () => {
    const s = shown(69.19, 69);
    expect(s.cents).toBeCloseTo(19, 0);
    expect(s.trueCents).toBeCloseTo(19, 0);
    expect(s.inTransition).toBe(false);
  });

  it('clamps in both directions', () => {
    expect(shown(67.5, 69).cents).toBe(-AXIS_LIMIT_CENTS);
    expect(shown(67.5, 69).inTransition).toBe(true);
  });

  it('marks the in-tune window at the shipped ±3¢, not ±5', () => {
    expect(shown(69.02, 69).inTune).toBe(true);    // +2
    expect(shown(69.04, 69).inTune).toBe(false);   // +4
  });

  it('is silent for silence', () => {
    expect(shown(null, null).cents).toBeNull();
    expect(shown(null, 69).midi).toBeNull();
    expect(shown(69, null).midi).toBeNull();
  });

  it('never returns a cents value the axis cannot hold, over the whole hard phrase', () => {
    // The property, asserted across every strategy rather than at one point: whatever
    // the mechanism decides, the number handed to a drawing is on the scale.
    const contour = [...hold(69, 2, 8), ...slide(69, 71, 4), ...hold(71, -8, 8),
      ...vibrato(74, 6, 58, 20)];
    for (const st of STRATEGIES) {
      const dec = segment(contour, st.id);
      for (let i = 0; i < contour.length; i++) {
        const v = shown(contour[i], dec[i]);
        if (v.cents === null) continue;
        expect(Math.abs(v.cents), `${st.id} at ${i}`).toBeLessThanOrEqual(AXIS_LIMIT_CENTS);
      }
    }
  });

  it('every strategy that holds a note through a slur reports the transition', () => {
    // attack-lock and hysteresis both hold; nearest never does. This asserts the flag
    // actually fires where the mechanism causes it, so a readout can trust it.
    const contour = [...hold(69, 2, 6), ...slide(69, 71, 5), ...hold(71, -8, 6)];
    const flags = (id: string) => segment(contour, id)
      .map((d, i) => shown(contour[i], d).inTransition).filter(Boolean).length;
    expect(flags('attack-lock')).toBeGreaterThan(0);
    expect(flags('nearest')).toBe(0);
  });
});

// ── how a note's pitch is summarised ────────────────────────────────────────────

describe('centerWeighted — the middle of a note is what you heard', () => {
  // From the research: Melodyne weights a note's "fine offset" toward its centre because
  // "the central part of a note, as a rule, plays a more decisive role in the listener's
  // perception of pitch", and Tunable splits Attack / Sustain / Release for the same
  // reason. An unweighted mean reports the attack as intonation.
  it('discounts an attack overshoot that a flat mean would report as being sharp', () => {
    // A real long tone: 42¢ sharp attack for 3 reads, then 1¢ for 20. The player did not
    // sit sharp — they started sharp.
    const cs = [42, 30, 18, ...Array.from({ length: 20 }, () => 1)];
    const flat = cs.reduce((a, b) => a + b, 0) / cs.length;
    const weighted = centerWeighted(cs);
    expect(flat).toBeGreaterThan(4);          // the flat mean calls this note sharp
    expect(weighted).toBeLessThan(flat);
    expect(Math.abs(weighted - 1)).toBeLessThan(2);   // the weighted one says: in tune
  });

  it('leaves a steady note alone', () => {
    const cs = Array.from({ length: 20 }, () => 12);
    expect(centerWeighted(cs)).toBeCloseTo(12, 6);
  });

  it('is centred on a symmetric vibrato', () => {
    const cs = Array.from({ length: 24 }, (_, i) => 30 * Math.sin((i / 24) * 2 * Math.PI));
    expect(Math.abs(centerWeighted(cs))).toBeLessThan(6);
  });

  it('is defined for the degenerate cases a real take produces', () => {
    expect(centerWeighted([])).toBe(0);
    expect(centerWeighted([7])).toBe(7);         // a one-read grace note
    expect(centerWeighted([7, 9])).toBe(8);      // two reads: no middle to weight
  });

  it('noteRuns reports both, so a verdict can choose and a test can compare', () => {
    const contour = [
      ...hold(69, 42, 3), ...hold(69, 1, 20),
    ];
    const runs = noteRuns(contour, segment(contour, 'nearest'));
    expect(runs).toHaveLength(1);
    expect(runs[0].flatMean).toBeGreaterThan(runs[0].mean);
    expect(Math.abs(runs[0].mean - 1)).toBeLessThan(2);
  });
});

describe('the in-tune window, and what the ear can actually hear', () => {
  it('ships at ±3¢ — tighter than the ear, deliberately', () => {
    expect(IN_TUNE_CENTS).toBe(3);
  });

  it('the practice bands bracket the published perceptual thresholds', () => {
    // Musicians cannot reliably hear below ~5–7 cents (Clark 2012), so the inner band is
    // "nobody hears this" and the outer is "an untrained ear hears it".
    expect(PRACTICE_BANDS.inner).toBeLessThanOrEqual(7);
    expect(PRACTICE_BANDS.inner).toBeGreaterThan(IN_TUNE_CENTS);
    expect(PRACTICE_BANDS.outer).toBeGreaterThan(PRACTICE_BANDS.inner);
    expect(PRACTICE_BANDS.outer).toBeLessThan(AXIS_LIMIT_CENTS);
  });
});

// ── the verdict layer ───────────────────────────────────────────────────────────

describe('noteRuns', () => {
  const contour = [
    ...hold(69, 19, 12),      // A4, sharp
    ...rest(2),
    ...hold(71, -13, 12),     // B4, flat
    ...rest(2),
    ...hold(73, 14, 12),      // C♯5, sharp
  ];

  it('gives one run per note, with that note\'s own mean and wobble', () => {
    const runs = noteRuns(contour, segment(contour, DEFAULT_STRATEGY_ID));
    expect(runs.map((r) => r.midi)).toEqual([69, 71, 73]);
    expect(runs[0].mean).toBeCloseTo(19, 5);
    expect(runs[1].mean).toBeCloseTo(-13, 5);
    expect(runs[2].mean).toBeCloseTo(14, 5);
    for (const r of runs) {
      expect(r.reads).toBe(12);
      expect(r.sd).toBeCloseTo(0, 5);          // a dead-steady hold has no wobble
    }
  });

  it('THE AVERAGING TRAP: the whole-take mean says in tune, every note says otherwise',
    () => {
      // This is the reason the reading is per-note. Asserted so a future "simplify it
      // to one number" cannot land without a red test explaining why not.
      const dec = segment(contour, DEFAULT_STRATEGY_ID);
      const sounding = contour
        .map((s, i) => centsOf(s, dec[i]))
        .filter((c): c is number => c !== null);
      const whole = sounding.reduce((a, b) => a + b, 0) / sounding.length;
      expect(Math.abs(whole)).toBeLessThan(8);        // "in tune"

      const runs = noteRuns(contour, dec);
      const spread = Math.max(...runs.map((r) => r.mean))
        - Math.min(...runs.map((r) => r.mean));
      expect(spread).toBeGreaterThan(30);             // and wrong about every note
    });

  it('a run\'s wobble is the standard deviation of its own offsets', () => {
    const wobbly = vibrato(74, 6, 20, 24);
    const runs = noteRuns(wobbly, segment(wobbly, 'hysteresis'));
    expect(runs).toHaveLength(1);
    expect(runs[0].sd).toBeGreaterThan(5);
    expect(Math.abs(runs[0].mean)).toBeLessThan(5);   // symmetric vibrato, centred
  });

  it('is empty for pure silence', () => {
    const s = rest(10);
    expect(noteRuns(s, segment(s))).toEqual([]);
  });

  // FOUND BY RED-CASING, and the reason this test exists: `noteRuns` was sabotaged to
  // merge every reading into ONE run and the whole suite still passed. Every grouping
  // case above puts a REST between its notes, and silence resets the run by a different
  // code path — so the note-change branch was never actually exercised. A SLURRED phrase
  // is the only contour that tests it.
  it('splits on a note change with NO silence between the notes', () => {
    const slurred = [
      ...hold(69, 19, 10),      // A4 sharp
      ...hold(71, -13, 10),     // straight into B4 flat, no rest
      ...hold(73, 14, 10),      // straight into C♯5 sharp
    ];
    const runs = noteRuns(slurred, segment(slurred, 'nearest'));
    expect(runs.map((r) => r.midi)).toEqual([69, 71, 73]);
    expect(runs.map((r) => r.reads)).toEqual([10, 10, 10]);
    expect(runs[0].mean).toBeCloseTo(19, 5);
    expect(runs[1].mean).toBeCloseTo(-13, 5);
    expect(runs[2].mean).toBeCloseTo(14, 5);
  });

  it('a run\'s indices are contiguous and cover exactly its own reads', () => {
    // The other half of what the merge sabotage broke: a merged run reports a `reads`
    // count that no longer matches its own index span.
    const slurred = [...hold(69, 5, 7), ...hold(71, 5, 4), ...rest(2), ...hold(69, 5, 6)];
    for (const r of noteRuns(slurred, segment(slurred, 'nearest'))) {
      expect(r.to - r.from + 1).toBe(r.reads);
    }
  });
});
