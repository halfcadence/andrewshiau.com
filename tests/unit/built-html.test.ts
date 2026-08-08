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

// THE SITEMAP MUST NOT CONTRADICT A CANONICAL. This existed unnoticed and is exactly the
// "one of them will get out of date" failure: /practice-room/ has declared
// https://practice.andrewshiau.com/ canonical since the subdomain shipped, while the
// sitemap went on advertising the apex path as a page. A sitemap is a request to index; a
// canonical says "this is not the address". Asking a crawler to index a URL the page
// itself disowns is a contradiction the build was happy to ship.
//
// Asserted as a RELATIONSHIP rather than a list of paths, so it catches the next one too:
// any page whose canonical points somewhere else must not be in the sitemap. That makes
// the rule self-maintaining — a new cross-host canonical is covered without editing this.
describe('the sitemap agrees with the canonicals', () => {
  const sitemapPath = join(DIST, 'sitemap-0.xml');
  const has = existsSync(sitemapPath);

  it.skipIf(!has)('advertises no URL whose page declares a different canonical', () => {
    const xml = readFileSync(sitemapPath, 'utf8');
    const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(listed.length, 'the sitemap is empty — did the build change?')
      .toBeGreaterThan(5);

    const contradictions: string[] = [];
    for (const url of listed) {
      const path = new URL(url).pathname;
      const file = join(DIST, path.replace(/^\//, ''), 'index.html');
      if (!existsSync(file)) continue;               // not a directory-style page
      const html = readFileSync(file, 'utf8');
      const canon = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
      if (!canon) continue;                          // no canonical is not a contradiction
      // Compare the whole URL: a canonical pointing at another HOST is the case that bit.
      if (canon.replace(/\/$/, '') !== url.replace(/\/$/, '')) {
        contradictions.push(`${path} is in the sitemap but says canonical=${canon}`);
      }
    }
    expect(contradictions).toEqual([]);
  });

  it.skipIf(!has)('still advertises the case study, which is a real page here', () => {
    // The complement, so the exclusion can't over-reach: retiring the instrument's apex
    // path must not take /work/practice-room/ with it. The regex that does the excluding
    // ends in `/practice-room/$`, which /work/practice-room/ also matches — this is the
    // test that would have caught that.
    const xml = readFileSync(sitemapPath, 'utf8');
    expect(xml).toContain('/work/practice-room/');
    expect(xml).not.toMatch(/<loc>https:\/\/andrewshiau\.com\/practice-room\/<\/loc>/);
  });
});

// THE APP'S NAME LIVES IN THREE FILES, and iOS and Android read different ones. iOS takes
// `apple-mobile-web-app-title` from the page; Android takes `name`/`short_name` from the
// manifest — and there are TWO manifests, because the same link URL is served from a
// host-specific file (the subdomain gets manifest-root.json so `start_url` can be `/`, the
// apex gets the path-scoped one). So "rename the app" is three edits, and missing one ships
// an icon captioned differently depending on the phone.
//
// This exists because the e2e install test could NOT catch it. Local preview serves only the
// path-scoped manifest, so red-arming `manifest-root.json` there passed — the assertion was
// reading a file the run never fetched. That is a test proving something about the wrong
// artifact, and the fix is a check that reads BOTH files directly rather than through a
// server that only serves one of them.
describe('the home-screen app name is one name', () => {
  const metaPath = join(DIST, 'practice-room', 'index.html');
  const scoped = join(DIST, 'practice-room', 'manifest.json');
  const rooted = join(DIST, 'practice-room', 'manifest-root.json');
  const has = existsSync(metaPath) && existsSync(scoped) && existsSync(rooted);

  // TITLE CASE, deliberately against the site's prevailing lowercase rule. That rule governs
  // words ON the instrument (the plates say "tuner", "metronome") — an icon caption is not a
  // control, it is the app's name, and it sits beside Mail and Notes. Argued at the meta in
  // Layout.astro; asserted here so applying the lowercase rule consistently can't quietly
  // undo a deliberate exception.
  const NAME = 'Practice Room';

  it.skipIf(!has)('is title case in the apple meta and in BOTH manifests', () => {
    const html = readFileSync(metaPath, 'utf8');
    const meta = /<meta name="apple-mobile-web-app-title" content="([^"]*)"/.exec(html)?.[1];
    expect(meta, 'the installable page carries no apple-mobile-web-app-title').toBe(NAME);

    for (const p of [scoped, rooted]) {
      const m = JSON.parse(readFileSync(p, 'utf8'));
      expect(m.name, `${p} name`).toBe(NAME);
      expect(m.short_name, `${p} short_name`).toBe(NAME);
      // The two manifests may differ in scope; they must NOT differ in identity.
      expect(m.display, `${p} display`).toBe('standalone');
    }
  });
});
