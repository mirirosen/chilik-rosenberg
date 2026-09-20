const API_BASE = (import.meta.env.VITE_PAYMENT_API_BASE || '').replace(/\/$/, '');
export const paymentsConfigured = Boolean(API_BASE);
export function bookingFingerprint(booking) { return [booking.email, booking.phone, booking.tourDate, booking.participants].join('|'); }
export function makeIdempotencyKey(booking) {
  const key = `chilik-payment:${bookingFingerprint(booking)}`;
  const current = sessionStorage.getItem(key);
  if (current) return current;
  const next = crypto.randomUUID().replace(/-/g, '');
  sessionStorage.setItem(key, next);
  return next;
}
export async function getPaymentStatus(bookingId) {
  if (!API_BASE) throw new Error('payment-not-configured');
  const response = await fetch(`${API_BASE}/paymentStatus?id=${encodeURIComponent(bookingId)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('payment-status-unavailable');
  return response.json();
}
export function clearIdempotencyKey(booking) { sessionStorage.removeItem(`chilik-payment:${bookingFingerprint(booking)}`); }
export async function createCreditPayment(booking, idempotencyKey) {
  if (!API_BASE) throw new Error('payment-not-configured');
  const response = await fetch(`${API_BASE}/createPayment`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-idempotency-key': idempotencyKey }, body: JSON.stringify(booking) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !/^https:\/\//.test(data.paymentUrl || '')) throw new Error(data.error || 'payment-initiation-failed');
  return data;
}
