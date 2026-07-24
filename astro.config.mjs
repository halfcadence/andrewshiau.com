import { defineConfig } from 'astro/config';
import annotate from './annotate/integration.mjs';

// Static site served from the DigitalOcean droplet (nginx + certbot).
// `site` drives canonical URLs / sitemap; output is fully static (default).
export default defineConfig({
  site: 'https://andrewshiau.com',
  build: {
    // Emit /work/recipes/index.html style paths so the droplet serves them
    // without server rewrites.
    format: 'directory',
  },
  // Dev-only annotation overlay (see annotate/README.md). Injects NOTHING into
  // `astro build` — it self-gates to `command === 'dev'`.
  integrations: [annotate()],
});
