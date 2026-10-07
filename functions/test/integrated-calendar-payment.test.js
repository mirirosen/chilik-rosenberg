'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fixture, INPUT, KEY, NOW, CONFIG } = require('./helpers/offline-system');
const { Timestamp } = require('./helpers/fake-db');
const { APPROVED_WEEK_POLICY, buildCalendarWeekSnapshots } = require('../src/weekly-availability');
const { publicAvailability, createCalendarApi } = require('../src/calendar-api');
const { createTranzilaAdapter } = require('../src/providers/tranzila');
const { createPaymentReconciler } = require('../src/payment-reconciliation');
const { createReturnUrls } = require('../src/payment-runtime');
const POLICY = { ...APPROVED_WEEK_POLICY, enabled: true }, WEEK = '2026-10-04';
const SETTINGS = 'artifacts/hilik-rosenberg-v1/public/data/settings/global';
function setup(events = []) {
  const f = fixture({ weeklyPolicy: POLICY });
  f.db.data.set(SETTINGS, { globalMaxParticipants: 30 });
  f.db.data.set(`bookingWeeks/${WEEK}`, { reconciled: true, currentRegistrations: 0, confirmedParticipants: 0, heldParticipants: 0 });
  f.db.data.set(`calendarAvailability/${WEEK}`, buildCalendarWeekSnapshots(events, { policy: POLICY, fromDate: WEEK, toDate: '2026-10-18', complete: true, nowMs: NOW })[WEEK]);
  return { ...f, week: () => f.db.data.get(`bookingWeeks/${WEEK}`), availability: async () => (await publicAvailability(f.db, POLICY, NOW)).publicAvailability[INPUT.tourDate] };
}
test('weekly public quota follows checkout hold, verified capture, cancellation and retries exactly once', async () => {
  const f = setup(); assert.equal((await f.availability()).availableSpots, 30);
  const first = await f.call('createPayment', { body: INPUT }); assert.equal(first.statusCode, 201);
  const id = first.body.bookingId;
  assert.equal((await f.availability()).availableSpots, 28); assert.equal(f.week().heldParticipants, 2); assert.equal(f.jobsCount(), 1);
  const retry = await f.call('createPayment', { body: INPUT }); assert.equal(retry.body.bookingId, id); assert.equal(f.jobsCount(), 1);
  assert.equal([...f.db.data.keys()].filter(k => k.startsWith('paymentReconciliation/')).length, 1);
  const notification = [...f.db.data.entries()].filter(([k]) => k.startsWith('whatsappOutbox/'));
  assert.equal(notification.length, 0); // Pending payment has no WhatsApp notification.
  assert.equal((await f.call('paymentStatus', { method: 'GET', query: { id, payment: 'success' } })).body.paymentStatus, 'awaiting_payment');
  f.record(id); await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } });
  assert.equal(f.week().heldParticipants, 0); assert.equal(f.week().confirmedParticipants, 2); assert.equal((await f.availability()).availableSpots, 28); assert.equal(f.jobsCount(), 4);
  await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } }); assert.equal(f.jobsCount(), 4);
  await f.call('updateBookingStatus', { token: 'admin', body: { bookingId: id, status: 'cancelled' } });
  assert.equal((await f.availability()).availableSpots, 30); assert.equal(f.week().currentRegistrations, 0); assert.equal(f.booking(id).refundStatus, 'manual_review_required');
  const jobs = f.jobsCount(); await f.call('updateBookingStatus', { token: 'admin', body: { bookingId: id, status: 'cancelled' } }); assert.equal(f.jobsCount(), jobs);
});
test('private event blocks the whole Jerusalem week before checkout without exposing its contents', async () => {
  const f = setup([{ summary: 'סיור פרטי Private Fixture', transparency: 'transparent', start: { date: '2026-10-06' }, end: { date: '2026-10-07' } }]);
  const row = await f.availability(); assert.equal(row.availableSpots, 0); assert.equal(row.available, false);
  assert.doesNotMatch(JSON.stringify(row), /Private|Fixture|summary|blocked|event/);
  const result = await f.call('createPayment', { body: INPUT }); assert.equal(result.statusCode, 409); assert.equal(result.body.error, 'tour-unavailable');
  assert.equal(f.requests.length, 0); assert.equal(f.week().currentRegistrations, 0); assert.equal(f.jobsCount(), 0);
});
test('edited admin quota blocks new requests while the original idempotent hold remains reusable', async () => {
  const f = setup(), first = await f.call('createPayment', { body: INPUT });
  f.db.data.set(SETTINGS, { globalMaxParticipants: 2 });
  assert.equal((await f.availability()).availableSpots, 0);
  assert.equal((await f.call('createPayment', { body: INPUT, key: KEY })).body.bookingId, first.body.bookingId);
  const denied = await f.call('createPayment', { body: { ...INPUT, participants: 1 }, key: 'd'.repeat(32) });
  assert.equal(denied.statusCode, 409); assert.equal(f.week().currentRegistrations, 2); assert.equal(f.requests.length, 1);
});
test('lost callback recovery converts the same weekly hold and cannot duplicate Calendar or notification work', async () => {
  const f = setup(), first = await f.call('createPayment', { body: INPUT }), id = first.body.bookingId;
  let clock = NOW;
  const row = { index: 42, authorization_number: 147934, amount: 500, currency: '1', processor_response_code: '000', child_terminal: CONFIG.terminal, user_defined_3: id, txn_type: 'FIXTURE_CAPTURE', tranmode: 'FIXTURE_MODE', transtatus: 1, txn_payment_method: 'CC', cancelfdid: null, cancelfdnumber: null };
  const provider = createTranzilaAdapter({ config: { ...CONFIG, orderLookupVerified: true, orderFilterParameter: 'order_id' }, clock: () => clock, fetchImpl: async () => ({ ok: true, json: async () => ({ transactions: [row], total: 1, rows: 1 }) }) });
  const runner = createPaymentReconciler({ db: f.db, bookings: f.bookings, Timestamp, provider, isEnabled: () => true, clock: () => clock });
  await runner.runDue(); assert.equal(f.booking(id).paymentStatus, 'paid'); assert.equal(f.week().confirmedParticipants, 2); assert.equal(f.week().heldParticipants, 0); assert.equal(f.jobsCount(), 4);
  clock += 3 * 60000; f.advance(3 * 60000); await runner.runDue();
  assert.equal(f.week().currentRegistrations, 2); assert.equal(f.jobsCount(), 4); assert.equal([...f.db.data.values()].filter(j => j.kind === 'whatsapp').length, 1);
});
test('confirmed target origin passes both HTTP boundaries and exact project-bound return URLs', async () => {
  const id = 'BK-' + 'a'.repeat(24), origin = 'https://livechilik-tours.com';
  const urls = createReturnUrls({ siteOrigin: origin, apiBase: 'https://us-central1-hilik-site.cloudfunctions.net', projectId: 'hilik-site' })(id);
  assert.equal(new URL(urls.success).origin, origin); assert.equal(new URL(urls.notify).hostname, 'us-central1-hilik-site.cloudfunctions.net');
  const f = setup();
  const api = createCalendarApi({ db: f.db, runtime: { publicEnabled: true, readsEnabled: false, policy: POLICY }, now: () => NOW, onRequest: (_o, fn) => fn });
  const res = { status(n) { this.code = n; return this; }, set() { return this; }, json(data) { this.body = data; return this; } };
  await api.calendarAvailability({ method: 'GET', get: () => origin }, res); assert.equal(res.code, 200);
  const bookingRes = { ...res, code: undefined, body: undefined };
  await f.api.paymentStatus({ method: 'GET', query: { id }, get: name => name === 'origin' ? origin : name === 'authorization' ? 'Bearer owner' : undefined }, bookingRes);
  assert.equal(bookingRes.code, 404);
});
