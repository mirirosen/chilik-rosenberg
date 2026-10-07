'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createIntegrationAdapters } = require('../src/integration-adapters');
const { createBookingService } = require('../src/booking-service');
const { createJobRunner } = require('../src/integration-jobs');
const { normalizeManagedCount, summarizeBookings } = require('../src/calendar-count-sync');
const { APPROVED_WEEK_POLICY, buildCalendarWeekSnapshots } = require('../src/weekly-availability');
const DATE = '2026-11-12', WEEK = '2026-11-08', NOW = Date.parse('2026-11-06T10:00:00Z');
const POLICY = { ...APPROVED_WEEK_POLICY, enabled: true };
const CONFIG = { calendar: { enabled: true, provider: 'google', mode: 'reconciled-event', idempotencyVerified: true, reconciliationVerified: true, privateEventAccessVerified: true, calendarId: 'fixture@example.test' } };
const JOB = { bookingId: `BK-${'a'.repeat(24)}`, revision: 1, idempotencyKey: 'fixture-job', tourDate: DATE };
function fixture(external = 10) {
  const db = fakeDb(), calls = [];
  const binding = { approved: true, reconciled: true, calendarId: CONFIG.calendar.calendarId, eventId: 'fixtureevent01', tourDate: DATE, weekStart: WEEK, externalParticipants: external, adoptionCount: external, adoptionEtag: 'v0' };
  db.data.set(`calendarSessions/${DATE}`, binding);
  db.data.set(`bookingWeeks/${WEEK}`, { reconciled: true, externalParticipants: external, currentRegistrations: external, confirmedParticipants: external, heldParticipants: 0 });
  db.data.set(`calendarAvailability/${WEEK}`, buildCalendarWeekSnapshots([], { policy: POLICY, fromDate: WEEK, toDate: '2026-11-15', complete: true, nowMs: NOW })[WEEK]);
  let event = { id: binding.eventId, etag: 'v0', summary: `${external} אנשים`, description: 'PRIVATE DETAILS', start: { date: DATE }, end: { date: '2026-11-13' }, transparency: 'transparent', extendedProperties: { private: { existingKey: 'retain' } } };
  let version = 0, loseResponse = false, conflict = null;
  const fetchImpl = async (url, options) => {
    calls.push({ url, ...options, payload: options.body ? JSON.parse(options.body) : undefined });
    if (options.method === 'GET') return { ok: true, status: 200, json: async () => structuredClone(event) };
    assert.equal(options.method, 'PATCH');
    if (conflict) { const action = conflict; conflict = null; action(); return { ok: false, status: 412, json: async () => ({}) }; }
    if (options.headers['If-Match'] !== event.etag) return { ok: false, status: 412, json: async () => ({}) };
    const body = JSON.parse(options.body);
    event = { ...event, ...body, extendedProperties: { ...event.extendedProperties, ...body.extendedProperties }, etag: `v${++version}` };
    if (loseResponse) { loseResponse = false; throw new Error('upstream PRIVATE TOKEN'); }
    return { ok: true, status: 200, json: async () => structuredClone(event) };
  };
  const adapters = createIntegrationAdapters({ db, config: CONFIG, now: () => NOW, fetchImpl, getAccessToken: async () => 'fixture-token' });
  return { db, binding, calls, adapters, service: createBookingService(db, Timestamp, { weeklyPolicy: POLICY }), event: () => event, setEvent: patch => { event = { ...event, ...patch }; }, lose: () => { loseResponse = true; }, conflict: action => { conflict = action; } };
}
const input = method => ({ name: 'Fixture', phone: '0501234567', email: 'fixture@example.test', participants: 2, tourDate: DATE, paymentMethod: method, dateOfBirth: '1990-01-01', agreeToTerms: true });
test('existing all-day event reflects external baseline plus website seats once and retains unrelated fields', async () => {
  const f = fixture(27);
  await f.service.create('owner', 'a'.repeat(32), input('bit'), NOW);
  await f.adapters.calendar(JOB);
  assert.equal(f.event().summary, '29 אנשים');
  assert.equal(f.event().description, 'PRIVATE DETAILS'); assert.equal(f.event().start.date, DATE);
  assert.equal(f.event().transparency, 'transparent'); assert.equal(f.event().extendedProperties.private.existingKey, 'retain');
  const patch = f.calls.find(c => c.method === 'PATCH');
  assert.deepEqual(Object.keys(patch.payload).sort(), ['extendedProperties', 'summary']);
  assert.match(patch.url, /sendUpdates=none$/); assert.equal(patch.headers['If-Match'], 'v0');
  assert.doesNotMatch(JSON.stringify(patch.payload), /PRIVATE|email|attendees/);
  const normalized = await normalizeManagedCount(f.db, f.event(), CONFIG.calendar.calendarId);
  assert.equal(normalized.summary, '27 אנשים'); // 29 already contains the site's 2
  await f.adapters.calendar({ ...JOB, revision: 2 });
  assert.equal(f.calls.filter(c => c.method === 'PATCH').length, 1);
});
test('credit hold queues calendar immediately; cancel/expiry retries update the same event and release once', async () => {
  const f = fixture();
  const b = await f.service.create('owner', 'a'.repeat(32), input('credit'), NOW);
  assert.ok(f.db.data.has(`integrationJobs/${b.bookingId}-1-calendar`));
  assert.ok(!f.db.data.has(`integrationJobs/${b.bookingId}-1-email`));
  await f.adapters.calendar(JOB); assert.equal(f.event().summary, '12 אנשים');
  await f.service.change(b.bookingId, 'expire', 'fixture-expiry', null, NOW + 900001);
  await f.service.change(b.bookingId, 'expire', 'fixture-expiry', null, NOW + 900002);
  await f.adapters.calendar(JOB); assert.equal(f.event().summary, '10 אנשים');
  const receipt = { verified: true, bookingId: b.bookingId, amount: 500, currency: 'ILS', transactionKey: 'fixture:late' };
  await f.service.change(b.bookingId, 'paid', 'fixture-provider', receipt, NOW + 900003);
  await f.adapters.calendar(JOB); assert.equal(f.event().summary, '10 אנשים');
  const pending = await f.service.create('owner', 'b'.repeat(32), input('bit'), NOW);
  await f.service.change(pending.bookingId, 'confirm', 'fixture-admin', null, NOW);
  await f.adapters.calendar(JOB); assert.equal(f.event().summary, '12 אנשים');
  await f.service.change(pending.bookingId, 'cancel', 'fixture-admin', null, NOW);
  await f.service.change(pending.bookingId, 'cancel', 'fixture-admin', null, NOW);
  await f.adapters.calendar(JOB); assert.equal(f.event().summary, '10 אנשים');
  assert.equal(new Set(f.calls.map(c => c.url.split('?')[0])).size, 1);
});
test('lost PATCH acknowledgement is recovered from persisted intent with no second PATCH or event insert', async () => {
  const f = fixture(); await f.service.create('owner', 'a'.repeat(32), input('bit'), NOW); f.lose();
  await assert.rejects(f.adapters.calendar(JOB), /provider-request-uncertain/);
  assert.deepEqual(await f.adapters.calendar(JOB), { providerId: f.binding.eventId });
  assert.equal(f.calls.filter(c => c.method === 'PATCH').length, 1);
  assert.ok(f.calls.every(c => ['GET', 'PATCH'].includes(c.method)));
});
test('ETag conflict rereads counter and retries with latest state; manual title edits require reconciliation', async () => {
  const f = fixture(); const booking = await f.service.create('owner', 'a'.repeat(32), input('bit'), NOW);
  f.conflict(() => {
    f.db.data.set(`bookings/${booking.bookingId}`, { ...f.db.data.get(`bookings/${booking.bookingId}`), participants: 3 });
    const c = f.db.data.get(`bookingWeeks/${WEEK}`); f.db.data.set(`bookingWeeks/${WEEK}`, { ...c, heldParticipants: 3, currentRegistrations: 13 });
  });
  await f.adapters.calendar(JOB);
  assert.deepEqual(f.calls.filter(c => c.method === 'PATCH').map(c => c.payload.summary), ['12 אנשים', '13 אנשים']);
  f.setEvent({ etag: 'human-change', summary: '30 אנשים' });
  await assert.rejects(f.adapters.calendar(JOB), /calendar-count-requires-reconciliation/);
  await assert.rejects(normalizeManagedCount(f.db, f.event(), CONFIG.calendar.calendarId), /calendar-count-requires-reconciliation/);
});
test('unmapped, moved, private-tour, attendee or counter conflicts cannot write or create', async () => {
  for (const patch of [{ summary: 'סיור פרטי' }, { start: { date: '2026-11-11' } }, { attendees: [{ email: 'private@example.test' }] }, { status: 'cancelled' }, { recurringEventId: 'series' }]) {
    const f = fixture(); f.setEvent(patch);
    await assert.rejects(f.adapters.calendar(JOB)); assert.ok(f.calls.every(c => c.method === 'GET'));
  }
  const f = fixture(); f.db.data.delete(`calendarSessions/${DATE}`);
  await assert.rejects(f.adapters.calendar(JOB), /calendar-binding-unverified/); assert.equal(f.calls.length, 0);
  const g = fixture(); g.db.data.get(`bookingWeeks/${WEEK}`).currentRegistrations = 20;
  await assert.rejects(g.adapters.calendar(JOB), /calendar-count-requires-reconciliation/); assert.equal(g.calls.length, 1);
});
test('expired holds are omitted from mirror aggregates but mapped counter sync waits for atomic release', async () => {
  const f = fixture(); const b = await f.service.create('owner', 'a'.repeat(32), input('credit'), NOW);
  f.db.data.get(`bookings/${b.bookingId}`).holdExpiresAt = Timestamp.fromMillis(NOW - 1);
  await assert.rejects(f.adapters.calendar(JOB), e => !e.blocked && e.message === 'calendar-hold-expiry-pending');
  assert.deepEqual(summarizeBookings([...f.db.data.values()].filter(v => v.schemaVersion), NOW), { confirmed: 0, held: 0, expiredHolds: 2 });
});
test('concurrent calendar workers deliver the same binding; persisted jobs retain sanitized failures', async () => {
  const f = fixture(); await f.service.create('owner', 'a'.repeat(32), input('bit'), NOW);
  await Promise.all([f.adapters.calendar(JOB), f.adapters.calendar(JOB)]);
  assert.equal(f.event().summary, '12 אנשים'); assert.ok(f.calls.every(c => ['GET', 'PATCH'].includes(c.method)));
  f.setEvent({ summary: '30 אנשים' });
  const ref = f.db.doc(`integrationJobs/${JOB.bookingId}-1-calendar`);
  f.db.data.set(ref.path, { ...JOB, kind: 'calendar', status: 'pending', attempts: 0, nextAttemptAt: Timestamp.fromMillis(NOW) });
  await createJobRunner(f.db, Timestamp, f.adapters).run(ref, NOW);
  assert.equal(f.db.data.get(ref.path).status, 'blocked');
  assert.equal(f.db.data.get(ref.path).lastError, 'calendar-count-requires-reconciliation');
});
test('missing mapped event never falls back to an insert, including deletion during PATCH', async () => {
  for (const missingAt of ['GET', 'PATCH']) {
    const f = fixture(); const calls = [];
    const adapters = createIntegrationAdapters({ db: f.db, config: CONFIG, now: () => NOW, getAccessToken: async () => 'fixture', fetchImpl: async (url, options) => {
      calls.push(options.method); return options.method === missingAt ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, status: 200, json: async () => f.event() };
    } });
    await assert.rejects(adapters.calendar(JOB), /calendar-bound-event-missing/);
    assert.deepEqual(calls, missingAt === 'GET' ? ['GET'] : ['GET', 'PATCH']);
  }
});
