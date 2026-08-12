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
  /* THE DEALER'S DEMAND IS 315, NOT THE 282 MY BISECTION FIRST REPORTED — and the gap is a
     hole in the harness, worth recording. `measure-demand.mjs` breaks a case on ink crossing
     the content edge, a row growing, or a control clipped. The chord SYMBOL does none of
     those: `#mt-sym` renders whatever chord was dealt, so at 282px it happened to hold `Cmaj7`
     (43px of ink) and the predicate saw nothing wrong. The case must fit the WIDEST symbol
     the decks can deal — `F♯m7♭5`, 259px at 72px in this face — plus the two 3ch insets and
     the hairlines: 259 + 54 + 2 = 315, which is exactly the width the page already shipped.
     A predicate that only measures what is currently on screen cannot see a worst case that
     is one deal away. Caught by `changes.spec.ts`, which probes the widest symbol directly. */
  { key: 'changes',   name: 'the changes', demand: 315, breaks: 'the widest symbol F♯m7♭5 (259px) no longer fits beside its insets' },
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

/* ══════════════════════════════════════════════════════════════════════════════════════
   THINGS, NOT INSTRUMENTS (chooser `practice-room-plan` Q1/02, `practice-room-box` Q1/04,
   Q2/04, Q3/02, Q4/04 — 2026-08-12)
   ══════════════════════════════════════════════════════════════════════════════════════
   The room held five peers and the owner's verdict was that it read as busy. His grouping,
   taken as the premise: the tuner, the drone and the metronome are the things you use WHILE
   PLAYING and often together — tuning against a drone, a drone against a click — so they are
   ONE thing, a console. The changes and the loop are things you WORK AT, one at a time, and
   each wants the screen. So the room holds THREE things, not five.

   THE CONSOLE IS A FITTING UNIT, NOT A DOM WRAPPER. Its three cases stay siblings in
   `#mt-pages`; what changes is that they are seated together or not at all. Wrapping them in
   a container would have re-parented three live instruments — every listener, every
   `data-testid`, and the row ladder they subgrid onto — to buy nothing the ordering already
   gives. The console's demand is therefore the sum of its members plus the gaps between them.

   THERE IS NO OUTSIDE (box Q4/04): every thing is always in the room. Nothing is put away, so
   the plan has no shelf and the queue is a permutation rather than a subset. */

/** One thing the room can hold: a single instrument, or the console's three. */
export interface Thing {
  id: string;
  /** the instrument keys it seats, in the order they sit */
  keys: readonly string[];
  /** the word the plan and the phone's row print */
  name: string;
}

export const THINGS: readonly Thing[] = [
  { id: 'console', keys: ['tuner', 'drone', 'metronome'], name: 'console' },
  { id: 'changes', keys: ['changes'], name: 'the changes' },
  { id: 'loop',    keys: ['loop'],    name: 'the loop' },
];
export const THING_BY_ID: Readonly<Record<string, Thing>> =
  Object.fromEntries(THINGS.map((t) => [t.id, t]));

/**
 * A thing's width demand: its members' measured demands plus one `GAP` between each.
 * The console comes to 170 + 170 + 196 + 2×56 = 648, which is why three things need the same
 * 1423px five instruments did — the grouping changes what you navigate, not what fits.
 */
export function thingDemand(id: string): number {
  const t = THING_BY_ID[id];
  if (!t) return 0;
  return t.keys.reduce((a, k) => a + (BY_KEY[k]?.demand ?? 0), 0) + GAP * (t.keys.length - 1);
}

export interface ThingFit {
  shown: string[];
  queued: string[];
  /** px per SHOWN thing, index-aligned with `shown` */
  widths: number[];
  share: number;
}

/**
 * HOW MANY THINGS A WIDTH BUYS — the same fit-by-demand-then-share arithmetic the owner picked
 * for the queue (Q1/04), applied to things rather than instruments. A console that does not fit
 * whole does not fit at all: seating two of its three would put a tuner beside a drone with the
 * metronome off-screen, which is the busy room the grouping exists to end.
 */
export function fitThings(order: readonly string[], width: number): ThingFit {
  const ids = order.filter((id) => id in THING_BY_ID);
  if (!ids.length) return { shown: [], queued: [], widths: [], share: 0 };

  let used = PAD * 2;
  let n = 0;
  for (const id of ids) {
    const add = thingDemand(id) + (n ? GAP : 0);
    if (used + add > width) break;
    used += add;
    n += 1;
  }
  if (n === 0) n = 1; // one thing always shows, even if it must overflow

  const shown = ids.slice(0, n);
  const base = shown.map(thingDemand);
  const occupied = base.reduce((a, b) => a + b, 0) + GAP * (n - 1) + PAD * 2;
  const share = Math.max(0, (width - occupied) / n);
  return { shown, queued: ids.slice(n), widths: base.map((b) => b + share), share };
}

/**
 * WITHIN a shown thing, how wide each of its instruments gets. The thing's own width is split
 * by its members' demands in proportion, so the console's extra room reaches the dial and the
 * pendulum rather than pooling in one case.
 */
export function splitThing(id: string, width: number): number[] {
  const t = THING_BY_ID[id];
  if (!t) return [];
  const demands = t.keys.map((k) => BY_KEY[k]?.demand ?? 0);
  const gaps = GAP * (t.keys.length - 1);
  const total = demands.reduce((a, b) => a + b, 0);
  const spare = Math.max(0, width - gaps - total);
  return demands.map((d) => d + (total ? (spare * d) / total : 0));
}

/** The persisted thing-order, validated the same way the instrument order is. */
export function normalizeThings(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of String(raw ?? '').split(',')) {
    const id = k.trim();
    if (id in THING_BY_ID && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  for (const t of THINGS) if (!seen.has(t.id)) out.push(t.id);
  return out;
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
 * THE 16px MARKS ARE GENERATED, NOT DRAWN (chooser chain: `practice-room-icons` Q1/04 →
 * `practice-room-systems` Q1/01 → `practice-room-encoding` Q1/01, Q2/01, Q3/03).
 *
 * THE RULE, in full, so anyone can reproduce it:
 *
 *     box 16 · module 4 · stroke 1.8 round · a mark is `n` full-width bars at angle `θ`
 *     n = how many things the instrument counts
 *     θ = 0° if its pitches SOUND · 45° if they are MEASURED
 *
 * Nothing is hand-drawn and there is no override table — the owner picked "no exceptions, the
 * formula's output ships, always". A sixth instrument needs no drawing, only its `counts` and
 * its `sounds`.
 *
 * THE CEILING, stated because it is the one thing this rule cannot do. The space is
 * `maxRows × 2` = 8 marks. That is enough to identify the five instruments uniquely (verified
 * below and in the unit tests) and NOT enough for the 10–15 app suite the owner has in mind:
 * 15 apps into 8 marks collides by arithmetic, whatever the drawing. When the suite grows past
 * eight, the mark stops being an identifier and becomes a TYPE label — several apps share one,
 * and the name distinguishes them. Two ways out, both already costed on the sheets: widen the
 * alphabet (a bar may be a left half, a right half, a split, or absent — 5^rows × angles) or
 * carry the domain on the angle. `work/understand/practice-room-alphabet/` measured the first
 * at 0 collisions for 15 apps and 1 for 30.
 *
 * THE FACTS ARE SHARPENED RATHER THAN AVERAGED (encoding chooser Q3/03): each instrument's
 * `counts` is what it actually counts, chosen so the five are distinct. The metronome counts
 * its four beats; the dealer counts a chord's three-note core, not the seventh, because
 * `counts: 4` would collide with the metronome at 4 bars. That is a data decision, recorded
 * here, and the alternative — a hand-drawn exception — is what the owner's pick forbids.
 *
 * `currentColor` throughout, so a mark inherits ink or accent from the row it sits in and
 * carries no colour of its own — the site's one-hue rule.
 */
const STROKE =
  'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

/** The generator's own constants. `MAX_ROWS` is what bounds the space to 8 marks. */
export const MARK = { box: 16, module: 4, halfSpan: 5.5, maxRows: 4 } as const;

/**
 * What each instrument counts, and whether its pitches sound. These two facts ARE the mark —
 * see the note above on sharpening. Keyed to `INSTRUMENTS`.
 */
export const MARK_FACTS: Readonly<Record<string, { counts: number; sounds: boolean; why: string }>> = {
  tuner:     { counts: 1, sounds: false, why: 'one pitch, measured against a reference' },
  metronome: { counts: 4, sounds: true,  why: 'four beats, sounded as clicks' },
  drone:     { counts: 2, sounds: true,  why: 'a root and one interval, sounding together' },
  changes:   { counts: 3, sounds: true,  why: "a chord's three-note core, sounded" },
  loop:      { counts: 2, sounds: false, why: 'two carets, a and b, measured on a track' },
};

/**
 * THE GENERATOR. `n` bars stacked on the module, centred in the box, at `θ`.
 * A slanted bar is drawn through the row's own centre so the stack shears as one object
 * rather than each bar sliding independently.
 */
export function markInner(counts: number, sounds: boolean): string {
  const n = Math.max(1, Math.min(MARK.maxRows, Math.round(counts)));
  const deg = sounds ? 0 : 45;
  const rad = (deg * Math.PI) / 180;
  const dx = Math.cos(rad) * MARK.halfSpan;
  const dy = Math.sin(rad) * MARK.halfSpan;
  const span = (n - 1) * MARK.module;
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const cy = 8 - span / 2 + i * MARK.module;
    const x0 = (8 - dx).toFixed(2), y0 = (cy - dy).toFixed(2);
    const x1 = (8 + dx).toFixed(2), y1 = (cy + dy).toFixed(2);
    out.push(`<path ${STROKE} d="M${x0} ${y0}L${x1} ${y1}"/>`);
  }
  return out.join('');
}

/** Every instrument's mark, generated from its facts. Same shape the hand-drawn map had. */
export const GLYPHS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(MARK_FACTS).map(([k, f]) => [k, markInner(f.counts, f.sounds)]),
);

/**
 * The mark's own signature — `<n>@<deg>` — which is what a collision check compares. Exposed so
 * a test can assert the five are distinct without rasterising anything.
 */
export function markSignature(key: string): string | null {
  const f = MARK_FACTS[key];
  if (!f) return null;
  return `${Math.max(1, Math.min(MARK.maxRows, f.counts))}@${f.sounds ? 0 : 45}`;
}

/** One instrument's glyph as a complete 16px `<svg>`, ready to inject. */
export function glyphSvg(key: string): string {
  const inner = GLYPHS[key] ?? '';
  return `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">${inner}</svg>`;
}
