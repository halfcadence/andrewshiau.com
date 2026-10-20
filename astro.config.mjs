import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ── STRIP HTML COMMENTS FROM THE BUILD (chooser: andrewshiau-decisions, Q4/02).
// Measured before this: 118,821 of 383,364 shipped bytes were HTML comments — 31% of the site,
// and `index.html` was 54% comment. Gzipped, the 16 pages went 145,823 -> 97,105 bytes, a 48.7 KB
// saving for zero visual change. CSS comments were already being stripped (65 bytes survive of
// 117 KB in source); Astro's compressor does not touch HTML ones, and there is no option for it.
//
// They also shipped EIGHT of the owner's private design annotations verbatim — "dont think this
// needs to be stronger than 'at amazon'", "is the filled circle smaller or is it some visual
// quirk" — quoted in the source comments as the reason for a change. Fine in a repo, odd in a
// public page's view-source.
//
// The reasoning is NOT lost: it stays in the `.astro` files, in git, and on /style/ and /system/,
// which exist to carry it in prose deliberately rather than as a payload a reader has to view
// source to find.
//
// AN INTEGRATION HOOK RATHER THAN A DEPENDENCY. The site has one runtime dependency and
// method.astro records the decision not to add a markdown renderer for the same reason; adding an
// HTML minifier to delete comments would be a worse trade. `astro:build:done` gives the output
// directory after every page is written, so this is a regex over the finished files.
//
// The regex cannot be `/<!--[\s\S]*?-->/g` alone: a conditional comment (`<!--[if IE]>`) and an
// SVG `<!---->` placeholder would both match, and more importantly a comment INSIDE a `<pre>` or a
// `<script>` is content, not a comment. /style/ renders CSS examples into `<pre>` blocks and they
// contain literal `/* … */` — those are safe (not HTML comments) — but `<script>` on the
// explainers holds the quiz engine, and a `//`-commented line there must survive. So the walk
// masks `<pre>`, `<code>`, `<script>` and `<style>` regions first, strips outside them, and
// restores.
function stripHtmlComments() {
  return {
    name: 'strip-html-comments',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = dir.pathname;
        let files = 0, saved = 0;
        const walk = (d) => {
          for (const name of readdirSync(d)) {
            const full = join(d, name);
            if (statSync(full).isDirectory()) { walk(full); continue; }
            if (!name.endsWith('.html')) continue;
            const before = readFileSync(full, 'utf8');
            // Mask the regions where a comment-like string is content.
            const keep = [];
            const masked = before.replace(
              /<(pre|code|script|style)\b[\s\S]*?<\/\1>/gi,
              (m) => `\u0000${keep.push(m) - 1}\u0000`
            );
            const stripped = masked
              .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
              // A comment on its own line leaves a blank line behind; collapse runs of them.
              .replace(/\n\s*\n\s*\n+/g, '\n\n');
            const after = stripped.replace(/\u0000(\d+)\u0000/g, (_m, i) => keep[Number(i)]);
            if (after !== before) {
              writeFileSync(full, after);
              files++; saved += Buffer.byteLength(before) - Buffer.byteLength(after);
            }
          }
        };
        walk(root);
        logger.info(`stripped comments from ${files} files, ${(saved / 1024).toFixed(1)} kB`);
      },
    },
  };
}

// Static site served from the DigitalOcean droplet (nginx + certbot).
// `site` drives canonical URLs / sitemap; output is fully static (default).
// Retired 2026-10-20; the pages are at tag full-site-2026-10. `/gate` stays a stub because nginx
// serves /gate/index.html as the 401 body for /work/stores-designer/.
const RETIRED = [
  '/method', '/style', '/system', '/stories', '/gate',
  '/work/aping', '/work/explain', '/work/luthier', '/work/photography', '/work/pitchgraph',
  '/work/powerpoint', '/work/practice-room', '/work/proofs', '/work/recipes', '/work/stores-designer',
  '/writing/10x-is-a-loop', '/writing/canele', '/writing/loops-vs-graphs', '/writing/personal-software',
  '/demo/index-layouts', '/demo/practice-room-tap', '/demo/recipes-harmony', '/demo/recipes-ultrawide',
];

export default defineConfig({
  site: 'https://andrewshiau.com',
  redirects: Object.fromEntries(RETIRED.map((path) => [path, '/'])),
  build: {
    // Emit /work/recipes/index.html style paths so the droplet serves them
    // without server rewrites.
    format: 'directory',
  },
  integrations: [
    stripHtmlComments(),
    // /sitemap-index.xml used to 404 — the comment on `site` above claimed it drove a
    // sitemap, but nothing generated one.
    //
    // UNPINNED. This was held at exactly 3.6.0 while the site was on Astro 4, because 3.7.0
    // moved to the `astro:routes:resolved` hook that Astro 4 never fires — `_routes` stayed
    // undefined and the build died in the integration's own `astro:build:done` with
    // "Cannot read properties of undefined (reading 'reduce')", at the END of the build, so
    // the log read green until the last two lines. That note said "bump this only with Astro
    // itself", and that is what happened: Astro 7 fires the hook, so 3.7.x works and the pin
    // is gone. 14 URLs in the sitemap before and after.
    sitemap({
      // Practice-host pages declare practice.andrewshiau.com canonical. Anchored on the host so
      // a bare `/practice-room/$` can't over-match.
      filter: (page) =>
        !/^https?:\/\/[^/]+\/(practice-room(\/(console|changes|live-loop|loop))?|pitchgraph)\/$/.test(page),
    }),
  ],
});
