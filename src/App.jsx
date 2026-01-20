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

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-dark text-white">
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
