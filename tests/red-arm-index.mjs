// RED-ARM THE INDEX ROOM. Ten sabotages, each the exact defect one assertion exists to catch.
//
// WHY THIS FILE EXISTS. Every claim below was true of the page when it was written, so a green
// suite proves nothing about whether the suite would notice if the claim stopped being true. Each
// arm breaks ONE mechanism, rebuilds, and runs ONLY the test that covers it: the arm passes when
// that test FAILS. An arm that stays green is a hole in the harness, not a compliment.
//
// Three of these are defects the page actually shipped with today — the phone's 56px scroll
// padding, the `--inset` token that does not exist, and the dot row's page-index arithmetic — so
// their arms are re-runs of a real failure rather than hypotheticals.
//
// Run: node tests/red-arm-index.mjs            (needs a free port; uses E2E_PORT=4399)

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const PAGE = 'src/pages/practice-room.astro';

const ARMS = [
  {
    name: 'the room no longer opens on the plan',
    file: PAGE,
    find: 'if (!opened) { opened = true; pages.scrollLeft = 0; }',
    with: 'if (!opened) { opened = true; }',
    covers: 'THE ROOM OPENS ON THE PLAN',
  },
  {
    name: 'the dots go back to page-index arithmetic',
    file: PAGE,
    find: `    Array.from(dots.children).forEach((b, i) =>
      b.classList.toggle('cur', onScreen(dotTargets[i]?.() ?? null)));`,
    with: `    const idx = pages.clientWidth ? Math.round(pages.scrollLeft / pages.clientWidth) : 0;
    Array.from(dots.children).forEach((b, i) => b.classList.toggle('cur', i === idx));`,
    covers: 'THE CURRENT DOT IS THE PAGE ON SCREEN',
  },
  {
    name: 'the phone gets the desktop inset back',
    file: PAGE,
    find: '      scroll-padding-left:0;',
    with: '      scroll-padding-left:var(--group);',
    covers: 'the phone snaps too',
  },
  {
    name: 'the floor padding reads the token that does not exist',
    file: PAGE,
    find: '    padding:var(--lead) var(--mt-inset)}',
    with: '    padding:var(--lead) var(--inset)}',
    covers: 'it is ONE box with the things inside it',
  },
  {
    // ARM THE ROOM'S OWN ROW, NOT THE FLOOR'S HEIGHT. The first version of this arm removed
    // `height:100%` from the floor and every assertion stayed green — because a grid item
    // stretches anyway, so the declaration was inert (it is now deleted). The row is what carries
    // it: `align-content:start` is the exact state that shipped a 62px strip of chips inside a
    // 742px case.
    //
    // AND THIS ARM FOUND A REAL HOLE ON ITS SECOND RUN. With the row sabotaged the floor
    // collapsed to 116px inside a 516px room, and BOTH original ratios stayed green: `room/page`
    // because the room still stretched, and `box/floor` because the box and the floor shrank
    // together. A chain of ratios can pass link by link while the middle link is missing — the
    // test now also asserts the floor fills the room's own content box.
    name: 'the rooms stop filling the floor',
    file: PAGE,
    find: '#mt-planroom{position:relative;display:grid;grid-template-rows:minmax(0, 1fr);gap:var(--lead);',
    with: '#mt-planroom{position:relative;display:grid;align-content:start;gap:var(--lead);',
    covers: 'THE ROOMS FILL THE FLOOR',
  },
  {
    name: 'the plan\'s 32px mark thickens with the box',
    file: PAGE,
    find: '  #mt-planroom :global(.mt-pmarks svg path){vector-effect:non-scaling-stroke}',
    with: '  #mt-planroom :global(.mt-pmarks svg path){vector-effect:none}',
    covers: 'the marks are drawn at 32px here',
  },
  {
    name: 'every case becomes a snap point again',
    file: PAGE,
    find: '  .mt-pages > .mt-half[data-snap]{scroll-snap-align:start}',
    with: '  .mt-pages > .mt-half{scroll-snap-align:start}',
    covers: "ONLY A PAGE'S FIRST CASE IS A SNAP POINT",
  },
  {
    name: 'the back mark shows on the plan it points at',
    file: PAGE,
    find: "      const sync = () => { word.style.visibility = onScreen(orderPage) ? 'hidden' : 'visible'; };",
    with: "      const sync = () => { word.style.visibility = 'visible'; };",
    covers: 'the back mark is HIDDEN on the plan',
  },
  {
    name: 'the phone draws three rooms across a 390px floor',
    file: PAGE,
    find: `    #mt-planroom :global(.mt-pfloor){grid-template-columns:minmax(0, 1fr);
      grid-auto-rows:minmax(0, 1fr);gap:var(--lead)}`,
    with: `    #mt-planroom :global(.mt-pfloor){grid-template-columns:repeat(3, minmax(0, 1fr));
      gap:var(--lead)}`,
    // NOT the truncation test: the names WRAP now, so three across a 390px floor sets `the
    // changes` on two lines rather than clipping it, and that assertion stayed green. What the
    // stack really buys is room for the console's three 32px marks — asserted in the thirds test.
    covers: "the slots are the screen's thirds",
  },
  {
    name: 'the console splits its page into equal thirds',
    file: PAGE,
    find: '      const parts = splitThing(t.id, pageW);',
    with: '      const parts = t.keys.map(() => (pageW - GAP * (t.keys.length - 1)) / t.keys.length);',
    covers: '760px is the plan plus one page per thing',
  },
  {
    name: 'a deep link resolves to the instrument, not to its page',
    file: PAGE,
    find: "    return caseEls.get(isPhone() ? (thing.keys.includes(id) ? id : thing.keys[0]) : thing.keys[0]) ?? null;",
    with: "    return caseEls.get(thing.keys.includes(id) ? id : thing.keys[0]) ?? null;",
    covers: '#metronome opens the page holding tuner',
  },
  {
    name: 'the hash stops following the scroll',
    file: PAGE,
    find: '  function syncHash() {\n    if (!caseEls.size) return;',
    with: '  function syncHash() {\n    if (caseEls.size) return;',
    covers: 'THE HASH FOLLOWS THE SCROLL',
  },
];

const sh = (cmd) => execSync(cmd, { stdio: 'pipe', encoding: 'utf8', env: { ...process.env, E2E_PORT: '4399' } });

let held = 0;
const holes = [];

for (const [i, arm] of ARMS.entries()) {
  const src = readFileSync(arm.file, 'utf8');
  const n = src.split(arm.find).length - 1;
  if (n !== 1) {
    holes.push(`${arm.name}: the sabotage target appears ${n} times — the arm never fired`);
    console.log(`\n${i + 1}/${ARMS.length}  ✗ ${arm.name} — TARGET NOT UNIQUE (${n})`);
    continue;
  }
  writeFileSync(arm.file, src.replace(arm.find, arm.with));
  let failed = false; let out = '';
  try {
    sh('npm run build');
    out = sh(`npx playwright test tests/e2e/room.spec.ts --reporter=line --retries=0 -g "${arm.covers}"`);
  } catch (e) {
    out = String(e.stdout || '') + String(e.stderr || '');
    failed = /\d+ failed/.test(out);
  } finally {
    writeFileSync(arm.file, src);
  }
  const ran = (out.match(/(\d+) (?:passed|failed)/g) || []).join(' ');
  if (failed) { held += 1; console.log(`\n${i + 1}/${ARMS.length}  ✓ ${arm.name} → "${arm.covers}" went RED (${ran})`); }
  else { holes.push(`${arm.name}: "${arm.covers}" stayed GREEN`); console.log(`\n${i + 1}/${ARMS.length}  ✗ ${arm.name} → "${arm.covers}" STAYED GREEN (${ran})`); }
}

// restore and rebuild the real page, so a killed run cannot leave a sabotage on disk
sh('npm run build');
console.log(`\n${held}/${ARMS.length} arms held`);
if (holes.length) { console.log('\nHOLES:'); holes.forEach((h) => console.log('  ✗ ' + h)); process.exit(1); }
