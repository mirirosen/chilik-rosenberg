'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fixture, INPUT, KEY, NOW, CONFIG } = require('./helpers/offline-system');

test('offline HTTP checkout -> report verification -> refresh -> duplicate -> admin cancel lifecycle', async () => {
  const f = fixture();
  const created = await f.call('createPayment', { body: { ...INPUT, totalPrice: 1 } });
  assert.equal(created.statusCode, 201); const id = created.body.bookingId;
  const checkout = new URL(created.body.paymentUrl);
  assert.equal(checkout.searchParams.get('sum'), '500.00'); assert.equal(checkout.searchParams.get('order_id'), id);
  for (const privateValue of [CONFIG.secret, CONFIG.appKey, INPUT.email, INPUT.phone, INPUT.dateOfBirth]) assert.ok(!created.body.paymentUrl.includes(privateValue));
  assert.equal(f.seats(), 2); assert.equal(f.jobsCount(), 1); // calendar mirrors the credit hold
  const retry = await f.call('createPayment', { body: { ...INPUT, totalPrice: 1 } });
  assert.equal(retry.statusCode, 200); assert.equal(retry.body.paymentUrl, created.body.paymentUrl);
  assert.equal(f.requests.filter(r => r.url.includes('handshake')).length, 1);
  const before = await f.call('paymentStatus', { method: 'GET', query: { id, payment: 'success' } });
  assert.equal(before.body.paymentStatus, 'awaiting_payment');
  const forged = await f.call('tranzilaWebhook', { body: { index: '99', Response: '000', sum: 500, paymentNonce: 'public' }, query: { id } });
  assert.equal(forged.statusCode, 503); assert.equal(f.booking(id).paymentStatus, 'awaiting_payment');
  f.record(id);
  const paid = await f.call('tranzilaWebhook', { token: null, body: { index: '42', Response: '001', sum: 1 }, query: { id } });
  assert.equal(paid.statusCode, 200); assert.equal(paid.body.paymentStatus, 'paid'); assert.equal(f.jobsCount(), 4);
  const revision = f.booking(id).revision;
  await f.call('tranzilaWebhook', { token: null, body: { index: 42 }, query: { id } });
  assert.equal(f.booking(id).revision, revision); assert.equal(f.seats(), 2); assert.equal(f.jobsCount(), 4);
  assert.equal((await f.call('paymentStatus', { method: 'GET', token: 'other', query: { id } })).statusCode, 404);
  const refresh = await f.call('paymentStatus', { method: 'GET', query: { id } });
  assert.equal(refresh.body.status, 'confirmed'); assert.equal(refresh.body.paymentStatus, 'paid');
  const cancel = await f.call('updateBookingStatus', { token: 'admin', body: { bookingId: id, status: 'cancelled' } });
  assert.equal(cancel.statusCode, 200); assert.equal(cancel.body.paymentStatus, 'paid'); assert.equal(cancel.body.refundStatus, 'manual_review_required');
  assert.equal(f.seats(), 0); assert.equal(f.jobsCount(), 6);
  await f.call('updateBookingStatus', { token: 'admin', body: { bookingId: id, status: 'cancelled' } });
  assert.equal(f.seats(), 0); assert.equal(f.jobsCount(), 6);
});
test('wrong provider bindings never confirm; expiry and late capture stay review-only with blocked outbox', async () => {
  const f = fixture(), result = await f.call('createBooking', { body: INPUT }), id = result.body.bookingId;
  for (const patch of [{ amount: 1 }, { currency: '2' }, { user_defined_3: 'other-order' }, { child_terminal: 'other-terminal' }, { processor_response_code: '001' }]) {
    f.record(id, 42, patch);
    assert.equal((await f.call('tranzilaWebhook', { query: { id }, body: { index: 42, Response: '000', sum: 500 } })).statusCode, 503);
    assert.equal(f.booking(id).paymentStatus, 'awaiting_payment'); assert.equal(f.seats(), 2);
  }
  f.advance(16 * 60000); await f.api.expirePaymentHolds();
  assert.equal(f.booking(id).paymentStatus, 'expired'); assert.equal(f.seats(), 0);
  f.record(id); await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } });
  assert.equal(f.booking(id).paymentStatus, 'pending_review'); assert.equal(f.seats(), 0);
  f.record(id, 43); await f.call('tranzilaWebhook', { query: { id }, body: { index: 43 } });
  const status = await f.call('paymentStatus', { method: 'GET', query: { id } });
  assert.equal(status.body.additionalPaymentReview, true); assert.equal(status.body.status, 'payment_review');
  for (const [path] of f.db.data) if (path.startsWith('integrationJobs/')) await f.jobs.run(f.db.doc(path), NOW + 17 * 60000);
  const jobs = [...f.db.data.entries()].filter(([path]) => path.startsWith('integrationJobs/')).map(([, data]) => data);
  assert.ok(jobs.length > 0); assert.ok(jobs.every(j => j.status === 'blocked'));
});
test('lost noncredit response can recover the same booking after consuming final seats', async () => {
  const f = fixture(); f.db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 2 });
  const first = await f.call('createBooking', { body: { ...INPUT, paymentMethod: 'bit' } });
  assert.equal(first.statusCode, 201); assert.equal(f.seats(), 2);
  const recovered = await f.call('createBooking', { body: { ...INPUT, paymentMethod: 'bit' } });
  assert.equal(recovered.statusCode, 200); assert.equal(recovered.body.bookingId, first.body.bookingId); assert.equal(f.seats(), 2);
  const other = await f.call('createBooking', { token: 'other', body: { ...INPUT, paymentMethod: 'bit' } });
  assert.equal(other.statusCode, 409); assert.equal(other.body.error, 'capacity-exceeded');
});
test('failed checkout releases hold once, hides upstream details and rejects reopening the key', async () => {
  const f = fixture(); f.failHandshake();
  const result = await f.call('createPayment', { body: INPUT });
  assert.equal(result.statusCode, 503); assert.deepEqual(result.body, { error: 'payment-provider-unavailable' });
  assert.ok(!JSON.stringify([result.body, f.logs]).includes('private-upstream-error')); assert.equal(f.seats(), 0);
  const retry = await f.call('createPayment', { body: INPUT });
  assert.equal(retry.statusCode, 409); assert.equal(retry.body.error, 'booking-closed'); assert.equal(f.seats(), 0);
});
