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

function load() {
  if (loaded || !analyticsConfigured() || typeof document === 'undefined') return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  // Measurement only; advertising storage and signals stay off.
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false });
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
