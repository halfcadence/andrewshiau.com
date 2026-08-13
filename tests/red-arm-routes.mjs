// RED-ARM THE ROUTED ROOM. Ten sabotages, each the exact defect one assertion exists to catch.
//
// WHY THIS FILE EXISTS. Every claim below was true when it was written, so a green suite proves
// nothing about whether the suite would NOTICE if the claim stopped being true. Each arm breaks ONE
// mechanism, rebuilds, and runs only the test that covers it: the arm passes when that test FAILS.
// An arm that stays green is a hole in the harness, not a compliment.
//
// IT REPLACES `red-arm-index.mjs`, whose twelve arms targeted the one-page index: the plan as page
// 0, `goTo`, the hash deep links, `data-snap`, the back mark hiding itself. Nine of those broke
// source that no longer exists — an arm whose `find` string is absent cannot fire, which the runner
// reports as a hole rather than passing quietly.
//
// FOUR OF THESE ARE DEFECTS THIS CHANGE ACTUALLY SHIPPED WITH for a few minutes, so their arms are
// re-runs of a real failure: the room's own section rendering on every route, the absolute `/console/`
// hrefs that only work on one host, the dot row surviving on the desktop, and the case widths
// spreading a narrow composition across 1400px.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const C = 'src/components/PracticeRoom.astro';

const ARMS = [
  {
    name: 'the room section renders on every route',
    file: C,
    find: "      {page === 'room' && (",
    with: '      {true && (',
    // NOT `caseKeys` — that is the hole this arm found. The index has no `data-mt-key`, so an extra
    // room section on every route left the case list correct while the console's grid gained a
    // fourth child. Counting the BOXES is what sees it.
    covers: 'renders its own cases',
  },
  {
    name: 'a case is keyed by POSITION again, not by its markup',
    file: C,
    find: `  pages?.querySelectorAll<HTMLElement>('[data-mt-key]').forEach((el) => {
    caseEls.set(el.dataset.mtKey!, el);
  });`,
    with: `  INSTRUMENTS.forEach((i, idx) => {
    const el = pages?.children[idx] as HTMLElement | undefined;
    if (el) caseEls.set(i.key, el);
  });`,
    // on /console/ this keys children[1] (the drone) as 'metronome', so the dot row's marks and
    // targets swap — silently, which is what makes it worth an arm
    covers: 'THE DOT ROW IS THE CONSOLE',
  },
  {
    name: 'the box links go absolute, so they only work on one host',
    file: C,
    find: 'href: `${t.id}/`,',
    with: 'href: `/${t.id}/`,',
    covers: 'THE ROOM IS THREE LINKS',
  },
  {
    name: 'the way back points at the site root instead of the room',
    file: C,
    find: `href="../" data-testid="plan-word"`,
    with: `href="/" data-testid="plan-word"`,
    covers: 'THE WAY BACK IS A LINK',
  },
  {
    name: 'the dot row comes back on the desktop',
    file: C,
    find: `  @media (max-width: 759px){
    #mt-app[data-page="console"] .mt-foot{display:flex}
  }`,
    with: `  #mt-app[data-page="console"] .mt-foot{display:flex}`,
    covers: 'THE DOT ROW IS THE CONSOLE',
  },
  {
    name: 'the console page splits into equal thirds',
    file: C,
    find: '#mt-app[data-page="console"] .mt-pages{grid-template-columns:170fr 170fr 196fr}',
    with: '#mt-app[data-page="console"] .mt-pages{grid-template-columns:repeat(3, 1fr)}',
    covers: 'seats the three in proportion to their measured demands',
  },
  {
    name: 'a lone case stretches to the viewport again',
    file: C,
    find: '#mt-app[data-page="changes"] .mt-pages{grid-template-columns:minmax(0, 560px);justify-content:center}',
    with: '#mt-app[data-page="changes"] .mt-pages{grid-template-columns:minmax(0, 1fr)}',
    covers: 'takes its columns from the ROUTE',
    unit: true,
  },
  {
    name: 'the phone scroller returns to every route',
    file: C,
    find: `    #mt-app[data-page="console"] .mt-pages{
      grid-template-columns:repeat(3, 100%);column-gap:0;
      overflow-x:auto;overflow-y:hidden;scrollbar-width:none;
      scroll-snap-type:x mandatory;scroll-padding-left:0}`,
    with: `    .mt-pages{
      grid-template-columns:repeat(3, 100%);column-gap:0;
      overflow-x:auto;overflow-y:hidden;scrollbar-width:none;
      scroll-snap-type:x mandatory;scroll-padding-left:0}`,
    covers: 'have no snap and nothing to swipe',
  },
  {
    name: 'the floor stops filling the room',
    file: C,
    find: '  .mt-order .mt-pfloor{display:grid;grid-row:1 / -1;',
    with: '  .mt-order .mt-pfloor{display:grid;',
    covers: 'THE ROOMS FILL THE FLOOR',
  },
  {
    // the walls are the site's hairline now (his annotation, "light line weight"), so the arm is
    // the other direction: put the 2px ink back and the assertion must notice.
    name: 'the room walls go back to 2px ink',
    file: C,
    find: '    border-color:var(--line);border-left-color:transparent;',
    with: '    border-width:2px;border-color:var(--ink);border-left-color:transparent;',
    covers: "ONE box, and the CASE",
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
    // the CSS claims are asserted in the unit suite (one shared stylesheet, four routes), the rest
    // on the real page
    out = arm.unit
      ? sh(`npx vitest run tests/unit/practice-room-css.test.ts -t "${arm.covers}"`)
      : sh(`npx playwright test tests/e2e/room.spec.ts --reporter=line --retries=0 -g "${arm.covers}"`);
  } catch (e) {
    out = String(e.stdout || '') + String(e.stderr || '');
    failed = /\d+ failed|✕|FAIL/.test(out);
  } finally {
    writeFileSync(arm.file, src);
  }
  const ran = (out.match(/(\d+) (?:passed|failed)/g) || []).join(' ');
  if (failed) { held += 1; console.log(`\n${i + 1}/${ARMS.length}  ✓ ${arm.name} → "${arm.covers}" went RED (${ran})`); }
  else { holes.push(`${arm.name}: "${arm.covers}" stayed GREEN`); console.log(`\n${i + 1}/${ARMS.length}  ✗ ${arm.name} → "${arm.covers}" STAYED GREEN (${ran})`); }
}

// restore and rebuild the real component, so a killed run cannot leave a sabotage on disk
sh('npm run build');
console.log(`\n${held}/${ARMS.length} arms held`);
if (holes.length) { console.log('\nHOLES:'); holes.forEach((h) => console.log('  ✗ ' + h)); process.exit(1); }
