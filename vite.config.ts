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
    server: { port: 5173, watch: { ignored: ['**/progress/**'] } },
  };
});
