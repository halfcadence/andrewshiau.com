// ONE SOURCE for the route→instrument structure. Each practice-room route renders the cases
// of exactly one Thing (plus the room, which renders none); this pins that mapping to room.ts's
// THINGS so the component and the model cannot disagree. Written against the component's local
// literal, kept green across the collapse into room.ts's own ROUTE_CASES export.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as room from '../../src/lib/practice-room/room';

const ROOT = join(__dirname, '..', '..');
const component = readFileSync(
  join(ROOT, 'src', 'components', 'PracticeRoom.astro'), 'utf8');

/** The component's route→cases mapping, from wherever it currently lives. */
function componentRouteCases(): Record<string, readonly string[]> {
  const literal = component.match(/const ROUTE_CASES[^=]*=\s*\{([^}]*)\}/);
  if (literal) {
    const map: Record<string, readonly string[]> = {};
    for (const m of literal[1].matchAll(/(\w+):\s*(\[\]|THING_BY_ID\.(\w+)\.keys)/g)) {
      map[m[1]] = m[2] === '[]' ? [] : room.THING_BY_ID[m[3]].keys;
    }
    return map;
  }
  // no local literal: the component must import the module's own mapping at build time
  expect(component,
    'without a local literal, PracticeRoom.astro must import ROUTE_CASES from room.ts',
  ).toMatch(/import\s*\{[^}]*\bROUTE_CASES\b[^}]*\}\s*from '\.\.\/lib\/practice-room\/room'/);
  const exported = (room as Record<string, unknown>).ROUTE_CASES;
  expect(exported, 'room.ts exports ROUTE_CASES').toBeTruthy();
  return exported as Record<string, readonly string[]>;
}

describe('route→instrument mapping equals THINGS', () => {
  it('routes are exactly the room plus one per thing', () => {
    const rc = componentRouteCases();
    expect(Object.keys(rc).sort())
      .toEqual(['room', ...room.THINGS.map((t) => t.id)].sort());
  });

  it('the room renders no cases; each thing route renders its keys, in order', () => {
    const rc = componentRouteCases();
    expect(rc.room).toEqual([]);
    for (const t of room.THINGS) expect(rc[t.id]).toEqual([...t.keys]);
  });

  it('every case a route renders is a real instrument', () => {
    const rc = componentRouteCases();
    for (const keys of Object.values(rc)) {
      for (const k of keys) expect(room.BY_KEY[k], `instrument ${k}`).toBeTruthy();
    }
  });
});
