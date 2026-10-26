'use strict';
// Customer-facing booking emails (Hebrew RTL HTML + plain text). Pure, no I/O.
// Table layout with inline CSS only, so it renders the same in Gmail web, the
// Gmail apps and Apple Mail. No images: the site has no hosted logo file, so the
// header is text in the site's palette (public site tokens in src/index.css).
const { liveLink } = require('./render');

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Only http(s) links may become an href; anything else is shown as text only.
const safeUrl = u => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : null);

const C = { paper: '#f5f4f4', card: '#ffffff', ink: '#4e4d50', dark: '#121214', gold: '#eebc26', goldText: '#805d00', muted: '#8a817d', line: '#e7e3df', warnBg: '#fff6dc', okBg: '#eaf6ec', ok: '#1e6b34' };
const FONT = "'Segoe UI', Tahoma, Arial, Helvetica, sans-serif";
const HEAD_FONT = "Georgia, 'Times New Roman', David, serif";
const CONTACT = { phone: '050-6724312', phoneIntl: '+972506724312', email: 'hr20192022@gmail.com', site: 'https://chilik-tours.com', siteLabel: 'chilik-tours.com' };
const BRAND = 'חיליק רוזנברג – סיורים קולינריים';
// The site sells a single tour; the booking document carries no tour name.
const DEFAULT_TOUR = 'סיור קולינרי בבני ברק';
// Mirrors viaProvider() in functions/src/booking-core.js: these bookings are paid on
// the Tranzila checkout page; everything else is a manual request handled by Hilik.
const viaProvider = b => b.paymentMethod === 'credit' || (b.paymentMethod === 'bit' && b.paymentProvider === 'tranzila');
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  const day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return `יום ${WEEKDAYS[day]}, ${m[3]}.${m[2]}.${m[1]}`;
}
const tourTime = b => [b.tourTime, b.startTime].find(t => typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)) || null;
const meetingPoint = b => (typeof b.meetingPoint === 'string' && b.meetingPoint.trim() ? b.meetingPoint.trim() : null);
const tourName = b => [b.tourName, b.tourTitle].find(t => typeof t === 'string' && t.trim())?.trim() || DEFAULT_TOUR;
function amount(b) {
  const n = Number(b.totalPrice);
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString('en-US')} ₪` : null;
}

// Rows shown in both emails. Meeting point appears only when the booking itself has one.
function detailRows(id, b, paymentLabel) {
  const time = tourTime(b), point = meetingPoint(b);
  return [
    ['מספר הזמנה', id],
    ['סיור', tourName(b)],
    ['תאריך', formatDate(b.tourDate)],
    ...(time ? [['שעה', time]] : []),
    ...(point ? [['נקודת מפגש', point]] : []),
    ['משתתפים', b.participants],
    ...(amount(b) ? [['סכום', amount(b)]] : []),
    ['סטטוס תשלום', paymentLabel],
  ];
}

function layout({ preheader, badge, badgeBg, badgeColor, title, intro, notice, rows, cta, after }) {
  const td = `font-family:${FONT};font-size:15px;line-height:1.5;padding:10px 0;border-bottom:1px solid ${C.line};`;
  const rowsHtml = rows.map(([k, v]) => `<tr><td align="right" style="${td}color:${C.muted};width:38%;vertical-align:top;">${esc(k)}</td>`
    + `<td align="right" style="${td}color:${C.dark};font-weight:bold;vertical-align:top;">${esc(v)}</td></tr>`).join('');
  const button = cta ? `<tr><td align="center" style="padding:8px 32px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.gold}" style="border-radius:999px;background:${C.gold};">
<a href="${esc(cta.href)}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${FONT};font-size:16px;font-weight:bold;color:${C.dark};text-decoration:none;border-radius:999px;">${esc(cta.label)}</a>
</td></tr></table></td></tr>` : '';
  const p = s => `<p style="margin:0 0 12px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.ink};">${s}</p>`;
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
</head>
<body dir="rtl" style="margin:0;padding:0;background:${C.paper};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper};font-size:1px;line-height:1px;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="background:${C.paper};" dir="rtl">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="max-width:600px;width:100%;background:${C.card};border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
<tr><td align="center" bgcolor="${C.dark}" style="background:${C.dark};padding:28px 24px 22px;">
<div style="font-family:${HEAD_FONT};font-size:26px;line-height:1.25;color:${C.gold};font-weight:bold;">חיליק רוזנברג</div>
<div style="font-family:${FONT};font-size:14px;line-height:1.4;color:#eaeae0;letter-spacing:1px;padding-top:4px;">סיורים קולינריים בבני ברק</div>
</td></tr>
<tr><td height="4" bgcolor="${C.gold}" style="background:${C.gold};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:28px 32px 4px;">
<span style="display:inline-block;padding:5px 14px;border-radius:999px;background:${badgeBg};color:${badgeColor};font-family:${FONT};font-size:13px;font-weight:bold;">${esc(badge)}</span>
<h1 style="margin:14px 0 12px;font-family:${HEAD_FONT};font-size:24px;line-height:1.3;color:${C.dark};font-weight:bold;">${esc(title)}</h1>
${intro.map(s => p(esc(s))).join('\n')}
</td></tr>
${notice ? `<tr><td style="padding:4px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="right" bgcolor="${notice.bg}" style="background:${notice.bg};border-right:4px solid ${notice.border};border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.dark};"><strong>${esc(notice.title)}</strong><br>${esc(notice.text)}</td></tr></table></td></tr>` : ''}
<tr><td style="padding:12px 32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl">${rowsHtml}</table>
</td></tr>
${button}
${after.length ? `<tr><td align="right" style="padding:0 32px 8px;">${after.map(s => p(esc(s))).join('\n')}</td></tr>` : ''}
<tr><td align="right" style="padding:8px 32px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="right" bgcolor="${C.paper}" style="background:${C.paper};border-radius:10px;padding:16px 18px;font-family:${FONT};font-size:14px;line-height:1.8;color:${C.ink};">
<strong style="color:${C.dark};">שאלות? חיליק זמין בשבילכם</strong><br>
טלפון: <a href="tel:${CONTACT.phoneIntl}" style="color:${C.goldText};text-decoration:none;font-weight:bold;"><span dir="ltr">${CONTACT.phone}</span></a><br>
אימייל: <a href="mailto:${CONTACT.email}" style="color:${C.goldText};text-decoration:none;font-weight:bold;">${CONTACT.email}</a><br>
אתר: <a href="${CONTACT.site}" target="_blank" style="color:${C.goldText};text-decoration:none;font-weight:bold;">${CONTACT.siteLabel}</a>
</td></tr></table>
</td></tr>
<tr><td align="center" bgcolor="${C.dark}" style="background:${C.dark};padding:16px 24px;font-family:${FONT};font-size:12px;line-height:1.5;color:#a69c98;">${esc(BRAND)}<br>הודעה זו נשלחה בעקבות הרשמה לסיור באתר ${CONTACT.siteLabel}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const textContact = ['שאלות? חיליק זמין בשבילכם:', `טלפון: ${CONTACT.phone}`, `אימייל: ${CONTACT.email}`, `אתר: ${CONTACT.site}`];
const textRows = rows => rows.map(([k, v]) => `${k}: ${v ?? ''}`);

// (a) Sent when the booking is created. It must never read as a confirmation.
const RECEIVED_NOTICE = 'ההרשמה אינה מאושרת ולא נשמר עבורך מקום בסיור עד להשלמת התשלום.';
function customerReceivedEmail(id, b, nowMs = Date.now()) {
  const link = safeUrl(liveLink(b, nowMs));
  const rows = detailRows(id, b, 'ממתין לתשלום');
  const name = String(b.name || '').trim();
  const intro = [`שלום${name ? ` ${name}` : ''},`, 'תודה שנרשמת לסיור! קיבלנו את פרטי ההרשמה שלך.'];
  const noticeText = `${RECEIVED_NOTICE} מיד לאחר שהתשלום יושלם ויאומת, נשלח אליך אימייל אישור הזמנה.`;
  // The create trigger fires before createPayment writes paymentUrl, so provider
  // bookings normally have no link yet: the customer is on the checkout page right now.
  const after = link ? ['הקישור לתשלום תקף לזמן מוגבל בלבד. אם פג תוקפו, אפשר להירשם מחדש באתר או לפנות לחיליק.']
    : viaProvider(b) ? ['אם טרם השלמת את התשלום בעמוד התשלום המאובטח, יש להשלים אותו כעת. אם כבר שילמת, אין צורך לעשות דבר – אימייל אישור יישלח אליך בנפרד.',
      'אם עמוד התשלום נסגר או שפג תוקפו, אפשר להירשם מחדש באתר או לפנות לחיליק.']
      : ['להשלמת התשלום אפשר לפנות לחיליק בטלפון או באימייל.'];
  const html = layout({
    preheader: `ההרשמה התקבלה (מספר ${id}) – טרם אושרה, נדרש תשלום`,
    badge: 'ממתין לתשלום', badgeBg: C.warnBg, badgeColor: C.goldText,
    title: 'קיבלנו את ההרשמה שלך – היא עדיין לא מאושרת', intro,
    notice: { bg: C.warnBg, border: C.gold, title: 'חשוב: ההרשמה טרם אושרה', text: noticeText },
    rows, cta: link ? { href: link, label: 'להשלמת התשלום' } : null, after,
  });
  const text = [...intro, '', 'חשוב: ההרשמה טרם אושרה.', noticeText, '', 'פרטי ההרשמה:', ...textRows(rows), '',
    ...(link ? [`להשלמת התשלום: ${link}`] : []), ...after, '', ...textContact, '', `תודה, ${BRAND}`].join('\n');
  return { subject: `ההרשמה התקבלה – טרם אושרה, נדרש תשלום (${id})`, text, html };
}

// (b) Sent only after the server recorded a verified Tranzila payment.
function customerConfirmedEmail(id, b) {
  const rows = detailRows(id, b, 'שולם');
  const name = String(b.name || '').trim();
  const intro = [`שלום${name ? ` ${name}` : ''},`, 'התשלום התקבל והמקום שלך בסיור שמור. מחכים לראות אותך!'];
  const after = [meetingPoint(b) ? 'מומלץ להגיע לנקודת המפגש כמה דקות לפני תחילת הסיור.' : 'לפרטים על נקודת המפגש ושעת ההגעה אפשר לפנות לחיליק.',
    'לשינויים או ביטול אפשר לפנות לחיליק בטלפון או באימייל.'];
  const html = layout({
    preheader: `ההזמנה אושרה – ${formatDate(b.tourDate)} (מספר ${id})`,
    badge: 'ההזמנה אושרה ✓', badgeBg: C.okBg, badgeColor: C.ok,
    title: 'ההזמנה שלך אושרה!', intro, notice: null, rows, cta: null, after,
  });
  const text = [...intro, '', 'פרטי ההזמנה:', ...textRows(rows), '', ...after, '', ...textContact, '', `תודה, ${BRAND}`].join('\n');
  return { subject: `ההזמנה אושרה – ${tourName(b)}, ${formatDate(b.tourDate)} (${id})`, text, html };
}

module.exports = { viaProvider, customerReceivedEmail, customerConfirmedEmail, formatDate, RECEIVED_NOTICE, CONTACT, DEFAULT_TOUR };
