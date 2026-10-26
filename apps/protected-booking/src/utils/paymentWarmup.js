import { IS_PREPROD } from './preview';
// Kept apart from paymentService so the date picker does not load Firebase Auth.
const WARM_FUNCTIONS = ['createPayment', 'paymentStatus', 'tranzilaWebhook'];
export const WARMUP_SESSION_KEY = 'chilik-payment-warmup-v1';

function warmupBase() {
  const base = (import.meta.env.VITE_PAYMENT_API_BASE || '').replace(/\/$/, '');
  try {
    const url = new URL(base);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash ? base : null;
  } catch { return null; }
}

// Booking intent (date picker or form opened): start the payment functions once
// per browser session so checkout does not wait for a cold start. Fire-and-forget:
// a simple no-cors GET (no preflight, no credentials) whose result is ignored.
export function warmPaymentFunctions() {
  if (IS_PREPROD || typeof fetch !== 'function') return false;
  const base = warmupBase();
  if (!base) return false;
  try {
    if (sessionStorage.getItem(WARMUP_SESSION_KEY)) return false;
    sessionStorage.setItem(WARMUP_SESSION_KEY, '1');
  } catch { return false; }
  for (const name of WARM_FUNCTIONS) {
    try {
      fetch(`${base}/${name}?warmup=1`, { method: 'GET', mode: 'no-cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', keepalive: true }).catch(() => {});
    } catch { /* never affects the booking flow */ }
  }
  return true;
}
