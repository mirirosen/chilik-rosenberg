import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  process.env.CHILIK_INQUIRY_BUILD = mode === 'inquiry' ? '1' : '0';
  return ({
  plugins: [react(), ...(mode === 'preprod' ? [{
    name: 'preprod-isolation',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n<meta name="robots" content="noindex, nofollow">\n<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; form-action 'none'; object-src 'none'">`)
        .replace(/<link rel="canonical"[^>]*>/g, '')
        .replace(/<meta property="og:url"[^>]*>/g, '');
    },
  }] : [])],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: mode === 'inquiry' ? 'dist-inquiry' : mode === 'preprod' ? 'dist-preprod' : 'dist',
    sourcemap: !['preprod', 'inquiry'].includes(mode),
    rollupOptions: {
      ...(mode === 'inquiry' ? { input: 'inquiry-index.html' } : {}),
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          ...(mode === 'inquiry' ? {} : { 'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'] }),
          'lucide-vendor': ['lucide-react']
        }
      }
    }
  }
});
});
