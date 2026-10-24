'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createBookingService } = require('../src/booking-service');
const { validateBooking } = require('../src/booking-core');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const NOW = Date.parse('2026-10-01T10:00:00Z');
const input = { name: 'Test', phone: '0501234567', email: 'a@example.com', participants: 2, tourDate: '2026-10-08', paymentMethod: 'bit', dateOfBirth: '1990-01-01', agreeToTerms: true };
const key = 'a'.repeat(32);
function setup() { const db = fakeDb(), service = createBookingService(db, Timestamp); return { db, service }; }
const tourCount = (db, service) => db.data.get(service.tourRef(input.tourDate).path)?.currentRegistrations ?? 0;
// Booking reserved under the earlier hold-at-create flow (already counted).
function seedReserved(db, service, id, patch = {}) {
  const b = { ...validateBooking(input, new Date(NOW)), bookingId: id, ownerUid: 'legacy', schemaVersion: 2, capacityReserved: true, revision: 1, status: 'pending', paymentStatus: 'pending', holdExpiresAt: null, ...patch };
  db.data.set(service.bookingRef(id).path, b);
  const path = service.tourRef(input.tourDate).path;
  db.data.set(path, { ...db.data.get(path), currentRegistrations: tourCount(db, service) + b.participants });
  return b;
}
test('creating a booking never reserves seats for bank transfer, bit or card', async () => {
  const { db, service } = setup();
  for (const [i, paymentMethod] of ['bank_transfer', 'bit', 'credit'].entries()) {
    const b = await service.create(`u${i}`, key, { ...input, paymentMethod }, NOW);
    assert.equal(b.capacityReserved, false);
    assert.equal(db.data.get(service.bookingRef(b.bookingId).path).capacityReserved, false);
  }
  assert.equal(db.data.has(service.tourRef(input.tourDate).path), false);
  assert.equal([...db.data.keys()].filter(k => k.startsWith('bookingWeeks/')).length, 0);
  assert.equal([...db.data.keys()].filter(k => k.endsWith('-calendar')).length, 0);
});
test('creation still rejects a tour that is already full, without writing anything', async () => {
  const { db, service } = setup(); db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 2 });
  db.data.set(service.tourRef(input.tourDate).path, { currentRegistrations: 1 });
  await assert.rejects(service.create('u', key, input, NOW), /capacity-exceeded/);
  assert.equal([...db.data.keys()].filter(k => k.startsWith('bookings/')).length, 0);
});
test('two requests for the final seats are both accepted; only the first confirmation reserves', async () => {
  const { db, service } = setup(); db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 2 });
  const [one, two] = await Promise.all([service.create('one', key, input, NOW), service.create('two', key, input, NOW)]);
  assert.equal(tourCount(db, service), 0);
  assert.equal([...db.data.keys()].filter(k => k.startsWith('integrationJobs/')).length, 2);
  const outcomes = await Promise.allSettled([service.change(one.bookingId, 'confirm', 'admin', null, NOW), service.change(two.bookingId, 'confirm', 'admin', null, NOW)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(o => o.status === 'rejected').reason.code, 'capacity-full-at-confirmation');
  assert.equal(tourCount(db, service), 2);
  const loser = [one, two].find(b => db.data.get(service.bookingRef(b.bookingId).path).status !== 'confirmed');
  assert.equal(db.data.get(service.bookingRef(loser.bookingId).path).status, 'pending');
  assert.equal(db.data.get(service.bookingRef(loser.bookingId).path).capacityReserved, false);
});
test('same request retry reuses booking; altered payload and closed retry rejected', async () => {
  const { service } = setup(); const b = await service.create('u', key, input, NOW);
  assert.equal((await service.create('u', key, input, NOW)).bookingId, b.bookingId);
  await assert.rejects(service.create('u', key, { ...input, name: 'Changed' }, NOW), /idempotency-conflict/);
  await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  await assert.rejects(service.create('u', key, input, NOW), /booking-closed/);
});
test('admin confirmation reserves exactly once; cancellation releases exactly once', async () => {
  const { db, service } = setup(); const b = await service.create('u', key, input, NOW);
  const confirmed = await service.change(b.bookingId, 'confirm', 'admin', null, NOW);
  assert.equal(confirmed.capacityReserved, true);
  await service.change(b.bookingId, 'confirm', 'admin', null, NOW);
  assert.equal(tourCount(db, service), 2);
  await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  assert.equal(tourCount(db, service), 0);
});
test('admin confirmation on a full tour fails with a clear error and reserves nothing', async () => {
  const { db, service } = setup(); db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 3 });
  const b = await service.create('u', key, input, NOW);
  seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa5', { participants: 2, status: 'confirmed' });
  await assert.rejects(service.change(b.bookingId, 'confirm', 'admin', null, NOW), err => err.code === 'capacity-full-at-confirmation');
  assert.equal(tourCount(db, service), 2);
  const after = db.data.get(service.bookingRef(b.bookingId).path);
  assert.equal(after.status, 'pending'); assert.equal(after.capacityReserved, false); assert.equal(after.revision, 1);
});
test('cancelling an unreserved pending booking does not decrement counters', async () => {
  const { db, service } = setup();
  seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa7', { status: 'confirmed' });
  const b = await service.create('u', key, input, NOW);
  const cancelled = await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(tourCount(db, service), 2);
});
test('legacy reserved bookings keep working: confirm adds nothing, cancel releases once', async () => {
  const { db, service } = setup();
  seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa1');
  seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa2');
  assert.equal(tourCount(db, service), 4);
  await service.change('BK-aaaaaaaaaaaaaaaaaaaaaaa1', 'confirm', 'admin', null, NOW);
  assert.equal(tourCount(db, service), 4);
  await service.change('BK-aaaaaaaaaaaaaaaaaaaaaaa1', 'cancel', 'admin', null, NOW);
  await service.change('BK-aaaaaaaaaaaaaaaaaaaaaaa2', 'cancel', 'admin', null, NOW);
  await service.change('BK-aaaaaaaaaaaaaaaaaaaaaaa2', 'cancel', 'admin', null, NOW);
  assert.equal(tourCount(db, service), 0);
});
test('legacy reserved card hold: verified payment confirms without reserving again; expiry releases once', async () => {
  const { db, service } = setup();
  seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa3', { paymentMethod: 'credit', status: 'payment_pending', paymentStatus: 'awaiting_payment', holdExpiresAt: Timestamp.fromMillis(NOW + 15 * 60000) });
  seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa4', { paymentMethod: 'credit', status: 'payment_pending', paymentStatus: 'awaiting_payment', holdExpiresAt: Timestamp.fromMillis(NOW + 15 * 60000) });
  const paid = await service.change('BK-aaaaaaaaaaaaaaaaaaaaaaa3', 'paid', 'provider', { verified: true, bookingId: 'BK-aaaaaaaaaaaaaaaaaaaaaaa3', transactionKey: 't:legacy', amount: 500, currency: 'ILS' }, NOW);
  assert.equal(paid.status, 'confirmed'); assert.equal(tourCount(db, service), 4);
  await service.change('BK-aaaaaaaaaaaaaaaaaaaaaaa4', 'expire', 'system', null, NOW + 16 * 60000);
  await service.change('BK-aaaaaaaaaaaaaaaaaaaaaaa4', 'expire', 'system', null, NOW + 16 * 60000);
  assert.equal(tourCount(db, service), 2);
});
test('verified card payment reserves the seats inside the payment transaction', async () => {
  const { db, service } = setup(); const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  assert.equal(tourCount(db, service), 0);
  const paid = await service.change(b.bookingId, 'paid', 'provider', { verified: true, bookingId: b.bookingId, transactionKey: 't:1', amount: 500, currency: 'ILS' }, NOW + 60000);
  assert.equal(paid.status, 'confirmed'); assert.equal(paid.paymentStatus, 'paid'); assert.equal(paid.capacityReserved, true);
  assert.equal(tourCount(db, service), 2);
});
test('verified card payment for a full tour is kept as paid, sent to review and raises an admin notice', async () => {
  const { db, service } = setup(); db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 3 });
  const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa6', { participants: 2, status: 'confirmed' });
  const receipt = { verified: true, bookingId: b.bookingId, transactionKey: 't:full', amount: 500, currency: 'ILS' };
  const result = await service.change(b.bookingId, 'paid', 'provider', receipt, NOW + 60000);
  assert.equal(result.paymentStatus, 'paid'); assert.equal(result.status, 'payment_review');
  assert.equal(result.paymentReviewReason, 'overbooked-at-payment'); assert.equal(result.capacityReserved, false);
  assert.equal(result.capacityCheckCode, 'capacity-exceeded');
  assert.equal(tourCount(db, service), 2);
  const notices = [...db.data.entries()].filter(([k]) => k.startsWith('adminNotices/'));
  assert.equal(notices.length, 1);
  assert.equal(notices[0][1].type, 'overbooked-at-payment'); assert.equal(notices[0][1].bookingId, b.bookingId); assert.equal(notices[0][1].status, 'open');
  assert.equal(notices[0][1].email, undefined); assert.equal(notices[0][1].phone, undefined);
  assert.equal([...db.data.keys()].filter(k => k.startsWith('paymentWebhookDeliveries/')).length, 1);
  // The same verified callback again changes nothing and raises no second notice.
  await service.change(b.bookingId, 'paid', 'provider', receipt, NOW + 61000);
  assert.equal([...db.data.keys()].filter(k => k.startsWith('adminNotices/')).length, 1);
  // Still full: the admin cannot confirm it; once room exists the admin can.
  await assert.rejects(service.change(b.bookingId, 'confirm', 'admin', null, NOW + 62000), /capacity-full-at-confirmation/);
  await service.change('BK-aaaaaaaaaaaaaaaaaaaaaaa6', 'cancel', 'admin', null, NOW + 63000);
  const confirmed = await service.change(b.bookingId, 'confirm', 'admin', null, NOW + 64000);
  assert.equal(confirmed.status, 'confirmed'); assert.equal(confirmed.paymentStatus, 'paid'); assert.equal(confirmed.capacityReserved, true);
  assert.equal(confirmed.paymentReviewReason, null);
  assert.equal(tourCount(db, service), 2);
});
test('card checkout expiry is time checked, releases nothing and late success enters review', async () => {
  const { db, service } = setup(); seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa7', { status: 'confirmed' });
  const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  await service.change(b.bookingId, 'expire', 'system', null, NOW);
  assert.equal(db.data.get(service.bookingRef(b.bookingId).path).status, 'payment_pending');
  const expired = await service.change(b.bookingId, 'expire', 'system', null, NOW + 16 * 60000);
  assert.equal(expired.status, 'cancelled'); assert.equal(expired.paymentStatus, 'expired');
  await service.change(b.bookingId, 'expire', 'system', null, NOW + 16 * 60000);
  assert.equal(tourCount(db, service), 2);
  const result = await service.change(b.bookingId, 'paid', 'provider', { verified: true, bookingId: b.bookingId, transactionKey: 'terminal:1', amount: 500, currency: 'ILS' }, NOW + 17 * 60000);
  assert.equal(result.paymentStatus, 'pending_review'); assert.equal(result.capacityReserved, false);
  assert.equal(tourCount(db, service), 2);
});
test('verified decline closes once without touching counters; unverified decline cannot mutate', async () => {
  const { db, service } = setup(); seedReserved(db, service, 'BK-aaaaaaaaaaaaaaaaaaaaaaa7', { status: 'confirmed' });
  const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  await assert.rejects(service.change(b.bookingId, 'decline', 'public', null, NOW), /unverified-provider-event/);
  const receipt = { verified: true, bookingId: b.bookingId, transactionKey: 't:1', amount: 500, currency: 'ILS' };
  const declined = await service.change(b.bookingId, 'decline', 'provider', receipt, NOW);
  await service.change(b.bookingId, 'decline', 'provider', receipt, NOW);
  assert.equal(declined.paymentStatus, 'failed'); assert.equal(declined.status, 'cancelled');
  assert.equal(tourCount(db, service), 2);
});
test('provider transaction cannot pay two bookings; successful callback is idempotent', async () => {
  const { service } = setup(); const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  const c = await service.create('v', key, { ...input, paymentMethod: 'credit' }, NOW);
  const receipt = { verified: true, bookingId: b.bookingId, transactionKey: 't:1', amount: 500, currency: 'ILS' };
  await service.change(b.bookingId, 'paid', 'provider', receipt, NOW);
  assert.equal((await service.change(b.bookingId, 'paid', 'provider', receipt, NOW)).paymentStatus, 'paid');
  await assert.rejects(service.change(c.bookingId, 'paid', 'provider', { ...receipt, bookingId: c.bookingId }, NOW), /provider-transaction-reused/);
});
test('cancel paid booking releases seats but never implies refund', async () => {
  const { service } = setup(); const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  await service.change(b.bookingId, 'paid', 'provider', { verified: true, bookingId: b.bookingId, transactionKey: 't:1', amount: 500, currency: 'ILS' }, NOW);
  const cancelled = await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  assert.equal(cancelled.paymentStatus, 'paid'); assert.equal(cancelled.refundStatus, 'manual_review_required');
});
test('legacy capacity is never guessed', async () => {
  const { db, service } = setup(); db.data.set(service.bookingRef('legacy').path, { tourDate: input.tourDate, status: 'pending', participants: 2 });
  await assert.rejects(service.change('legacy', 'cancel', 'admin', null, NOW), /legacy-booking-requires-reconciliation/);
});
test('validates real future session date, adult age, terms and payment method', () => {
  for (const patch of [{ tourDate: '2026-99-99' }, { tourDate: '2026-10-09' }, { tourDate: '2026-09-24' }, { dateOfBirth: '2010-01-01' }, { agreeToTerms: false }, { paymentMethod: 'free' }]) assert.throws(() => validateBooking({ ...input, ...patch }, new Date(NOW)));
  assert.equal(validateBooking({ ...input, totalPrice: 1 }, new Date(NOW)).totalPrice, 500);
});

test('decline followed by verified capture of the same transaction is reviewed', async () => {
  const { service } = setup(); const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  const receipt = { verified: true, bookingId: b.bookingId, transactionKey: 't:late', amount: 500, currency: 'ILS' };
  await service.change(b.bookingId, 'decline', 'provider', receipt, NOW);
  const result = await service.change(b.bookingId, 'paid', 'provider', receipt, NOW + 1000);
  assert.equal(result.paymentStatus, 'pending_review'); assert.equal(result.capacityReserved, false);
});
test('second distinct captured payment is recorded and flagged, not fulfilled twice', async () => {
  const { db, service } = setup(); const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  const receipt = { verified: true, bookingId: b.bookingId, transactionKey: 't:1', amount: 500, currency: 'ILS' };
  await service.change(b.bookingId, 'paid', 'provider', receipt, NOW);
  const result = await service.change(b.bookingId, 'paid', 'provider', { ...receipt, transactionKey: 't:2' }, NOW);
  assert.equal(result.additionalPaymentReview, true); assert.equal(result.paymentStatus, 'paid');
  assert.equal([...db.data.keys()].filter(k => k.startsWith('paymentWebhookDeliveries/')).length, 2);
  assert.equal(db.data.get(service.tourRef(input.tourDate).path).currentRegistrations, 2);
});

test('same-day Thursday follows existing 20:00 cutoff in Jerusalem', () => {
  assert.equal(validateBooking({ ...input, tourDate: '2026-10-01' }, new Date(NOW)).tourDate, '2026-10-01');
  assert.throws(() => validateBooking({ ...input, tourDate: '2026-10-01' }, new Date('2026-10-01T18:00:00Z')), /invalid-date/);
});
test('additional captured transaction during pending review is recorded too', async () => {
  const { db, service } = setup(); const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  await service.change(b.bookingId, 'expire', 'system', null, NOW + 16 * 60000);
  const receipt = { verified: true, bookingId: b.bookingId, transactionKey: 't:1', amount: 500, currency: 'ILS' };
  await service.change(b.bookingId, 'paid', 'provider', receipt, NOW + 17 * 60000);
  const result = await service.change(b.bookingId, 'paid', 'provider', { ...receipt, transactionKey: 't:2' }, NOW + 18 * 60000);
  assert.equal(result.paymentStatus, 'pending_review'); assert.equal(result.additionalPaymentReview, true);
  assert.equal([...db.data.keys()].filter(k => k.startsWith('paymentWebhookDeliveries/')).length, 2);
});
test('malformed JSON types and oversized notes reject as validation errors', () => {
  for (const patch of [{ phone: 501234567 }, { participants: true }, { participants: [2] }, { notes: {} }, { notes: 'x'.repeat(1001) }]) assert.throws(() => validateBooking({ ...input, ...patch }, new Date(NOW)), /invalid-/);
});
