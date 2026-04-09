// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  site: 'https://cadre.run',
  output: 'server',
  adapter: isDev
    ? node({ mode: 'standalone' })
    : cloudflare({
        platformProxy: { enabled: true },
      }),
  vite: {
    plugins: [tailwindcss()],
  },
});
