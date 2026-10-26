import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InquiryApp from './InquiryApp';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from '../apps/protected-booking/src/components/ErrorBoundary';
import { IS_PREPROD, PREVIEW_NOTICE, disablePreviewContacts } from '../apps/protected-booking/src/utils/preview';
import { applyRouteMetadata } from './utils/routeMetadata';
import { BOOKING_INTENT } from './navigation/bookingIntent';

// Load the booking and management SDKs after the public page can render.
const BookingSection = lazy(() => import('../apps/protected-booking/src/components/BookingSection'));
const BookingForm = lazy(() => import('../apps/protected-booking/src/components/BookingForm'));
const BookingConfirmation = lazy(() => import('../apps/protected-booking/src/components/BookingConfirmation'));
const Terms = lazy(() => import('../apps/protected-booking/src/components/Terms'));
const Admin = lazy(() => import('../apps/protected-booking/src/components/Admin'));

const HOME_PATHS = ['/', '/index.html', '/en'];

function HomeBookingPicker({ fallback, children }) {
  const container = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible) return;
    if (typeof IntersectionObserver !== 'function') { setVisible(true); return; }
    let inView = false, timer;
    // A section jump can pass the calendar. Wait for scrolling to settle so
    // mounting its larger content cannot move the requested destination.
    const schedule = () => {
      clearTimeout(timer);
      if (inView) timer = setTimeout(() => setVisible(true), 180);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    }, { rootMargin: '300px' });
    observer.observe(container.current);
    const showForIntent = () => { clearTimeout(timer); setVisible(true); };
    window.addEventListener(BOOKING_INTENT, showForIntent);
    window.addEventListener('scroll', schedule, { passive: true });
    return () => { observer.disconnect(); clearTimeout(timer); window.removeEventListener(BOOKING_INTENT, showForIntent); window.removeEventListener('scroll', schedule); };
  }, [visible]);
  return <div ref={container}>{visible ? children : <div id="date-selection">{fallback}</div>}</div>;
}

export default function BookingSiteApp() {
  const { t, i18n } = useTranslation();
  const [location, setLocation] = useState(() => typeof window === 'undefined' ? { path: '/', search: '' } : { path: window.location.pathname, search: window.location.search });
  const [draft, setDraft] = useState(null);
  const [selection, setSelection] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const params = new URLSearchParams(location.search);
  const isStatus = location.path === '/confirmation' || params.has('payment') || params.has('id');
  const hasSelection = (params.has('date') && params.has('participants')) || (IS_PREPROD && params.has('demoCheckout'));
  const confirmation = location.path === '/confirmation' && bookingData?.bookingId === params.get('id') ? bookingData : null;

  useEffect(() => {
    if (!IS_PREPROD || location.path !== '/confirmation') return;
    let cancelled = false;
    import('../apps/protected-booking/src/utils/demoBookingService').then(({ getDemoBooking }) => {
      if (!cancelled) setBookingData(getDemoBooking(new URLSearchParams(location.search).get('id')));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [location.path, location.search]);

  useEffect(() => {
    document.body.classList.add('booking-edition');
    return () => document.body.classList.remove('booking-edition');
  }, []);

  useEffect(() => {
    const update = () => setLocation({ path: window.location.pathname, search: window.location.search });
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  useEffect(() => IS_PREPROD ? disablePreviewContacts() : undefined, []);
  // The homepage URL follows the visible language: Hebrew at /, English at /en.
  useEffect(() => {
    if (!HOME_PATHS.includes(location.path)) return;
    const english = i18n.language?.startsWith('en');
    if (english === (location.path === '/en')) return;
    window.history.replaceState(window.history.state, '', (english ? '/en' : '/') + window.location.search + window.location.hash);
    setLocation({ path: window.location.pathname, search: window.location.search });
  }, [location.path, i18n.language]);
  useEffect(() => {
    applyRouteMetadata({ route: location.path === '/manage-bookings' ? 'admin' : isStatus ? 'confirmation' : HOME_PATHS.includes(location.path) ? 'home' : ['/terms', '/תקנון'].includes(location.path) ? 'terms' : 'booking', language: i18n.language, t, englishHome: true });
    if (IS_PREPROD) document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow');
  }, [location, i18n.language, t, isStatus]);

  function navigate(path) {
    window.history.pushState({}, '', path);
    setLocation({ path: window.location.pathname, search: window.location.search });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  const continueBooking = (date, participants) => navigate(`/booking?date=${encodeURIComponent(date)}&participants=${participants}`);
  const bookingSuccess = result => {
    setBookingData(result); setDraft(null); setSelection(null);
    navigate(`/confirmation?id=${encodeURIComponent(result.bookingId)}`);
  };
  const changeSelection = form => {
    const { name, phone, email, notes, howDidYouHear, paymentMethod } = form;
    setDraft({ name, phone, email, notes, howDidYouHear, paymentMethod });
    setSelection({ date: form.tourDate, participants: form.participants }); navigate('/booking');
  };
  const loading = <div className="site-route-loading" role="status">{t('common.loading')}</div>;
  const picker = <Suspense fallback={loading}><BookingSection standalone={location.path === '/booking'} onContinue={continueBooking} initialSelection={selection} /></Suspense>;
  const banner = IS_PREPROD && <div className="booking-demo-banner" role="status">{PREVIEW_NOTICE}</div>;
  if (location.path === '/manage-bookings') return <ErrorBoundary><div className="site-management">{banner}<Suspense fallback={loading}><Admin /></Suspense></div></ErrorBoundary>;
  if (HOME_PATHS.includes(location.path)) return <>{banner}<InquiryApp bookingSection={<HomeBookingPicker fallback={loading}>{picker}</HomeBookingPicker>} /></>;
  if (['/terms', '/תקנון'].includes(location.path)) return <div className="site-legal">{banner}<Suspense fallback={loading}><Terms /></Suspense></div>;
  if (!['/booking', '/confirmation'].includes(location.path)) return <InquiryApp />;
  return <ErrorBoundary><div className="target-site target-booking-flow">{banner}<Header /><main id="main-content" className={hasSelection || isStatus ? 'booking-details-shell' : 'booking-selection-page'}>
    <Suspense fallback={loading}>{confirmation ? <BookingConfirmation bookingData={confirmation} onBackToHome={() => { setBookingData(null); navigate('/'); }} /> : hasSelection || isStatus ? <BookingForm key={location.path + location.search} initialDraft={draft} onChangeSelection={changeSelection} statusBookingId={isStatus ? params.get('id') : undefined} onSuccess={bookingSuccess} /> : picker}</Suspense>
  </main><Footer /></div></ErrorBoundary>;
}
