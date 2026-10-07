import { IS_PREPROD } from './preview';
import { isSelectableTourDate } from './dateUtils';
import { bookingFingerprint } from './paymentService';

// UI simulation only. Never substitutes for the authenticated production API.
// No customer input, credential, provider request or card data is persisted.
const STORE = 'chilik-design-demo-v1';
export const DEMO_CHANGED = 'chilik-design-demo-changed';
export const DEMO_CUSTOMER = Object.freeze({ name: 'Demo Customer', phone: '0500000000', email: 'demo@example.invalid', howDidYouHear: 'friend', dateOfBirth: '1990-01-01', notes: '' });
const fail = code => { throw new Error(code); };
function assertDemo() { if (!IS_PREPROD) fail('demo-unavailable'); }
function load() {
  assertDemo();
  try {
    const saved = sessionStorage.getItem(STORE);
    const store = saved ? JSON.parse(saved) : { version: 1, keys: {}, bookings: {} };
    if (store.version !== 1 || !store.keys || !store.bookings || typeof store.keys !== 'object' || typeof store.bookings !== 'object') fail('demo-storage-unavailable');
    for (const [id, b] of Object.entries(store.bookings)) {
      if (!/^BK-[a-f0-9]{24}$/.test(id) || b.bookingId !== id || b.demo !== true || !Number.isInteger(b.participants) || b.participants < 1 || b.participants > 20 || !/^\d{4}-\d{2}-\d{2}$/.test(b.tourDate || '')) fail('demo-storage-unavailable');
    }
    let expired = false;
    for (const b of Object.values(store.bookings)) {
      if (b.capacityReserved && b.paymentMethod === 'credit' && b.paymentStatus === 'awaiting_payment' && b.holdExpiresAt <= Date.now()) {
        Object.assign(b, { status: 'cancelled', paymentStatus: 'expired', capacityReserved: false }); expired = true;
      }
    }
    if (expired) sessionStorage.setItem(STORE, JSON.stringify(store));
    return store;
  } catch { fail('demo-storage-unavailable'); }
}
function save(store) {
  try { sessionStorage.setItem(STORE, JSON.stringify(store)); }
  catch { fail('demo-storage-unavailable'); }
  window.dispatchEvent(new Event(DEMO_CHANGED));
}
async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function displayRecord(b) { return { ...DEMO_CUSTOMER, ...b, agreeToTerms: true }; }
export function getDemoBooking(id) {
  if (!/^BK-[a-f0-9]{24}$/.test(id || '')) fail('not-found');
  const b = load().bookings[id];
  if (!b) fail('not-found');
  return displayRecord(b);
}
export function getDemoAvailability() {
  const store = load(), tourDates = {};
  for (const b of Object.values(store.bookings)) {
    if (!b.capacityReserved) continue;
    tourDates[b.tourDate] ||= { useGlobalMax: true, currentRegistrations: 0 };
    tourDates[b.tourDate].currentRegistrations += b.participants;
  }
  return { availabilityStatus: 'ready', blocked: [], soldOut: [], globalMaxParticipants: 30, tourDates };
}
export async function makeDemoIdempotencyKey(booking) {
  assertDemo();
  const fingerprint = await digest(bookingFingerprint(booking));
  // Read after the asynchronous digest so simultaneous submits converge.
  const store = load();
  if (!store.keys[fingerprint]) { store.keys[fingerprint] = crypto.randomUUID().replace(/-/g, ''); save(store); }
  if (!/^[a-f0-9]{32}$/.test(store.keys[fingerprint])) fail('demo-storage-unavailable');
  return store.keys[fingerprint];
}
async function create(booking, key) {
  assertDemo();
  if (!/^[a-f0-9]{32}$/.test(key || '')) fail('invalid-idempotency-key');
  const fingerprint = await digest(bookingFingerprint(booking));
  const id = `BK-${(await digest(`demo:${key}`)).slice(0, 24)}`;
  const store = load();
  if (store.keys[fingerprint] !== key) fail('idempotency-conflict');
  if (store.bookings[id]) {
    const prior = store.bookings[id];
    if (prior.fingerprint !== fingerprint) fail('idempotency-conflict');
    if (prior.status === 'cancelled' || ['failed', 'expired'].includes(prior.paymentStatus)) fail('booking-closed');
    return { ...displayRecord(prior), reused: true };
  }
  const participants = Number(booking.participants);
  // Existing idempotent requests recover above; only new requests need this guard.
  if (!isSelectableTourDate(booking.tourDate)) fail('tour-unavailable');
  if (!Number.isInteger(participants) || participants < 1 || participants > 20) fail('invalid-participants');
  if (!['credit', 'bit', 'bank_transfer'].includes(booking.paymentMethod) || booking.agreeToTerms !== true) fail('invalid-booking');
  const reserved = Object.values(store.bookings).filter(b => b.tourDate === booking.tourDate && b.capacityReserved).reduce((sum, b) => sum + b.participants, 0);
  if (reserved + participants > 30) fail('capacity-exceeded');
  const credit = booking.paymentMethod === 'credit';
  const record = { demo: true, bookingId: id, fingerprint, tourDate: booking.tourDate, participants, paymentMethod: booking.paymentMethod, language: booking.language === 'en' ? 'en' : 'he', pricePerPerson: 250, totalPrice: participants * 250, status: credit ? 'payment_pending' : 'pending', paymentStatus: credit ? 'awaiting_payment' : 'pending', capacityReserved: true, holdExpiresAt: credit ? Date.now() + 15 * 60000 : null };
  store.bookings[id] = record; save(store); return displayRecord(record);
}
export async function resolveDemoBooking(id, outcome) {
  assertDemo();
  const store = load(), b = store.bookings[id];
  if (!b) fail('not-found');
  if (!['success', 'decline', 'pending', 'cancel'].includes(outcome)) fail('invalid-demo-outcome');
  if (outcome === 'pending') return displayRecord(b);
  if (outcome === 'success') {
    if (b.paymentMethod === 'credit') {
      if (b.paymentStatus === 'paid' || b.paymentStatus === 'pending_review') return displayRecord(b);
      Object.assign(b, b.capacityReserved && b.status !== 'cancelled' && b.holdExpiresAt > Date.now()
        ? { status: 'confirmed', paymentStatus: 'paid' }
        : { status: 'payment_review', paymentStatus: 'pending_review', capacityReserved: false });
    } else {
      if (!b.capacityReserved || b.status === 'cancelled') fail('booking-closed');
      b.status = 'confirmed'; // Manual booking approval does not claim money was captured.
    }
  } else if (outcome === 'cancel') {
    Object.assign(b, { status: 'cancelled', capacityReserved: false, ...(['paid', 'pending_review'].includes(b.paymentStatus) ? { refundStatus: 'manual_review_required' } : { paymentStatus: 'cancelled' }) });
  } else if (!['paid', 'pending_review'].includes(b.paymentStatus)) {
    Object.assign(b, { status: 'cancelled', paymentStatus: 'failed', capacityReserved: false });
  }
  save(store); return displayRecord(b);
}
export function resetDemoBookings() { assertDemo(); sessionStorage.removeItem(STORE); window.dispatchEvent(new Event(DEMO_CHANGED)); }
export const demoBookingApi = {
  makeIdempotencyKey: makeDemoIdempotencyKey,
  createBooking: create,
  async createCreditPayment(booking, key) {
    const result = await create(booking, key);
    return { ...result, paymentUrl: `${window.location.origin}/booking?demoCheckout=${encodeURIComponent(result.bookingId)}` };
  },
  async getPaymentStatus(id, { signal } = {}) { if (signal?.aborted) fail('booking-request-interrupted'); return getDemoBooking(id); },
};
