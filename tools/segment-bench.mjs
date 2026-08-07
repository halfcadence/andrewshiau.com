// The segmentation bench: run every strategy against the same set of hard contours and
// print what each one decides.
//
// Why this exists. `segment.ts` is a registry precisely because there is no answer that
// is right everywhere, which means the way to evaluate a change to it is to look at ALL
// the mechanisms against ALL the cases at once. A unit test asserts one property; this
// prints the whole matrix, so "raise the hysteresis band to 70" becomes a thing you can
// see the consequences of in one command instead of a thing you argue about.
//
// It is also the adoption path for a finding: a new strategy from a paper or from another
// tool's source is added to the registry, and this tells you whether it actually beats
// what is there on the cases we know are hard.
//
//   node tools/segment-bench.mjs                       # every strategy, defaults
//   node tools/segment-bench.mjs --id hysteresis       # one strategy
//   node tools/segment-bench.mjs --id hysteresis --band 70
//   node tools/segment-bench.mjs --sweep band=50,55,62,70,80
//
// Getting the TypeScript module into plain Node: esbuild strips the types. It is NOT a
// top-level dependency here — it ships nested under Astro — so it is resolved rather than
// imported by bare name, and the failure is explicit if that ever moves. (First version
// of this file imported 'esbuild' directly and asserted in a comment that it was a
// dependency. It is not; the import threw.)
//
// The point of the transform is that the bench imports the REAL module. A bench that
// reimplements the thing it benches measures the bench.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'src', 'lib', 'practice-room', 'segment.ts');
const require = createRequire(import.meta.url);

let transformSync;
try {
  ({ transformSync } = require('esbuild'));
} catch {
  try {
    ({ transformSync } = require(require.resolve('esbuild', {
      paths: [join(HERE, '..', 'node_modules', 'astro')],
    })));
  } catch {
    console.error('esbuild not found. It ships nested under Astro; if that has changed, '
      + 'install it (npm i -D esbuild) or point this file at whatever strips types now.');
    process.exit(1);
  }
}

const js = transformSync(readFileSync(SRC, 'utf8'), { loader: 'ts', format: 'esm' }).code;
const dir = mkdtempSync(join(tmpdir(), 'segbench-'));
const out = join(dir, 'segment.mjs');
writeFileSync(out, js);
const { STRATEGIES, DEFAULT_STRATEGY_ID, segment, noteRuns, resolveParams, getStrategy } =
  await import(pathToFileURL(out).href);

const STEP_MS = 66;
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const nm = (m) => (m === null ? '—' : NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1));
const sgn = (n) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(0);

// ── the cases ───────────────────────────────────────────────────────────────────
//
// Each case is built as (reading, INTENDED NOTE) pairs, so the bench knows the ground
// truth by construction. The first version scored against `nearest` as the baseline,
// which is wrong in exactly the place it matters: on a wide vibrato `nearest` is the
// broken algorithm, so it reported a 15¢ "lie" for the strategies that were right. The
// truth of a synthetic contour is the thing that synthesized it.
//
// `truth` is the note per read (null in silence); `notes` is the sequence of note EVENTS
// a musician would say they played, which is what a run count is compared against.
// `ambiguous: true` means there is no single right answer, so its run count is printed
// and not scored — a portamento genuinely can be called one gesture or five notes.

const seg_ = (note, samples) => samples.map((s) => ({ s, t: note }));
const hold = (m, c, n) => seg_(m, Array.from({ length: n }, () => m + c / 100));
const rest = (n) => Array.from({ length: n }, () => ({ s: null, t: null }));
const vib = (m, hz, cents, n) => seg_(m, Array.from({ length: n }, (_, i) =>
  m + (cents / 100) * Math.sin(2 * Math.PI * hz * ((i * STEP_MS) / 1000))));
// A slide's intended note is the nearest one at each instant — the only defensible
// reading, and the case is marked ambiguous anyway.
const slide = (a, b, n) => Array.from({ length: n }, (_, i) => {
  const v = a + (b - a) * (i / (n - 1));
  return { s: v, t: Math.round(v) };
});
/** A trill: `alt` alternations, each `reads` long. 2 reads = 132 ms ≈ 7.6 notes/sec. */
const trill = (lo, hi, alt, reads) => Array.from({ length: alt * reads }, (_, i) => {
  const note = Math.floor(i / reads) % 2 ? hi : lo;
  return { s: note, t: note };
});

const build = (name, why, parts, extra = {}) => {
  const flat = parts.flat();
  const notes = [];
  for (const p of flat) if (p.t !== null && p.t !== notes[notes.length - 1]) notes.push(p.t);
  return {
    name,
    why,
    contour: flat.map((p) => p.s),
    truth: flat.map((p) => p.t),
    // Note EVENTS, so two takes of one note counts as two. Rebuilt from the parts rather
    // than deduped globally: a rest ends a note even when the same note returns.
    events: (() => {
      const ev = [];
      let last = null;
      for (const p of flat) {
        if (p.t === null) { last = null; continue; }
        if (p.t !== last) ev.push(p.t);
        last = p.t;
      }
      return ev;
    })(),
    ...extra,
  };
};

const CASES = [
  build('long tone, 19¢ sharp',
    'the exercise the tool was built for — nothing should split this',
    [rest(2), hold(69, 19, 24), rest(2)]),

  build('wide vibrato 6 Hz ±58¢',
    "a singer's; peaks cross the halfway line, so nearest must flicker",
    [rest(2), vib(74, 6, 58, 28), rest(2)]),

  build('narrow vibrato 6 Hz ±20¢',
    "a violinist's; nothing should split this either",
    [rest(2), vib(74, 6, 20, 28), rest(2)]),

  build('slur A4→B4, no rest',
    'two notes with no silence — attack-lock cannot see the second',
    [rest(2), hold(69, 2, 12), hold(71, -8, 12)]),

  build('grace note, 1 read',
    'slurred both sides; dwell reattributes its read to C♯5',
    [rest(2), hold(73, 14, 12), seg_(71, [71.02]), hold(69, -6, 12)]),

  // NOT SCORED, by the owner's call: "semitone trill is so fast though when I'm
  // practicing I don't really mind if it gets swallowed." An intonation trainer is for
  // held notes and phrases, and a 7.6 notes/sec trill has no intonation to read — you
  // cannot be told you were 12 cents sharp on something that lasted 132 ms. It is still
  // RUN and still PRINTED, because a strategy's behaviour here is worth seeing (it is the
  // single thing that separates the adaptive band from hysteresis), but it no longer
  // decides the ranking of a tool for a use it does not serve.
  build('semitone trill B4⇄C5, 2 reads each',
    '7.6 notes/sec — printed, NOT scored: too fast to have readable intonation',
    [rest(2), trill(71, 72, 12, 2)], { ambiguous: true }),

  build('portamento A4→C♯5',
    'a continuous slide: one gesture or five notes, both defensible',
    [rest(2), slide(69, 73, 24)], { ambiguous: true }),

  build('two takes of one note',
    'a rest must end a note under every strategy',
    [rest(2), hold(69, 10, 10), rest(4), hold(69, -10, 10)]),
];

// ── running one strategy over one case ──────────────────────────────────────────

function run(strategyId, params, c) {
  const dec = segment(c.contour, strategyId, params);
  const runs = noteRuns(c.contour, dec);
  const solid = runs.filter((r) => r.reads >= 2);

  // The truth, computed from what synthesized the contour: for each intended note event,
  // the mean cents the player actually sounded against THAT note. This is the number a
  // per-note verdict is supposed to report, so the "lie" is the distance from it.
  const truthRuns = noteRuns(c.contour, c.truth);

  let worstLie = 0;
  let lieNote = null;
  for (const r of solid) {
    // Compare against the intended run that overlaps this one most.
    let best = null; let overlap = 0;
    for (const t of truthRuns) {
      const o = Math.min(r.to, t.to) - Math.max(r.from, t.from) + 1;
      if (o > overlap) { overlap = o; best = t; }
    }
    if (!best) continue;
    // Two distinguishable errors, both real: naming the wrong note, and reporting the
    // right note's intonation wrongly. A wrong NAME is the larger error, so it is scored
    // as the full distance between the notes plus whatever cents it then claims.
    const lie = r.midi === best.midi
      ? Math.abs(r.mean - best.mean)
      : Math.abs((r.midi - best.midi) * 100) + Math.abs(r.mean);
    if (lie > worstLie) { worstLie = lie; lieNote = best.midi; }
  }

  return {
    notes: runs.map((r) => r.midi),
    solid: solid.map((r) => r.midi),
    runs,
    // How many note events it invents beyond what the player would name. The headline
    // number: 13 notes in a 6-note phrase is the bug this whole file exists for.
    extra: c.ambiguous ? 0 : runs.length - c.events.length,
    shown: runs.length,
    want: c.events.length,
    worstLie,
    lieNote,
  };
}

// ── output ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(`--${k}`); return i < 0 ? null : argv[i + 1]; };
const onlyId = arg('id');
const sweep = arg('sweep');

const pad = (s, n) => String(s).padEnd(n);

function header() {
  console.log(`\nContours sampled at the instrument's ${STEP_MS} ms read cadence.`);
  console.log('Columns: found/intended note events · worst per-note error in cents, '
    + 'measured against the notes that SYNTHESIZED the contour (not against another '
    + 'algorithm) · the notes it reports.');
  console.log('Flags: ! invents notes · - loses notes · ~ ambiguous, not scored.\n');
}

function benchOne(id, params) {
  const s = getStrategy(id);
  const p = resolveParams(s, params);
  const pstr = Object.keys(p).length
    ? ' (' + Object.entries(p).map(([k, v]) => `${k}=${v}`).join(', ') + ')' : '';
  console.log(`── ${s.name}${pstr}${id === DEFAULT_STRATEGY_ID ? '   ← the default' : ''}`);
  console.log(`   ${s.mechanism}`);
  console.log(`   cost: ${s.cost}`);
  let totalExtra = 0; let worst = 0;
  for (const c of CASES) {
    const r = run(id, params, c);
    totalExtra += Math.abs(r.extra);          // missing a note is as wrong as inventing one
    worst = Math.max(worst, r.worstLie);
    const flag = c.ambiguous ? '~' : (r.extra > 0 ? '!' : (r.extra < 0 ? '-' : ' '));
    console.log(`   ${flag} ${pad(c.name, 30)} ${pad(`${r.shown}/${r.want}`, 7)}`
      + `${pad(r.worstLie > 1 ? `lie ${r.worstLie.toFixed(0)}¢` : '', 10)}`
      + r.solid.map(nm).join(' '));
  }
  console.log(`   ── ${totalExtra} miscounted notes across ${CASES.length} cases, `
    + `worst error ${worst.toFixed(0)}¢\n`);
  return { id, totalExtra, worst };
}

header();

if (sweep) {
  // --sweep band=50,55,62 : one parameter, several values, one strategy
  const [key, list] = sweep.split('=');
  const id = onlyId || DEFAULT_STRATEGY_ID;
  console.log(`sweeping ${key} on "${getStrategy(id).name}"\n`);
  const rows = list.split(',').map(Number).map((v) => benchOne(id, { [key]: v }));
  const best = rows.reduce((a, b) => (b.totalExtra < a.totalExtra ? b : a), rows[0]);
  console.log(`fewest spurious notes at ${key} in this sweep: `
    + `${rows.filter((r) => r.totalExtra === best.totalExtra).length} tied at `
    + `${best.totalExtra}\n`);
} else {
  const params = {};
  for (let i = 0; i < argv.length; i += 1) {
    const m = /^--(.+)$/.exec(argv[i]);
    if (m && m[1] !== 'id' && m[1] !== 'sweep' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      const v = Number(argv[i + 1]);
      if (Number.isFinite(v)) params[m[1]] = v;
    }
  }
  const ids = onlyId ? [onlyId] : STRATEGIES.map((s) => s.id);
  const rows = ids.map((id) => benchOne(id, params));
  if (rows.length > 1) {
    console.log('── ranked by miscounted notes, then by worst error. Read BOTH columns: '
      + 'attack-lock miscounts little\n   by refusing to change its mind, and pays for '
      + 'it with the largest error on the sheet.');
    for (const r of [...rows].sort((a, b) => (a.totalExtra - b.totalExtra)
      || (a.worst - b.worst))) {
      console.log(`   ${pad(r.id, 18)} ${pad(r.totalExtra + ' miscounted', 15)}`
        + `worst ${r.worst.toFixed(0)}¢`);
    }
    console.log('');
  }
}
