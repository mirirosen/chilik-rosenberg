'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createBookingService } = require('../src/booking-service');
const { createPaymentFlow } = require('../src/payment-flow');
const NOW = Date.parse('2026-10-01T10:00:00Z');
const input = { name: 'Test', phone: '0501234567', email: 'a@example.com', participants: 2, tourDate: '2026-10-08', dateOfBirth: '1990-01-01', agreeToTerms: true };
function setup(provider) { const db = fakeDb(), old = db.doc; db.doc = p => ({ ...old(p), async get() { const v = db.data.get(p); return { exists: !!v, data: () => v }; } }); const bookings = createBookingService(db, Timestamp); const flow = createPaymentFlow({ db, bookings, Timestamp, provider, urlsFor: id => ({ id }), clock: () => NOW }); return { db, bookings, flow }; }
test('unconfigured payment adapter does not create booking/hold', async () => {
  const { db, flow } = setup({ assertReady() { throw new Error('disabled'); } });
  await assert.rejects(flow.create('u', 'a'.repeat(32), input), /disabled/); assert.equal(db.data.size, 0);
});
test('concurrent initiation leases prevent multiple checkout URLs; retry reuses active URL', async () => {
  let calls = 0;
  const { db, flow } = setup({ assertReady() {}, async createCheckout() { calls++; return { paymentUrl: 'https://directng.tranzila.com/test/' }; } });
  const results = await Promise.allSettled([flow.create('u', 'a'.repeat(32), input), flow.create('u', 'a'.repeat(32), input)]);
  assert.ok(results.some(r => r.status === 'fulfilled')); assert.equal(calls, 1);
  const reused = await flow.create('u', 'a'.repeat(32), input); assert.equal(reused.reused, true);
  assert.equal([...db.data.keys()].filter(k => k.startsWith('bookings/')).length, 1);
});
test('handshake failure releases hold exactly once, closed key cannot reopen checkout', async () => {
  const { db, bookings, flow } = setup({ assertReady() {}, async createCheckout() { throw new Error('provider-unavailable'); } });
  await assert.rejects(flow.create('u', 'a'.repeat(32), input), /provider-unavailable/);
  assert.equal(db.data.get(bookings.tourRef(input.tourDate).path).currentRegistrations, 0);
  await assert.rejects(flow.create('u', 'a'.repeat(32), input), /booking-closed/);
});
test('notification uses only independent provider receipt, not browser approved/amount fields', async () => {
  let approved = false;
  const { flow, bookings } = setup({ assertReady() {}, async createCheckout() { return { paymentUrl: 'https://directng.tranzila.com/test/' }; }, async verifyTransaction({ booking }) { if (!approved) throw new Error('provider-verification-pending'); return { verified: true, bookingId: booking.bookingId, transactionKey: 't:1', amount: 500, currency: 'ILS', event: 'paid' }; } });
  const b = await flow.create('u', 'a'.repeat(32), input);
  await assert.rejects(flow.notify({ bookingId: b.bookingId, transactionIndex: 1, Response: '000', sum: 500 }), /verification-pending/);
  assert.equal((await bookings.bookingRef(b.bookingId).get()).data().paymentStatus, 'awaiting_payment');
  approved = true; const paid = await flow.notify({ bookingId: b.bookingId, transactionIndex: 1 }); assert.equal(paid.paymentStatus, 'paid');
});

test('stale initiator cannot cancel checkout issued under a newer lease', async () => {
  const db = fakeDb(), bookings = createBookingService(db, Timestamp);
  let now = NOW, calls = 0, resumeFirst, started;
  const firstStarted = new Promise(resolve => { started = resolve; });
  const provider = { assertReady() {}, async createCheckout() {
    calls++;
    if (calls === 1) { started(); await new Promise(resolve => { resumeFirst = resolve; }); }
    return { paymentUrl: `https://directng.tranzila.com/test/?attempt=${calls}` };
  } };
  const flow = createPaymentFlow({ db, bookings, Timestamp, provider, urlsFor: () => ({}), clock: () => now });
  const stale = flow.create('u', 'a'.repeat(32), input).catch(error => error);
  await firstStarted; now += 121000;
  const active = await flow.create('u', 'a'.repeat(32), input);
  resumeFirst(); assert.match((await stale).message, /booking-closed/);
  const saved = db.data.get(bookings.bookingRef(active.bookingId).path);
  assert.equal(saved.paymentStatus, 'awaiting_payment'); assert.equal(saved.capacityReserved, true);
  assert.equal(db.data.get(bookings.tourRef(input.tourDate).path).currentRegistrations, 2);
});
