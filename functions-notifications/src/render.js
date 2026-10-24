'use strict';
// Pure renderers for booking notification emails (no I/O).
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isPaid = b => b.paymentStatus === 'paid' || b.status === 'confirmed';

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

function unpaidEmail(id, b) {
  const link = b.paymentUrl || null;
  const he = [`שלום ${b.name || ''},`, `קיבלנו את ההרשמה שלך לסיור הקולינרי בבני ברק בתאריך ${b.tourDate} (${b.participants} משתתפים, מספר הזמנה ${id}).`,
    'שימו לב: ההרשמה אינה בתוקף עד לקבלת התשלום.', link ? `להשלמת התשלום: ${link}` : 'להשלמת התשלום אפשר לפנות לחיליק: 050-6724312 או hr20192022@gmail.com.', 'תודה, חיליק רוזנברג – סיורים קולינריים'];
  const en = [`Hello ${b.name || ''},`, `We received your registration for the culinary tour in Bnei Brak on ${b.tourDate} (${b.participants} participants, booking ${id}).`,
    'Please note: your registration is not valid until payment is received.', link ? `Complete payment here: ${link}` : 'To complete payment, contact Chilik: +972-50-672-4312 or hr20192022@gmail.com.', 'Thanks, Chilik Rosenberg Tours'];
  const parts = b.language === 'he' ? [he] : [he, en];
  return {
    subject: b.language === 'he' ? `ההרשמה לסיור טרם הושלמה – נדרש תשלום (${id})` : `ההרשמה טרם הושלמה – נדרש תשלום | Payment required (${id})`,
    text: parts.map(p => p.join('\n')).join('\n\n----\n\n'),
    html: parts.map((p, i) => `<div dir="${i === 0 ? 'rtl' : 'ltr'}">${p.map(l => `<p>${esc(l)}</p>`).join('')}</div>`).join('<hr>'),
  };
}
module.exports = { ownerEmail, unpaidEmail, isPaid };
