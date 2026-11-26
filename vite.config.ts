import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

const buildId = process.env.BUILD_ID ?? 'dev';

export default defineConfig({
  base: process.env.BASE ?? '/stay-miniapp/',
  plugins: [preact()],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  build: { target: 'es2020', sourcemap: false, assetsInlineLimit: 0 },
  server: { host: true, port: 5174 },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
});
