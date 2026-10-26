'use strict';
// WhatsApp via the existing Newreel WAHA host (send-only). Never touches the
// WAHA session, webhooks or config: one read-only health check, then sendText.
const OWNER_DEFAULT = '972506724312';   // Hilik, 050-6724312
const SENDER_DEFAULT = '972553094372';  // Newreel WAHA bot, 055-309-4372
const digits = v => String(v ?? '').replace(/\D/g, '');

// Israeli mobile from the booking form (05XXXXXXXX) -> 9725XXXXXXXX.
function toIntl(phone) {
  const d = digits(phone);
  if (/^05\d{8}$/.test(d)) return `972${d.slice(1)}`;
  if (/^9725\d{8}$/.test(d)) return d;
  return '';
}

function createWahaSender({ origin, apiKey, session = 'default', sender = SENDER_DEFAULT, fetchImpl = globalThis.fetch }) {
  const base = String(origin || '').trim().replace(/\/$/, '');
  const key = String(apiKey || '').trim(), sess = String(session || '').trim();
  if (!/^https:\/\/[^/@]+$/.test(base) || !key || !/^[A-Za-z0-9_-]{1,64}$/.test(sess)) throw new Error('waha-not-configured');
  const headers = { 'X-Api-Key': key, 'Content-Type': 'application/json' };
  return async function sendText(to, text) {
    if (!/^9725\d{8}$/.test(to)) throw new Error('waha-invalid-recipient');
    let health;
    try {
      const r = await fetchImpl(`${base}/api/sessions/${encodeURIComponent(sess)}`, { headers, redirect: 'error', signal: AbortSignal.timeout(5000) });
      health = r.ok ? await r.json() : null;
    } catch { health = null; }
    const me = typeof health?.me?.id === 'string' ? health.me.id.replace(/@c\.us$/, '') : '';
    if (health?.status !== 'WORKING' || me !== sender) throw new Error('waha-session-unavailable');
    const r = await fetchImpl(`${base}/api/sendText`, { method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ session: sess, chatId: `${to}@c.us`, text, linkPreview: false }) });
    if (!r.ok) throw new Error(`waha-send-failed-${r.status}`);
    const data = await r.json().catch(() => ({}));
    const id = typeof data?.id === 'string' ? data.id : data?.id?._serialized;
    return id || 'unknown-id';
  };
}

const ddmm = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : String(d ?? '');
const paidLabel = b => b.paymentStatus === 'paid' ? 'שולם ✅' : b.status === 'cancelled' ? 'בוטל ❌' : 'לא שולם';
const clean = v => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120);

function ownerNewBookingText(id, b) {
  return ['🆕 הרשמה חדשה לסיור', `שם: ${clean(b.name)}`, `טלפון: ${clean(b.phone)}`, `תאריך: ${ddmm(b.tourDate)}`,
    `משתתפים: ${b.participants ?? ''}`, b.totalPrice != null ? `סכום: ${b.totalPrice} ₪` : null,
    `תשלום: ${paidLabel(b)} (${clean(b.paymentMethod)})`, `מספר הזמנה: ${id}`].filter(Boolean).join('\n');
}
function ownerPaidText(id, b) {
  return ['✅ התקבל תשלום', `שם: ${clean(b.name)}`, `תאריך: ${ddmm(b.tourDate)}`, `משתתפים: ${b.participants ?? ''}`,
    b.totalPrice != null ? `סכום: ${b.totalPrice} ₪` : null, b.status === 'confirmed' ? null : '⚠️ ההזמנה דורשת בדיקה (ייתכן שהסיור מלא)',
    `מספר הזמנה: ${id}`].filter(Boolean).join('\n');
}
function customerReceivedText(id, b) {
  return [`שלום ${clean(b.name)},`, `קיבלנו את ההרשמה שלך לסיור הקולינרי בבני ברק בתאריך ${ddmm(b.tourDate)} (${b.participants} משתתפים).`,
    'ההרשמה בתוקף לאחר השלמת התשלום.', `מספר הזמנה: ${id}`, 'חיליק רוזנברג – סיורים קולינריים'].join('\n');
}
function customerPaidText(id, b) {
  return [`שלום ${clean(b.name)},`, `התשלום התקבל וההרשמה לסיור בתאריך ${ddmm(b.tourDate)} אושרה 🎉`, `מספר הזמנה: ${id}`,
    'חיליק רוזנברג – סיורים קולינריים'].join('\n');
}
module.exports = { createWahaSender, toIntl, ownerNewBookingText, ownerPaidText, customerReceivedText, customerPaidText, paidLabel, ddmm, OWNER_DEFAULT, SENDER_DEFAULT };
