'use strict';
const crypto = require('node:crypto');
const { assertWeeklyCounter, eventDateRange, weekStartDate, APPROVED_WEEK_POLICY } = require('./weekly-availability');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = (code, blocked = true) => Object.assign(new Error(code), { blocked });
const title = count => `${count} אנשים`;
function bindingHash(binding) {
  return hash(JSON.stringify([binding.calendarId, binding.eventId, binding.tourDate, binding.weekStart, binding.externalParticipants, binding.adoptionEtag, binding.adoptionCount]));
}
function validateBinding(binding, calendarId, tourDate) {
  if (!binding || binding.approved !== true || binding.reconciled !== true || binding.calendarId !== calendarId || binding.tourDate !== tourDate || !/^[a-zA-Z0-9_-]{5,1024}$/.test(binding.eventId || '') || !Number.isSafeInteger(binding.externalParticipants) || binding.externalParticipants < 0 || !Number.isSafeInteger(binding.adoptionCount) || binding.adoptionCount < binding.externalParticipants || typeof binding.adoptionEtag !== 'string' || !binding.adoptionEtag || /[\r\n]/.test(binding.adoptionEtag) || weekStartDate(tourDate, APPROVED_WEEK_POLICY) !== binding.weekStart || new Date(`${tourDate}T00:00:00Z`).getUTCDay() !== 4) throw fail('calendar-binding-unverified');
  return binding;
}
function summarizeBookings(bookings, nowMs) {
  let confirmed = 0, held = 0, expiredHolds = 0;
  for (const b of bookings) {
    if (!['pending', 'payment_pending', 'confirmed'].includes(b.status) || b.capacityReserved === false) continue;
    if (b.schemaVersion !== 2 || b.capacityReserved !== true || !Number.isSafeInteger(b.participants) || b.participants < 1) throw fail('calendar-data-invalid');
    if (b.status === 'confirmed') confirmed += b.participants;
    else if (b.paymentMethod === 'credit') {
      const expires = b.holdExpiresAt?.toMillis?.();
      if (!Number.isFinite(expires)) throw fail('calendar-data-invalid');
      if (expires <= nowMs) expiredHolds += b.participants;
      else held += b.participants;
    } else held += b.participants;
  }
  if (![confirmed, held, expiredHolds].every(Number.isSafeInteger)) throw fail('calendar-data-invalid');
  return { confirmed, held, expiredHolds };
}
function intentMatches(intent, event, binding) {
  return intent && intent.bindingHash === bindingHash(binding) && intent.eventId === binding.eventId && intent.calendarId === binding.calendarId && Number.isSafeInteger(intent.total) && intent.total >= binding.externalParticipants && event.summary === title(intent.total) && event.extendedProperties?.private?.chilikSession === binding.tourDate;
}
async function readDocument(db, path) {
  return db.runTransaction(async tx => (await tx.get(db.doc(path))).data());
}
// Used only by the private importer. Site participants in an acknowledged or
// uncertain *own* write are removed from the annotation, never added again.
// Any changed human count/marker requires a new explicit reconciliation.
async function normalizeManagedCount(db, event, calendarId) {
  const writeId = event.extendedProperties?.private?.chilikSyncWrite;
  if (!writeId) return event;
  if (!/^[a-f0-9-]{36}$/.test(writeId)) throw fail('calendar-event-conflict');
  const date = event.extendedProperties.private.chilikSession;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail('calendar-event-conflict');
  const binding = validateBinding(await readDocument(db, `calendarSessions/${date}`), calendarId, date);
  const intent = await readDocument(db, `calendarWriteIntents/${writeId}`);
  if (event.id !== binding.eventId || !intentMatches(intent, event, binding)) throw fail('calendar-count-requires-reconciliation');
  const [start, last] = eventDateRange(event, APPROVED_WEEK_POLICY);
  if (start !== binding.tourDate || last !== binding.tourDate) throw fail('calendar-event-conflict');
  return { ...event, summary: title(binding.externalParticipants) };
}
// No insert path. A missing/deleted/replaced mapped event is blocked for review.
// Caller supplies the same sanitized request/token functions as the mirror.
function createReconciledCountSync({ db, request, tokenFor, now = Date.now }) {
  return async function sync(job, config) {
    const binding = validateBinding(await readDocument(db, `calendarSessions/${job.tourDate}`), config.calendarId, job.tourDate);
    const token = await tokenFor('google-calendar');
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(binding.eventId)}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await request(url, 'GET', token);
      if ([404, 410].includes(existing.status)) throw fail('calendar-bound-event-missing');
      if (!existing.ok) throw fail('calendar-read-failed', [400, 401, 403].includes(existing.status));
      const event = existing.data;
      if (event.id !== binding.eventId || !event.etag || /[\r\n]/.test(event.etag) || event.status === 'cancelled' || event.recurrence?.length || event.recurringEventId || event.attendees?.length || event.attendeesOmitted === true) throw fail('calendar-event-conflict');
      const [start, last] = eventDateRange(event, APPROVED_WEEK_POLICY);
      if (start !== job.tourDate || last !== job.tourDate) throw fail('calendar-event-conflict');
      const writeId = event.extendedProperties?.private?.chilikSyncWrite;
      if (writeId) {
        if (!/^[a-f0-9-]{36}$/.test(writeId) || !intentMatches(await readDocument(db, `calendarWriteIntents/${writeId}`), event, binding)) throw fail('calendar-count-requires-reconciliation');
      } else if (event.etag !== binding.adoptionEtag || event.summary !== title(binding.adoptionCount)) throw fail('calendar-count-requires-reconciliation');
      // Latest counter is read AFTER ETag. Compare site-only quantities against
      // the explicitly reconciled external baseline; never infer an overlap.
      const state = await db.runTransaction(async tx => {
        const currentBinding = validateBinding((await tx.get(db.doc(`calendarSessions/${job.tourDate}`))).data(), config.calendarId, job.tourDate);
        if (bindingHash(currentBinding) !== bindingHash(binding)) throw fail('calendar-binding-unverified');
        let counter;
        try { counter = assertWeeklyCounter((await tx.get(db.doc(`bookingWeeks/${binding.weekStart}`))).data()); }
        catch { throw fail('calendar-count-requires-reconciliation'); }
        const bookings = await tx.get(db.collection('bookings').where('weekStart', '==', binding.weekStart));
        const counts = summarizeBookings(bookings.docs.map(d => d.data()), now());
        if (counts.expiredHolds) throw fail('calendar-hold-expiry-pending', false);
        if (counter.externalParticipants !== binding.externalParticipants || counter.heldParticipants !== counts.held || counter.confirmedParticipants !== counts.confirmed + binding.externalParticipants) throw fail('calendar-count-requires-reconciliation');
        return { total: counter.currentRegistrations };
      });
      if (writeId && event.summary === title(state.total)) return { providerId: binding.eventId };
      // Persist before PATCH, so a lost response can be identified on retry.
      const nextWriteId = crypto.randomUUID();
      await db.runTransaction(async tx => {
        tx.create(db.doc(`calendarWriteIntents/${nextWriteId}`), { bindingHash: bindingHash(binding), eventId: binding.eventId, calendarId: config.calendarId, total: state.total, createdAtMs: now() });
      });
      const body = { summary: title(state.total), extendedProperties: { private: { ...event.extendedProperties?.private, chilikSession: job.tourDate, chilikSyncWrite: nextWriteId } } };
      const result = await request(`${url}?sendUpdates=none`, 'PATCH', token, body, { 'If-Match': event.etag });
      if (result.status === 412) continue;
      if ([404, 410].includes(result.status)) throw fail('calendar-bound-event-missing');
      if (!result.ok || result.data.id !== binding.eventId) throw fail('calendar-write-failed', [400, 401, 403].includes(result.status));
      return { providerId: binding.eventId };
    }
    throw fail('calendar-concurrent-update', false);
  };
}
module.exports = { createReconciledCountSync, normalizeManagedCount, summarizeBookings, bindingHash, validateBinding };
