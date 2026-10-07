import { IS_PREPROD } from './preview';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
const API_BASE = (import.meta.env.VITE_PAYMENT_API_BASE || '').replace(/\/$/, '');
const DEMO = import.meta.env.VITE_FIREBASE_EMULATORS === 'true';
function safeBase(base) {
  try { const url = new URL(base); return !url.username && !url.password && !url.search && !url.hash && (url.protocol === 'https:' || (DEMO && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))); } catch { return false; }
}
export const paymentsConfigured = !IS_PREPROD && safeBase(API_BASE);
let signingIn;
async function customerSession(createSession) {
  if (!auth) throw new Error('authentication-unavailable');
  await auth.authStateReady();
  if (!auth.currentUser && createSession) {
    signingIn ||= signInAnonymously(auth).finally(() => { signingIn = null; });
    await signingIn;
  }
  if (!auth.currentUser) throw new Error('booking-session-unavailable');
  return auth.currentUser;
}
export function bookingFingerprint(b) { return JSON.stringify([b.email?.trim().toLowerCase(), b.phone?.replace(/\D/g, ''), b.tourDate, Number(b.participants), b.paymentMethod, b.name?.trim(), b.notes?.trim(), b.howDidYouHear, b.dateOfBirth, b.agreeToTerms, b.language]); }
async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
}
export async function makeIdempotencyKey(booking) {
  if (!paymentsConfigured) throw new Error('booking-api-not-configured');
  // Look up the request BEFORE deciding whether a new anonymous login is safe.
  // Existing request recovery must stay bound to its original owner.
  const recordKey = `chilik-booking-v3:${await digest(bookingFingerprint(booking))}`;
  const saved = sessionStorage.getItem(recordKey);
  let record;
  try { record = saved ? JSON.parse(saved) : null; } catch { throw new Error('booking-session-unavailable'); }
  if (record && (!/^[a-f0-9]{32}$/.test(record.key || '') || !/^[a-f0-9]{64}$/.test(record.owner || ''))) throw new Error('booking-session-unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let user;
  try { user = await abortable(customerSession(!record), controller.signal); }
  finally { clearTimeout(timer); }
  const owner = await digest(user.uid);
  if (auth.currentUser?.uid !== user.uid) throw new Error('booking-session-unavailable');
  // Another same-request caller may have saved its key while auth/digest awaited.
  try { record = JSON.parse(sessionStorage.getItem(recordKey) || 'null'); } catch { throw new Error('booking-session-unavailable'); }
  if (record && (!/^[a-f0-9]{32}$/.test(record.key || '') || !/^[a-f0-9]{64}$/.test(record.owner || ''))) throw new Error('booking-session-unavailable');
  if (record && record.owner !== owner) throw new Error('booking-session-unavailable');
  if (!record) record = { key: crypto.randomUUID().replace(/-/g, ''), owner };
  sessionStorage.setItem(recordKey, JSON.stringify(record));
  sessionStorage.setItem(`chilik-booking-key-v3:${record.key}`, owner);
  return record.key;
}
function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('booking-request-interrupted'));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
async function request(path, options = {}, expectedOwner = null) {
  if (!paymentsConfigured) throw new Error('booking-api-not-configured');
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  try {
    const user = await abortable(customerSession(false), controller.signal);
    if (expectedOwner && await digest(user.uid) !== expectedOwner) throw new Error('booking-session-unavailable');
    const token = await abortable(user.getIdToken(), controller.signal);
    if (auth.currentUser?.uid !== user.uid) throw new Error('booking-session-unavailable');
    controller.signal.throwIfAborted();
    const response = await fetch(`${API_BASE}/${path}`, { ...options, signal: controller.signal, cache: 'no-store', headers: { 'content-type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` } });
    let data;
    try { data = await abortable(response.json(), controller.signal); }
    catch { if (response.ok) throw new Error('invalid-booking-response'); data = {}; }
    controller.signal.throwIfAborted();
    if (!response.ok) throw Object.assign(new Error(data.error || 'booking-request-failed'), { status: response.status });
    if (!data || !/^BK-[a-f0-9]{20,24}$/.test(data.bookingId || '')) throw new Error('invalid-booking-response');
    if (path !== 'createPayment' && (!['pending', 'payment_pending', 'confirmed', 'cancelled', 'payment_review'].includes(data.status) || !['pending', 'creating', 'awaiting_payment', 'paid', 'failed', 'cancelled', 'expired', 'pending_review'].includes(data.paymentStatus))) throw new Error('invalid-booking-response');
    if (path === 'createBooking' && (!Number.isFinite(data.totalPrice) || data.totalPrice <= 0 || !Number.isFinite(data.pricePerPerson) || data.pricePerPerson <= 0)) throw new Error('invalid-booking-response');
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw Object.assign(new Error('booking-request-interrupted'), { aborted: true });
    throw error;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
export function getPaymentStatus(id, { signal } = {}) { return request(`paymentStatus?id=${encodeURIComponent(id)}`, { signal }); }
function requestOwner(key) {
  const owner = sessionStorage.getItem(`chilik-booking-key-v3:${key}`);
  if (!/^[a-f0-9]{64}$/.test(owner || '')) throw new Error('booking-session-unavailable');
  return owner;
}
export async function createBooking(booking, key) { return request('createBooking', { method: 'POST', headers: { 'x-idempotency-key': key }, body: JSON.stringify(booking) }, requestOwner(key)); }
export async function createCreditPayment(booking, key) {
  const data = await request('createPayment', { method: 'POST', headers: { 'x-idempotency-key': key }, body: JSON.stringify(booking) }, requestOwner(key));
  if (!/^https:\/\/directng\.tranzila\.com\//.test(data.paymentUrl || '')) throw new Error('invalid-payment-url');
  return data;
}
