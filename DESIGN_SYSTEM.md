# Design System Documentation

## Overview

This project uses a centralized Design System defined in `tailwind.config.js`. All hardcoded values have been removed and replaced with semantic Tailwind utility classes.

## Color Palette

### Brand Colors
```javascript
brand: {
  dark: '#121214',          // Main background
  'dark-lighter': '#1E1E24', // Card backgrounds
  'dark-alt': '#1a1a1c',     // Alternative dark (rating bar)
  'dark-section': '#0a0a0a', // Section backgrounds
  gold: '#E9C46A',           // Primary brand color
  text: '#EAEAE0',           // Light text color
}
```

**Usage:**
- `bg-brand-dark` - Main dark background
- `bg-brand-dark-lighter` - Card backgrounds
- `bg-brand-dark-alt` - Rating section background
- `bg-brand-dark-section` - Section backgrounds
- `text-brand-gold` - Gold text (primary accent)
- `text-brand-text` - Light text

### Integration Colors
```javascript
whatsapp: '#25D366'
```

**Usage:**
- `bg-whatsapp` - WhatsApp button background

### Media Brand Colors
```javascript
media: {
  mako: '#7d32d3',   // Mako purple
  reshet: '#0056d2', // Reshet blue
  kan: '#ffffff',    // Kan white
  ynet: '#ed1c24',   // Ynet red
}
```

**Usage:**
- `text-media-mako` - Mako purple text
- `border-r-media-mako` - Mako purple border
- `bg-media-reshet` - Reshet blue background
- etc.

## Typography

### Font Families
```javascript
fontFamily: {
  serif: ['Frank Ruhl Libre', 'serif'],
  sans: ['Heebo', 'sans-serif'],
}
```

**Usage:**
- `font-serif` - Headlines (Frank Ruhl Libre)
- `font-sans` - Body text (Heebo) - default

## Border Radius

### Custom Radius Values
```javascript
borderRadius: {
  '4xl': '2rem',  // 32px
  '5xl': '3rem',  // 48px
  '6xl': '4rem',  // 64px
  '7xl': '6rem',  // 96px
}
```

**Usage:**
- `rounded-4xl` - Date cards, media cards
- `rounded-5xl` - Bio image, journey cards
- `rounded-6xl` - Food menu cards
- `rounded-7xl` - Booking section (on large screens)

## Animations

### Keyframes
All animations are defined in `tailwind.config.js`:

```javascript
keyframes: {
  'pulse-green': { ... },      // WhatsApp button pulse
  'float': { ... },            // Floating scroll-to-top button
  'fade-in': { ... },          // Fade in effect
  'slide-in-from-top': { ... },// Slide from top
  'zoom-in': { ... },          // Zoom in effect
}
```

### Animation Classes
```javascript
animation: {
  'pulse-green': 'pulse-green 2s infinite',
  'float': 'float 3s ease-in-out infinite',
  'fade-in': 'fade-in 0.3s ease-in-out',
  'slide-in-from-top': 'slide-in-from-top 0.3s ease-in-out',
  'zoom-in': 'zoom-in 0.3s ease-in-out',
}
```

**Usage:**
- `animate-pulse-green` - WhatsApp button
- `animate-float` - Scroll to top button
- `animate-fade-in` - Fade in elements
- `animate-slide-in-from-top` - FAQ answers
- `animate-zoom-in` - Selected date feedback

## Box Shadows

```javascript
boxShadow: {
  'hub': '0 10px 30px rgba(0, 0, 0, 0.5)',
}
```

**Usage:**
- `shadow-hub` - Hub buttons (WhatsApp, FAQ)

## Component Classes

### Custom Components (defined in `src/index.css`)

#### Header
- `.main-header` - Fixed header with blur backdrop
- `.nav-link` - Navigation links with underline animation

#### Buttons
- `.hub-btn` - Base hub button style
- `.hub-btn-whatsapp` - WhatsApp specific styling
- `.hub-btn-faq` - FAQ button styling
- `.pulse` - Pulse animation

#### Cards
- `.media-card` - Media appearance cards
- `.date-card` - Date selection cards

#### Scroll
- `.dates-wrapper` - Horizontal scroll container for dates
- `.custom-scroll::-webkit-scrollbar` - Custom scrollbar styling

#### Animations
- `.floating-btn` - Floating animation
- `.react-content` - Fade in content
- `.animate-in` - Animation fill mode
- `.fade-in`, `.slide-in-from-top-2`, `.zoom-in` - Various animations

## Migration Guide

### Before (Hardcoded)
```jsx
<div className="bg-[#121214] text-[#E9C46A]">
  <h1 className="text-[#E9C46A]">Title</h1>
</div>
```

### After (Design System)
```jsx
<div className="bg-brand-dark text-brand-gold">
  <h1 className="text-brand-gold">Title</h1>
</div>
```

## Color Reference Chart

| Hex Color | Design Token | Tailwind Class |
|-----------|--------------|----------------|
| `#121214` | brand.dark | `bg-brand-dark` / `text-brand-dark` |
| `#1E1E24` | brand.dark-lighter | `bg-brand-dark-lighter` |
| `#1a1a1c` | brand.dark-alt | `bg-brand-dark-alt` |
| `#0a0a0a` | brand.dark-section | `bg-brand-dark-section` |
| `#E9C46A` | brand.gold | `bg-brand-gold` / `text-brand-gold` |
| `#EAEAE0` | brand.text | `text-brand-text` |
| `#25D366` | whatsapp | `bg-whatsapp` / `text-whatsapp` |
| `#7d32d3` | media.mako | `bg-media-mako` / `text-media-mako` |
| `#0056d2` | media.reshet | `bg-media-reshet` / `text-media-reshet` |
| `#ffffff` | media.kan | `bg-media-kan` / `text-media-kan` |
| `#ed1c24` | media.ynet | `bg-media-ynet` / `text-media-ynet` |

## Validation Rules

✅ **NO** hex codes in component files  
✅ **NO** inline `style={{ color: '#...' }}`  
✅ **ALL** colors defined in `tailwind.config.js`  
✅ **ALL** animations defined in config  
✅ **SEMANTIC** naming (brand-gold vs gold)  

## Benefits

1. **Consistency** - Single source of truth for all design tokens
2. **Maintainability** - Update colors in one place
3. **Type Safety** - Tailwind autocomplete works perfectly
4. **Performance** - Optimized class names
5. **Scalability** - Easy to add new themes
6. **DRY Principle** - No repeated color values

## Adding New Colors

1. Open `tailwind.config.js`
2. Add to appropriate section under `theme.extend.colors`
3. Use semantic naming (e.g., `accent`, `primary`, `secondary`)
4. Update this documentation

Example:
```javascript
colors: {
  brand: {
    // existing colors...
    accent: '#FF6B6B', // Add new accent color
  }
}
```

Usage:
```jsx
<div className="bg-brand-accent text-white">
  New accent color!
</div>
```

## Notes

- **Opacity Modifiers**: Use with custom colors like `bg-brand-gold/20`
- **Arbitrary Values**: Still available if needed, but should be avoided
- **Theme Switching**: Easy to implement with CSS variables in the future
- **Dark Mode**: Can be added using Tailwind's dark mode utilities

---

**Last Updated:** 2026-01-20  
**Maintainer:** Frontend Team  
**Status:** ✅ Complete
