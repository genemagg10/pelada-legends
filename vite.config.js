import { defineConfig } from 'vite';

// Production builds target GitHub project pages:
// https://genemagg10.github.io/pelada-legends/
// Dev serves from `/` so `npm run dev` just works.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pelada-legends/' : '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
  server: {
    open: false,
  },
  preview: {
    open: false,
  },
}));
