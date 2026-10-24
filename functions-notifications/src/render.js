'use strict';
// Pure renderers for booking notification emails (no I/O).
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Matches the live booking model (functions/src/booking-core.js): credit sets
// status 'confirmed' + paymentStatus 'paid'; a manually confirmed bit/bank
// transfer keeps paymentStatus 'pending' but status 'confirmed'.
const isPaid = b => b.paymentStatus === 'paid' || b.status === 'confirmed';
// Cancelled/expired/failed bookings and late captures awaiting manual review
// must never receive the "payment required" notice.
const isClosed = b => b.status === 'cancelled' || b.status === 'payment_review'
  || ['cancelled', 'expired', 'failed', 'pending_review'].includes(b.paymentStatus);

function ownerEmail(id, b) {
  const rows = [['מספר הזמנה', id], ['שם', b.name], ['טלפון', b.phone], ['אימייל', b.email], ['תאריך סיור', b.tourDate],
    ['משתתפים', b.participants], ['סכום', b.totalPrice], ['אמצעי תשלום', b.paymentMethod], ['הערות', b.notes],
    ['שפה', b.language], ['סטטוס', b.status], ['סטטוס תשלום', b.paymentStatus]];
  return {
    subject: `הרשמה חדשה לסיור | ${b.name || ''} | ${b.tourDate || ''} | ${id}`,
    text: rows.map(([k, v]) => `${k}: ${v ?? ''}`).join('\n'),
    html: `<div dir="rtl"><h2>הרשמה חדשה לסיור</h2><table>${rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table></div>`,
  };
}

// A payment link is offered only while its hold is still open; a stale
// Tranzila link would charge for a seat that was already released.
function liveLink(b, nowMs) {
  if (!b.paymentUrl || b.paymentStatus !== 'awaiting_payment') return null;
  const until = b.holdExpiresAt && typeof b.holdExpiresAt.toMillis === 'function' ? b.holdExpiresAt.toMillis() : null;
  return until != null && until > nowMs ? b.paymentUrl : null;
}

function unpaidEmail(id, b, nowMs = Date.now()) {
  const link = liveLink(b, nowMs);
  const he = [`שלום ${b.name || ''},`, `קיבלנו את ההרשמה שלך לסיור הקולינרי בבני ברק בתאריך ${b.tourDate} (${b.participants} משתתפים, מספר הזמנה ${id}).`,
    'שימו לב: ההרשמה אינה בתוקף, ולא נשמר עבורך מקום בסיור, עד להשלמת התשלום.',
    link ? `להשלמת התשלום: ${link}` : 'להשלמת התשלום אפשר לפנות לחיליק: 050-6724312 או hr20192022@gmail.com.', 'תודה, חיליק רוזנברג – סיורים קולינריים'];
  const en = [`Hello ${b.name || ''},`, `We received your registration for the culinary tour in Bnei Brak on ${b.tourDate} (${b.participants} participants, booking ${id}).`,
    'Please note: your registration is not valid, and no seat is held for you, until payment is completed.',
    link ? `Complete payment here: ${link}` : 'To complete payment, contact Chilik: +972-50-672-4312 or hr20192022@gmail.com.', 'Thanks, Chilik Rosenberg Tours'];
  const english = b.language === 'en';
  const parts = english ? [he, en] : [he];
  return {
    subject: english ? `ההרשמה טרם הושלמה – נדרש תשלום | Payment required (${id})` : `ההרשמה לסיור טרם הושלמה – נדרש תשלום (${id})`,
    text: parts.map(p => p.join('\n')).join('\n\n----\n\n'),
    html: parts.map((p, i) => `<div dir="${i === 0 ? 'rtl' : 'ltr'}">${p.map(l => `<p>${esc(l)}</p>`).join('')}</div>`).join('<hr>'),
  };
}
module.exports = { ownerEmail, unpaidEmail, isPaid, isClosed };
