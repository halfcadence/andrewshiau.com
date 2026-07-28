import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static site served from the DigitalOcean droplet (nginx + certbot).
// `site` drives canonical URLs / sitemap; output is fully static (default).
export default defineConfig({
  site: 'https://andrewshiau.com',
  build: {
    // Emit /work/recipes/index.html style paths so the droplet serves them
    // without server rewrites.
    format: 'directory',
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
      // /work/stores-designer/ — behind nginx Basic Auth. A sitemap is a request to
      // index, and asking a crawler to index a URL that answers 401 is a contradiction:
      // it lands as a search result that opens a password prompt.
      //
      // NOT excluded: the /writing/ explainers embedded on /work/aping/ and
      // /work/explain/. Those are full pages that stand alone and should be indexed.
      filter: (page) => !page.includes('/demo/') && !page.includes('/work/stores-designer/'),
    }),
  ],
});
