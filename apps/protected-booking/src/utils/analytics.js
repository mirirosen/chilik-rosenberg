// Google Analytics 4, loaded ONLY after the visitor explicitly accepts.
// Without VITE_GA4_MEASUREMENT_ID (the default) everything here is inert:
// no banner, no script, no cookies, no network request, every call a no-op.
const CONSENT_KEY = 'chilik-analytics-consent';
const PURCHASES_KEY = 'chilik-analytics-purchases';
const configuredId = String(import.meta.env.VITE_GA4_MEASUREMENT_ID || '').trim();
const MODE = import.meta.env.MODE;
let measurementId = /^G-[A-Z0-9]{4,15}$/.test(configuredId) && !['preprod', 'booking-demo'].includes(MODE) ? configuredId : '';
let loaded = false, clicksBound = false;

export const analyticsConfigured = () => measurementId !== '';
// Tests only: simulate a build with or without a measurement ID.
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
  document.addEventListener('click', event => {
    const link = event.target?.closest?.('a[href]');
    const href = link?.getAttribute('href') || '';
    if (/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//.test(href)) track('click_whatsapp', { link_url: href.split('?')[0] });
    else if (/^tel:/.test(href)) track('click_phone', { link_url: 'tel' });
  }, { capture: true });
}

const tourItem = (participants, price) => [{ item_id: 'bnei-brak-culinary-tour', item_name: 'Bnei Brak culinary tour', price, quantity: participants }];

export function trackBeginCheckout({ participants, pricePerPerson, totalPrice }) {
  return track('begin_checkout', { currency: 'ILS', value: totalPrice, items: tourItem(participants, pricePerPerson), transport_type: 'beacon' });
}

// Only for a booking the SERVER reports as paid and confirmed; once per booking.
export function trackPurchase(state) {
  if (!state || state.paymentStatus !== 'paid' || state.status !== 'confirmed' || !/^BK-[a-f0-9]{20,24}$/.test(state.bookingId || '')) return false;
  if (!loaded) return false;
  let sent = [];
  try { sent = JSON.parse(storage()?.getItem(PURCHASES_KEY) || '[]'); } catch { sent = []; }
  if (!Array.isArray(sent)) sent = [];
  if (sent.includes(state.bookingId)) return false;
  const participants = Number.isInteger(state.participants) ? state.participants : undefined;
  const ok = track('purchase', { transaction_id: state.bookingId, currency: 'ILS', value: state.totalPrice, ...(participants ? { items: tourItem(participants, state.pricePerPerson) } : {}) });
  if (ok) storage()?.setItem(PURCHASES_KEY, JSON.stringify([...sent, state.bookingId].slice(-20)));
  return ok;
}
