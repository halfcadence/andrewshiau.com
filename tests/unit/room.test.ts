// THE ROOM'S ARITHMETIC, asserted against the measured demands rather than eyeballed.
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
  INSTRUMENTS, BY_KEY, PAD, GAP,
  fitRoom, normalizeOrder, moveTo, nudge, settleTo, glyphSvg, GLYPHS,
  MARK, MARK_FACTS, markInner, markSignature,
  THINGS, THING_BY_ID, thingDemand, fitThings, splitThing, normalizeThings,
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

describe('fitRoom — how many a width buys', () => {
  // The independent expectation: walk the queue greedily at the harness's own demands.
  const expectFit = (order: string[], w: number) => {
    let used = PAD * 2, n = 0;
    for (const k of order) {
      const add = DEMAND[k] + (n ? GAP : 0);
      if (used + add > w) break;
      used += add; n += 1;
    }
    return Math.max(1, n);
  };

  for (const w of [400, 560, 700, 840, 1044, 1280, 1512, 1920]) {
    it(`at ${w}px shows ${expectFit(ORDER, w)}`, () => {
      expect(fitRoom(ORDER, w).shown.length).toBe(expectFit(ORDER, w));
    });
  }

  it('never drops the rest of the queue — shown + queued is always the whole order', () => {
    for (const w of [300, 560, 840, 1423, 1920]) {
      const f = fitRoom(ORDER, w);
      expect([...f.shown, ...f.queued]).toEqual(ORDER);
    }
  });

  it('fills the room: occupied width equals the viewport, to a rounding error', () => {
    for (const w of [560, 700, 840, 1044, 1512]) {
      const f = fitRoom(ORDER, w);
      const occupied = f.widths.reduce((a, b) => a + b, 0) + GAP * (f.shown.length - 1) + PAD * 2;
      expect(occupied).toBeCloseTo(w, 4);
    }
  });

  it('gives every shown instrument at least its own demand', () => {
    for (const w of [560, 840, 1044, 1512]) {
      const f = fitRoom(ORDER, w);
      f.shown.forEach((k, i) => expect(f.widths[i]).toBeGreaterThanOrEqual(DEMAND[k]));
    }
  });

  it('shares the leftover equally — every shown case gets the same share', () => {
    const f = fitRoom(ORDER, 1044);
    const overs = f.shown.map((k, i) => f.widths[i] - DEMAND[k]);
    for (const o of overs) expect(o).toBeCloseTo(f.share, 6);
  });

  it('holds all five at 1423px, which is what the five demands plus chrome come to', () => {
    const need = Object.values(DEMAND).reduce((a, b) => a + b, 0) + PAD * 2 + GAP * 4;
    expect(need).toBe(1423);
    expect(fitRoom(ORDER, need).shown.length).toBe(5);
    // and one pixel under, the last one is still in the queue rather than gone
    const under = fitRoom(ORDER, need - 1);
    expect(under.shown.length).toBe(4);
    expect(under.queued).toEqual(['loop']);
  });

  it('THE ORDER CHANGES THE COUNT — the dealer first costs a slot at 840px', () => {
    expect(fitRoom(ORDER, 840).shown.length).toBe(3);
    expect(fitRoom(['changes', 'tuner', 'metronome', 'drone', 'loop'], 840).shown.length).toBe(2);
  });

  it('always shows one case, even below the narrowest demand', () => {
    const f = fitRoom(ORDER, 120);
    expect(f.shown).toEqual(['tuner']);
    expect(f.share).toBe(0);            // never negative: a share cannot shrink a case
    expect(f.widths[0]).toBe(DEMAND.tuner);
  });

  it('is empty only for an empty order', () => {
    expect(fitRoom([], 1000).shown).toEqual([]);
    expect(fitRoom(['nope'], 1000).shown).toEqual([]);
  });
});

describe('normalizeOrder — a persisted order is validated, not trusted', () => {
  it('keeps a valid order as written', () => {
    expect(normalizeOrder('drone,tuner,loop,changes,metronome'))
      .toEqual(['drone', 'tuner', 'loop', 'changes', 'metronome']);
  });

  it('drops unknown keys — a stale value from another era must not break the room', () => {
    expect(normalizeOrder('drone,pitchgraph,tuner')[0]).toBe('drone');
    expect(normalizeOrder('drone,pitchgraph,tuner')).not.toContain('pitchgraph');
  });

  it('appends instruments the stored order never mentioned', () => {
    const out = normalizeOrder('loop');
    expect(out[0]).toBe('loop');
    expect(out.length).toBe(5);
    expect(new Set(out).size).toBe(5);
  });

  it('collapses duplicates', () => {
    expect(normalizeOrder('tuner,tuner,tuner').filter((k) => k === 'tuner').length).toBe(1);
  });

  it('returns the default order for junk, null and empty', () => {
    for (const raw of [null, undefined, '', ' , , ', '{"a":1}']) {
      expect(normalizeOrder(raw as string | null)).toEqual(ORDER);
    }
  });

  it('is always a permutation of exactly what exists now', () => {
    for (const raw of ['loop', 'x,y,z', 'changes,changes', null]) {
      const out = normalizeOrder(raw as string | null);
      expect([...out].sort()).toEqual([...ORDER].sort());
    }
  });
});

describe('moveTo / nudge — the drag and its keyboard equivalent', () => {
  it('moves a key to an index', () => {
    expect(moveTo(ORDER, 'loop', 0)).toEqual(['loop', 'tuner', 'metronome', 'drone', 'changes']);
    expect(moveTo(ORDER, 'tuner', 4)).toEqual(['metronome', 'drone', 'changes', 'loop', 'tuner']);
  });

  it('does not mutate its input', () => {
    const before = [...ORDER];
    moveTo(ORDER, 'loop', 0);
    expect(ORDER).toEqual(before);
  });

  it('clamps an out-of-range index rather than losing the key', () => {
    expect(moveTo(ORDER, 'tuner', 99).length).toBe(5);
    expect(moveTo(ORDER, 'tuner', -5)[0]).toBe('tuner');
  });

  it('nudges one place either way', () => {
    expect(nudge(ORDER, 'drone', -1)).toEqual(['tuner', 'drone', 'metronome', 'changes', 'loop']);
    expect(nudge(ORDER, 'drone', 1)).toEqual(['tuner', 'metronome', 'changes', 'drone', 'loop']);
  });

  it('is a no-op past either end, and for a key not in the order', () => {
    expect(nudge(ORDER, 'tuner', -1)).toEqual(ORDER);
    expect(nudge(ORDER, 'loop', 1)).toEqual(ORDER);
    expect(nudge(ORDER, 'nope', 1)).toEqual(ORDER);
  });
});

describe('settleTo — free scroll, lock on release', () => {
  it('locks to the nearest case offset', () => {
    expect(settleTo([0, 226, 508], 40)).toBe(0);
    expect(settleTo([0, 226, 508], 200)).toBe(226);
    expect(settleTo([0, 226, 508], 400)).toBe(508);
  });

  it('returns null when already there — no pointless correcting animation', () => {
    expect(settleTo([0, 226, 508], 226)).toBeNull();
    expect(settleTo([0, 226, 508], 226.5)).toBeNull();   // inside the default 1px tolerance
    expect(settleTo([0, 226, 508], 228)).toBe(226);      // outside it
  });

  it('handles the empty room', () => {
    expect(settleTo([], 100)).toBeNull();
  });
});

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

  it('all three need the same 1423px the five instruments did', () => {
    const need = ORDER3.reduce((a, id) => a + thingDemand(id), 0) + PAD * 2 + GAP * 2;
    expect(need).toBe(1423);
    expect(fitThings(ORDER3, need).shown.length).toBe(3);
    expect(fitThings(ORDER3, need - 1).shown).toEqual(['console', 'changes']);
  });

  it('A CONSOLE THAT DOES NOT FIT WHOLE DOES NOT FIT AT ALL', () => {
    // 647 is one px under the console's own demand plus the room's padding
    const justUnder = thingDemand('console') + PAD * 2 - 1;
    const f = fitThings(ORDER3, justUnder);
    // it is forced (one thing always shows) but nothing is seated BESIDE a partial console
    expect(f.shown).toEqual(['console']);
    expect(f.queued).toEqual(['changes', 'loop']);
  });

  it('shares the leftover equally between the things that fit', () => {
    const f = fitThings(ORDER3, 1600);
    const overs = f.shown.map((id, i) => f.widths[i] - thingDemand(id));
    for (const o of overs) expect(o).toBeCloseTo(f.share, 6);
    const occupied = f.widths.reduce((a, b) => a + b, 0) + GAP * (f.shown.length - 1) + PAD * 2;
    expect(occupied).toBeCloseTo(1600, 4);
  });

  it('never drops a thing — shown + queued is the whole order', () => {
    for (const w of [300, 700, 900, 1423, 1920]) {
      const f = fitThings(ORDER3, w);
      expect([...f.shown, ...f.queued]).toEqual(ORDER3);
    }
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

  it('validates a persisted thing-order rather than trusting it', () => {
    expect(normalizeThings('loop,console,changes')).toEqual(['loop', 'console', 'changes']);
    expect(normalizeThings('loop')).toEqual(['loop', 'console', 'changes']);
    expect(normalizeThings('tuner,nope')).toEqual(['console', 'changes', 'loop']);
    for (const raw of [null, '', ' , ']) expect(normalizeThings(raw as string | null)).toEqual(['console', 'changes', 'loop']);
    // always a permutation of exactly what exists
    for (const raw of ['loop', 'x', null]) {
      expect([...normalizeThings(raw as string | null)].sort()).toEqual(['changes', 'console', 'loop']);
    }
  });
});
