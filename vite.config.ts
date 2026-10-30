import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { devApi } from './server/devApi';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Relative base so `npm run build` output works on GitHub Pages or any static host.
    base: './',
    plugins: [react(), tailwindcss(), devApi(env.ANTHROPIC_API_KEY)],
    // Pre-bundle deps up front so the dev server never re-optimizes mid-session (which reloads the page).
    optimizeDeps: { include: ['react', 'react-dom/client', 'react-router-dom', 'zustand', 'zustand/middleware', '@xyflow/react'] },
    build: { chunkSizeWarningLimit: 2600 }, // ponytail: one content chunk (~650 KB gzip); split per module if load time ever matters
    server: { port: 5173, watch: { ignored: ['**/progress/**'] } },
  };
});
