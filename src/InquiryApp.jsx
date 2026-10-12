import { Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './components/Header';
import Hero from './components/Hero';
import RatingBar from './components/RatingBar';
import TourInclusions from './components/TourInclusions';
import Journey from './components/Journey';
import Menu from './components/Menu';
import Lectures from './components/Lectures';
import Bio from './components/Bio';
import TourVideos from './components/TourVideos';
import MediaSection from './components/MediaSection';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Terms from './components/Terms';
import InquirySection from './components/InquirySection';
import { useHomeMotion } from './hooks/useHomeMotion';
import { NavigationProvider } from './navigation/NavigationContext';
import { settle } from './animations/registry';
import { applyRouteMetadata } from './utils/routeMetadata';
import { inquiryRoute } from './utils/inquiryRoutes';
import { tourVideos } from './data/content';
import { populatedTourVideoGroups } from './utils/tourVideos';
import TourOverview from './components/TourOverview';
import './organic-seo.css';

// Dedicated public entry: no imports of booking, Firebase, admin, payment or
// geolocation modules. Legacy admin is served by Hosting as its own document.
export default function InquiryApp({ bookingSection } = {}) {
  const { t, i18n } = useTranslation();
  const route = inquiryRoute(typeof window === 'undefined' ? '/' : window.location.pathname, typeof window === 'undefined' ? '' : window.location.search);
  const motion = useHomeMotion(route);
  useEffect(() => {
    applyRouteMetadata({ route, language: i18n.language, t });
    if (route !== 'home') return;
    const scrollHash = () => {
      const id = window.location.hash.slice(1);
      if (['date-selection', 'about', 'journey', 'menu', 'lectures', 'videos', 'faq', 'media'].includes(id)) {
        const element = document.getElementById(id);
        settle(element); // hash navigation: natural state before the jump
        element?.scrollIntoView({ behavior: 'auto' });
      }
    };
    scrollHash(); window.addEventListener('hashchange', scrollHash);
    return () => window.removeEventListener('hashchange', scrollHash);
  }, [route, i18n.language, t]);
  if (route === 'terms') return <div className="site-legal"><Terms inquiry /></div>;
  if (route === 'not-found') return <main className="inquiry-section"><h1>{t('seo.notFound.title')}</h1><a href="/">{t('terms.backToSite')}</a></main>;
  return <NavigationProvider><div className="target-site min-h-screen">
    <a href="#main-content" className="target-skip-link">{t('common.skipContent')}</a>
    <Header showVideos={populatedTourVideoGroups(tourVideos).length > 0} />
    <main ref={motion} id="main-content" tabIndex={-1}>
      {route === 'home' ? <>
        <Hero /><RatingBar />{bookingSection || <InquirySection />}<TourOverview />
        {/* Independent hydration boundaries keep below-fold work interruptible.
            Their complete HTML is still rendered at build time. */}
        <Suspense fallback={null}><TourInclusions /></Suspense>
        <Suspense fallback={null}><Journey /></Suspense>
        <Suspense fallback={null}><Menu /></Suspense>
        <Suspense fallback={null}><TourVideos compact /></Suspense>
        <Suspense fallback={null}><Lectures /></Suspense>
        <Suspense fallback={null}><Bio /></Suspense>
        <Suspense fallback={null}><MediaSection /></Suspense>
        <Suspense fallback={null}><FAQ /></Suspense>
      </> : <div className="inquiry-route"><InquirySection status={route === 'confirmation'} search={window.location.search} /><a className="inquiry-back" href="/">{t('terms.backToSite')}</a></div>}
    </main>
    <Footer />
  </div></NavigationProvider>;
}
