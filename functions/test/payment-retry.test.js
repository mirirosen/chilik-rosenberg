'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createBookingService } = require('../src/booking-service');
const { createPaymentFlow } = require('../src/payment-flow');
const NOW = Date.parse('2026-10-01T10:00:00Z');
const KEY = 'a'.repeat(32);
const declinedRow = () => Object.assign(new Error('provider-verification-pending'), { code: 'provider-verification-pending', declined: true });
const input = { name: 'Test', phone: '0501234567', email: 'a@example.com', participants: 2, tourDate: '2026-10-08', paymentMethod: 'credit', agreeToTerms: true, adultConfirmed: true };

function setup(extra = {}) {
  const db = fakeDb(), bookings = createBookingService(db, Timestamp);
  let now = NOW, calls = 0;
  // The verified order lookup is on by default and finds nothing; tests override it.
  const provider = { assertReady() {}, assertLookupReady() {}, async findTransactionIndexes() { return { complete: true, transactionIndexes: [] }; }, async createCheckout() { calls++; return { paymentUrl: `https://directng.tranzila.com/t/?attempt=${calls}`, paymentTerminal: 'term' }; }, ...extra };
  const flow = createPaymentFlow({ db, bookings, Timestamp, provider, urlsFor: () => ({}), clock: () => now });
  const booking = id => db.data.get(bookings.bookingRef(id).path);
  return { db, bookings, flow, booking, advance: ms => { now += ms; }, calls: () => calls };
}

test('declined card: owner gets a fresh checkout for the same booking immediately, window restarts, no seat held', async () => {
  const s = setup();
  const first = await s.flow.create('u', KEY, input);
  s.advance(5 * 60000);
  const retried = await s.flow.retry('u', first.bookingId);
  assert.equal(retried.bookingId, first.bookingId);
  assert.equal(retried.retried, true);
  assert.notEqual(retried.paymentUrl, first.paymentUrl);
  const saved = s.booking(first.bookingId);
  assert.equal(saved.paymentUrl, retried.paymentUrl);
  assert.equal(saved.status, 'payment_pending'); assert.equal(saved.paymentStatus, 'awaiting_payment');
  assert.equal(saved.capacityReserved, false); assert.equal(saved.paymentRetries, 1);
  assert.equal(saved.holdExpiresAt.toMillis(), NOW + 5 * 60000 + 15 * 60000);
  assert.equal(saved.initiationLease, null);
  assert.equal(s.db.data.get(s.bookings.tourRef(input.tourDate).path)?.currentRegistrations ?? 0, 0);
  assert.equal([...s.db.data.keys()].filter(k => k.startsWith('bookings/')).length, 1);
});

test('retry is refused for other users, closed/expired/paid bookings and after the retry limit', async () => {
  const s = setup();
  const { bookingId } = await s.flow.create('u', KEY, input);
  await assert.rejects(s.flow.retry('intruder', bookingId), /not-found/);
  await assert.rejects(s.flow.retry('u', 'BK-nothex'), /invalid-booking-reference/);
  for (let i = 0; i < 5; i++) await s.flow.retry('u', bookingId);
  await assert.rejects(s.flow.retry('u', bookingId), /payment-retry-limit/);
  const t = setup();
  const other = await t.flow.create('u', KEY, input);
  t.advance(16 * 60000);
  await assert.rejects(t.flow.retry('u', other.bookingId), /booking-closed/);
  const p = setup({ async verifyTransaction({ booking }) { return { verified: true, bookingId: booking.bookingId, transactionKey: 'term:7', amount: 500, currency: 'ILS', event: 'paid' }; } });
  const paid = await p.flow.create('u', KEY, input);
  await p.flow.notify({ bookingId: paid.bookingId, transactionIndex: 7 });
  await assert.rejects(p.flow.retry('u', paid.bookingId), /booking-closed/);
  assert.equal(p.calls(), 1);
});

test('a verified capture found by the order lookup is applied instead of opening another checkout', async () => {
  const s = setup({
    async findTransactionIndexes() { return { complete: true, transactionIndexes: [3, 4] }; },
    async verifyTransaction({ booking, transactionIndex }) {
      if (transactionIndex === 3) throw declinedRow(); // the declined attempt
      return { verified: true, bookingId: booking.bookingId, transactionKey: `term:${transactionIndex}`, amount: 500, currency: 'ILS', event: 'paid' };
    },
  });
  const { bookingId } = await s.flow.create('u', KEY, input);
  const result = await s.flow.retry('u', bookingId);
  assert.equal(result.paymentUrl, undefined);
  assert.equal(result.paymentStatus, 'paid');
  assert.equal(result.applied, true);
  assert.equal(s.calls(), 1);
  assert.equal(s.booking(bookingId).status, 'confirmed');
});

test('only a positively declined row allows the retry; every unverifiable state refuses it', async () => {
  const declined = setup({ async findTransactionIndexes() { return { complete: true, transactionIndexes: [3] }; }, async verifyTransaction() { throw declinedRow(); } });
  const a = await declined.flow.create('u', KEY, input);
  const ok = await declined.flow.retry('u', a.bookingId);
  assert.equal(ok.retried, true); assert.equal(ok.applied, undefined);
  const unavailable = () => Object.assign(new Error('payment-provider-unavailable'), { code: 'payment-provider-unavailable' });
  const refusals = {
    'lookup not configured': { assertLookupReady: undefined },
    'lookup not verified': { assertLookupReady() { throw new Error('payment-order-lookup-not-configured'); } },
    'no lookup method': { findTransactionIndexes: undefined },
    'lookup fails': { async findTransactionIndexes() { throw new Error('provider-lookup-incomplete'); } },
    'row transport timeout': { async findTransactionIndexes() { return { complete: true, transactionIndexes: [3, 4] }; }, async verifyTransaction({ transactionIndex }) { if (transactionIndex === 3) throw declinedRow(); throw unavailable(); } },
    'row report error': { async findTransactionIndexes() { return { complete: true, transactionIndexes: [4] }; }, async verifyTransaction() { throw Object.assign(new Error('provider-verification-pending'), { code: 'provider-verification-pending' }); } },
    'row not a verified capture': { async findTransactionIndexes() { return { complete: true, transactionIndexes: [4] }; }, async verifyTransaction() { return { verified: false }; } },
  };
  for (const [name, extra] of Object.entries(refusals)) {
    const s = setup(extra);
    const { bookingId } = await s.flow.create('u', KEY, input);
    await assert.rejects(s.flow.retry('u', bookingId), e => e.message === 'payment-verification-pending' && e.status === 503, name);
    assert.equal(s.calls(), 1, name);
    assert.equal(s.booking(bookingId).paymentRetries, undefined, name);
    assert.equal(s.booking(bookingId).initiationLease, null, name);
  }
  const unbound = setup({ async createCheckout() { return { paymentUrl: 'https://directng.tranzila.com/t/?x' }; } });
  const u = await unbound.flow.create('u', KEY, input);
  await assert.rejects(unbound.flow.retry('u', u.bookingId), /payment-verification-pending/);
});

test('a failed retry handshake keeps the existing checkout and booking open', async () => {
  let fail = false;
  const s = setup({ async createCheckout() { if (fail) throw new Error('payment-provider-unavailable'); return { paymentUrl: 'https://directng.tranzila.com/t/?first', paymentTerminal: 'term' }; } });
  const { bookingId } = await s.flow.create('u', KEY, input);
  fail = true;
  await assert.rejects(s.flow.retry('u', bookingId), /payment-provider-unavailable/);
  const saved = s.booking(bookingId);
  assert.equal(saved.paymentUrl, 'https://directng.tranzila.com/t/?first');
  assert.equal(saved.status, 'payment_pending'); assert.equal(saved.paymentStatus, 'awaiting_payment');
  assert.equal(saved.initiationLease, null);
  fail = false;
  assert.equal((await s.flow.retry('u', bookingId)).retried, true);
});

test('a webhook capture after the retry still confirms the booking exactly once', async () => {
  const s = setup({ async verifyTransaction({ booking, transactionIndex }) { return { verified: true, bookingId: booking.bookingId, transactionKey: `term:${transactionIndex}`, amount: 500, currency: 'ILS', event: 'paid' }; } });
  const { bookingId } = await s.flow.create('u', KEY, input);
  await s.flow.retry('u', bookingId);
  const paid = await s.flow.notify({ bookingId, transactionIndex: 9 });
  assert.equal(paid.status, 'confirmed'); assert.equal(paid.paymentStatus, 'paid');
  // A second capture (e.g. the old checkout page was also paid) is routed to review, never lost.
  const second = await s.flow.notify({ bookingId, transactionIndex: 10 });
  assert.equal(second.additionalPaymentReview, true);
});
