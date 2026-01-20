/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        brand: {
          dark: '#121214',          // Main background
          'dark-lighter': '#1E1E24', // Card backgrounds
          'dark-alt': '#1a1a1c',     // Alternative dark (rating bar)
          'dark-section': '#0a0a0a', // Section backgrounds
          gold: '#E9C46A',           // Primary brand color
          text: '#EAEAE0',           // Light text color
        },
        // Integration Colors
        whatsapp: '#25D366',
        // Media Brand Colors
        media: {
          mako: '#7d32d3',
          reshet: '#0056d2',
          kan: '#ffffff',
          ynet: '#ed1c24',
        },
      },
      fontFamily: {
        serif: ['Frank Ruhl Libre', 'serif'],
        sans: ['Heebo', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
        '6xl': '4rem',
        '7xl': '6rem',
      },
      keyframes: {
        'pulse-green': {
          '0%': { boxShadow: '0 0 0 0 rgba(37, 211, 102, 0.4)' },
          '70%': { boxShadow: '0 0 0 15px rgba(37, 211, 102, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(37, 211, 102, 0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-0.5rem)' },
          to: { transform: 'translateY(0)' },
        },
        'zoom-in': {
          from: { transform: 'scale(0.95)' },
          to: { transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-green': 'pulse-green 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-in-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-in-out',
        'zoom-in': 'zoom-in 0.3s ease-in-out',
      },
      boxShadow: {
        'hub': '0 10px 30px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
