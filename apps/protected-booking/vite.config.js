import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'preprod' ? [{
    name: 'isolated-booking-demo',
    transformIndexHtml: html => html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="connect-src 'none'; form-action 'none'; object-src 'none'">`),
  }] : [])],
  server: { host: '127.0.0.1', port: 18781, strictPort: true, open: false },
  preview: { host: '127.0.0.1', port: 18782, strictPort: true, open: false },
  build: { outDir: 'dist', sourcemap: false },
}));
