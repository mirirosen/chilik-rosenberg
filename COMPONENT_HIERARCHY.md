# Component Hierarchy

## Visual Structure

```
App.jsx (Root)
├── ErrorBoundary
│   ├── Header
│   │   ├── Desktop Navigation
│   │   └── Mobile Menu (conditional)
│   │
│   ├── Hero
│   │   ├── Badge
│   │   ├── H1 Title
│   │   ├── Subtitle
│   │   └── CTA Button
│   │
│   ├── RatingBar
│   │   ├── Star Rating (5 stars)
│   │   └── Grid of 3 Cards
│   │       ├── Card: מבט של בן-בית
│   │       ├── Card: טעימות בלעדיות
│   │       └── Card: גשר בין עולמות
│   │
│   ├── Bio
│   │   ├── Profile Image
│   │   └── Biography Text
│   │
│   ├── Journey
│   │   └── Grid of 9 Station Cards
│   │       ├── Station: הזרמים החרדיים
│   │       ├── Station: עולם השידוכים
│   │       ├── Station: בנייה יצירתית
│   │       ├── Station: חנויות ספרים
│   │       ├── Station: גמ"חים וחסד
│   │       ├── Station: ישיבות וחיידרים
│   │       ├── Station: מאפיית ויז'ניץ
│   │       ├── Station: התנדבות ותרומה
│   │       └── Station: חדרי האינטרנט
│   │
│   ├── Menu
│   │   └── Horizontal Scroll Container
│   │       ├── Food Card: הטשולנט שלי
│   │       ├── Food Card: דגים והערינג
│   │       ├── Food Card: קיגעל אוברנייט
│   │       └── Food Card: חלות ויז'ניץ חמות
│   │
│   ├── BookingSection ⭐ (Most Complex)
│   │   ├── Date Selector
│   │   │   ├── Left Arrow (desktop)
│   │   │   ├── Date Cards (9 Thursdays)
│   │   │   └── Right Arrow (desktop)
│   │   │
│   │   ├── Selection Feedback (conditional)
│   │   │   ├── If Thursday: Booking Button
│   │   │   └── If Not Thursday: Correction Options
│   │   │
│   │   └── Manual Date Input
│   │
│   ├── MediaSection
│   │   └── Grid of 3 Media Cards
│   │       ├── Media: מאקו
│   │       ├── Media: כאן 11
│   │       └── Media: רשת 13
│   │
│   ├── FAQ
│   │   └── Accordion (5 items)
│   │       ├── FAQ: האם ניתן לתאם סיור פרטי?
│   │       ├── FAQ: מה עושים בבני ברק בחמישי בערב?
│   │       ├── FAQ: כמה זמן נמשך הסיור?
│   │       ├── FAQ: איך מתלבשים לסיור?
│   │       └── FAQ: איפה קונים אוכל מוכן לשבת?
│   │
│   ├── Footer
│   │   └── Copyright Text
│   │
│   ├── HelpHub (Floating)
│   │   ├── WhatsApp Button (pulsing)
│   │   └── FAQ Button
│   │
│   └── ScrollToTop (conditional)
│       └── Up Arrow Button
```

## Data Flow

```
Firebase
   ↓
useFirebaseData hook
   ↓
BookingSection component
   ↓
Date Status Display (בודק, אין סיור, אזל המקום, נותרו מקומות)
```

## State Management

### Component-Level State

**Header**
- `mobileMenuOpen`: boolean

**BookingSection**
- `selectedDate`: string (ISO date)
- `cloudData`: object (from Firebase hook)

**FAQ**
- `openFaq`: number | null

**ScrollToTop**
- `showScrollTop`: boolean (from hook)

### Custom Hooks

**useFirebaseData**
- Returns: `cloudData` object
- Updates: Real-time via Firestore listener

**useScrollProgress**
- Returns: `{ showScrollTop, scrollProgress }`
- Updates: On window scroll event

## Props Flow

Most components are **self-contained** with no props:
- Data imported from `src/data/content.js`
- Utilities imported from `src/utils/`
- Icons imported from `src/utils/icons.js`

This design choice keeps components independent and easy to test.

## Event Handlers

### Navigation Events
- `scrollToSection(id)` - Smooth scroll to section
- `setMobileMenuOpen(bool)` - Toggle mobile menu

### Booking Events
- `setSelectedDate(dateStr)` - Select a date
- `handleWhatsApp(date, isPrivate)` - Open WhatsApp
- `scrollDates(direction)` - Scroll date container

### FAQ Events
- `handleFAQToggle(index)` - Toggle FAQ item

### Scroll Events
- `scrollToTop()` - Scroll to page top
- `openFaqSection()` - Scroll to FAQ and open first item

## Utility Functions

### Date Utilities (`dateUtils.js`)
```
getNearestThursday(date) → Date
isThursday(dateStr) → boolean
getUpcomingThursdays(count) → Array<DateObject>
formatDateHebrew(dateStr) → string
```

### WhatsApp Utility (`whatsapp.js`)
```
handleWhatsApp(date, isPrivate) → void (opens URL)
```

### Icon Mapper (`iconMapper.js`)
```
getIcon(iconName) → ReactComponent
```

### Firebase (`firebase.js`)
```
Exports: { app, auth, db, APP_ID }
```

## Styling Approach

### Tailwind Utility Classes
- 90% of styling via Tailwind
- Responsive modifiers (`md:`, `lg:`)
- Custom colors from config

### Custom CSS (`index.css`)
- Animations (pulse, fade-in, slide-in)
- Custom scrollbar
- Hub button styles
- Media card effects
- Nav link underline

## Performance Optimizations

### Code Splitting
```
Main bundle: 22 kB
React vendor: 134 kB
Firebase vendor: 439 kB
Lucide vendor: 18 kB (optimized!)
```

### Lazy Loading
- Images with proper loading attributes
- Components split by vendor

### Memoization
- `useMemo` for Thursday list generation
- Prevents unnecessary recalculations

## Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Screen reader friendly
- Focus states on interactive elements

## Browser Compatibility

- Modern browsers (ES6+)
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers

## RTL (Right-to-Left) Support

- HTML `dir="rtl"` attribute
- Tailwind RTL-aware utilities
- Text alignment: `text-right`
- Flex direction: `flex-row-reverse`
- Proper Hebrew text rendering
