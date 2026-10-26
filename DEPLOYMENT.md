# Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase:
```bash
firebase init hosting
```

4. Build the project:
```bash
npm run build
```

5. Deploy:
```bash
firebase deploy
```

### Option 2: Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Build the project:
```bash
npm run build
```

3. Deploy:
```bash
vercel --prod
```

Or simply connect your GitHub repo to Vercel dashboard.

### Option 3: Netlify

1. Build the project:
```bash
npm run build
```

2. Drag and drop the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)

Or use Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Option 4: GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to package.json scripts:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

3. Add to vite.config.js:
```javascript
export default defineConfig({
  base: '/your-repo-name/',
  // ... rest of config
})
```

4. Deploy:
```bash
npm run deploy
```

## 📋 Pre-Deployment Checklist

- [ ] Test the production build locally: `npm run build && npm run preview`
- [ ] Verify all images load correctly
- [ ] Test WhatsApp integration
- [ ] Verify Firebase real-time updates work
- [ ] Test on mobile devices
- [ ] Check RTL (right-to-left) layout
- [ ] Validate SEO meta tags
- [ ] Test all navigation links
- [ ] Verify FAQ accordion works
- [ ] Test date picker and booking flow
- [ ] Booking functions only: set `CHILIK_INTEGRATION_CUTOFF_ISO` in
      `functions/booking-deployment-settings.json` to the deploy time in UTC
      (`date -u +%Y-%m-%dT%H:%M:%SZ`). While `CHILIK_INTEGRATION_SCHEDULER_ENABLED` is `"true"`,
      the predeploy check `scripts/assert-integration-cutoff.cjs` refuses the deploy if the cutoff
      is the placeholder `SET_TO_DEPLOY_TIME_UTC`, not a valid UTC ISO time, or more than an hour
      in the future. See `docs/BOOKING_SCHEDULERS.md`.

## 🔒 Security Notes

- Firebase credentials are included in the source code (client-side)
- This is normal for client-side Firebase apps
- Use Firebase Security Rules to protect your data
- Consider moving sensitive config to environment variables for production

## 🌐 Custom Domain

After deployment, you can configure a custom domain:

### Firebase Hosting
```bash
firebase hosting:channel:deploy live --only hosting
```

### Vercel
Add custom domain in Vercel dashboard → Settings → Domains

### Netlify
Add custom domain in Netlify dashboard → Domain Settings

## 📊 Performance Optimization

The build is already optimized with:
- Code splitting
- Tree shaking
- Minification
- Asset optimization
- Lazy loading

For additional optimization:
- Enable Gzip/Brotli compression on your hosting
- Set up CDN for static assets
- Configure caching headers

## 🐛 Troubleshooting

### Build fails
- Check Node.js version (v16+)
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Images not loading
- Verify image paths in src/assets
- Check import statements in components

### Firebase not working
- Verify Firebase credentials
- Check Firebase console for security rules
- Ensure Firestore is enabled

## 📱 Testing Production Build Locally

```bash
npm run build
npm run preview
```

Then open http://localhost:4173
