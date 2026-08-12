// THE ROOM'S MEASUREMENTS, AND THE MARKS: what a case needs, what a page holds, what an app's
// figure is.
//
// WHY THIS FILE EXISTS. The room used to be five columns written into the page —
// `1fr 1fr 210px 315px 236px` — with the count fixed at five and the order fixed by source
// position. A sixth instrument meant editing a grid, and every viewport under 1477px got the
// phone swiper because five fixed columns do not fit a laptop.
//
// IT WAS A QUEUE FOR ONE DAY (chooser `practice-room-queue`, 2026-08-11): an order you set once,
// a width that decided how many of it were on screen, the rest reached by scrolling. The owner
// rejected it on sight of the built page — "the snapping and settling don't work quite right, i
// also think its a bit concerningly busy on desktop" — and the room is an INDEX now: the plan is
// page 0, every thing is one whole page, you press a box to open it and a mark to come back.
//
// SO THE QUEUE'S ARITHMETIC IS DELETED, not kept for a rainy day: `fitRoom`, `fitThings`,
// `normalizeOrder`, `normalizeThings`, `moveTo`, `nudge`, `settleTo` and their two interfaces,
// with the ~40 unit tests that covered them. A pure function nothing calls still describes the
// design to whoever reads it next, and `settleTo` had already survived one round on the excuse
// that its tests needed it — which is a deleted mechanism kept alive by its own harness. What is
// left is what the page calls: the demands, PAD/GAP, THINGS, splitThing, and the mark generator.
//
// EVERY NUMBER BELOW IS MEASURED, NOT PREFERRED. `demand` is the width at which an
// instrument's own ink breaks, bisected on the built page one case at a time by
// `work/understand/practice-room-queue/measure-demand.mjs`, against each case's SHIPPED row
// heights. The first run of that script called all five broken at 900px because it measured
// `scrollWidth` — but every control here pads out to a 44px tap target with matching negative
// margins, so a box edge is nowhere near its visible edge (the trap
// `practice-room-two-datums` records). Measuring INK instead gave these five.
//
// Pure functions on numbers. No DOM, no CSS, so the arithmetic is asserted in
// tests/unit/room.test.ts rather than eyeballed in a browser.

/** One instrument in the room. `demand` is measured; see the file header. */
export interface Instrument {
  /** stable id — what a case, a dot and a mark are all keyed by */
  key: string;
  /** the word the phone's dot row and the plan print */
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

/* ══════════════════════════════════════════════════════════════════════════════════════
   THINGS, NOT INSTRUMENTS (chooser `practice-room-plan` Q1/02, `practice-room-box` Q1/04,
   Q2/04, Q3/02, Q4/04 — 2026-08-12)
   ══════════════════════════════════════════════════════════════════════════════════════
   The room held five peers and the owner's verdict was that it read as busy. His grouping,
   taken as the premise: the tuner, the drone and the metronome are the things you use WHILE
   PLAYING and often together — tuning against a drone, a drone against a click — so they are
   ONE thing, a console. The changes and the loop are things you WORK AT, one at a time, and
   each wants the screen. So the room holds THREE things, not five.

   THE CONSOLE IS A PAGE, NOT A DOM WRAPPER. Its three cases stay siblings in `#mt-pages`; what
   makes them one thing is that they share a page and only the first of them is a snap point.
   Wrapping them in a container would have re-parented three live instruments — every listener,
   every `data-testid`, and the row ladder they subgrid onto — to buy nothing the column
   arithmetic already gives. Its demand is the sum of its members plus the gaps between them.

   THERE IS NO OUTSIDE (box Q4/04): every thing is always in the room, and positions are FIXED —
   the plan has no shelf and no ordering, so THINGS is the whole model of what the room holds. */

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
 *
 * The console comes to 170 + 170 + 196 + 2×56 = 648, and that number is WHY THE PHONE BAND IS AT
 * 760: 648 plus the room's two 56px paddings is the narrowest desktop page that can hold the
 * console's three cases at their measured minimums. Nothing calls this at runtime — the band is a
 * media query, and a media query cannot ask a function — so it exists to derive that constant and
 * is asserted in the unit tests. If a member's demand changes, the failing test is the notice
 * that the 760 in the stylesheet is now wrong.
 */
export function thingDemand(id: string): number {
  const t = THING_BY_ID[id];
  if (!t) return 0;
  return t.keys.reduce((a, k) => a + (BY_KEY[k]?.demand ?? 0), 0) + GAP * (t.keys.length - 1);
}

/**
 * HOW A THING'S PAGE IS SPLIT between its instruments — by their measured demands in proportion,
 * so a console's extra room reaches the dial and the pendulum rather than pooling in one case.
 * NOT equal thirds: at 760 a third is 178 and the metronome needs 196, so equal thirds would
 * break the case at the exact width the phone band was bisected for.
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
