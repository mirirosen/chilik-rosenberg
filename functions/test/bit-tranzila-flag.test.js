'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { fixture, INPUT, NOW, CONFIG } = require('./helpers/offline-system');
const { Timestamp } = require('./helpers/fake-db');
const { createTranzilaAdapter } = require('../src/providers/tranzila');
const { createPaymentReconciler } = require('../src/payment-reconciliation');
const { loadPaymentConfiguration } = require('../src/payment-runtime');
const { bitConfigurationIssues } = require('../src/configuration-readiness');
const { transition } = require('../src/booking-core');

// Fixture Bit report labels: the real txn_payment_method/type/mode/status of a Tranzila
// Bit capture must be confirmed by the controlled 5 NIS test before the flag is turned on.
const BIT_PAIRS = [{ txnPaymentMethod: 'FIXTURE_BIT', txnType: 'FIXTURE_CAPTURE', tranmode: 'FIXTURE_MODE', transtatus: 1 }];
const BIT_ON = { ...CONFIG, bitEnabled: true, bitCapturePairs: BIT_PAIRS };
const BIT = { ...INPUT, paymentMethod: 'bit' };
const bookingDocs = f => [...f.db.data.keys()].filter(k => k.startsWith('bookings/'));
const handshakes = f => f.requests.filter(r => r.url.includes('handshake')).length;

test('flag off (default): backend rejects bit on both endpoints before creating anything', async () => {
  for (const paymentConfig of [CONFIG, { ...CONFIG, bitEnabled: false, bitCapturePairs: BIT_PAIRS }, { ...CONFIG, bitEnabled: true, bitCapturePairs: [] }]) {
    const f = fixture({ paymentConfig });
    for (const name of ['createPayment', 'createBooking']) {
      const result = await f.call(name, { body: BIT });
      assert.equal(result.statusCode, 409); assert.equal(result.body.error, 'invalid-payment-method');
    }
    assert.equal(bookingDocs(f).length, 0); assert.equal(handshakes(f), 0); assert.equal(f.seats(), 0); assert.equal(f.jobsCount(), 0);
  }
});

test('flag off: card checkout request and redirect URL are unchanged (no bit_pay)', async () => {
  const f = fixture();
  const created = await f.call('createPayment', { body: INPUT });
  assert.equal(created.statusCode, 201);
  const url = new URL(created.body.paymentUrl);
  assert.equal(url.searchParams.has('bit_pay'), false);
  assert.deepEqual([...url.searchParams.keys()].sort(), ['cred_type', 'currency', 'fail_url_address', 'lang', 'notify_url_address', 'order_id', 'success_url_address', 'sum', 'thtk', 'tranmode']);
  const b = f.booking(created.body.bookingId);
  assert.equal(b.paymentMethod, 'credit'); assert.equal(Object.hasOwn(b, 'paymentProvider'), false);
});

test('runtime flag defaults OFF; the live deployment settings keep it off; a bad Bit allowlist never blocks cards', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'booking-deployment-settings.json'), 'utf8'));
  assert.notEqual(settings.TRANZILA_BIT_ENABLED, 'true');
  assert.equal(settings.TRANZILA_BIT_CAPTURE_PAIRS_JSON, undefined);
  const env = { ...settings, GCLOUD_PROJECT: 'hilik-site' };
  delete env.TRANZILA_BIT_ENABLED;
  const secrets = () => 'fixture-secret-value';
  const off = loadPaymentConfiguration({ env, readSecret: secrets });
  assert.equal(off.config.bitEnabled, false);
  assert.deepEqual(bitConfigurationIssues(off.config), ['bit-disabled', 'bit-capture-semantics-unverified']);
  const broken = loadPaymentConfiguration({ env: { ...env, TRANZILA_BIT_ENABLED: 'true', TRANZILA_BIT_CAPTURE_PAIRS_JSON: '{not json' }, readSecret: secrets });
  assert.deepEqual(broken.paymentIssues, off.paymentIssues);
  assert.deepEqual(bitConfigurationIssues(broken.config), ['bit-capture-semantics-unverified']);
  const on = loadPaymentConfiguration({ env: { ...env, TRANZILA_BIT_ENABLED: 'true', TRANZILA_BIT_CAPTURE_PAIRS_JSON: JSON.stringify([{ txnPaymentMethod: 'BIT', txnType: 'DEBIT', tranmode: 'A', transtatus: 0 }]) }, readSecret: secrets });
  assert.deepEqual(bitConfigurationIssues(on.config), []);
  for (const pairs of [[{ ...BIT_PAIRS[0], txnPaymentMethod: 'CC' }], [{ ...BIT_PAIRS[0], transtatus: '1' }], [{ txnPaymentMethod: 'FIXTURE_BIT' }]]) {
    assert.deepEqual(bitConfigurationIssues({ bitEnabled: true, bitCapturePairs: pairs }), ['bit-capture-semantics-unverified']);
  }
});

test('flag on: bit is routed through the Tranzila checkout with bit_pay=1 and holds no seat', async () => {
  const f = fixture({ paymentConfig: BIT_ON });
  const created = await f.call('createPayment', { body: BIT });
  assert.equal(created.statusCode, 201);
  const url = new URL(created.body.paymentUrl), id = created.body.bookingId;
  assert.equal(url.hostname, 'directng.tranzila.com'); assert.equal(url.searchParams.get('bit_pay'), '1'); assert.equal(url.searchParams.get('order_id'), id);
  const b = f.booking(id);
  assert.equal(b.paymentMethod, 'bit'); assert.equal(b.paymentProvider, 'tranzila'); assert.equal(b.status, 'payment_pending'); assert.equal(b.paymentStatus, 'awaiting_payment');
  assert.equal(f.seats(), 0); assert.equal(f.jobsCount(), 0); assert.ok(f.db.data.get(`paymentReconciliation/${id}`));
  // createBooking with bit takes the same checkout path, never the manual pending path.
  const viaCreate = await f.call('createBooking', { token: 'other', body: BIT });
  assert.equal(viaCreate.statusCode, 201); assert.match(viaCreate.body.paymentUrl, /bit_pay=1/);
  // A card checkout on the same configuration still carries no bit_pay.
  const card = await f.call('createPayment', { token: 'admin', body: INPUT });
  assert.equal(new URL(card.body.paymentUrl).searchParams.has('bit_pay'), false);
});

test('flag on: only an allowlisted txn_payment_method (or a verified card capture) pays a Bit booking', async () => {
  const f = fixture({ paymentConfig: BIT_ON });
  const id = (await f.call('createPayment', { body: BIT })).body.bookingId;
  for (const patch of [{ txn_payment_method: 'OTHER' }, { txn_payment_method: undefined }, { txn_payment_method: 'FIXTURE_BIT', txn_type: 'VERIFY' }, { txn_payment_method: 'FIXTURE_BIT', amount: 100 }, { txn_payment_method: 'FIXTURE_BIT', processor_response_code: '001' }]) {
    f.record(id, 42, patch);
    assert.equal((await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } })).statusCode, 503);
    assert.equal(f.booking(id).paymentStatus, 'awaiting_payment'); assert.equal(f.seats(), 0);
  }
  f.record(id, 42, { txn_payment_method: 'FIXTURE_BIT' });
  const paid = await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } });
  assert.equal(paid.statusCode, 200); assert.equal(paid.body.paymentStatus, 'paid');
  assert.equal(f.booking(id).status, 'confirmed'); assert.equal(f.seats(), 2);
  // A card capture also pays a Bit booking (same page); a Bit report never pays a card booking.
  const g = fixture({ paymentConfig: BIT_ON });
  const bitId = (await g.call('createPayment', { body: BIT })).body.bookingId;
  g.record(bitId, 42);
  assert.equal((await g.call('tranzilaWebhook', { query: { id: bitId }, body: { index: 42 } })).body.paymentStatus, 'paid');
  const cardId = (await g.call('createPayment', { token: 'other', body: INPUT })).body.bookingId;
  g.record(cardId, 43, { txn_payment_method: 'FIXTURE_BIT' });
  assert.equal((await g.call('tranzilaWebhook', { query: { id: cardId }, body: { index: 43 } })).statusCode, 503);
  assert.equal(g.booking(cardId).paymentStatus, 'awaiting_payment');
});

test('flag on: admin manual confirm can never mark a Tranzila Bit booking as paid', async () => {
  const f = fixture({ paymentConfig: BIT_ON });
  const id = (await f.call('createPayment', { body: BIT })).body.bookingId;
  const confirm = await f.call('updateBookingStatus', { token: 'admin', body: { bookingId: id, status: 'confirmed' } });
  assert.equal(confirm.statusCode, 409); assert.equal(confirm.body.error, 'invalid-transition');
  assert.equal(f.booking(id).status, 'payment_pending'); assert.equal(f.booking(id).paymentStatus, 'awaiting_payment'); assert.equal(f.seats(), 0);
  // Even a record forced back into the manual 'pending' state stays provider-only.
  const pending = { schemaVersion: 2, capacityReserved: false, status: 'pending', paymentStatus: 'pending', paymentMethod: 'bit', paymentProvider: 'tranzila' };
  assert.throws(() => transition(pending, 'confirm', NOW, { capacityAvailable: true }), /invalid-transition/);
  // Legacy manual Bit requests keep their admin confirmation but can never become 'paid' by a receipt.
  const legacy = { ...pending, paymentProvider: undefined };
  assert.deepEqual(transition(legacy, 'confirm', NOW, { capacityAvailable: true }), { status: 'confirmed', capacityReserved: true });
  assert.throws(() => transition(legacy, 'paid', NOW, { capacityAvailable: true }), /invalid-transition/);
});

test('flag on: a verified Bit payment for a full tour stays paid for review; admin may confirm once room exists', async () => {
  const f = fixture({ paymentConfig: BIT_ON });
  f.db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 2 });
  const id = (await f.call('createPayment', { body: BIT })).body.bookingId;
  f.db.data.set(f.bookings.tourRef(INPUT.tourDate).path, { currentRegistrations: 2 });
  f.record(id, 42, { txn_payment_method: 'FIXTURE_BIT' });
  await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } });
  assert.equal(f.booking(id).status, 'payment_review'); assert.equal(f.booking(id).paymentStatus, 'paid'); assert.equal(f.booking(id).paymentReviewReason, 'overbooked-at-payment');
  f.db.data.set(f.bookings.tourRef(INPUT.tourDate).path, { currentRegistrations: 0 });
  const confirm = await f.call('updateBookingStatus', { token: 'admin', body: { bookingId: id, status: 'confirmed' } });
  assert.equal(confirm.statusCode, 200); assert.equal(confirm.body.status, 'confirmed'); assert.equal(f.seats(), 2);
});

test('flag on: reconciliation recovers a lost Bit callback through the same verification', async () => {
  const f = fixture({ paymentConfig: BIT_ON });
  const id = (await f.call('createPayment', { body: BIT })).body.bookingId;
  const ref = f.db.doc(`paymentReconciliation/${id}`);
  const row = { index: 42, authorization_number: 147934, amount: 50000, currency: '1', processor_response_code: '000', child_terminal: CONFIG.terminal, user_defined_3: id, txn_type: 'FIXTURE_CAPTURE', tranmode: 'FIXTURE_MODE', transtatus: 1, txn_payment_method: 'FIXTURE_BIT', cancelfdid: null, cancelfdnumber: null };
  const provider = createTranzilaAdapter({ config: { ...BIT_ON, orderLookupVerified: true, orderFilterParameter: 'order_id' }, clock: () => NOW, fetchImpl: async () => ({ ok: true, json: async () => ({ transactions: [row], total: '1', rows: 1 }) }) });
  const runner = createPaymentReconciler({ db: f.db, bookings: f.bookings, Timestamp, provider, isEnabled: () => true, clock: () => NOW });
  await runner.run(ref);
  assert.equal(f.booking(id).paymentStatus, 'paid'); assert.equal(f.booking(id).status, 'confirmed'); assert.equal(f.seats(), 2);
});
