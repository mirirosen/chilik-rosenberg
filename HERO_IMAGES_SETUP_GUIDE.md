# 🎬 Hero Images Setup Guide

## ✅ What's Been Done

1. **Created folder:** `public/hero-images/`
2. **Updated code:** Hero.jsx now uses local image paths
3. **Added documentation:** README in the hero-images folder

---

## 📸 Next Steps - Add Your Images

### Option 1: Quick Test (Use Placeholder Images)

Download 3 free high-quality images from Unsplash:

1. **Jewish Food/Challah:**
   - https://unsplash.com/photos/bread-on-white-surface-8bghKxNU1j0
   - Save as: `img1.jpg`

2. **Bakery Scene:**
   - https://unsplash.com/photos/pastries-on-brown-wooden-table-XoByiBymX20
   - Save as: `img2.jpg`

3. **Bnei Brak/Jerusalem:**
   - https://unsplash.com/photos/lighted-buildings-during-night-time-B-btO78NyoM
   - Save as: `img3.jpg`

**Save all 3 images to:** `public/hero-images/`

---

### Option 2: Use Your Own Images

**Requirements:**
- **Format:** JPG or PNG
- **Size:** 1920x1080 (Full HD) minimum
- **Aspect Ratio:** 16:9 (landscape)
- **File Size:** Optimize to < 500KB each
- **Names:** `img1.jpg`, `img2.jpg`, `img3.jpg`

**Suggested Themes:**
1. **img1.jpg** - Your signature dish (Cholent, Challah, Shabbat table)
2. **img2.jpg** - Bnei Brak bakery or food scene
3. **img3.jpg** - Bnei Brak streets at night or iconic location

**Location:** `public/hero-images/`

---

## 🔧 Optimize Your Images (IMPORTANT!)

Before adding images, compress them to improve page load speed:

### Online Tools (Free)
- **TinyPNG:** https://tinypng.com/ (Best quality preservation)
- **Squoosh:** https://squoosh.app/ (Advanced control)
- **Compressor.io:** https://compressor.io/ (Simple drag-and-drop)

### Target Stats
- **Before:** 2-5 MB per image ❌
- **After:** 200-500 KB per image ✅

---

## 📁 Final Folder Structure

```
public/
├── hero-images/
│   ├── img1.jpg          ← Jewish food theme
│   ├── img2.jpg          ← Bakery scene
│   ├── img3.jpg          ← Bnei Brak cityscape
│   └── README.md         ← Documentation
├── hero-bg.jpeg          ← Your original hero image (kept as backup)
└── hilik-profile.jpeg    ← Profile image
```

---

## 🎨 Current Configuration

### Code Changed in `src/components/Hero.jsx`:

**Before (Testing Mode):**
```javascript
const heroImages = [
  'https://images.unsplash.com/...',  // External Unsplash URLs
  'https://images.unsplash.com/...',
  'https://images.unsplash.com/...'
];
```

**After (Production Mode):**
```javascript
const heroImages = [
  '/hero-images/img1.jpg',  // Local images (public folder)
  '/hero-images/img2.jpg',
  '/hero-images/img3.jpg',
];
```

---

## ⚠️ Important Notes

### If Images Don't Load
If you see broken images after adding files:

1. **Check file names match exactly:**
   - ✅ `img1.jpg` (lowercase)
   - ❌ `IMG1.jpg` (uppercase)
   - ❌ `img1.JPG` (wrong extension case)

2. **Check file location:**
   - ✅ `public/hero-images/img1.jpg`
   - ❌ `src/hero-images/img1.jpg`
   - ❌ `hero-images/img1.jpg`

3. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev  # Restart
   ```

4. **Hard refresh browser:**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

---

## 🚀 Testing Your Images

### Step 1: Add Images
Place 3 images in `public/hero-images/` named `img1.jpg`, `img2.jpg`, `img3.jpg`

### Step 2: View Locally
```bash
npm run dev
# Open: http://localhost:3003/
```

### Step 3: Verify Slideshow
- ✅ Images load (no broken icons)
- ✅ Slideshow auto-cycles every 5 seconds
- ✅ Smooth fade + zoom transitions
- ✅ Navigation dots work when clicked
- ✅ Text is readable over all images

### Step 4: Build for Production
```bash
npm run build
# Images should be in: dist/hero-images/
```

---

## 🔄 Switching Back to Unsplash (Testing)

If you want to temporarily use external URLs again:

1. Open `src/components/Hero.jsx`
2. **Comment out** the production mode:
   ```javascript
   // const heroImages = [
   //   '/hero-images/img1.jpg',
   //   '/hero-images/img2.jpg',
   //   '/hero-images/img3.jpg',
   // ];
   ```
3. **Uncomment** the testing fallback:
   ```javascript
   const heroImages = [
     'https://images.unsplash.com/...',
     'https://images.unsplash.com/...',
     'https://images.unsplash.com/...'
   ];
   ```

---

## 📊 Performance Impact

### Before (External Unsplash URLs)
- ✅ No initial setup needed
- ❌ Depends on Unsplash CDN
- ❌ Potential CORS issues
- ❌ Slower load times (external request)

### After (Local Images)
- ✅ Faster load times (same server)
- ✅ No external dependencies
- ✅ Works offline
- ✅ Better control over quality/size
- ⚠️ Requires manual image setup

---

## 🎯 Quick Checklist

- [x] ✅ Folder created: `public/hero-images/`
- [x] ✅ Code updated: Hero.jsx uses local paths
- [x] ✅ Documentation added
- [ ] ⏳ Add 3 images to folder
- [ ] ⏳ Optimize images (< 500KB each)
- [ ] ⏳ Test locally (npm run dev)
- [ ] ⏳ Verify slideshow works
- [ ] ⏳ Build and deploy

---

## 🆘 Need Help?

**Images not showing?**
1. Check browser console for errors (F12)
2. Verify file paths match exactly
3. Restart dev server
4. Clear browser cache

**Images too large?**
1. Use TinyPNG to compress
2. Resize to 1920x1080 max
3. Target 200-500KB per file

**Slideshow not smooth?**
1. Ensure images are optimized
2. Check browser performance
3. Reduce image dimensions if needed

---

**Current Status:** ✅ Folder ready, code updated, waiting for images  
**Next Action:** Add 3 images named `img1.jpg`, `img2.jpg`, `img3.jpg` to `public/hero-images/`
