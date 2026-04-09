// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const isProduction = process.argv.includes('build');

export default defineConfig({
  site: 'https://cadre.run',
  output: 'server',
  adapter: isProduction
    ? cloudflare({
        platformProxy: { enabled: true },
      })
    : node({ mode: 'standalone' }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/welcome') && !page.includes('/r/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
