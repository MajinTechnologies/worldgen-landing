// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // TODO: set `site` to the real production origin. It feeds Astro.site, which
  // the OG tags in src/layouts/Base.astro use for og:url. It is left unset on
  // purpose rather than guessed, because a wrong canonical URL is worse than
  // no og:url at all.
  site: undefined,
  vite: {
    plugins: [tailwindcss()],
  },
});