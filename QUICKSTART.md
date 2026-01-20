# 🚀 Quick Start Guide

## Prerequisites

- Node.js v16 or higher
- npm or yarn

## Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser to http://localhost:3000
```

That's it! The app is now running locally. 🎉

## Available Scripts

```bash
# Development
npm run dev          # Start dev server (hot reload enabled)

# Production
npm run build        # Build for production
npm run preview      # Preview production build locally

# Deployment (example)
npm run build        # Build first
# Then deploy the 'dist' folder to your hosting service
```

## Project Features

✅ **12 React Components** - Modular and reusable  
✅ **Firebase Integration** - Real-time tour availability  
✅ **Smart Date Picker** - Automatic Thursday detection  
✅ **WhatsApp Booking** - Direct message integration  
✅ **Mobile Responsive** - Works on all devices  
✅ **RTL Support** - Hebrew right-to-left layout  
✅ **Modern Stack** - Vite + React + Tailwind  

## File Structure

```
src/
├── components/      # React UI components
├── data/           # Static content (edit here!)
├── hooks/          # Custom React hooks
├── utils/          # Helper functions
└── assets/         # Images
```

## Customization

### Edit Content
All text, tour info, and links are in:
```javascript
src/data/content.js
```

### Update Styling
Global styles and Tailwind config:
```css
src/index.css
tailwind.config.js
```

### Firebase Config
Firebase credentials (if needed):
```javascript
src/utils/firebase.js
```

### WhatsApp Number
Update in:
```javascript
src/data/content.js
// Look for: whatsappNumber
```

## Common Tasks

### Add a New Tour Station
Edit `src/data/content.js`:
```javascript
export const stations = [
  // ... existing stations
  {
    icon: "star",  // Lucide icon name
    title: "New Station",
    desc: "Description here"
  }
];
```

### Add a New FAQ
Edit `src/data/content.js`:
```javascript
export const faqs = [
  // ... existing faqs
  {
    q: "Your question?",
    a: "Your answer here"
  }
];
```

### Update Media Links
Edit `src/data/content.js`:
```javascript
export const mediaLinks = [
  // ... existing links
  {
    name: "Media Name",
    icon: "tv",
    color: "#ff0000",
    url: "https://...",
    buttonText: "Watch Now"
  }
];
```

## Troubleshooting

### Port 3000 already in use?
```bash
# Use a different port
npm run dev -- --port 3001
```

### Build fails?
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Images not loading?
- Make sure images are in `src/assets/`
- Check import paths in components

## Development Tips

1. **Hot Reload**: Changes appear instantly without refresh
2. **Console**: Check browser console for errors
3. **React DevTools**: Install browser extension for debugging
4. **Tailwind**: Use utility classes for quick styling

## Deployment

See `DEPLOYMENT.md` for detailed deployment instructions to:
- Firebase Hosting
- Vercel
- Netlify
- GitHub Pages

## Documentation

- `README.md` - Full project documentation
- `DEPLOYMENT.md` - Deployment guide
- `PROJECT_STRUCTURE.md` - Architecture details
- `REFACTOR_SUMMARY.md` - What changed

## Need Help?

1. Check the documentation files
2. Review the code comments
3. Contact via WhatsApp: 972505804367

---

**Happy coding! 🎉**
