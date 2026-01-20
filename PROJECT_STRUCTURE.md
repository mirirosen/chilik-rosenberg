# Project Structure Documentation

## 📂 Directory Structure

```
chilik-rosenberg/
├── public/                      # Static assets (if needed)
├── src/                         # Source code
│   ├── assets/                  # Images and media files
│   │   ├── hero-bg.jpeg        # Hero section background
│   │   └── hilik-profile.jpeg  # Profile image
│   │
│   ├── components/              # React components (UI building blocks)
│   │   ├── Header.jsx          # Navigation header with mobile menu
│   │   ├── Hero.jsx            # Hero section with CTA
│   │   ├── RatingBar.jsx       # 5-star rating and testimonials
│   │   ├── Bio.jsx             # Biography section
│   │   ├── Journey.jsx         # 9 tour stations grid
│   │   ├── Menu.jsx            # Food menu carousel
│   │   ├── BookingSection.jsx  # Smart date picker with Firebase
│   │   ├── MediaSection.jsx    # Media appearances (Mako, Kan 11, Reshet 13)
│   │   ├── FAQ.jsx             # Accordion FAQ section
│   │   ├── Footer.jsx          # Footer with copyright
│   │   ├── HelpHub.jsx         # Floating WhatsApp & FAQ buttons
│   │   ├── ScrollToTop.jsx     # Scroll to top button
│   │   └── ErrorBoundary.jsx   # Error handling wrapper
│   │
│   ├── data/                    # Static content and configuration
│   │   └── content.js          # All text, links, and data
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useFirebaseData.js  # Hook for Firebase real-time data
│   │   └── useScrollProgress.js # Hook for scroll tracking
│   │
│   ├── utils/                   # Utility functions
│   │   ├── firebase.js         # Firebase initialization
│   │   ├── dateUtils.js        # Date manipulation functions
│   │   ├── whatsapp.js         # WhatsApp integration
│   │   └── iconMapper.js       # Icon name to component mapper
│   │
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles and animations
│
├── index.html                   # HTML template
├── vite.config.js              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── package.json                # Dependencies and scripts
├── .gitignore                  # Git ignore rules
├── README.md                   # Project documentation
├── DEPLOYMENT.md               # Deployment guide
└── PROJECT_STRUCTURE.md        # This file
```

## 🧩 Component Architecture

### Layout Components
- **Header**: Fixed navigation with smooth scroll, mobile menu
- **Hero**: Full-screen hero with call-to-action
- **Footer**: Simple copyright footer

### Content Components
- **RatingBar**: Social proof with 5-star rating
- **Bio**: About section with profile image
- **Journey**: Grid of 9 tour stations with icons
- **Menu**: Horizontal scrolling food menu
- **MediaSection**: Media appearances with branded colors

### Interactive Components
- **BookingSection**: 
  - Dynamic Thursday date generator
  - Firebase real-time availability
  - Smart date validation
  - WhatsApp booking integration
  
- **FAQ**: Accordion with smooth animations
- **HelpHub**: Floating action buttons (WhatsApp + FAQ)
- **ScrollToTop**: Appears after scrolling 500px

### Utility Components
- **ErrorBoundary**: Catches React errors gracefully

## 🔧 Utilities & Hooks

### Custom Hooks
- `useFirebaseData`: Subscribes to Firebase Firestore for real-time updates
- `useScrollProgress`: Tracks scroll position and progress

### Utility Functions
- `dateUtils.js`: Thursday calculation, date formatting
- `whatsapp.js`: WhatsApp link generation with pre-filled messages
- `iconMapper.js`: Maps icon names to Lucide React components
- `firebase.js`: Firebase app initialization

## 📊 Data Management

### Content Structure (`src/data/content.js`)

```javascript
{
  stations: [],      // 9 tour stations
  foods: [],         // 4 food items
  faqs: [],          // 5 FAQ items
  mediaLinks: [],    // 3 media appearances
  whatsappNumber,    // Contact number
  siteMetadata       // SEO data
}
```

### Firebase Data Structure

```
artifacts/
  └── hilik-rosenberg-v1/
      └── public/
          └── data/
              └── settings/
                  └── global/
                      ├── blocked: []      // Blocked dates
                      └── soldOut: []      // Sold out dates
```

## 🎨 Styling Architecture

### Tailwind Configuration
- Custom colors (gold, bg-dark, green-whatsapp)
- Custom fonts (Frank Ruhl Libre, Heebo)
- RTL support built-in

### Global Styles (`index.css`)
- CSS variables for colors
- Header animations
- Hub button styles
- Media card effects
- Date card styles
- Custom scrollbar
- Animation keyframes

## 🔥 Firebase Integration

### Setup
1. Firebase app initialization in `utils/firebase.js`
2. Anonymous authentication
3. Firestore real-time listener

### Usage
```javascript
import { useFirebaseData } from '../hooks/useFirebaseData';

const cloudData = useFirebaseData();
// cloudData: { blocked: [], soldOut: [] }
```

## 📱 Responsive Design

### Breakpoints (Tailwind defaults)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile Optimizations
- Hamburger menu for mobile
- Horizontal scrolling for dates and food menu
- Touch-friendly tap targets
- Optimized images

## ⚡ Performance Optimizations

1. **Code Splitting**: Automatic via Vite
2. **Lazy Loading**: Components loaded on demand
3. **Image Optimization**: Properly sized images
4. **Tree Shaking**: Unused code eliminated
5. **Minification**: Production builds are minified
6. **Caching**: Vite handles cache efficiently

## 🛠️ Development Workflow

### Local Development
```bash
npm run dev         # Start dev server
```

### Production Build
```bash
npm run build       # Build for production
npm run preview     # Preview production build
```

### Code Quality
- ESLint for linting
- React best practices
- Semantic HTML
- Accessible components

## 🔐 Security Considerations

- Client-side Firebase credentials (normal for web apps)
- Firebase Security Rules should be configured
- No sensitive data in source code
- Environment variables for production (optional)

## 🌐 Internationalization

Currently supports:
- Hebrew (RTL)
- All text in Hebrew
- RTL layout with Tailwind's `dir="rtl"`

To add more languages:
1. Create language files in `src/data/`
2. Add language switcher component
3. Update content dynamically

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] All links work
- [ ] Mobile menu toggles
- [ ] Date picker shows Thursdays
- [ ] WhatsApp links open correctly
- [ ] Firebase updates in real-time
- [ ] FAQ accordion expands/collapses
- [ ] Scroll to top button appears
- [ ] Images load correctly
- [ ] RTL layout works

### Future Testing
- Consider adding Jest for unit tests
- Cypress or Playwright for E2E tests
- React Testing Library for component tests

## 📈 Future Enhancements

Potential features to add:
- [ ] Payment integration
- [ ] Email newsletter signup
- [ ] Blog section
- [ ] Photo gallery from tours
- [ ] Reviews and testimonials section
- [ ] Multi-language support
- [ ] Admin dashboard for managing dates
- [ ] Tour calendar view
- [ ] Weather integration for tour dates
