// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const isProduction = process.argv.includes('build');

export default defineConfig({
  site: 'https://cadre.run',
  output: 'server',
  adapter: isProduction
    ? cloudflare({
        platformProxy: { enabled: true },
      })
    : node({ mode: 'standalone' }),
  vite: {
    plugins: [tailwindcss()],
  },
});
