# חיליק רוזנברג | סיורים בבני ברק

A modern, fast, and production-ready Vite + React application for Chilik Rosenberg's culinary and cultural tours in Bnei Brak.

## 🚀 Tech Stack

- **Vite** - Lightning-fast build tool
- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase** - Real-time database for tour availability
- **Lucide React** - Beautiful icon library

## 📁 Project Structure

```
chilik-rosenberg/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── Header.jsx       # Navigation header
│   │   ├── Hero.jsx         # Hero section
│   │   ├── RatingBar.jsx    # Rating and testimonials
│   │   ├── Bio.jsx          # Biography section
│   │   ├── Journey.jsx      # Tour stations
│   │   ├── Menu.jsx         # Food menu
│   │   ├── BookingSection.jsx  # Smart date booking with Firebase
│   │   ├── MediaSection.jsx    # Media appearances
│   │   ├── FAQ.jsx          # FAQ accordion
│   │   ├── Footer.jsx       # Footer
│   │   ├── HelpHub.jsx      # Floating help buttons
│   │   └── ScrollToTop.jsx  # Scroll to top button
│   ├── data/
│   │   └── content.js       # All static content and data
│   ├── hooks/
│   │   ├── useFirebaseData.js   # Firebase data hook
│   │   └── useScrollProgress.js # Scroll tracking hook
│   ├── utils/
│   │   ├── firebase.js      # Firebase configuration
│   │   ├── dateUtils.js     # Date utility functions
│   │   └── whatsapp.js      # WhatsApp integration
│   ├── assets/              # Images and static assets
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
└── package.json             # Dependencies
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## 📦 Build for Production

Build the application for production:

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

## 🔍 Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## 🎨 Key Features

- **📱 Fully Responsive** - Works perfectly on all devices
- **⚡ Lightning Fast** - Vite provides instant HMR and optimized builds
- **🔥 Firebase Integration** - Real-time tour availability updates
- **📅 Smart Date Picker** - Automatic Thursday selection logic
- **💬 WhatsApp Integration** - Direct booking via WhatsApp
- **🌐 RTL Support** - Full right-to-left language support
- **🎭 Modern UI** - Beautiful animations and transitions
- **♿ Accessible** - Semantic HTML and ARIA labels

## 📝 Customization

### Update Content

Edit `src/data/content.js` to update:
- Tour stations
- Food menu
- FAQ items
- Media links
- WhatsApp number

### Update Styles

Modify `src/index.css` for global styles or `tailwind.config.js` for theme customization.

### Firebase Configuration

Update Firebase credentials in `src/utils/firebase.js` if needed.

## 🚀 Deployment

This project can be deployed to:
- Firebase Hosting
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

## 📄 License

© 2026 All rights reserved - חיליק רוזנברג | סיורים בבני ברק

## 🤝 Support

For questions or support, contact via WhatsApp: [972505804367](https://wa.me/972505804367)
