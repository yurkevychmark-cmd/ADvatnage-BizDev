import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

// Vercel під час збірки ставить VERCEL=1 — там лишається як було. На нашому
// сервері образ збирається без неї: окремий Node-сервер (Dockerfile).
const onVercel = !!process.env.VERCEL;

export default defineConfig({
  output: 'server',
  adapter: onVercel ? vercel() : node({ mode: 'standalone' }),
  integrations: [tailwind()],
  security: {
    checkOrigin: false,
  },
});
