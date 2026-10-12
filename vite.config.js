import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { organicSeoPlugin } from './scripts/organic-html.mjs'

export default defineConfig(({ mode }) => {
  process.env.CHILIK_INQUIRY_BUILD = mode === 'inquiry' ? '1' : '0';
  const booking = ['booking', 'booking-demo'].includes(mode);
  process.env.CHILIK_BOOKING_BUILD = booking ? '1' : '0';
  return ({
  define: booking ? { 'import.meta.env.VITE_BOOKING_REVIEW_ENABLED': JSON.stringify('true') } : {},
  plugins: [react(), organicSeoPlugin(mode), ...(['preprod', 'booking-demo'].includes(mode) ? [{
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
    outDir: booking ? mode === 'booking-demo' ? 'dist-booking-demo' : 'dist-booking' : mode === 'inquiry' ? 'dist-inquiry' : mode === 'preprod' ? 'dist-preprod' : 'dist',
    sourcemap: !['preprod', 'inquiry', 'booking', 'booking-demo'].includes(mode),
    rollupOptions: {
      ...(mode === 'inquiry' ? { input: 'inquiry-index.html' } : booking ? { input: 'booking-index.html' } : {}),
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
