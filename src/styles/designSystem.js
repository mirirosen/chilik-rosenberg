// Design System - Composed utility tokens for chilik-rosenberg
//
// COLOR SOURCE OF TRUTH → tailwind.config.js (brand.* keys)
// Do NOT define raw color hex values here.
// Use Tailwind classes: bg-brand-gold, text-brand-text, bg-brand-dark, etc.

export const spacing = {
  section: 'py-20 md:py-32',           // Generous section spacing
  sectionTight: 'py-12 md:py-20',      // Tighter section spacing
  container: 'px-4 md:px-8 lg:px-16 max-w-7xl mx-auto',
  containerWide: 'px-4 md:px-6 lg:px-8 max-w-[1400px] mx-auto',
  containerNarrow: 'px-4 md:px-8 max-w-4xl mx-auto',
};

export const typography = {
  // Hero - largest, most impactful
  hero: 'text-5xl md:text-7xl lg:text-8xl font-black leading-tight',
  // Headings
  h1: 'text-4xl md:text-6xl font-bold leading-tight',
  h2: 'text-3xl md:text-5xl font-bold leading-tight',
  h3: 'text-2xl md:text-4xl font-bold leading-snug',
  h4: 'text-xl md:text-2xl font-semibold',
  // Body text
  body: 'text-base md:text-lg leading-relaxed',
  bodyLarge: 'text-lg md:text-xl leading-relaxed',
  small: 'text-sm md:text-base',
  caption: 'text-xs md:text-sm',
};

export const effects = {
  // Glass morphism
  glass: 'bg-white/10 backdrop-blur-md border border-white/20',
  glassStrong: 'bg-white/15 backdrop-blur-lg border border-white/30',
  glassDark: 'bg-black/40 backdrop-blur-md border border-white/10',
  // Gradients
  darkGradient: 'bg-gradient-to-t from-black/80 via-black/40 to-transparent',
  darkGradientStrong: 'bg-gradient-to-t from-black/90 via-black/60 to-black/20',
  goldGradient: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600',
  warmGradient: 'bg-gradient-to-br from-amber-900 via-amber-700 to-amber-500',
  // Overlays
  imageOverlay: 'absolute inset-0 bg-black/30',
  imageOverlayStrong: 'absolute inset-0 bg-black/50',
  // Shadows
  cardShadow: 'shadow-xl shadow-black/30',
  elevatedShadow: 'shadow-2xl shadow-black/40',
};

export const borders = {
  subtle: 'border border-white/10',
  medium: 'border border-white/20',
  gold: 'border border-brand-gold/30',
  goldStrong: 'border-2 border-brand-gold',
};

export const transitions = {
  default: 'transition-all duration-300 ease-out',
  slow: 'transition-all duration-500 ease-out',
  fast: 'transition-all duration-150 ease-out',
};

// Animation variants for Framer Motion
export const motionVariants = {
  fadeInUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5 }
  },
  slideInFromRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6 }
  },
  slideInFromLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.6 }
  },
  staggerChildren: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};

// Viewport settings for animations
export const viewportSettings = {
  once: true,
  margin: "-100px"
};
