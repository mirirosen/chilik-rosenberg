'use strict';
const { authenticate } = require('./access');
const { FUNCTION_REGION, BOOKING_RUNTIME } = require('./deployment-config');
const realDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const CONTACT_ADMIN_URL = 'https://www.chilik-tours.com/admin';
const CONTACT_TEMPLATE_BODY = 'עדכון על הזמנה חדשה לסיור שהתקבלה באתר.\nשם המזמין: {{1}}\nתאריך הסיור שנבחר: {{2}}\nמספר המשתתפים בהזמנה: {{3}}\nלפתיחת כרטיס איש הקשר של המזמין, היכנס לקישור המאובטח.\nהצפייה בפרטי הקשר והורדת הכרטיס זמינות לאחר כניסה לחשבון מנהל מורשה.';
const CONTACT_BUTTON_TITLE = 'פתיחת איש קשר';
const CONTACT_BUTTON_URL = 'https://www.chilik-tours.com/{{4}}';
const validBookingId = id => typeof id === 'string' && /^BK-[a-f0-9]{24}$/.test(id);
const invalid = () => Object.assign(new Error('invalid-contact-data'), { status: 409 });
const forbiddenText = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
function cleanText(value, max) {
  if (typeof value !== 'string' || value.length > max || forbiddenText.test(value) || Array.from(value).some(c => /^[\ud800-\udfff]$/u.test(c))) throw invalid();
  const result = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!result) throw invalid();
  return result;
}
function contactLink(id) {
  if (!validBookingId(id)) throw Object.assign(new Error('invalid-contact-booking-id'), { blocked: true });
  // A locator, never a bearer credential. Firebase admin authentication is mandatory.
  return `${CONTACT_ADMIN_URL}#contact=${id}`;
}
function contactSuffix(id) { return contactLink(id).slice('https://www.chilik-tours.com/'.length); }
function escapeText(value) { return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r\n|\r|\n/g, '\\n'); }
function foldLine(line) {
  let result = '', bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
    if (bytes + size > 75) { result += '\r\n '; bytes = 1; }
    result += char; bytes += size;
  }
  return result;
}
function renderContactCard(booking) {
  const name = cleanText(booking?.name, 120), rawPhone = cleanText(booking?.phone, 32);
  const phone = rawPhone.replace(/[ -]/g, '');
  const e164 = /^05\d{8}$/.test(phone) ? `+972${phone.slice(1)}` : /^\+9725\d{8}$/.test(phone) ? phone : null;
  if (!e164 || !realDate(booking.tourDate) || !Number.isInteger(booking.participants) || booking.participants < 1 || booking.participants > 20) throw invalid();
  const displayName = `${name} ב־${booking.tourDate.slice(8, 10)}.${booking.tourDate.slice(5, 7)} ${booking.participants} אנשים`;
  // RFC 6350: UTF-8, CRLF, 75-octet folding without splitting codepoints.
  // Natural Hebrew bidi ordering; no hidden directional controls or extra PII.
  return Buffer.from(['BEGIN:VCARD', 'VERSION:4.0', `FN;LANGUAGE=he:${escapeText(displayName)}`, `TEL;VALUE=uri;TYPE=cell:tel:${e164}`, 'END:VCARD'].map(foldLine).join('\r\n') + '\r\n', 'utf8');
}
function createAdminBookingContactCard({ onRequest, bookings, verifyIdToken, enabled = false }) {
  const origins = new Set(['https://www.chilik-tours.com', 'https://chilik-tours.com', 'https://livechilik-tours.com', 'https://hilik-site.web.app', 'https://hilik-site.firebaseapp.com', 'http://localhost:3000', 'http://localhost:5173']);
  return onRequest({ region: FUNCTION_REGION, serviceAccount: BOOKING_RUNTIME, invoker: 'private', minInstances: 0, maxInstances: 1, concurrency: 1, memory: '256MiB', cpu: 1, timeoutSeconds: 60 }, async (req, res) => {
    // Apply on every response, including authentication, validation and CORS errors.
    res.set('Cache-Control', 'private, no-store, max-age=0').set('Pragma', 'no-cache').set('Expires', '0')
      .set('Referrer-Policy', 'no-referrer').set('X-Robots-Tag', 'noindex, nofollow, noarchive')
      .set('X-Content-Type-Options', 'nosniff').set('Vary', 'Origin, Authorization');
    const json = (status, error) => res.status(status).json({ error });
    if (enabled !== true) return json(503, 'booking-runtime-disabled');
    const origin = req.get('origin');
    if (origin && !origins.has(origin)) return json(403, 'origin-not-allowed');
    if (origin) res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET,OPTIONS').set('Access-Control-Allow-Headers', 'Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return json(405, 'method-not-allowed');
    try {
      const user = await authenticate(req, verifyIdToken, true);
      if (!user.uid || !user.firebase?.sign_in_provider || user.firebase.sign_in_provider === 'anonymous') return json(403, 'admin-required');
      const id = req.query?.id;
      if (!validBookingId(id) || Object.keys(req.query).some(k => k !== 'id')) return json(400, 'invalid-id');
      // Authentication precedes all reads. Customers (including the booking owner)
      // cannot enumerate bookings; admins have the same scope as the dashboard.
      const snap = await bookings.bookingRef(id).get();
      const booking = snap.exists ? snap.data() : null;
      if (!booking || booking.bookingId !== id || booking.schemaVersion !== 2 || booking.status !== 'confirmed' || booking.capacityReserved !== true) return json(404, 'not-found');
      const bytes = renderContactCard(booking);
      return res.status(200).set('Content-Type', 'text/vcard; charset=utf-8')
        .set('Content-Disposition', 'attachment; filename="booking-contact.vcf"').send(bytes);
    } catch (error) {
      // Never log request headers, identity, locator, card, database or upstream errors.
      const known = new Set(['authentication-required', 'admin-required', 'invalid-contact-data']);
      return json(known.has(error.message) ? error.status : 503, known.has(error.message) ? error.message : 'contact-unavailable');
    }
  });
}
module.exports = { createAdminBookingContactCard, renderContactCard, contactLink, contactSuffix, CONTACT_ADMIN_URL, CONTACT_TEMPLATE_BODY, CONTACT_BUTTON_TITLE, CONTACT_BUTTON_URL, validBookingId };
