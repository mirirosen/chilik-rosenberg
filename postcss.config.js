export default {
  plugins: {
    tailwindcss: process.env.CHILIK_INQUIRY_BUILD === '1' ? { config: './tailwind.inquiry.config.js' } : process.env.CHILIK_BOOKING_BUILD === '1' ? { config: './tailwind.booking.config.js' } : {},
    autoprefixer: {},
  },
}
