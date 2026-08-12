// THE ROOM'S MEASUREMENTS AND ITS MARKS, asserted rather than eyeballed.
//
// The numbers here are restated from the measurement run rather than imported from the
// module, so a test cannot agree with a typo in the constant it is checking. The demands
// (170/196/170/315/236) come from `work/understand/practice-room-queue/measure-demand.mjs`,
// bisected on the built page one case at a time — EXCEPT the dealer's 315, which that script
// reported as 282 and was wrong about: its break predicate only sees the symbol currently
// dealt, and the case must fit the widest one any deck can deal (`F♯m7♭5`, 259px at 72px,
// + two 3ch insets + hairlines). A predicate that measures what is on screen cannot see a
// worst case one deal away; `changes.spec.ts` probes the widest symbol directly and caught it.

import { describe, it, expect } from 'vitest';
import {
  INSTRUMENTS, BY_KEY, PAD, GAP, glyphSvg, GLYPHS,
  MARK, MARK_FACTS, markInner, markSignature,
  THINGS, THING_BY_ID, thingDemand, splitThing,
} from '../../src/lib/practice-room/room';

const ORDER = ['tuner', 'metronome', 'drone', 'changes', 'loop'];
/** the harness's OWN copy of the measured demands — see the file header */
const DEMAND: Record<string, number> = {
  tuner: 170, metronome: 196, drone: 170, changes: 315, loop: 236,
};

describe('the measured demands', () => {
  it('matches the bisection run for all five instruments', () => {
    expect(INSTRUMENTS.length).toBe(5);
    for (const i of INSTRUMENTS) expect(i.demand).toBe(DEMAND[i.key]);
  });

  it('names what breaks below each demand, so the number stays falsifiable', () => {
    for (const i of INSTRUMENTS) expect(i.breaks.length).toBeGreaterThan(10);
  });

  it('spans 1.85x from the narrowest to the widest — why a slot cannot be one size', () => {
    const ds = INSTRUMENTS.map((i) => i.demand);
    expect(Math.max(...ds) / Math.min(...ds)).toBeCloseTo(315 / 170, 2);
  });
});

/* ── WHAT USED TO BE HERE, AND WHY IT IS NOT (2026-08-12) ───────────────────────────────────
   Four describes — `fitRoom`, `normalizeOrder`, `moveTo / nudge`, `settleTo`, about 40 its —
   covering the queue: how many instruments a width bought, how a persisted order was validated,
   how a drag moved one, where a free scroll locked on release. All of it passed. All of it
   described a design the owner rejected once he saw it built, and the functions are deleted, so
   the tests go with them rather than being adapted.

   THIS IS THE POINT WORTH KEEPING. `settleTo` had already outlived the mechanism by one round on
   the grounds that "it stays exported for its unit tests" — a deleted feature kept alive by its
   own harness, which is how a codebase ends up describing something it does not do. A test that
   pins behaviour nothing ships is not coverage; it is a second copy of the old design. What the
   room does now is asserted in tests/e2e/room.spec.ts, where the claims are about pages and
   navigation rather than about fitting. */

describe('the GENERATED marks — the formula, its output, and its ceiling', () => {
  // The rule, restated independently of the module: n bars at θ, n = counts (capped),
  // θ = 0 if the pitches sound else 45. A test that imported the generator to check the
  // generator would prove nothing.
  const WANT: Record<string, { n: number; deg: number }> = {
    tuner:     { n: 1, deg: 45 },
    metronome: { n: 4, deg: 0  },
    drone:     { n: 2, deg: 0  },
    changes:   { n: 3, deg: 0  },
    loop:      { n: 2, deg: 45 },
  };

  it('draws exactly n bars for each instrument', () => {
    for (const [k, w] of Object.entries(WANT)) {
      const paths = (GLYPHS[k].match(/<path /g) || []).length;
      expect(paths, `${k} should draw ${w.n} bars`).toBe(w.n);
    }
  });

  it('slants a measured instrument and levels a sounding one', () => {
    // a level bar has equal y at both ends; a 45° bar does not
    for (const [k, w] of Object.entries(WANT)) {
      const m = GLYPHS[k].match(/d="M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)"/);
      expect(m, `${k} should draw a line`).toBeTruthy();
      const level = Math.abs(Number(m![2]) - Number(m![4])) < 0.01;
      expect(level, `${k} level=${level} but deg=${w.deg}`).toBe(w.deg === 0);
    }
  });

  it('THE FIVE DO NOT COLLIDE — every signature is distinct', () => {
    const sigs = INSTRUMENTS.map((i) => markSignature(i.key));
    expect(sigs.every(Boolean)).toBe(true);
    expect(new Set(sigs).size, `collision in ${sigs.join(' ')}`).toBe(INSTRUMENTS.length);
  });

  it('states its ceiling honestly: maxRows x 2 marks, and 5 fit inside it', () => {
    const space = MARK.maxRows * 2;
    expect(space).toBe(8);
    expect(INSTRUMENTS.length).toBeLessThanOrEqual(space);
    // AND THE THING IT CANNOT DO, asserted so a future suite cannot quietly overflow it:
    // 15 apps into 8 marks collides by arithmetic, whatever the drawing.
    expect(15).toBeGreaterThan(space);
  });

  it('caps the row count rather than drawing off the box', () => {
    // an instrument counting 9 must not draw 9 bars in a 16px box
    const inner = markInner(9, true);
    expect((inner.match(/<path /g) || []).length).toBe(MARK.maxRows);
    // every y stays inside the box
    for (const m of inner.matchAll(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/g)) {
      for (const y of [Number(m[2]), Number(m[4])]) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(16);
      }
    }
  });

  it('never draws nothing', () => {
    for (const c of [0, -3, 1, 4, 99]) expect(markInner(c, true)).toContain('<path');
  });

  it('every fact carries the reason it was chosen', () => {
    for (const i of INSTRUMENTS) {
      expect(MARK_FACTS[i.key], `${i.key} needs facts`).toBeTruthy();
      expect(MARK_FACTS[i.key].why.length).toBeGreaterThan(12);
    }
  });

  it('uses the site\'s own 1.8 stroke, round-capped', () => {
    for (const i of INSTRUMENTS) {
      expect(GLYPHS[i.key]).toContain('stroke-width="1.8"');
      expect(GLYPHS[i.key]).toContain('stroke-linecap="round"');
    }
  });
});

describe('the 16px glyphs', () => {
  it('draws one per instrument', () => {
    for (const i of INSTRUMENTS) expect(GLYPHS[i.key]).toBeTruthy();
  });

  it('draws five DISTINCT glyphs — five identical marks is the failure mode', () => {
    const drawings = INSTRUMENTS.map((i) => GLYPHS[i.key]);
    expect(new Set(drawings).size).toBe(5);
  });

  it('carries no colour of its own, so a row can ink or accent it', () => {
    for (const i of INSTRUMENTS) {
      expect(GLYPHS[i.key]).toContain('currentColor');
      expect(GLYPHS[i.key]).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });

  it('is sized explicitly — a viewBox-only svg stretches to its container', () => {
    const svg = glyphSvg('tuner');
    expect(svg).toContain('width="16"');
    expect(svg).toContain('height="16"');
    expect(svg).toContain('viewBox="0 0 16 16"');
    expect(svg).toContain('aria-hidden="true"');
  });

  it('returns an empty but valid svg for an unknown key', () => {
    expect(glyphSvg('nope')).toContain('<svg');
  });
});

describe('THINGS — the console and the two standalones (box + plan choosers)', () => {
  const D: Record<string, number> = { tuner: 170, metronome: 196, drone: 170, changes: 315, loop: 236 };
  const ORDER3 = ['console', 'changes', 'loop'];

  it('holds three things, not five instruments', () => {
    expect(THINGS.length).toBe(3);
    expect(THINGS.flatMap((t) => t.keys).sort())
      .toEqual(['changes', 'drone', 'loop', 'metronome', 'tuner']);
  });

  it('the console seats exactly the three you play with', () => {
    expect(THING_BY_ID.console.keys).toEqual(['tuner', 'drone', 'metronome']);
  });

  it("a thing's demand is its members plus the gaps between them", () => {
    // computed here rather than imported, so a typo in the module cannot agree with itself
    expect(thingDemand('console')).toBe(D.tuner + D.drone + D.metronome + GAP * 2);
    expect(thingDemand('console')).toBe(648);
    expect(thingDemand('changes')).toBe(D.changes);
    expect(thingDemand('loop')).toBe(D.loop);
    expect(thingDemand('nope')).toBe(0);
  });

  it('THE CONSOLE IS WHY THE PHONE BAND IS 760 — and the stylesheet must agree', () => {
    // The band is a media query, so it cannot ask a function; this is the derivation, and if a
    // member's demand changes, this failing is the notice that the 760 in the CSS is now wrong.
    expect(thingDemand('console') + PAD * 2).toBe(760);
  });

  it("splits a thing's width among its members in proportion to their demands", () => {
    const w = thingDemand('console');
    const parts = splitThing('console', w);
    expect(parts.map(Math.round)).toEqual([D.tuner, D.drone, D.metronome]);
    // and extra room reaches every member rather than pooling in one
    const wide = splitThing('console', w + 300);
    expect(wide.every((p, i) => p > parts[i])).toBe(true);
    expect(wide.reduce((a, b) => a + b, 0) + GAP * 2).toBeCloseTo(w + 300, 4);
  });

  it('a standalone splits to itself', () => {
    expect(splitThing('loop', 400)).toEqual([400]);
  });

  it('THINGS is the whole model — positions are fixed, so there is nothing to persist', () => {
    // `normalizeThings` is deleted with the drag it validated for. The plan draws THINGS in
    // source order at every width, so the order is a fact about this array and nothing else.
    expect(THINGS.map((t) => t.id)).toEqual(ORDER3);
    expect(Object.keys(THING_BY_ID)).toEqual(ORDER3);
  });
});
