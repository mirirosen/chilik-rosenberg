import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { initGeoLanguageDetection } from './i18n';
import Header from './components/Header';
import Hero from './components/Hero';
import RatingBar from './components/RatingBar';
import Bio from './components/Bio';
import Journey from './components/Journey';
import Menu from './components/Menu';
import BookingSection from './components/BookingSection';
import MediaSection from './components/MediaSection';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import HelpHub from './components/HelpHub';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import Admin from './components/Admin';
import BookingForm from './components/BookingForm';
import BookingConfirmation from './components/BookingConfirmation';
import Terms from './components/Terms';

function App() {
  const { i18n } = useTranslation();
  const [currentRoute, setCurrentRoute] = useState('home'); // 'home', 'admin', 'booking', 'confirmation', 'terms'
  const [bookingData, setBookingData] = useState(null);
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
      const path = window.location.pathname;
      if (path === '/admin') {
        setCurrentRoute('admin');
      } else if (path === '/booking') {
        setCurrentRoute('booking');
      } else if (path === '/terms' || path === '/תנאים') {
        setCurrentRoute('terms');
      } else {
        setCurrentRoute('home');
      }
    };

    checkRoute();

    // Handle hash scrolling for date-selection
    const handleHashScroll = () => {
      const hash = window.location.hash;
      if (hash === '#date-selection') {
        setTimeout(() => {
          const element = document.getElementById('date-selection');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
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
    setBookingData(data);
    setCurrentRoute('confirmation');
    window.history.pushState({}, '', '/confirmation');
  };

  const handleBackToHome = () => {
    setCurrentRoute('home');
    setBookingData(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show loading screen while detecting language (only for first-time visitors)
  if (isDetectingLanguage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-brand-gold border-b-4 border-transparent mx-auto mb-6"></div>
          <p className="text-white text-xl font-serif">טוען / Loading...</p>
          <p className="text-gray-400 text-sm mt-2">מזהה מיקום / Detecting location...</p>
        </div>
      </div>
    );
  }

  // Render admin interface
  if (currentRoute === 'admin') {
    return <Admin />;
  }

  // Render terms page
  if (currentRoute === 'terms') {
    return <Terms />;
  }

  // Render booking form
  if (currentRoute === 'booking') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-brand-dark text-white">
          <Header />
          <div className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
            <BookingForm onSuccess={handleBookingSuccess} />
          </div>
          <Footer />
        </div>
      </ErrorBoundary>
    );
  }

  // Render confirmation page
  if (currentRoute === 'confirmation' && bookingData) {
    return (
      <ErrorBoundary>
        <BookingConfirmation 
          bookingData={bookingData} 
          onBackToHome={handleBackToHome}
        />
      </ErrorBoundary>
    );
  }

  // Render main site
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-brand-dark text-white">
        <Header />
        <Hero />
        <RatingBar />
        <Bio />
        <Journey />
        <Menu />
        <BookingSection />
        <MediaSection />
        <FAQ />
        <Footer />
        <HelpHub />
        <ScrollToTop />
      </div>
    </ErrorBoundary>
  );
}

export default App;
