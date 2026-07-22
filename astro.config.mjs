import { defineConfig } from 'astro/config';

// Static site served from the DigitalOcean droplet behind Caddy.
// `site` drives canonical URLs / sitemap; output is fully static (default).
export default defineConfig({
  site: 'https://andrewshiau.com',
  build: {
    // Emit /work/recipes/index.html style paths so the droplet serves them
    // without server rewrites.
    format: 'directory',
  },
});
