// THE ROOM'S ARITHMETIC: which instruments a width buys, in the order you chose.
//
// WHY THIS FILE EXISTS. The room used to be five columns written into the page —
// `1fr 1fr 210px 315px 236px` — with the count fixed at five and the order fixed by source
// position. A sixth instrument meant editing a grid, and every viewport under 1477px got the
// phone swiper because five fixed columns do not fit a laptop.
//
// The room is a QUEUE now (chooser `practice-room-queue`, 2026-08-11, five questions):
// you set an ORDER once and nothing else; the width decides how many of that order are on
// screen; the rest stay in the queue and are reached by scrolling. Picked: Q1/04 "fit by
// demand, then share what's left", Q2/04 "free scroll, lock on release", Q3/01 "the room's
// last page" (so there is still NO global chrome — the order page is simply the next thing
// along), Q4/01 "drag the row", Q5/02 "each instrument's own figure at 16px".
//
// EVERY NUMBER BELOW IS MEASURED, NOT PREFERRED. `demand` is the width at which an
// instrument's own ink breaks, bisected on the built page one case at a time by
// `work/understand/practice-room-queue/measure-demand.mjs`, against each case's SHIPPED row
// heights. The first run of that script called all five broken at 900px because it measured
// `scrollWidth` — but every control here pads out to a 44px tap target with matching negative
// margins, so a box edge is nowhere near its visible edge (the trap
// `practice-room-two-datums` records). Measuring INK instead gave these five.
//
// Pure functions on numbers. No DOM, no CSS, so the fit arithmetic is asserted in
// tests/unit/room.test.ts rather than eyeballed in a browser.

/** One instrument in the room. `demand` is measured; see the file header. */
export interface Instrument {
  /** stable id — the persisted order is a list of these */
  key: string;
  /** the word the phone's dot row and the order page print */
  name: string;
  /**
   * The width in px below which this instrument's own ink breaks. Bisected on the built
   * page; `breaks` names what fails first, so a future change can tell whether the number
   * is still about the same thing.
   */
  demand: number;
  /** what breaks below `demand` — kept so the number is falsifiable, not folklore */
  breaks: string;
}

/**
 * THE FIVE, in their default order. `demand` bisected 2026-08-11 on the built page at
 * 1600px reference. Re-run `measure-demand.mjs` after any change to a case's contents —
 * these are measurements with a date, not constants.
 */
export const INSTRUMENTS: readonly Instrument[] = [
  { key: 'tuner',     name: 'tuner',       demand: 170, breaks: 'the calibration row wraps under its own label' },
  { key: 'metronome', name: 'metronome',   demand: 196, breaks: 'the tap button crosses the case edge' },
  { key: 'drone',     name: 'drone',       demand: 170, breaks: 'the voice row wraps to two lines' },
  { key: 'changes',   name: 'the changes', demand: 282, breaks: 'the deck row wraps and the deal button is clipped' },
  { key: 'loop',      name: 'the loop',    demand: 236, breaks: 'the speed row wraps past its track' },
];

export const BY_KEY: Readonly<Record<string, Instrument>> =
  Object.fromEntries(INSTRUMENTS.map((i) => [i.key, i]));

/** The room's own chrome, in px: `--group` padding either side, `--group` between cases. */
export const PAD = 56;
export const GAP = 56;

export interface Fit {
  /** the keys on screen, in order */
  shown: string[];
  /** the keys still in the queue, in order — rendered, reachable by scrolling, never dropped */
  queued: string[];
  /** px width per shown instrument, index-aligned with `shown` */
  widths: number[];
  /** px given back to each shown instrument beyond its demand (Q1/04's whole point) */
  share: number;
}

/**
 * HOW MANY FIT, and how wide each one gets.
 *
 * Q1/04, "fit by demand, then share what's left": walk the queue from the front taking
 * instruments while the next still fits at its own measured demand, then divide the leftover
 * width equally among the ones that made it. So the room is always full and the drawings get
 * the change back.
 *
 * WHY NOT Q1/02 (fit by demand, leave the air): at 1044px three instruments sit in 868px and
 * 176px of the room is empty — width paid for and given to air rather than to the dials.
 * WHY NOT Q1/03 (one column width, counted off the widest): a queue containing the chord
 * dealer makes every other instrument buy its 282px, which is one slot fewer at 840px.
 * WHY NOT Q1/05 (fixed bands): the thresholds are computed from today's five, so a sixth
 * instrument — or reordering so the dealer comes first — makes them silently wrong. Config
 * that can drift from code will drift.
 *
 * THE COST Q1/04 CARRIES, stated because it is real: an instrument's width now depends on
 * which OTHERS are on screen, so the tuner is 170px wide in one room and wider in the next,
 * and the dial it holds is drawn from that width. Same instrument, two sizes, no reason
 * visible on the page. The owner was shown that in the sheet and chose it anyway.
 *
 * ONE CASE ALWAYS SHOWS. Below the narrowest demand the room would otherwise be empty; a
 * single case that must overflow is better than a blank screen, and the phone layout takes
 * over long before that in practice.
 */
export function fitRoom(order: readonly string[], width: number): Fit {
  const keys = order.filter((k) => k in BY_KEY);
  if (!keys.length) return { shown: [], queued: [], widths: [], share: 0 };

  let used = PAD * 2;
  let n = 0;
  for (const k of keys) {
    const add = BY_KEY[k].demand + (n ? GAP : 0);
    if (used + add > width) break;
    used += add;
    n += 1;
  }
  if (n === 0) n = 1; // one case always shows — see the note above

  const shown = keys.slice(0, n);
  const base = shown.map((k) => BY_KEY[k].demand);
  const occupied = base.reduce((a, b) => a + b, 0) + GAP * (n - 1) + PAD * 2;
  // `Math.max(0, …)`: with one forced case the room can be narrower than its demand, and a
  // negative share would shrink the case below the width its ink needs.
  const share = Math.max(0, (width - occupied) / n);

  return {
    shown,
    queued: keys.slice(n),
    widths: base.map((b) => b + share),
    share,
  };
}

/**
 * THE PERSISTED ORDER, validated rather than trusted — localStorage outlives the code that
 * wrote it, so a stale value from a five-instrument era must not break a six-instrument room.
 * Unknown keys are dropped, missing ones are appended in default order, duplicates collapse.
 * The result is always a permutation of exactly the instruments that exist now.
 */
export function normalizeOrder(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of String(raw ?? '').split(',')) {
    const key = k.trim();
    if (key in BY_KEY && !seen.has(key)) { seen.add(key); out.push(key); }
  }
  for (const i of INSTRUMENTS) if (!seen.has(i.key)) out.push(i.key);
  return out;
}

/** Move `key` to sit at index `to` in `order`. Returns a new array; out-of-range clamps. */
export function moveTo(order: readonly string[], key: string, to: number): string[] {
  const out = order.filter((k) => k !== key);
  const at = Math.max(0, Math.min(out.length, to));
  out.splice(at, 0, key);
  return out;
}

/** Move `key` by `delta` places (−1 up, +1 down). A move past either end is a no-op. */
export function nudge(order: readonly string[], key: string, delta: number): string[] {
  const at = order.indexOf(key);
  if (at < 0) return [...order];
  const to = at + delta;
  if (to < 0 || to >= order.length) return [...order];
  return moveTo(order, key, to);
}

/**
 * THE SETTLE (Q2/04, "free scroll, lock on release"): given each shown case's left offset
 * and where the scroller came to rest, which offset should it lock to?
 *
 * The momentum is the browser's — no CSS snap while a finger is moving — and the lock is
 * ours, fired on `scrollend`. This returns the nearest case's offset so the room always
 * rests with a case's left edge on the room's 3ch inset datum, which is the page's whole
 * horizontal alignment argument.
 *
 * `null` means "already there" (within `tol`), so a caller can skip a pointless animation —
 * a settle that re-animates to where you already are reads as the page correcting you.
 */
export function settleTo(offsets: readonly number[], scrollLeft: number, tol = 1): number | null {
  if (!offsets.length) return null;
  let best = offsets[0];
  let bestD = Math.abs(offsets[0] - scrollLeft);
  for (const o of offsets) {
    const d = Math.abs(o - scrollLeft);
    if (d < bestD) { bestD = d; best = o; }
  }
  return bestD <= tol ? null : best;
}

/**
 * THE 16px GLYPHS (Q5/02): one per instrument, each a reduction of the drawing that case
 * already holds — the tuner's dial arc and needle, the metronome's pendulum, the drone's
 * stacked interval, the dealer's voicing, the loop's bracket.
 *
 * WHY GLYPHS AND NOT THE WORDS THAT SHIP: measured at 390px, `tuner · metronome · drone ·
 * the changes · the loop` sets to 568px, so the row wraps to two lines and the foot takes a
 * second lead — and a sixth instrument makes it three. Five glyphs set on one line at any
 * width. The cost, stated: a glyph does not name its page, so the mapping is learned by
 * swiping once. That is why each one is the case's OWN drawing rather than an invented icon.
 *
 * `currentColor` throughout, so a glyph inherits ink or accent from the row it sits in and
 * carries no colour of its own — the site's one-hue rule.
 */
const STROKE =
  'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';

export const GLYPHS: Readonly<Record<string, string>> = {
  /* the dial: the tuner's arc rail and its needle at rest */
  tuner: `<path ${STROKE} d="M2.5 11a6 6 0 0 1 11 0"/><path ${STROKE} d="M8 11V5.4"/>`,
  /* the pendulum: pivot at the top, arm parked off vertical, its base rule */
  metronome: `<circle cx="8" cy="2.8" r="1" fill="currentColor"/><path ${STROKE} d="M8 3.8l3.2 8.4"/><path ${STROKE} d="M4 13.4h8"/>`,
  /* the stacked interval: the drone's two sounding pitches */
  drone: `<path ${STROKE} d="M2.5 5.5h11"/><path ${STROKE} d="M2.5 10.5h11"/>`,
  /* the voicing: four notes of a chord, stacked and offset as they are dealt */
  changes: `<path ${STROKE} d="M3 12.5h6"/><path ${STROKE} d="M4.5 9.5h7"/><path ${STROKE} d="M6 6.5h6"/><path ${STROKE} d="M7.5 3.5h5"/>`,
  /* the loop: a bracket closing back on itself, the a–b of a transcription */
  loop: `<path ${STROKE} d="M11 4.5H6.5A3.5 3.5 0 0 0 6.5 11.5H11"/><path ${STROKE} d="M9.2 2.7L11 4.5 9.2 6.3"/>`,
};

/** One instrument's glyph as a complete 16px `<svg>`, ready to inject. */
export function glyphSvg(key: string): string {
  const inner = GLYPHS[key] ?? '';
  return `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">${inner}</svg>`;
}
