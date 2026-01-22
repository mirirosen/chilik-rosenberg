import { useState, useEffect } from 'react';
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
  const [currentRoute, setCurrentRoute] = useState('home'); // 'home', 'admin', 'booking', 'confirmation', 'terms'
  const [bookingData, setBookingData] = useState(null);

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

    // Listen for route changes
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
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
