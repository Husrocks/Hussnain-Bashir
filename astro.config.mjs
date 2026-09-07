// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE_URL = 'https://hussnain-bashir.vercel.app';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: SITE_URL,
  integrations: [
    sitemap(),
  ],
});
