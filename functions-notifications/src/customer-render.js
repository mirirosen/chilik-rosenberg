'use strict';
// Customer-facing booking emails, always bilingual: a Hebrew RTL section first, then an
// English LTR section (HTML + plain text). Pure, no I/O.
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
const BRAND_EN = 'Hilik Rosenberg – Culinary Tours';
// The site sells a single tour; the booking document carries no tour name.
const DEFAULT_TOUR = 'סיור קולינרי בבני ברק';
const DEFAULT_TOUR_EN = 'Culinary tour of Bnei Brak';
// Mirrors viaProvider() in functions/src/booking-core.js: these bookings are paid on
// the Tranzila checkout page; everything else is a manual request handled by Hilik.
const viaProvider = b => b.paymentMethod === 'credit' || (b.paymentMethod === 'bit' && b.paymentProvider === 'tranzila');
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isoParts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? { y: m[1], mo: m[2], d: m[3], day: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() } : null;
}
function formatDate(iso) {
  const p = isoParts(iso);
  return p ? `יום ${WEEKDAYS[p.day]}, ${p.d}.${p.mo}.${p.y}` : String(iso || '');
}
function formatDateEn(iso) {
  const p = isoParts(iso);
  return p ? `${WEEKDAYS_EN[p.day]}, ${+p.d} ${MONTHS_EN[+p.mo - 1]} ${p.y}` : String(iso || '');
}
const tourTime = b => [b.tourTime, b.startTime].find(t => typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)) || null;
const meetingPoint = b => (typeof b.meetingPoint === 'string' && b.meetingPoint.trim() ? b.meetingPoint.trim() : null);
const customTour = b => [b.tourName, b.tourTitle].find(t => typeof t === 'string' && t.trim())?.trim() || null;
const tourName = b => customTour(b) || DEFAULT_TOUR;
function amountValue(b) {
  const n = Number(b.totalPrice);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US') : null;
}

// Per-language labels and formatters for the shared section layout.
// Wrap a user name in Unicode FSI/PDI isolates so a Hebrew name in the English
// greeting (or a Latin name in the Hebrew one) does not drag the comma to the wrong side.
const isolate = v => `\u2068${v}\u2069`;
const LANG = {
  he: {
    lang: 'he', dir: 'rtl', align: 'right',
    labels: { id: 'מספר הזמנה', tour: 'סיור', date: 'תאריך', time: 'שעה', point: 'נקודת מפגש', people: 'משתתפים', amount: 'סכום', status: 'סטטוס תשלום' },
    date: formatDate, tour: tourName, amount: v => `${v} ₪`,
    hello: name => `שלום${name ? ` ${isolate(name)}` : ''},`,
    contactTitle: 'שאלות? חיליק זמין בשבילכם', phone: 'טלפון', email: 'אימייל', site: 'אתר',
    thanks: `תודה, ${BRAND}`,
  },
  en: {
    lang: 'en', dir: 'ltr', align: 'left',
    labels: { id: 'Booking number', tour: 'Tour', date: 'Date', time: 'Time', point: 'Meeting point', people: 'Participants', amount: 'Amount', status: 'Payment status' },
    date: formatDateEn, tour: b => customTour(b) || DEFAULT_TOUR_EN, amount: v => `₪${v} (ILS)`,
    hello: name => `Hello${name ? ` ${isolate(name)}` : ''},`,
    contactTitle: 'Questions? Hilik is happy to help', phone: 'Phone', email: 'Email', site: 'Website',
    thanks: `Thank you, ${BRAND_EN}`,
  },
};

// Rows shown in both emails. Meeting point appears only when the booking itself has one.
// Value cells use dir="auto" so a Hebrew value in the English table (or vice versa) keeps its order.
function detailRows(L, id, b, paymentLabel) {
  const time = tourTime(b), point = meetingPoint(b), amt = amountValue(b), t = L.labels;
  return [
    [t.id, id],
    [t.tour, L.tour(b)],
    [t.date, L.date(b.tourDate)],
    ...(time ? [[t.time, time]] : []),
    ...(point ? [[t.point, point]] : []),
    [t.people, b.participants],
    ...(amt ? [[t.amount, L.amount(amt)]] : []),
    [t.status, paymentLabel],
  ];
}

// One language section: badge, title, intro, notice, details, CTA, notes and contact box.
// The section's own container carries dir/lang so each mail client aligns it correctly.
function section(L, { badge, badgeBg, badgeColor, title, intro, notice, rows, cta, after }) {
  const a = L.align, attrs = `dir="${L.dir}" lang="${L.lang}"`;
  const td = `font-family:${FONT};font-size:15px;line-height:1.5;padding:10px 0;border-bottom:1px solid ${C.line};`;
  const rowsHtml = rows.map(([k, v]) => `<tr><td align="${a}" style="${td}color:${C.muted};width:38%;vertical-align:top;">${esc(k)}</td>`
    + `<td align="${a}" dir="auto" style="${td}color:${C.dark};font-weight:bold;vertical-align:top;">${esc(v)}</td></tr>`).join('');
  const button = cta ? `<tr><td align="center" style="padding:8px 32px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.gold}" style="border-radius:999px;background:${C.gold};">
<a href="${esc(cta.href)}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${FONT};font-size:16px;font-weight:bold;color:${C.dark};text-decoration:none;border-radius:999px;">${esc(cta.label)}</a>
</td></tr></table></td></tr>` : '';
  const p = s => `<p style="margin:0 0 12px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.ink};">${s}</p>`;
  return `<tr><td ${attrs} align="${a}" style="padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${attrs}>
<tr><td align="${a}" style="padding:28px 32px 4px;">
<span style="display:inline-block;padding:5px 14px;border-radius:999px;background:${badgeBg};color:${badgeColor};font-family:${FONT};font-size:13px;font-weight:bold;">${esc(badge)}</span>
<h1 style="margin:14px 0 12px;font-family:${HEAD_FONT};font-size:24px;line-height:1.3;color:${C.dark};font-weight:bold;">${esc(title)}</h1>
${intro.map(s => p(esc(s))).join('\n')}
</td></tr>
${notice ? `<tr><td style="padding:4px 32px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${attrs}><tr><td align="${a}" bgcolor="${notice.bg}" style="background:${notice.bg};border-${a}:4px solid ${notice.border};border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.dark};"><strong>${esc(notice.title)}</strong><br>${esc(notice.text)}</td></tr></table></td></tr>` : ''}
<tr><td style="padding:12px 32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${attrs}>${rowsHtml}</table>
</td></tr>
${button}
${after.length ? `<tr><td align="${a}" style="padding:0 32px 8px;">${after.map(s => p(esc(s))).join('\n')}</td></tr>` : ''}
<tr><td align="${a}" style="padding:8px 32px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ${attrs}><tr><td align="${a}" bgcolor="${C.paper}" style="background:${C.paper};border-radius:10px;padding:16px 18px;font-family:${FONT};font-size:14px;line-height:1.8;color:${C.ink};">
<strong style="color:${C.dark};">${esc(L.contactTitle)}</strong><br>
${L.phone}: <a href="tel:${CONTACT.phoneIntl}" style="color:${C.goldText};text-decoration:none;font-weight:bold;"><span dir="ltr">${CONTACT.phone}</span></a><br>
${L.email}: <a href="mailto:${CONTACT.email}" style="color:${C.goldText};text-decoration:none;font-weight:bold;">${CONTACT.email}</a><br>
${L.site}: <a href="${CONTACT.site}" target="_blank" style="color:${C.goldText};text-decoration:none;font-weight:bold;">${CONTACT.siteLabel}</a>
</td></tr></table>
</td></tr>
</table>
</td></tr>`;
}

// Subtle divider between the Hebrew and the English section.
const DIVIDER = `<tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="45%" style="border-top:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</td>
<td width="10%" align="center" style="font-family:${FONT};font-size:12px;line-height:1;color:${C.gold};padding:0 6px;">&#9670;</td>
<td width="45%" style="border-top:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</td>
</tr></table></td></tr>`;

function layout({ preheader, title, he, en }) {
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
<div dir="ltr" lang="en" style="font-family:${FONT};font-size:12px;line-height:1.4;color:#a69c98;letter-spacing:1px;padding-top:4px;">Hilik Rosenberg · Culinary tours in Bnei Brak</div>
</td></tr>
<tr><td height="4" bgcolor="${C.gold}" style="background:${C.gold};font-size:0;line-height:0;">&nbsp;</td></tr>
${section(LANG.he, he)}
${DIVIDER}
${section(LANG.en, en)}
<tr><td align="center" bgcolor="${C.dark}" style="background:${C.dark};padding:16px 24px;font-family:${FONT};font-size:12px;line-height:1.5;color:#a69c98;">${esc(BRAND)}<br>הודעה זו נשלחה בעקבות הרשמה לסיור באתר ${CONTACT.siteLabel}
<div dir="ltr" lang="en" style="padding-top:6px;">${esc(BRAND_EN)}<br>This message was sent following a tour registration on ${CONTACT.siteLabel}</div></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const TEXT_SEPARATOR = '----------------------------------------';
const textContact = L => [`${L.contactTitle}:`, `${L.phone}: ${CONTACT.phone}`, `${L.email}: ${CONTACT.email}`, `${L.site}: ${CONTACT.site}`];
const textRows = rows => rows.map(([k, v]) => `${k}: ${v ?? ''}`);
// Plain text: Hebrew block, separator line, English block.
const bilingualText = (he, en) => [...he, '', TEXT_SEPARATOR, '', ...en].join('\n');

// (a) Sent when the booking is created. It must never read as a confirmation.
const RECEIVED_NOTICE = 'ההרשמה אינה מאושרת ולא נשמר עבורך מקום בסיור עד להשלמת התשלום.';
const RECEIVED_NOTICE_EN = 'Your registration is NOT confirmed and no seat is held for you on the tour until payment is completed.';
function customerReceivedEmail(id, b, nowMs = Date.now()) {
  const link = safeUrl(liveLink(b, nowMs));
  const name = String(b.name || '').trim();
  // The create trigger fires before createPayment writes paymentUrl, so provider
  // bookings normally have no link yet: the customer is on the checkout page right now.
  const branch = link ? 'link' : viaProvider(b) ? 'provider' : 'manual';
  const copy = {
    he: {
      status: 'ממתין לתשלום', title: 'קיבלנו את ההרשמה שלך – היא עדיין לא מאושרת', noticeTitle: 'חשוב: ההרשמה טרם אושרה',
      intro: [LANG.he.hello(name), 'תודה שנרשמת לסיור! קיבלנו את פרטי ההרשמה שלך.'],
      notice: `${RECEIVED_NOTICE} מיד לאחר שהתשלום יושלם ויאומת, נשלח אליך אימייל אישור הזמנה.`,
      cta: 'להשלמת התשלום', details: 'פרטי ההרשמה:',
      after: {
        link: ['הקישור לתשלום תקף לזמן מוגבל בלבד. אם פג תוקפו, אפשר להירשם מחדש באתר או לפנות לחיליק.'],
        provider: ['אם טרם השלמת את התשלום בעמוד התשלום המאובטח, יש להשלים אותו כעת. אם כבר שילמת, אין צורך לעשות דבר – אימייל אישור יישלח אליך בנפרד.',
          'אם עמוד התשלום נסגר או שפג תוקפו, אפשר להירשם מחדש באתר או לפנות לחיליק.'],
        manual: ['להשלמת התשלום אפשר לפנות לחיליק בטלפון או באימייל.'],
      }[branch],
    },
    en: {
      status: 'Awaiting payment', title: 'We received your registration – it is not confirmed yet', noticeTitle: 'Important: your registration is not confirmed yet',
      intro: [LANG.en.hello(name), 'Thank you for registering for the tour! We have received your registration details.'],
      notice: `${RECEIVED_NOTICE_EN} As soon as the payment is completed and verified, we will send you a booking confirmation email.`,
      cta: 'Complete payment', details: 'Registration details:',
      after: {
        link: ['The payment link is valid for a limited time only. If it has expired, you can register again on the website or contact Hilik.'],
        provider: ['If you have not yet completed payment on the secure payment page, please complete it now. If you have already paid, there is nothing more to do – a confirmation email will be sent to you separately.',
          'If the payment page was closed or has expired, you can register again on the website or contact Hilik.'],
        manual: ['To complete payment, please contact Hilik by phone or email.'],
      }[branch],
    },
  };
  const part = lang => {
    const c = copy[lang], rows = detailRows(LANG[lang], id, b, c.status);
    return {
      html: { badge: c.status, badgeBg: C.warnBg, badgeColor: C.goldText, title: c.title, intro: c.intro,
        notice: { bg: C.warnBg, border: C.gold, title: c.noticeTitle, text: c.notice }, rows, cta: link ? { href: link, label: c.cta } : null, after: c.after },
      text: [...c.intro, '', `${c.noticeTitle}.`, c.notice, '', c.details, ...textRows(rows), '',
        ...(link ? [`${c.cta}: ${link}`] : []), ...c.after, '', ...textContact(LANG[lang]), '', LANG[lang].thanks],
    };
  };
  const he = part('he'), en = part('en');
  const html = layout({
    preheader: `ההרשמה התקבלה (מספר ${id}) – טרם אושרה, נדרש תשלום | Registration received – not confirmed, payment required`,
    title: `${copy.he.title} | ${copy.en.title}`, he: he.html, en: en.html,
  });
  return {
    subject: `ההרשמה התקבלה – טרם אושרה, נדרש תשלום (${id}) | Registration received – not confirmed, payment required (${id})`,
    text: bilingualText(he.text, en.text), html,
  };
}

// (b) Sent only after the server recorded a verified Tranzila payment.
function customerConfirmedEmail(id, b) {
  const name = String(b.name || '').trim(), point = meetingPoint(b);
  const copy = {
    he: {
      status: 'שולם', badge: 'ההזמנה אושרה ✓', title: 'ההזמנה שלך אושרה!', details: 'פרטי ההזמנה:',
      intro: [LANG.he.hello(name), 'התשלום התקבל והמקום שלך בסיור שמור. מחכים לראות אותך!'],
      after: [point ? 'מומלץ להגיע לנקודת המפגש כמה דקות לפני תחילת הסיור.' : 'לפרטים על נקודת המפגש ושעת ההגעה אפשר לפנות לחיליק.',
        'לשינויים או ביטול אפשר לפנות לחיליק בטלפון או באימייל.'],
    },
    en: {
      status: 'Paid', badge: 'Booking confirmed ✓', title: 'Your booking is confirmed!', details: 'Booking details:',
      intro: [LANG.en.hello(name), 'Your payment was received and your seat on the tour is reserved. We look forward to seeing you!'],
      after: [point ? 'Please arrive at the meeting point a few minutes before the tour starts.' : 'For details about the meeting point and arrival time, please contact Hilik.',
        'For changes or cancellations, please contact Hilik by phone or email.'],
    },
  };
  const part = lang => {
    const c = copy[lang], rows = detailRows(LANG[lang], id, b, c.status);
    return {
      html: { badge: c.badge, badgeBg: C.okBg, badgeColor: C.ok, title: c.title, intro: c.intro, notice: null, rows, cta: null, after: c.after },
      text: [...c.intro, '', c.details, ...textRows(rows), '', ...c.after, '', ...textContact(LANG[lang]), '', LANG[lang].thanks],
    };
  };
  const he = part('he'), en = part('en');
  const html = layout({
    preheader: `ההזמנה אושרה – ${formatDate(b.tourDate)} (מספר ${id}) | Booking confirmed – ${formatDateEn(b.tourDate)}`,
    title: `${copy.he.title} | ${copy.en.title}`, he: he.html, en: en.html,
  });
  return {
    subject: `ההזמנה אושרה – ${tourName(b)}, ${formatDate(b.tourDate)} (${id}) | Booking confirmed – ${LANG.en.tour(b)}, ${formatDateEn(b.tourDate)} (${id})`,
    text: bilingualText(he.text, en.text), html,
  };
}

module.exports = {
  viaProvider, customerReceivedEmail, customerConfirmedEmail, formatDate, formatDateEn,
  RECEIVED_NOTICE, RECEIVED_NOTICE_EN, TEXT_SEPARATOR, CONTACT, DEFAULT_TOUR, DEFAULT_TOUR_EN,
};
