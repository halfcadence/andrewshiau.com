import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// WHITESPACE EATEN AT AN INLINE TAG BOUNDARY. Astro's `compressHTML` collapses the
// newline between a closing inline tag and the next word, so source that wraps like
//
//     dragged a <b>65 Hz</b>
//     sine 22 cents sharp
//
// ships as `65 Hz</b>sine` and RENDERS as "65 Hzsine". Two of those shipped on
// /work/practice-room/ ("65 Hzsine" and "within0.35 cents") and were found by looking at a
// screenshot, not by the build — the build is green either way and the HTML is
// well-formed. Prettier-style source wrapping is the trigger, so any future edit that
// rewraps a paragraph can reintroduce it.
//
// The assertion is on `dist/`, because this is a defect of the ARTIFACT: nothing is
// wrong with the .astro source. Requires `npm run build` first; skipped if `dist/` is
// absent so a bare `npm test` on a clean checkout does not fail for the wrong reason.
const DIST = new URL('../../dist/', import.meta.url).pathname;

// Only the PROSE emphasis tags. Every exclusion below is real markup, not an oversight:
//   - `</span>` — `.ck`/`.sn`/`.pk` are display:block labels whose value abuts them by
//     design (`<span class="ck">Timing</span>A lookahead scheduler`).
//   - `</a>` — the mobile header's `←</span>index</a>` is one word built from two spans.
//   - `<i>` — /demo/recipes-harmony/ sets card numerals as `<h1>tortilla<i>034</i></h1>`,
//     a badge meant to touch the word.
// Including them reported 27 hits, 26 of which were correct markup. A check that cries
// wolf gets deleted, so this is scoped to the tags where a fused word is always a bug.
//
// One more exclusion, and it is a rule rather than a path: an emphasis element holding a
// BARE INTEGER is a marker, and a marker is supposed to touch what it marks. That is the
// numbered-note idiom on /demo/recipes-harmony/ (`<span><b>1</b>This is a concentrate…`),
// 20 more correct hits. Anything with a letter or a space inside it — `<b>65 Hz</b>` — is
// prose emphasis, and a word fused to that is the defect. So the capture is the emphasized
// CONTENT, and a digits-only capture is skipped.
// `[^>]*` after the tag name is NOT optional: Astro stamps scoped-style attributes onto
// elements, so the built markup is `<b data-astro-cid-6xegyoue>65 Hz</b>`, never a bare
// `<b>`. A first version of this matched `<b>` literally, passed against a deliberately
// reintroduced "65 Hzsine", and would have been a test that could never fail on the one
// page it was written for. Caught by red-casing it, which is the only reason it is right.
const CLOSING_FUSED = /<(b|strong|em)[^>]*>([^<]*)<\/\1>[A-Za-z]/g;
const OPENING_FUSED = /[A-Za-z]<(b|strong|em)[^>]*>([^<]*)<\/\1>/g;
const isMarker = (content: string) => /^\d+$/.test(content.trim());

const htmlFiles = (d: string): string[] =>
  existsSync(d)
    ? readdirSync(d).flatMap((n) => {
        const full = join(d, n);
        return statSync(full).isDirectory()
          ? htmlFiles(full)
          : full.endsWith('.html')
            ? [full]
            : [];
      })
    : [];

const scan = (files: string[], re: RegExp): string[] => {
  const hits: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
      if (isMarker(m[2])) continue;
      const at = m.index ?? 0;
      hits.push(`${f.slice(DIST.length)}: …${src.slice(Math.max(0, at - 40), at + 30)}…`);
    }
  }
  return hits;
};

describe('built HTML', () => {
  const files = htmlFiles(DIST);

  it.skipIf(files.length === 0)('never fuses a word onto a closing inline tag', () => {
    expect(scan(files, CLOSING_FUSED)).toEqual([]);
  });

  it.skipIf(files.length === 0)('never fuses an opening inline tag onto the word before it', () => {
    expect(scan(files, OPENING_FUSED)).toEqual([]);
  });
});
