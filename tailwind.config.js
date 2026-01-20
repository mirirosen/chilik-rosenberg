/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#121214',
        'gold': '#E9C46A',
        'green-whatsapp': '#25D366',
        'mako-color': '#7d32d3',
        'reshet-color': '#0056d2',
        'ynet-color': '#ed1c24',
      },
      fontFamily: {
        'serif': ['Frank Ruhl Libre', 'serif'],
        'sans': ['Heebo', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
