import { IS_PREPROD, PREVIEW_NOTICE } from './utils/preview';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initGeoLanguageDetection } from './i18n';
import Header from './components/Header';
import BookingSection from './components/BookingSection';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import Admin from './components/Admin';
import BookingForm from './components/BookingForm';
import BookingConfirmation from './components/BookingConfirmation';
import Terms from './components/Terms';
import { getDemoBooking } from './utils/demoBookingService';
import { validBookingReference } from './utils/paymentState';
import { applyRouteMetadata, routeFromPath } from './utils/routeMetadata';

function App() {
  const { t, i18n } = useTranslation();
  const [routeSearch, setRouteSearch] = useState(window.location.search);
  const [currentRoute, setCurrentRoute] = useState(() => routeFromPath(window.location.pathname));
  // Unsaved customer details live only in React memory in this tab.
  const [bookingDraft, setBookingDraft] = useState(null);
  const [dateSelection, setDateSelection] = useState(null);
  const confirmationId = new URLSearchParams(routeSearch).get('id');
  const [bookingData, setBookingData] = useState(() => {
    if (!IS_PREPROD || window.location.pathname !== '/confirmation') return null;
    try { return getDemoBooking(confirmationId); } catch { return null; }
  });
  const currentBookingData = bookingData?.bookingId === confirmationId ? bookingData : null;
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(true);

  // Geolocation-based language detection on first load
  useEffect(() => {
    const detectLanguage = async () => {
      // Only detect if no saved preference
      const savedLanguage = localStorage.getItem('language');
      if (savedLanguage) {
        setIsDetectingLanguage(false);
        return;
      }

      try {
        await initGeoLanguageDetection();
      } catch (error) {
        console.error('Language detection error:', error);
      } finally {
        setIsDetectingLanguage(false);
      }
    };

    detectLanguage();
  }, []);

  useEffect(() => {
    // Set direction based on current language
    const dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    // Check current path
    const checkRoute = () => {
      setRouteSearch(window.location.search);
      setCurrentRoute(routeFromPath(window.location.pathname));
    };

    checkRoute();

    // Restore homepage section links when returning from booking/terms pages.
    const handleHashScroll = () => {
      const hash = window.location.hash;
      const sectionIds = ['date-selection', 'about', 'journey', 'menu', 'lectures', 'faq', 'media'];
      if (sectionIds.some(id => hash === `#${id}`)) {
        setTimeout(() => {
          const element = document.getElementById(hash.slice(1));
          if (element) {
            element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          }
        }, 100);
      }
    };

    handleHashScroll();

    // Listen for route changes
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', handleHashScroll);

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, []);

  const handleBookingSuccess = (data) => {
    setBookingDraft(null);
    setDateSelection(null);
    setBookingData(data);
    setCurrentRoute('confirmation');
    window.history.pushState({}, '', `/confirmation?id=${encodeURIComponent(data.bookingId)}`);
    setRouteSearch(window.location.search);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleBackToHome = () => {
    setBookingDraft(null);
    setDateSelection(null);
    setCurrentRoute('home');
    setBookingData(null);
    window.history.pushState({}, '', '/');
    setRouteSearch('');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const handleContinueBooking = (date, participants) => {
    const search = `?date=${encodeURIComponent(date)}&participants=${participants}`;
    window.history.pushState({}, '', `/booking${search}`);
    setRouteSearch(search);
    setCurrentRoute('booking');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const handleChangeSelection = (form) => {
    const { name, phone, email, notes, howDidYouHear, dateOfBirth, paymentMethod } = form;
    setBookingDraft({ name, phone, email, notes, howDidYouHear, dateOfBirth, paymentMethod });
    setDateSelection({ date: form.tourDate, participants: form.participants });
    setBookingData(null);
    window.history.pushState({}, '', '/#date-selection');
    setRouteSearch('');
    setCurrentRoute('home');
  };

  useEffect(() => {
    if (currentRoute === 'home' && window.location.hash === '#date-selection') {
      document.getElementById('date-selection')?.scrollIntoView({ behavior: 'auto' });
    }
  }, [currentRoute]);

  useEffect(() => {
    applyRouteMetadata({ route: currentRoute, language: i18n.language, isPreprod: IS_PREPROD, t });
  }, [currentRoute, i18n.language, t]);

  if (currentRoute === 'not-found' || (currentRoute === 'confirmation' && !currentBookingData && !validBookingReference(confirmationId))) {
    return <main dir={i18n.language === 'he' ? 'rtl' : 'ltr'} className="p-12">
      <h1>{i18n.language === 'he' ? 'העמוד אינו זמין' : 'Page unavailable'}</h1>
      <p>{currentRoute === 'not-found' ? (i18n.language === 'he' ? 'הכתובת אינה קיימת.' : 'This address does not exist.') : i18n.language === 'he' ? 'לא מוצג כאן אישור הזמנה. לבדיקת הזמנה קיימת יש לפנות עם מספר ההזמנה.' : 'No booking confirmation is available here. To check an existing booking, contact us with your booking reference.'}</p>
      <a href="/">{i18n.language === 'he' ? 'חזרה לעמוד הבית' : 'Back to homepage'}</a>
    </main>;
  }

  // Render admin interface
  if (currentRoute === 'admin') {
    return IS_PREPROD ? <main className="p-12"><h1>Preprod</h1><p>{PREVIEW_NOTICE}</p><a href="/">חזרה / Home</a></main> : <Admin />;
  }

  // Render terms page
  if (currentRoute === 'terms') {
    return <Terms />;
  }

  // Render booking form
  if (currentRoute === 'booking' || (currentRoute === 'confirmation' && !currentBookingData)) {
    return (
      <ErrorBoundary>
        <div className="target-site target-booking-flow min-h-screen bg-brand-dark text-white">
          <Header />
          <div className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
            <BookingForm key={currentRoute + routeSearch} initialDraft={bookingDraft} onChangeSelection={handleChangeSelection} onSuccess={handleBookingSuccess} statusBookingId={currentRoute === 'confirmation' ? confirmationId : undefined} />
          </div>
          <Footer />
        </div>
      </ErrorBoundary>
    );
  }

  // Render confirmation page
  if (currentRoute === 'confirmation' && currentBookingData) {
    return (
      <ErrorBoundary>
        <BookingConfirmation
          bookingData={currentBookingData}
          onBackToHome={handleBackToHome}
        />
      </ErrorBoundary>
    );
  }

  // Render main site
  return (
    <ErrorBoundary>
      <div className="target-site min-h-screen">
        <a href="#main-content" className="target-skip-link">{t('common.skipContent')}</a>
        <Header />
        <main id="main-content" tabIndex={-1}>
        <BookingSection onContinue={handleContinueBooking} initialSelection={dateSelection} />
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
