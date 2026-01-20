# Firebase Deployment Guide

## 🔴 Problem (FIXED)

**Error:** `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/jsx"`

**Cause:** Firebase was serving raw source code (`.jsx` files) instead of compiled production files.

---

## ✅ Solution Applied

### Configuration Fixed

**firebase.json** updated:
```diff
- "public": "."     ❌ Serving source code
+ "public": "dist"  ✅ Serving built files
```

---

## 🚀 Deployment Commands (In Order)

### Step 1: Build Production Files
```bash
npm run build
```

**What this does:**
- ✅ Compiles all `.jsx` → `.js`
- ✅ Bundles React components
- ✅ Optimizes and minifies code
- ✅ Processes Tailwind CSS
- ✅ Optimizes images
- ✅ Creates `dist/` folder with production files

**Output location:** `dist/` folder

---

### Step 2: Test Build Locally (Optional but Recommended)
```bash
npm run preview
```

**What this does:**
- Serves the built files locally
- Let you verify everything works before deploying
- Usually runs on `http://localhost:4173`

---

### Step 3: Deploy to Firebase
```bash
firebase deploy
```

**What this does:**
- Uploads contents of `dist/` folder to Firebase Hosting
- Makes your site live
- Updates your production URL

---

## 📋 Complete Deployment Checklist

### First Time Setup
- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Login to Firebase: `firebase login`
- [ ] Initialize project: `firebase init hosting`

### Every Deployment
- [ ] Make your code changes
- [ ] Test locally: `npm run dev`
- [ ] Build production: `npm run build`
- [ ] Test build: `npm run preview` (optional)
- [ ] Deploy: `firebase deploy`

---

## 🔍 How to Verify It's Fixed

After deploying, check your Firebase site:

### ✅ Success Indicators
- Site loads without errors
- No `.jsx` file references in browser console
- All styles and images load correctly
- JavaScript bundles are minified
- React app works properly

### ❌ Still Broken?
If you still see errors:
1. Clear browser cache
2. Check Firebase console for deployment status
3. Verify `dist/` folder exists locally
4. Check `dist/index.html` - should reference bundled `.js` files, not `.jsx`

---

## 📁 Project Structure

```
chilik-rosenberg/
├── src/              # Source code (NOT deployed)
│   ├── components/
│   ├── data/
│   ├── utils/
│   └── main.jsx
├── dist/             # Built files (DEPLOYED) ✅
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── images/
│   └── ...
├── firebase.json     # Points to "dist" ✅
└── package.json
```

---

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (localhost) |
| `npm run build` | Create production build |
| `npm run preview` | Test production build locally |
| `firebase deploy` | Deploy to Firebase |
| `firebase deploy --only hosting` | Deploy only hosting (faster) |

---

## 💡 Pro Tips

### 1. Always Build Before Deploy
```bash
# Good workflow
npm run build && firebase deploy
```

### 2. Add to .gitignore
Make sure `dist/` is in `.gitignore`:
```
dist/
```

### 3. CI/CD Automation (Optional)
For GitHub Actions, use:
```yaml
- run: npm ci
- run: npm run build
- run: firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "dist folder not found"
**Solution:** Run `npm run build` first

### Issue 2: Old version still showing
**Solution:** 
- Clear browser cache (Ctrl+Shift+R)
- Wait 2-3 minutes for Firebase CDN to update
- Check incognito window

### Issue 3: 404 errors on refresh
**Solution:** Already fixed in `firebase.json` with rewrites rule ✅

### Issue 4: Assets not loading
**Solution:** Check Vite's `base` config in `vite.config.js`

---

## 📊 Build Output Example

When you run `npm run build`, you should see:

```
vite v5.4.21 building for production...
✓ 1620 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.16 kB │ gzip: 0.66 kB
dist/assets/index-[hash].css     21.28 kB │ gzip: 4.71 kB
dist/assets/index-[hash].js      615.06 kB │ gzip: 155.27 kB
✓ built in 4.08s
```

---

## ✅ Final Deployment Steps

### 1. Build
```bash
npm run build
```

### 2. Deploy
```bash
firebase deploy
```

### 3. Success!
Your site is now live at: `https://your-project.web.app`

---

**Last Updated:** January 20, 2026  
**Status:** ✅ Configuration Fixed  
**Ready for:** Production Deployment
