import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
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
export default defineConfig({
  site: 'https://andrewshiau.com',
  build: {
    // Emit /work/recipes/index.html style paths so the droplet serves them
    // without server rewrites.
    format: 'directory',
  },
  // TAILWIND v4 VIA THE VITE PLUGIN, not the `@astrojs/tailwind` integration. v4 dropped the
  // config file and the PostCSS pipeline: the plugin reads `@import "tailwindcss"` from the CSS
  // itself, so there is no tailwind.config.js and no content-globbing to keep in sync.
  // It is here to serve ONE dependency — `basecoat-css`, which is built on Tailwind v4 source and
  // cannot be used without it (verified against basecoatui.com/installation). Basecoat is the
  // design-system base: shadcn/ui's components and visual patterns as plain HTML classes, with no
  // React. See src/styles/system.css for what is imported and what is deliberately not.
  vite: {
    plugins: [tailwindcss()],
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
      // Two exclusions, both because the URL isn't a page a reader can land on.
      //
      // /demo/ — the three iframe payloads for the embeds on /work/proofs/: no mast, no
      // nav, no way back to the site. A crawler that indexes one hands a reader a
      // dead-ended fragment. Also Disallow'd in robots.txt; the filter keeps them out of
      // the sitemap, the Disallow keeps them out of the index.
      //
      // /work/stores-designer/ — behind the password gate, so it answers 401 without the
      // cookie. A sitemap is a request to index, and asking a crawler to index a URL that
      // answers 401 is a contradiction: it lands as a search result that asks for a password.
      //
      // /gate/ — the 401 body nginx serves AT that URL (error_page). It is not a page anyone
      // should land on by choice: on its own, out of context, it is a password box with no
      // explanation of which page it opens. It also carries `noindex` for a crawler that finds
      // it another way, since a sitemap filter only stops us advertising it.
      //
      // /stories/ — the story bank. Not gated (see stories.astro) and it does not 401, so the
      // reason here is different from the case study's: it is a document I SEND rather than
      // publish. A search result for it puts the working-out in front of a reader who has not
      // seen the claim, which is the wrong order to meet someone in.
      //
      // /practice-room/ — the instrument, whose ONE public address is
      // https://practice.andrewshiau.com/ (2026-08-06). The apex path serves the identical
      // bytes (the subdomain's vhost does `try_files /practice-room/index.html` off the
      // same webroot — verified byte-identical, same ETag), and the page has declared the
      // subdomain canonical since the subdomain shipped. Advertising the apex path in the
      // sitemap CONTRADICTED that canonical: it asks a crawler to index a URL the page
      // itself says is not the address. The path is NOT deleted and cannot be — the app is
      // served from it, and the manifest and icons live under it — it is just no longer
      // advertised or linked.
      //
      // NOT excluded: the /writing/ explainers embedded on /work/aping/ and
      // /work/explain/. Those are full pages that stand alone and should be indexed.
      filter: (page) =>
        !page.includes('/demo/') &&
        !page.includes('/work/stores-designer/') &&
        !page.includes('/stories/') &&
        !page.includes('/gate/') &&
        // EVERY PAGE WHOSE ADDRESS IS ON practice.andrewshiau.com. The apex path 301s to
        // that host, and the page declares it canonical, so advertising the apex URL here
        // asks a crawler to index a URL the page itself disowns.
        //
        // Anchored on the host, not just the path ending: a `/practice-room\/$` regex also
        // matches /work/practice-room/ and silently dropped the case study — caught by the
        // complement test in tests/unit/built-html.test.ts, which exists for that
        // over-reach. Adding /pitchgraph/ here was likewise not a guess: the relationship
        // test ("no sitemap URL may name a page declaring a different canonical") went red
        // on the build, which is the whole reason it is a rule and not a list.
        !/^https?:\/\/[^/]+\/(practice-room|pitchgraph)\/$/.test(page),
    }),
  ],
});
