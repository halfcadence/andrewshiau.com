import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
    // /sitemap-index.xml used to 404 — the comment on `site` above claimed it drove a
    // sitemap, but nothing generated one.
    //
    // PINNED to @astrojs/sitemap 3.6.0, exact, and it must stay pinned while this site is
    // on Astro 4. 3.7.0 moved to the `astro:routes:resolved` hook, which Astro 4 never
    // fires: `_routes` stays undefined and the build dies in the integration's own
    // astro:build:done with "Cannot read properties of undefined (reading 'reduce')".
    // The failure is at the END of the build, after all 13 pages report success, so the
    // log reads green until the last two lines. Bump this only with Astro itself.
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
      // NOT excluded: the /writing/ explainers embedded on /work/aping/ and
      // /work/explain/. Those are full pages that stand alone and should be indexed.
      filter: (page) =>
        !page.includes('/demo/') &&
        !page.includes('/work/stores-designer/') &&
        !page.includes('/gate/'),
    }),
  ],
});
