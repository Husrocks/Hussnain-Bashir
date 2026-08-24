// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: Replace this with your real deployed domain before launch, e.g. "https://hussnain.dev"
// Must be a valid URL — the sitemap integration validates it at build time.
const SITE_URL = 'https://hussnain-bashir.vercel.app';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: SITE_URL,
  integrations: [
    sitemap(),
  ],
});
