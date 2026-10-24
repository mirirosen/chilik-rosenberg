import { IS_PREPROD } from './preview';
import { auth } from './firebase';
const base = (import.meta.env.VITE_PAYMENT_API_BASE || '').replace(/\/$/, '');
function safeBase() {
  try { const u = new URL(base); return !u.username && !u.password && !u.search && !u.hash && (u.protocol === 'https:' || (import.meta.env.VITE_FIREBASE_EMULATORS === 'true' && u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))); } catch { return false; }
}
export function adminErrorMessage(error) {
  if (['unauthenticated', 'authentication-required', 'admin-required', 'admin-session-changed'].includes(error.message)) return 'יש להתחבר מחדש עם חשבון מנהל מורשה.';
  if (error.message === 'admin-service-unavailable') return 'שירות הניהול אינו מוגדר. יש לפנות למנהל המערכת.';
  if (error.message === 'job-not-retryable') return 'מצב הפעולה השתנה. רענן את הנתונים לפני ניסיון נוסף.';
  // Seats are reserved only at confirmation; the server re-checks capacity in the same transaction.
  if (error.message === 'capacity-full-at-confirmation') return 'אין מספיק מקום פנוי בסיור כדי לאשר את ההזמנה. המקום לא נשמר וההזמנה נשארה ממתינה. יש לפנות מקום או לתאם מועד אחר עם הלקוח.';
  if (error.message === 'calendar-unavailable') return 'לא ניתן לאמת כרגע את התפוסה השבועית מול היומן. נסו שוב בעוד כמה דקות.';
  if (error.message === 'capacity-requires-reconciliation') return 'מוני התפוסה דורשים בדיקה ידנית לפני שינוי ההזמנה.';
  return 'לא התקבל אישור לעדכון. ייתכן שהשינוי נשמר; רענן את הנתונים ובדוק את המצב לפני ניסיון נוסף.';
}
export async function adminRequest(endpoint, body) {
  if (IS_PREPROD || !safeBase() || !auth?.currentUser) throw new Error('admin-service-unavailable');
  const user = auth.currentUser;
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('admin-timeout')); }, 15000); });
  try {
    return await Promise.race([timeout, (async () => {
      const token = await user.getIdToken();
      if (auth.currentUser?.uid !== user.uid || controller.signal.aborted) throw new Error('admin-session-changed');
      const response = await fetch(`${base}/${endpoint}`, { method: 'POST', signal: controller.signal, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await response.json();
      controller.signal.throwIfAborted();
      if (!response.ok) throw new Error(data?.error || 'admin-update-failed');
      if (endpoint === 'retryIntegrationJob' ? data?.queued !== true : data?.bookingId !== body.bookingId || data?.status !== body.status) throw new Error('invalid-admin-response');
      return data;
    })()]);
  } finally { clearTimeout(timer); }
}
