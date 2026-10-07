'use strict';
const crypto = require('node:crypto');
const { createReconciledCountSync, summarizeBookings } = require('./calendar-count-sync');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const EMAIL_WINDOW_MS = 23 * 60 * 60 * 1000; // Provider retains keys for 24h; keep a safety margin.
const fail = (code, blocked = false) => Object.assign(new Error(code), { blocked });
const address = value => typeof value === 'string' && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) && value.length <= 254;
const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
function validateJob(job) {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(job?.idempotencyKey || '') || !/^BK-[a-f0-9]{20,24}$/.test(job.bookingId || '') || !validDate(job.tourDate) || !Number.isInteger(job.revision) || job.revision < 1) throw fail('invalid-integration-job', true);
}
function renderEmail(job, from) {
  const s = job.emailSnapshot;
  if (!s || s.bookingId !== job.bookingId || s.revision !== job.revision || s.status !== job.event || s.tourDate !== job.tourDate || !address(s.email) || !['pending', 'confirmed', 'cancelled'].includes(s.status) || !Number.isInteger(s.participants) || s.participants < 1 || !Number.isFinite(s.totalPrice) || s.totalPrice < 0) throw fail('email-snapshot-invalid', true);
  const en = job.language === 'en';
  const titles = en ? { pending: 'Booking request received', confirmed: 'Booking confirmed', cancelled: 'Booking cancelled' } : { pending: 'בקשת ההזמנה התקבלה', confirmed: 'ההזמנה אושרה', cancelled: 'ההזמנה בוטלה' };
  const title = titles[s.status];
  // Plain text only. No notes, DOB, payment credentials or marketing content.
  const lines = en
    ? [title, `Reference: ${s.bookingId}`, `Tour date: ${s.tourDate}`, `Participants: ${s.participants}`, `Booking amount: ILS ${s.totalPrice.toFixed(2)}`]
    : [title, `מספר הזמנה: ${s.bookingId}`, `תאריך סיור: ${s.tourDate}`, `משתתפים: ${s.participants}`, `סכום ההזמנה: ₪${s.totalPrice.toFixed(2)}`];
  if (s.status === 'pending') lines.push(en ? 'This acknowledges your request. Confirmation and payment are separate.' : 'זו הודעה על קבלת הבקשה. אישור ההזמנה והתשלום הם שלבים נפרדים.');
  if (s.status === 'cancelled') lines.push(en ? 'This cancellation notice does not confirm a refund.' : 'הודעת הביטול אינה אישור להחזר כספי.');
  return { from, to: [s.email], subject: `Chilik Tours | ${title} | ${s.bookingId}`, text: lines.join('\n') };
}
/**
 * Explicit, disabled-by-default adapters. getAccessToken(service) returns an
 * ephemeral token string for 'resend' or 'google-calendar'; it never persists here.
 * No account creation/OAuth grants or automatic provider selection.
 * config.email: {enabled, provider:'resend', idempotencyVerified, from}
 * config.calendar: {enabled, provider:'google', mode:'mirror', idempotencyVerified,
 *   calendarId, startTime:'HH:mm', endTime:'HH:mm', endDayOffset:0|1}
 * Alternative mode:'reconciled-event' requires reconciliationVerified and
 * privateEventAccessVerified, plus a protected approved calendarSessions binding.
 * It updates the mapped count event only; it never inserts/replaces an event.
 * Runtime wiring must remain disabled until owner setup + sandbox verification.
 * References: https://resend.com/docs/dashboard/emails/idempotency-keys
 * https://developers.google.com/workspace/calendar/api/guides/version-resources
 */
function createIntegrationAdapters({ db, config = {}, fetchImpl = globalThis.fetch, getAccessToken, now = Date.now }) {
  async function request(url, method, token, body, headers = {}) {
    if (!token || typeof token !== 'string' || /[\r\n]/.test(token)) throw fail('provider-token-unavailable', true);
    let response;
    try {
      response = await fetchImpl(url, { method, redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    } catch { throw fail('provider-request-uncertain'); }
    let data = {};
    try { data = await response.json(); } catch { /* Responses without JSON are handled by status. */ }
    return { status: response.status, ok: response.ok, data };
  }
  async function tokenFor(service) {
    if (typeof getAccessToken !== 'function') throw fail('provider-token-unavailable', true);
    try { return await getAccessToken(service); } catch { throw fail('provider-token-unavailable', true); }
  }
  async function email(job) {
    const c = config.email || {};
    if (c.enabled !== true || c.provider !== 'resend' || c.idempotencyVerified !== true || !address(c.from)) throw fail('email-not-configured', true);
    validateJob(job);
    const body = renderEmail(job, c.from), payloadHash = hash(JSON.stringify(body));
    const ref = db.doc(`deliveryReceipts/${hash(`email:${job.idempotencyKey}`)}`);
    const receipt = await db.runTransaction(async tx => {
      const snap = await tx.get(ref), saved = snap.data();
      if (saved) {
        if (saved.payloadHash !== payloadHash) throw fail('email-payload-changed', true);
        if (saved.providerId) return saved;
        if (!Number.isFinite(saved.firstAttemptMs) || now() < saved.firstAttemptMs || now() - saved.firstAttemptMs >= EMAIL_WINDOW_MS) throw fail('email-idempotency-window-expired', true);
        return saved;
      }
      const created = { payloadHash, firstAttemptMs: now(), providerId: null };
      tx.create(ref, created);
      return created;
    });
    if (receipt.providerId) return { providerId: receipt.providerId };
    const token = await tokenFor('resend');
    if (now() < receipt.firstAttemptMs || now() - receipt.firstAttemptMs >= EMAIL_WINDOW_MS) throw fail('email-idempotency-window-expired', true);
    // Stable job key + immutable body covers response loss and concurrent attempts.
    const response = await request('https://api.resend.com/emails', 'POST', token, body, { 'Idempotency-Key': job.idempotencyKey });
    if (!response.ok || typeof response.data.id !== 'string' || !response.data.id) throw fail('email-provider-rejected', [400, 401, 403, 422].includes(response.status));
    await ref.update({ providerId: response.data.id });
    return { providerId: response.data.id };
  }
  async function calendar(job) {
    const c = config.calendar || {};
    const time = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (c.enabled !== true || c.provider !== 'google' || !['mirror', 'reconciled-event'].includes(c.mode) || c.idempotencyVerified !== true || typeof c.calendarId !== 'string' || !c.calendarId || c.calendarId === 'primary') throw fail('calendar-not-configured', true);
    validateJob(job);
    if (new Date(`${job.tourDate}T00:00:00Z`).getUTCDay() !== 4) throw fail('invalid-integration-job', true);
    if (c.mode === 'reconciled-event') {
      if (c.reconciliationVerified !== true || c.privateEventAccessVerified !== true) throw fail('calendar-not-configured', true);
      return createReconciledCountSync({ db, request, tokenFor, now })(job, c);
    }
    if (!time(c.startTime) || !time(c.endTime) || ![0, 1].includes(c.endDayOffset) || (c.endDayOffset === 0 && c.endTime <= c.startTime)) throw fail('calendar-not-configured', true);
    const token = await tokenFor('google-calendar');
    // Hex is a subset of Google's base32hex event-id alphabet. One event/session.
    const eventId = hash(`chilik-tours:${job.tourDate}`);
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendarId)}/events`;
    const url = `${base}/${eventId}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      // ETag MUST be fetched before latest Firestore state. An older worker cannot
      // overwrite a newer mirror write: If-Match failure rereads both sources.
      const existing = await request(url, 'GET', token);
      if (!existing.ok && existing.status !== 404) throw fail('calendar-read-failed', [401, 403, 410].includes(existing.status));
      if (existing.ok && (existing.data.id !== eventId || !existing.data.etag || /[\r\n]/.test(existing.data.etag) || existing.data.status === 'cancelled' || existing.data.recurrence?.length || existing.data.recurringEventId || existing.data.attendees?.length || existing.data.attendeesOmitted === true || existing.data.extendedProperties?.private?.chilikSession !== job.tourDate)) throw fail('calendar-event-conflict', true);
      const bookings = await db.collection('bookings').where('tourDate', '==', job.tourDate).get();
      const { confirmed, held } = summarizeBookings(bookings.docs.map(document => document.data()), now());
      const active = confirmed + held;
      if (existing.status === 404 && active === 0) return { providerId: `not-needed:${eventId}` };
      const end = new Date(`${job.tourDate}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + c.endDayOffset);
      const body = {
        summary: active ? `Chilik Tours | ${confirmed} confirmed, ${held} pending` : 'Chilik Tours | No active reservations',
        description: `Booking-system mirror for ${job.tourDate}. Confirmed participants: ${confirmed}. Pending participants: ${held}. Availability is managed in the booking system.`,
        start: { dateTime: `${job.tourDate}T${c.startTime}:00`, timeZone: 'Asia/Jerusalem' },
        end: { dateTime: `${end.toISOString().slice(0, 10)}T${c.endTime}:00`, timeZone: 'Asia/Jerusalem' },
        visibility: 'private', transparency: 'transparent',
        attendees: [], // Never expose customers or generate invitations.
        extendedProperties: { private: { ...existing.data.extendedProperties?.private, chilikSession: job.tourDate } }
      };
      const result = existing.status === 404
        ? await request(`${base}?sendUpdates=none`, 'POST', token, { id: eventId, ...body })
        : await request(`${url}?sendUpdates=none`, 'PATCH', token, body, { 'If-Match': existing.data.etag });
      if ([409, 412].includes(result.status)) continue;
      // Deletion between GET and PATCH needs review, not a replacement event.
      if ([404, 410].includes(result.status)) throw fail('calendar-event-conflict', true);
      if (!result.ok || result.data.id !== eventId) throw fail('calendar-write-failed', [400, 401, 403, 410].includes(result.status));
      return { providerId: eventId };
    }
    throw fail('calendar-concurrent-update');
  }
  return { email, calendar };
}
module.exports = { createIntegrationAdapters, renderEmail, EMAIL_WINDOW_MS };
