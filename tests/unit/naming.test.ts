import { describe, it, expect } from 'vitest';
import {
  NOTE_NAMES, nameOf, pitchClassOf, nameInChord, chordNames, octaveOf,
} from '../../src/lib/practice-room/naming';

// ── THE MODULE THAT NAMES EVERY NOTE ON THE INSTRUMENT ────────────────────────────────
// Every expectation here is a fact a musician would state without seeing the code. That is
// deliberate: a test that re-derives the spelling from the same arithmetic as the
// implementation proves only that the arithmetic is self-consistent, which was never in doubt.

describe('a pitch on its own', () => {
  it('spells the black keys the way key signatures spell them', () => {
    // Three flats, two sharps, and the split follows which keys occur — E♭/A♭/B♭ across the
    // common flat keys, C♯ and F♯ from D major onward.
    expect([...NOTE_NAMES]).toEqual(
      ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']);
  });

  it('names A440 as A4 and middle C as C4', () => {
    expect(nameOf(69)).toBe('A4');
    expect(nameOf(60)).toBe('C4');
    expect(octaveOf(60)).toBe(4);
    // the octave boundary is B→C, not A→B: B3 and C4 are adjacent
    expect(nameOf(59)).toBe('B3');
  });

  it('gives the pitch class without an octave when asked', () => {
    expect(pitchClassOf(69)).toBe('A');
    expect(pitchClassOf(63)).toBe('E♭');
  });
});

describe('a pitch as an interval above a root', () => {
  // THE USER'S CASE, and the reason this module exists: "E♭4 F♯4 should actually read like
  // eb gb". A minor third above E♭ is spelled on the letter G, because E to G is a third and
  // E to F is a second — no interval called a third can be spelled F-anything above an E.
  it('spells a minor third above E♭ as G♭, not F♯', () => {
    const eFlat3 = 51;                       // E♭3
    expect(nameOf(eFlat3)).toBe('E♭3');
    expect(nameInChord(eFlat3, 3)).toBe('G♭3');
    expect(nameInChord(eFlat3, 3)).not.toContain('F');
  });

  it('spells the same pitch differently above a different root', () => {
    // 54 is F♯3/G♭3. Above D it is a major third and must read F♯; above E♭ a minor third,
    // so G♭. Identical pitch, two correct names, decided by the root.
    const d3 = 50, eFlat3 = 51;
    expect(nameInChord(d3, 4)).toBe('F♯3');
    expect(nameInChord(eFlat3, 3)).toBe('G♭3');
  });

  it('keeps every chord member on its own letter', () => {
    // A triad spans three DIFFERENT letters, always. This is the invariant that catches a
    // spelling which is enharmonically right and typographically nonsense (E♭ F♯ B♭ has two
    // members a "second" apart and reads as a cluster, not a chord).
    for (const root of [51, 54, 56, 61, 63, 68, 70]) {   // every black-key root
      for (const third of [3, 4]) {
        const names = chordNames(root, [third, 7]);
        const letters = names.map((n) => n[0]);
        expect(new Set(letters).size, `${names.join(' ')} must use three letters`).toBe(3);
      }
    }
  });

  it('spells the perfect intervals on the expected letters', () => {
    const eFlat3 = 51;
    expect(nameInChord(eFlat3, 5)).toBe('A♭3');    // a fourth: E→A
    expect(nameInChord(eFlat3, 7)).toBe('B♭3');    // a fifth:  E→B
    expect(nameInChord(eFlat3, 12)).toBe('E♭4');   // an octave: same letter, next octave
  });

  it('handles compound intervals by folding octaves, not by renaming', () => {
    const eFlat3 = 51;
    // a major tenth is a major third an octave up — same letter, one octave higher
    expect(nameInChord(eFlat3, 16)).toBe('G4');
    expect(nameInChord(eFlat3, 15)).toBe('G♭4');   // minor tenth
    expect(nameInChord(eFlat3, 14)).toBe('F4');    // a ninth: E→F, one octave up
  });

  it('is correct for a natural root too', () => {
    const c4 = 60;
    expect(chordNames(c4, [4, 7])).toEqual(['C4', 'E4', 'G4']);          // C major
    expect(chordNames(c4, [3, 7])).toEqual(['C4', 'E♭4', 'G4']);         // C minor
    const a3 = 57;
    expect(chordNames(a3, [4, 7])).toEqual(['A3', 'C♯4', 'E4']);         // A major
    expect(chordNames(a3, [3, 7])).toEqual(['A3', 'C4', 'E4']);          // A minor
  });

  it('spells a sharp root\'s chord on sharps', () => {
    // C♯ is spelled sharp on its own (NOTE_NAMES), so its third must be E♯ — not F, which
    // would make C♯–F a fourth. This is the mirror of the E♭ case and the same rule.
    const cSharp4 = 61;
    expect(nameOf(cSharp4)).toBe('C♯4');
    expect(nameInChord(cSharp4, 4)).toBe('E♯4');
    expect(nameInChord(cSharp4, 7)).toBe('G♯4');
  });

  it('never produces a letter more than one step off the diatonic count', () => {
    // A sweep over every root and every interval the drone offers, asserting the letter
    // matches the diatonic size. This is the check that would catch an off-by-one in the
    // letter arithmetic at some root nobody thought to try by hand.
    const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const STEPS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7, 8, 8, 9, 9];
    for (let root = 36; root <= 84; root++) {
      const rootLetter = nameOf(root)[0];
      const li = LETTERS.indexOf(rootLetter);
      for (let s = 1; s <= 16; s++) {
        const got = nameInChord(root, s);
        const wantLetter = LETTERS[(li + STEPS[s]) % 7];
        // the fallback path (past a double accidental) is allowed to disagree — it prints the
        // context-free name rather than an unreadable one
        if (got[0] !== wantLetter) {
          expect(got, `${nameOf(root)} + ${s} → ${got}`).toBe(nameOf(root + s));
        }
      }
    }
  });

  // THE ASSERTION THAT WAS MISSING, and it cost a real bug: A♭ minor printed `A♭4 C♭4 E♭5`,
  // the C♭ an octave low. Found by PRINTING a chord table, not by any check here — the sweep
  // below verified the letter and the pitch class and both were right; only the octave digit
  // was wrong, and a passing test suite said nothing.
  // WHY IT HAPPENS: scientific pitch numbers octaves from C, so a C♭ sounds a semitone BELOW
  // its own letter's C and therefore sits in the previous octave BY PITCH while still being
  // written on that C. Asking `octaveOf(midi)` answers for the wrong C. B♯ is the mirror.
  it('numbers the octave from the LETTER, not the pitch', () => {
    const aFlat4 = 68;
    expect(nameOf(aFlat4)).toBe('A♭4');
    // a minor third above A♭4 is C♭5 — written on the C that starts octave 5, though it sounds
    // below it
    expect(nameInChord(aFlat4, 3)).toBe('C♭5');
    // and every name's octave digit must be consistent with its letter across the whole range:
    // a name's letter+octave must be the letter's own position, so C♭5 follows B♭4 upward
    const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    for (let root = 36; root <= 84; root++) {
      let prevIdx = -Infinity;
      for (let s = 0; s <= 16; s++) {
        const name = s === 0 ? nameOf(root) : nameInChord(root, s);
        const m = name.match(/^([A-G])(♯|♭|𝄪|𝄫)?(-?\d+)$/u)!;
        // letters must ASCEND monotonically as the interval grows — that is what an octave
        // digit is for, and a wrong digit breaks the ordering even when the pitch is right
        const idx = Number(m[3]) * 7 + LETTERS.indexOf(m[1]);
        expect(idx, `${nameOf(root)} + ${s} → ${name} is out of order`)
          .toBeGreaterThanOrEqual(prevIdx);
        prevIdx = idx;
      }
    }
  });

  it('always names the right PITCH, whatever the spelling', () => {
    // The spelling may be debatable; the pitch never is. Parse each name back to a pitch class
    // and check it matches — a beautiful name for the wrong note is the worst failure here.
    const VAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    for (let root = 36; root <= 84; root++) {
      for (let s = 0; s <= 16; s++) {
        const name = s === 0 ? nameOf(root) : nameInChord(root, s);
        const m = name.match(/^([A-G])(♯|♭|𝄪|𝄫)?(-?\d+)$/u);
        expect(m, `unparseable: ${name}`).not.toBeNull();
        const acc = { '♯': 1, '♭': -1, '𝄪': 2, '𝄫': -2 }[m![2] ?? ''] ?? 0;
        const pc = (VAL[m![1]] + acc + 12) % 12;
        expect(pc, `${name} must sound pitch class ${(root + s) % 12}`).toBe((root + s) % 12);
      }
    }
  });
});
