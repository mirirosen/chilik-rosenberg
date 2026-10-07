'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createBookingService } = require('../src/booking-service');
const { validateBooking } = require('../src/booking-core');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const NOW = Date.parse('2026-10-01T10:00:00Z');
const input = { name: 'Test', phone: '0501234567', email: 'a@example.com', participants: 2, tourDate: '2026-10-08', paymentMethod: 'bit', dateOfBirth: '1990-01-01', agreeToTerms: true };
const key = 'a'.repeat(32);
function setup() { const db = fakeDb(), service = createBookingService(db, Timestamp); return { db, service }; }
test('two requests for final seats: only one succeeds and exactly one job pair created', async () => {
  const { db, service } = setup(); db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 2 });
  const outcomes = await Promise.allSettled([service.create('one', key, input, NOW), service.create('two', key, input, NOW)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  assert.equal(db.data.get(service.tourRef(input.tourDate).path).currentRegistrations, 2);
  assert.equal([...db.data.keys()].filter(k => k.startsWith('integrationJobs/')).length, 2);
});
test('same request retry reuses booking; altered payload and closed retry rejected', async () => {
  const { service } = setup(); const b = await service.create('u', key, input, NOW);
  assert.equal((await service.create('u', key, input, NOW)).bookingId, b.bookingId);
  await assert.rejects(service.create('u', key, { ...input, name: 'Changed' }, NOW), /idempotency-conflict/);
  await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  await assert.rejects(service.create('u', key, input, NOW), /booking-closed/);
});
test('confirmation consumes no extra seats; cancellation releases exactly once', async () => {
  const { db, service } = setup(); const b = await service.create('u', key, input, NOW);
  await service.change(b.bookingId, 'confirm', 'admin', null, NOW);
  await service.change(b.bookingId, 'confirm', 'admin', null, NOW);
  assert.equal(db.data.get(service.tourRef(input.tourDate).path).currentRegistrations, 2);
  await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  assert.equal(db.data.get(service.tourRef(input.tourDate).path).currentRegistrations, 0);
});
test('cancelling pending noncredit releases seats', async () => {
  const { db, service } = setup(); const b = await service.create('u', key, input, NOW);
  await service.change(b.bookingId, 'cancel', 'admin', null, NOW);
  assert.equal(db.data.get(service.tourRef(input.tourDate).path).currentRegistrations, 0);
});
test('credit expiry is time checked and late success enters review without overselling', async () => {
  const { db, service } = setup(); const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  await service.change(b.bookingId, 'expire', 'system', null, NOW);
  assert.equal(db.data.get(service.tourRef(input.tourDate).path).currentRegistrations, 2);
  await service.change(b.bookingId, 'expire', 'system', null, NOW + 16 * 60000);
  await service.change(b.bookingId, 'expire', 'system', null, NOW + 16 * 60000);
  const result = await service.change(b.bookingId, 'paid', 'provider', { verified: true, bookingId: b.bookingId, transactionKey: 'terminal:1', amount: 500, currency: 'ILS' }, NOW + 17 * 60000);
  assert.equal(result.paymentStatus, 'pending_review'); assert.equal(result.capacityReserved, false);
  assert.equal(db.data.get(service.tourRef(input.tourDate).path).currentRegistrations, 0);
});
test('verified decline releases once; unverified decline cannot mutate', async () => {
  const { db, service } = setup(); const b = await service.create('u', key, { ...input, paymentMethod: 'credit' }, NOW);
  await assert.rejects(service.change(b.bookingId, 'decline', 'public', null, NOW), /unverified-provider-event/);
  const receipt = { verified: true, bookingId: b.bookingId, transactionKey: 't:1', amount: 500, currency: 'ILS' };
  await service.change(b.bookingId, 'decline', 'provider', receipt, NOW);
  await service.change(b.bookingId, 'decline', 'provider', receipt, NOW);
  assert.equal(db.data.get(service.tourRef(input.tourDate).path).currentRegistrations, 0);
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
