// ── HOW A PITCH GETS ITS NAME ─────────────────────────────────────────────────────────
//
// THE ONE MODULE THAT NAMES NOTES. Every surface — the tuner's readout, the pitch graph's
// axis and panels, the drone's figure and its chord — spells notes through here, so there is
// no second copy of "what is this pitch called" to drift. (User call, 2026-08-07: "make some
// kind of centralized naming module and use it everywhere like in the tuner".)
//
// Two jobs, and they are genuinely different questions:
//
//   nameOf(midi)                — a pitch on its own. No context, so it takes the commonest
//                                spelling: E♭ not D♯, but C♯ not D♭.
//   nameInChord(root, semis)    — a pitch as an INTERVAL above a root, which is a different
//                                question with a different answer.
//
// WHY THE SECOND EXISTS (the user's observation, and it is correct music theory): a minor
// third above E♭ is **G♭**, never F♯. Same pitch, but the name is wrong as F♯ because an
// interval's name is determined by the LETTERS it spans, not only by its size in semitones.
// E to G is a third; E to F♯ is a second, however you alter it. So a third above E-flat has
// to be spelled on the letter G, and the accidental follows from arithmetic.
//
// THE MECHANISM, stated plainly because it is the whole module:
//   1. An interval of n semitones has a DIATONIC SIZE — a 3rd, a 5th, a 7th — which says how
//      many letters up from the root to count. A minor 3rd and a major 3rd are both thirds.
//   2. Count that many letters up the natural scale from the root's letter. That fixes the
//      letter, and it cannot be argued with.
//   3. The accidental is whatever makes that letter sound the right pitch: the difference
//      between the letter's natural semitone value and the pitch we want.
// That yields G♭ above E♭ and F♯ above D, from one rule, with no table of special cases.
//
// WHAT THIS DELIBERATELY DOES NOT DO: pick a key. Spelling in real music depends on the key
// signature, and this instrument has none — B♭ in D major should read A♯ and won't. Adding a
// key selector would add a mode to an instrument that has avoided them. Within a chord,
// though, the root IS the context, which is exactly why the chord case can be right.

/** The seven natural letters, and their semitone offsets from C. */
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_SEMIS = [0, 2, 4, 5, 7, 9, 11] as const;

/**
 * A pitch class's commonest spelling, with no context.
 *
 * Three of the five black keys read flat and two read sharp, and the split follows which key
 * signatures occur rather than a preference: E♭/A♭/B♭ appear across the common flat keys and
 * their sharp enharmonics need five or six sharps, while C♯ and F♯ appear from D major onward.
 * This is the spelling on a fingering chart, which is the test that matters for an instrument
 * you practise against.
 */
export const NOTE_NAMES = [
  'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B',
] as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** An accidental string from a signed semitone offset. `♮` is never printed — 0 is bare. */
function accidental(delta: number): string {
  if (delta === 0) return '';
  if (delta === 1) return '♯';
  if (delta === -1) return '♭';
  if (delta === 2) return '𝄪';       // double sharp — reachable from an augmented interval
  if (delta === -2) return '𝄫';      // double flat — e.g. a diminished 3rd above a flat root
  // Beyond a double accidental the spelling has stopped being useful to a reader; fall back to
  // the context-free name rather than printing ♯♯♯.
  return '';
}

/** Scientific octave for a MIDI number: C4 = 60, A4 = 69 → octave 4. */
export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/** `E♭4` — a pitch on its own, commonest spelling, with octave. */
export function nameOf(midi: number): string {
  return `${NOTE_NAMES[mod(midi, 12)]}${octaveOf(midi)}`;
}

/** `E♭` — the pitch class alone, no octave. The drone's 72px figure used this. */
export function pitchClassOf(midi: number): string {
  return NOTE_NAMES[mod(midi, 12)];
}

/**
 * How many LETTERS up a given number of semitones spans, by default.
 *
 * This is the only judgement call in the module, and it is the standard one: each semitone
 * count has a conventional diatonic reading (4 semitones is a major 3rd, not a diminished 4th).
 * The tritone is the one genuine ambiguity — 6 semitones is an augmented 4th or a diminished
 * 5th with equal claim — and it is read as an augmented 4th, which is how a raised 4th is
 * heard against a drone.
 *
 * Index = semitones from the root; value = letters to count up (0 = same letter).
 */
const DIATONIC_STEPS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7] as const;

// ── WHEN A SEMITONE COUNT IS NOT ENOUGH ─────────────────────────────────────────────────
// The table above reads a semitone count and picks the CONVENTIONAL size for it. That is the
// right answer when all you have is a pitch and a root — which is the drone's case, and every
// caller before the chord trainer.
//
// It is the wrong answer when something has already DECLARED the degree. A chord symbol does
// exactly that: `F♯m7♭5`'s ♭5 is a fifth, lowered — so it must be spelled on the letter C. Six
// semitones reads as an augmented 4th by the table, so the module printed B♯. Measured across
// a deck of eleven chords, three disagreed with their own symbol:
//     F♯m7♭5 → F♯ A B♯ E   (the ♭5 wants C)
//     B°     → B D E♯      (the ♭5 wants F)
//     G7♯9   → G B F B♭    (the ♯9 wants A♯)
// Neither reading is "wrong about the pitch" — both sound the same note. The letter is what
// differs, and the letter is the whole job of this module.
//
// So the degree is an OPTIONAL third argument. Omit it and nothing changes: every existing
// caller keeps the conventional reading, which is why this is additive rather than a fix that
// has to be audited across three surfaces. Pass it and the letter comes from the degree.
// A degree of 5 counts 4 letters up; a 9th counts 8 — i.e. `degree - 1`, compounds included.

/**
 * Name a pitch as an interval above a root: `nameInChord(51, 3)` → `G♭3`.
 *
 * `root` is a MIDI number, `semis` the interval above it in semitones (0–24 covered; larger
 * compound intervals fold by octaves). The root's own spelling comes from `NOTE_NAMES`, so a
 * root of E♭ is an E-flat and its third is spelled on G.
 *
 * `degree` is optional and only for a caller that already knows which degree this note IS —
 * a chord symbol's ♭5, ♯9, ♭13. Without it the semitone count picks the conventional size,
 * which is correct for a bare interval and wrong for a declared alteration. See the note above.
 */
export function nameInChord(root: number, semis: number, degree?: number): string {
  const rootName = NOTE_NAMES[mod(root, 12)];
  const rootLetter = rootName[0] as (typeof LETTERS)[number];
  const rootAcc = rootName.length > 1 ? (rootName[1] === '♯' ? 1 : -1) : 0;
  const li = LETTERS.indexOf(rootLetter);

  // fold to a simple interval, remembering the octaves so the letter count stays right
  const octaves = Math.floor(semis / 12);
  const simple = semis - octaves * 12;

  // The declared degree wins when there is one; otherwise the conventional size for the count.
  // A degree already carries its own compounding (a 9th is 8 letters up), so it is NOT folded
  // by octaves the way the table's simple-interval reading has to be.
  const steps = degree === undefined ? DIATONIC_STEPS[simple] + octaves * 7 : degree - 1;
  const targetLetterIdx = li + steps;
  const letter = LETTERS[mod(targetLetterIdx, 7)];

  // the natural pitch that letter lands on, counting the octaves the letters crossed
  const letterOctaves = Math.floor(targetLetterIdx / 7);
  const naturalSemis = LETTER_SEMIS[mod(targetLetterIdx, 7)] + letterOctaves * 12;
  const rootNaturalSemis = LETTER_SEMIS[li];
  // THE ACCIDENTAL IS PURE ARITHMETIC: how far the wanted pitch sits from the letter we are
  // obliged to use. Both sides are measured from the ROOT'S LETTER's natural, so the root's own
  // accidental carries through — that is what makes a third above E♭ come out G♭ and a third
  // above E come out G♯.
  const delta = (rootAcc + semis) - (naturalSemis - rootNaturalSemis);

  const acc = accidental(delta);
  // If the accidental ran past a double, the spelling is not worth reading — fall back to the
  // context-free name, which is always legible even when it is theoretically the wrong letter.
  if (!acc && delta !== 0) return nameOf(root + semis);

  // ── THE OCTAVE BELONGS TO THE LETTER, NOT TO THE PITCH ──────────────────────────────
  // Caught by PRINTING a chord table rather than by any assertion: A♭ minor came out
  // `A♭4 C♭4 E♭5` — the C♭ reading octave 4 when it must read 5. Scientific pitch numbers the
  // octave from C, so a C♭ sounds a semitone BELOW its own letter's C and lands in the previous
  // octave by pitch while still being written as that C. `octaveOf(midi)` therefore answers for
  // the wrong C. B♯ has the mirror problem, one octave the other way.
  // The letter's own position is what decides it: `letterOctaves` already counted how many times
  // the letter walk crossed a C, so the octave is the root's letter-octave plus those crossings.
  // My unit sweep could not catch this — it checked the letter and the pitch class, and both
  // were right. Only the octave digit was wrong, and only a reader would notice.
  const rootOctave = octaveOf(root - rootAcc >= 0 ? root - rootAcc : root);
  return `${letter}${acc}${rootOctave + letterOctaves}`;
}

/** Every name in a chord, root first: `chordNames(51, [3, 7])` → `['E♭3','G♭3','B♭3']`. */
export function chordNames(root: number, semis: number[]): string[] {
  return [nameOf(root), ...semis.map((s) => nameInChord(root, s))];
}

/**
 * One note of a chord VOICING: the semitones above the root, and the degree the symbol calls it.
 *
 * The pair travels together because either one alone spells something wrong — the semitones
 * without the degree give B♯ for a ♭5, and the degree without the semitones cannot say whether
 * a 5th is flat, natural or sharp.
 */
export interface ChordTone {
  /** semitones above the root — what sounds */
  semis: number;
  /** the degree the chord symbol declares: 5 for a ♭5, 9 for a ♯9, 13 for a ♭13 */
  degree: number;
}

/**
 * Spell a voicing whose degrees are known — the chord trainer's case.
 *
 * `spellVoicing(54, [{semis:0,degree:1},{semis:3,degree:3},{semis:6,degree:5},{semis:10,degree:7}])`
 * → `['F♯3','A3','C4','E4']` — the ♭5 on C, where `chordNames` would print B♯.
 */
export function spellVoicing(root: number, tones: ChordTone[]): string[] {
  return tones.map((t) => nameInChord(root, t.semis, t.degree));
}
