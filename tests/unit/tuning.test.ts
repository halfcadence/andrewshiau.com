import { describe, it, expect } from 'vitest';
import {
  TUNINGS, DEFAULT_TUNING_ID, getTuning, stackHz, beatRate,
  centsBetween, ratioToCents,
} from '../../src/lib/practice-room/tuning';

// Every number asserted here is an EXACT ratio, not an ear judgement. The proof sheet
// (work/understand/practice-room-thirds/) answered "which sounds better" by playing them;
// this file answers "is each system the system it claims to be", which is the half a sheet
// cannot check.

const A3 = 220;
const cents = (f: number, ref: number) => centsBetween(f, ref);

describe('the registry contract', () => {
  it('every system is documented: mechanism and cost', () => {
    for (const t of TUNINGS) {
      expect(t.id, 'id').toBeTruthy();
      expect(t.name, `${t.id} name`).toBeTruthy();
      // A system with no stated cost is a system whose cost nobody found yet.
      expect(t.mechanism.length, `${t.id} mechanism`).toBeGreaterThan(20);
      expect(t.cost.length, `${t.id} cost`).toBeGreaterThan(20);
    }
  });

  it('ids are unique and the default exists', () => {
    const ids = TUNINGS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(() => getTuning(DEFAULT_TUNING_ID)).not.toThrow();
  });

  it('an unknown id throws rather than silently falling back', () => {
    // A typo in a stored preference must not present as a tuning that behaves oddly.
    expect(() => getTuning('no-such-tuning')).toThrow(/unknown/i);
  });

  it('every system returns the root unchanged at 0 semitones, and an exact octave at 12',
    () => {
      for (const t of TUNINGS) {
        expect(t.hz(A3, 0, [0]), `${t.id} unison`).toBeCloseTo(A3, 9);
        expect(t.hz(A3, 12, [12]), `${t.id} octave`).toBeCloseTo(440, 6);
      }
    });

  it('every system is monotonic over two octaves — a higher interval is a higher pitch',
    () => {
      const stack = Array.from({ length: 25 }, (_, i) => i);
      for (const t of TUNINGS) {
        let prev = 0;
        for (let s = 0; s <= 24; s++) {
          const hz = t.hz(A3, s, stack);
          expect(hz, `${t.id} at ${s} semitones`).toBeGreaterThan(prev);
          prev = hz;
        }
      }
    });
});

describe('equal temperament — the baseline the drone shipped with', () => {
  const eq = getTuning('equal');

  it('is exactly 100 cents per semitone', () => {
    for (let s = 0; s <= 12; s++) {
      expect(cents(eq.hz(A3, s, [s]), A3)).toBeCloseTo(100 * s, 6);
    }
  });

  it('has a major third 13.69 cents WIDE of just — the beating that started this', () => {
    const third = eq.hz(A3, 4, [4]);
    const just = A3 * (5 / 4);
    expect(cents(third, just)).toBeCloseTo(13.686, 2);
  });

  it('beats audibly on a major third, and just does not', () => {
    // The quantity the owner heard as "beatiness", computed from the coinciding partials.
    const eqBeat = beatRate(A3, eq.hz(A3, 4, [4]));
    const justBeat = beatRate(A3, A3 * (5 / 4));
    expect(eqBeat).toBeGreaterThan(5);          // measured ~8.7 Hz at A3
    expect(justBeat).toBeLessThan(0.01);        // exact ratio, no beat at all
  });
});

describe('just intonation — the ratios, exactly', () => {
  const jr = getTuning('just-root');

  it('gives the 5-limit ratios for every interval in the octave', () => {
    const want: [number, number][] = [
      [0, 1 / 1], [1, 16 / 15], [2, 9 / 8], [3, 6 / 5], [4, 5 / 4], [5, 4 / 3],
      [6, 45 / 32], [7, 3 / 2], [8, 8 / 5], [9, 5 / 3], [10, 9 / 5], [11, 15 / 8],
      [12, 2 / 1],
    ];
    for (const [semi, ratio] of want) {
      expect(jr.hz(A3, semi, [semi]) / A3, `${semi} semitones`).toBeCloseTo(ratio, 9);
    }
  });

  it('folds octaves correctly — a tenth is a third an octave up', () => {
    expect(jr.hz(A3, 16, [16])).toBeCloseTo(A3 * (5 / 4) * 2, 6);
  });

  it('LEAVES THE 41-CENT WOLF the chain system exists to close', () => {
    // A major third under a minor sixth: both perfect against the root, 32:25 apart.
    const third = jr.hz(A3, 4, [4, 8]);
    const sixth = jr.hz(A3, 8, [4, 8]);
    const between = cents(sixth, third);
    expect(between).toBeCloseTo(ratioToCents(32 / 25), 3);
    // 427.4 cents where a just major third is 386.3 — a 41-cent wolf.
    expect(between - ratioToCents(5 / 4)).toBeCloseTo(41.06, 1);
  });
});

describe('just-chain — THE PICK (sheet option 07)', () => {
  it('is the default', () => {
    expect(DEFAULT_TUNING_ID).toBe('just-chain');
  });

  it('IS IDENTICAL TO ROOT-RELATIVE FOR A TRIAD — the property that makes it safe', () => {
    // This is the claim the option's why-line rests on, so it is asserted rather than
    // trusted: root × 5:4 is the third, and that × 6:5 is 3:2, the same fifth.
    const triad = [4, 7];
    const chain = stackHz(A3, triad, 'just-chain');
    const root = stackHz(A3, triad, 'just-root');
    expect(chain.map((x) => +x.hz.toFixed(9))).toEqual(root.map((x) => +x.hz.toFixed(9)));
    // And the fifth really is 3:2, reached the long way round.
    expect(chain[2].hz / A3).toBeCloseTo(3 / 2, 9);
  });

  it('CLOSES the wolf that root-relative leaves', () => {
    const stack = [4, 8];
    const chain = stackHz(A3, stack, 'just-chain');
    const third = chain[1].hz;
    const sixth = chain[2].hz;
    // Neighbour-to-neighbour is now a simple ratio — 4 semitones above the third is a just
    // major third, not 32:25.
    expect(cents(sixth, third)).toBeCloseTo(ratioToCents(5 / 4), 3);
    // Compare with the system it fixes: that interval was 41 cents wider.
    const rootRel = stackHz(A3, stack, 'just-root');
    expect(cents(rootRel[2].hz, rootRel[1].hz) - cents(sixth, third)).toBeCloseTo(41.06, 1);
  });

  it('is unaffected by the order the stack arrives in', () => {
    // The drone's strip can add notes in any order; the tuning may not depend on it.
    const a = stackHz(A3, [7, 4, 11], 'just-chain');
    const b = stackHz(A3, [11, 4, 7], 'just-chain');
    expect(a).toEqual(b);
  });

  it('does not mutate the caller\'s stack array', () => {
    // It sorts internally; sorting in place would silently reorder the drone's own state.
    const stack = [7, 4, 11];
    stackHz(A3, stack, 'just-chain');
    expect(stack).toEqual([7, 4, 11]);
  });

  it('falls back to root-relative for a note not in the stack', () => {
    // The strip previews a note before committing it, so hz() gets asked about notes the
    // stack does not yet contain.
    const t = getTuning('just-chain');
    expect(t.hz(A3, 4, [])).toBeCloseTo(A3 * (5 / 4), 9);
    expect(t.hz(A3, 0, [4, 7])).toBeCloseTo(A3, 9);
  });
});

describe('Pythagorean — perfect fifths, unusable thirds', () => {
  const p = getTuning('pythagorean');

  it('has an exact 3:2 fifth', () => {
    expect(p.hz(A3, 7, [7]) / A3).toBeCloseTo(3 / 2, 9);
  });

  it('has an 81:64 third, 408 cents — the widest here', () => {
    expect(p.hz(A3, 4, [4]) / A3).toBeCloseTo(81 / 64, 9);
    expect(cents(p.hz(A3, 4, [4]), A3)).toBeCloseTo(407.82, 1);
    // 22 cents wide of just, which is why it buzzed at 7.9 Hz on the sheet.
    expect(cents(p.hz(A3, 4, [4]), A3 * (5 / 4))).toBeCloseTo(21.51, 1);
  });

  it('beats harder on a third than equal temperament does', () => {
    expect(beatRate(A3, p.hz(A3, 4, [4]))).toBeGreaterThan(beatRate(A3, getTuning('equal').hz(A3, 4, [4])));
  });
});

describe('quarter-comma meantone — pure thirds, flat fifths', () => {
  const m = getTuning('meantone');

  it('has an EXACT 5:4 third — the whole point of the system', () => {
    expect(m.hz(A3, 4, [4]) / A3).toBeCloseTo(5 / 4, 6);
  });

  it('pays for it with a fifth 5.38 cents narrow', () => {
    const fifth = cents(m.hz(A3, 7, [7]), A3);
    expect(fifth).toBeCloseTo(696.58, 1);
    expect(fifth - 701.955).toBeCloseTo(-5.38, 1);
  });

  it('does not beat on a third', () => {
    expect(beatRate(A3, m.hz(A3, 4, [4]))).toBeLessThan(0.01);
  });
});

describe('stackHz — what the drone actually calls', () => {
  it('returns the root plus every stacked note, ascending', () => {
    const out = stackHz(A3, [7, 4], 'just-chain');
    expect(out.map((x) => x.semitones)).toEqual([0, 4, 7]);
    expect(out[0].hz).toBeCloseTo(A3, 9);
  });

  it('reports each note\'s deviation from the equal-tempered note of the same name', () => {
    // The number a player needs: their tuner and their piano are both equal-tempered, so
    // "how far from what a tuner would say" is the honest readout.
    const out = stackHz(A3, [4], 'just-chain');
    expect(out[1].centsFromEqual).toBeCloseTo(-13.686, 2);
  });

  it('reports zero deviation everywhere under equal temperament', () => {
    for (const n of stackHz(A3, [3, 4, 7, 8, 12], 'equal')) {
      expect(Math.abs(n.centsFromEqual)).toBeLessThan
        ? expect(Math.abs(n.centsFromEqual)).toBeLessThan(1e-9)
        : expect(n.centsFromEqual).toBeCloseTo(0, 9);
    }
  });

  it('ignores duplicates and non-positive entries', () => {
    expect(stackHz(A3, [4, 4, 0, -5], 'just-root').map((x) => x.semitones)).toEqual([0, 4, 4]);
  });
});

describe('beatRate — the quantity the owner heard', () => {
  it('is zero for an exact ratio', () => {
    expect(beatRate(220, 330)).toBeLessThan(1e-9);      // a perfect 3:2
    expect(beatRate(220, 275)).toBeLessThan(1e-9);      // a perfect 5:4
  });

  it('rises with the mistuning', () => {
    const small = beatRate(220, 220 * 2 ** (4 / 12) * 0.999);
    const large = beatRate(220, 220 * 2 ** (4 / 12));
    expect(large).toBeGreaterThan(0);
    expect(small).toBeGreaterThan(0);
  });

  it('scales with register — the same interval beats faster higher up', () => {
    const eq = getTuning('equal');
    const low = beatRate(110, eq.hz(110, 4, [4]));
    const high = beatRate(440, eq.hz(440, 4, [4]));
    expect(high).toBeGreaterThan(low * 3);
  });
});
