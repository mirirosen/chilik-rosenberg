// Google Analytics 4, loaded ONLY after the visitor explicitly accepts the consent banner.
// Before that (and after "No thanks") there is no gtag script, no cookie and no request.
const CONSENT_KEY = 'chilik-analytics-consent';
const PURCHASE_KEY_PREFIX = 'chilik-analytics-purchase:';
// Property 560779012, web stream 16203937010.
export const DEFAULT_MEASUREMENT_ID = 'G-165V7SRZJK';

// VITE_GA4_MEASUREMENT_ID overrides the default; "off" disables analytics entirely.
// Preprod/demo builds never load analytics.
export function resolveMeasurementId(envValue, mode) {
  if (['preprod', 'booking-demo'].includes(mode)) return '';
  const value = String(envValue ?? '').trim();
  if (value.toLowerCase() === 'off') return '';
  const id = value || DEFAULT_MEASUREMENT_ID;
  return /^G-[A-Z0-9]{4,15}$/.test(id) ? id : '';
}

let measurementId = resolveMeasurementId(import.meta.env.VITE_GA4_MEASUREMENT_ID, import.meta.env.MODE);
let loaded = false, clicksBound = false;

export const analyticsConfigured = () => measurementId !== '';
export const currentMeasurementId = () => measurementId;
// Tests only: simulate a build with another (or no) measurement ID.
export function __setMeasurementIdForTests(id) { measurementId = id; loaded = false; }

function storage() { try { return window.localStorage; } catch { return null; } }
export function consentState() {
  if (!analyticsConfigured()) return 'unavailable';
  const value = storage()?.getItem(CONSENT_KEY);
  return value === 'granted' || value === 'denied' ? value : 'unset';
}

// Booking and confirmation URLs carry booking IDs and selections in the query
// string; GA receives those pages without it. Other pages keep their URL.
const QUERYLESS_PATHS = ['/booking', '/confirmation'];
export function pageLocation(href) {
  try {
    const url = new URL(href);
    if (QUERYLESS_PATHS.includes(url.pathname)) { url.search = ''; url.hash = ''; }
    return url.toString();
  } catch { return ''; }
}
// The management dashboard is never measured. GA's documented per-property
// opt-out flag blocks every hit, including history-change page views.
const MANAGEMENT_PATH = '/manage-bookings';
function setMeasurementBlocked(blocked) {
  if (analyticsConfigured() && typeof window !== 'undefined') window[`ga-disable-${measurementId}`] = blocked === true;
}

// Call BEFORE every SPA navigation (pushState or after popstate). Returns true when
// the caller must do a full page load instead, because analytics is loaded and the
// target is the management dashboard.
export function beforeNavigate(href) {
  if (!analyticsConfigured() || typeof window === 'undefined') return false;
  let url;
  try { url = new URL(href, window.location.href); } catch { return false; }
  const management = url.pathname === MANAGEMENT_PATH;
  setMeasurementBlocked(management);
  if (loaded && !management && typeof window.gtag === 'function') window.gtag('set', { page_location: pageLocation(url.toString()) });
  return loaded && management;
}

function load() {
  if (loaded || !analyticsConfigured() || typeof document === 'undefined') return;
  if (window.location?.pathname === MANAGEMENT_PATH) { setMeasurementBlocked(true); return; }
  loaded = true;
  setMeasurementBlocked(false);
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  // Measurement only; advertising storage and signals stay off.
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false, page_location: pageLocation(window.location.href) });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);
  bindContactClicks();
}

export function setConsent(granted) {
  if (!analyticsConfigured()) return;
  storage()?.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
  if (granted) load();
}

// Footer "withdraw consent": forget the choice, stop measurement, remove the GA
// cookies (_ga, _ga_*) for this host and its parent domains, then reload so the
// gtag script is gone and the banner asks again.
export function withdrawConsent({ reload = () => window.location.reload() } = {}) {
  if (!analyticsConfigured() || typeof document === 'undefined') return false;
  storage()?.removeItem(CONSENT_KEY);
  setMeasurementBlocked(true);
  const names = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => n === '_ga' || n.startsWith('_ga_'));
  const parts = window.location.hostname.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`);
  for (const name of names) for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
  reload();
  return true;
}

// Call once at startup: restores an earlier "accept" without asking again.
export function initAnalytics() {
  if (consentState() === 'granted') load();
}

export function track(name, params = {}) {
  if (!loaded || typeof window.gtag !== 'function') return false;
  window.gtag('event', name, params);
  return true;
}

// WhatsApp and phone links anywhere on the site, via one delegated listener.
function bindContactClicks() {
  if (clicksBound || typeof document === 'undefined') return;
  clicksBound = true;
  // At most one listener per page, even if this module is ever evaluated twice.
  if (window.__chilikContactClicks) document.removeEventListener('click', window.__chilikContactClicks, { capture: true });
  window.__chilikContactClicks = event => {
    const link = event.target?.closest?.('a[href]');
    const href = link?.getAttribute('href') || '';
    if (/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(href)) track('whatsapp_click', { link_url: href.split('?')[0] });
    else if (/^tel:/.test(href)) track('phone_click', { link_url: 'tel' });
  };
  document.addEventListener('click', window.__chilikContactClicks, { capture: true });
}

const tourItem = (participants, price) => [{ item_id: 'bnei-brak-culinary-tour', item_name: 'Bnei Brak culinary tour', price, quantity: participants }];

// The booking details form was opened for a chosen date and party size.
export function trackBeginBooking({ participants, pricePerPerson, totalPrice }) {
  return track('begin_booking', { currency: 'ILS', value: totalPrice, items: tourItem(participants, pricePerPerson) });
}

// The visitor is being sent to the Tranzila checkout (GA4 standard funnel event).
export function trackBeginCheckout({ participants, pricePerPerson, totalPrice }) {
  return track('begin_checkout', { currency: 'ILS', value: totalPrice, items: tourItem(participants, pricePerPerson), transport_type: 'beacon' });
}

// Only for a booking the SERVER reports as paid and confirmed (a verified Tranzila
// capture), never from the return URL. Once per booking: a reload does not refire.
export function trackPurchase(state) {
  if (!state || state.paymentStatus !== 'paid' || state.status !== 'confirmed' || !/^BK-[a-f0-9]{20,24}$/.test(state.bookingId || '')) return false;
  if (!loaded || !Number.isFinite(state.totalPrice) || state.totalPrice <= 0) return false;
  const key = PURCHASE_KEY_PREFIX + state.bookingId;
  if (storage()?.getItem(key)) return false;
  const participants = Number.isInteger(state.participants) ? state.participants : undefined;
  const ok = track('purchase', { transaction_id: state.bookingId, currency: 'ILS', value: state.totalPrice, ...(participants ? { items: tourItem(participants, state.pricePerPerson) } : {}) });
  if (ok) storage()?.setItem(key, String(Date.now()));
  return ok;
}
