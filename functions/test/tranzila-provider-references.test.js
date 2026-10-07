'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { paymentConfigurationIssues } = require('../src/configuration-readiness');
const { loadPaymentConfiguration } = require('../src/payment-runtime');
const { createTranzilaAdapter } = require('../src/providers/tranzila');
const { createPaymentReconciler } = require('../src/payment-reconciliation');
const { fingerprint } = require('../src/booking-core');
const { fixture, CONFIG, INPUT, NOW } = require('./helpers/offline-system');
const { Timestamp } = require('./helpers/fake-db');
const ID = 'BK-' + 'a'.repeat(24);
const NAMED = { ...CONFIG, orderParameter: 'chilik_order_id', orderReportField: 'chilik_order_id' };
const booking = { bookingId: ID, totalPrice: 500, paymentTerminal: CONFIG.terminal, createdAt: Timestamp.fromMillis(NOW - 60000) };
const row = (config = CONFIG, patch = {}) => ({ index: 42, authorization_number: '00147934', amount: 500, currency: '1', child_terminal: config.terminal, [config.orderReportField]: ID, txn_payment_method: 'CC', txn_type: 'FIXTURE_CAPTURE', tranmode: 'FIXTURE_MODE', transtatus: 1, processor_response_code: '000', cancelfdid: null, cancelfdnumber: null, ...patch });
const adapter = (config, report) => createTranzilaAdapter({ config, clock: () => NOW, fetchImpl: async () => ({ ok: true, json: async () => ({ transactions: [report] }) }) });
const ledgerEntries = f => [...f.db.data.entries()].filter(([path]) => path.startsWith('paymentWebhookDeliveries/'));
const references = (index = 42, auth = '00147934') => ({ provider: 'tranzila', terminal: CONFIG.terminal, transactionIndex: String(index), authorizationNumber: auth });

test('configured same-name order echo and verified report slot are both supported without guessing', () => {
  assert.deepEqual(paymentConfigurationIssues(NAMED), []);
  assert.deepEqual(paymentConfigurationIssues(CONFIG), []);
  for (const orderReportField of ['', 'other_name', 'user_defined_26', '__proto__', 'constructor']) assert.ok(paymentConfigurationIssues({ ...NAMED, orderReportField }).includes('order-report-binding-missing'));
  for (const orderParameter of ['sum', 'index', 'authorization_number', 'child_terminal', 'constructor', '__proto__']) assert.ok(paymentConfigurationIssues({ ...NAMED, orderParameter, orderReportField: orderParameter }).includes('order-parameter-invalid'));
});

test('supplier reply does not activate unverified runtime, secrets or order filters', () => {
  let secrets = 0;
  const runtime = loadPaymentConfiguration({ env: { TRANZILA_ORDER_PARAMETER: NAMED.orderParameter, TRANZILA_ORDER_REPORT_FIELD: NAMED.orderReportField }, readSecret: () => { secrets++; return 'forbidden'; } });
  assert.equal(secrets, 0);
  assert.ok(runtime.paymentIssues.includes('merchant-configuration-unverified'));
  assert.ok(runtime.paymentIssues.includes('report-capture-and-cancellation-contract-unverified'));
  assert.ok(runtime.reconciliationIssues.includes('order-lookup-contract-unverified'));
});

test('only the explicitly configured own order field binds a verified transaction', async () => {
  const namedRow = row(NAMED), slotRow = row(CONFIG);
  assert.equal((await adapter(NAMED, namedRow).verifyTransaction({ booking, transactionIndex: 42 })).verified, true);
  assert.equal((await adapter(CONFIG, slotRow).verifyTransaction({ booking, transactionIndex: 42 })).verified, true);
  await assert.rejects(adapter(NAMED, slotRow).verifyTransaction({ booking, transactionIndex: 42 }), /verification-pending/);
  await assert.rejects(adapter(CONFIG, namedRow).verifyTransaction({ booking, transactionIndex: 42 }), /verification-pending/);
  const inherited = Object.assign(Object.create({ [NAMED.orderReportField]: ID }), namedRow);
  delete inherited[NAMED.orderReportField];
  await assert.rejects(adapter(NAMED, inherited).verifyTransaction({ booking, transactionIndex: 42 }), /verification-pending/);
  await assert.rejects(adapter(NAMED, row(NAMED, { chilik_order_id: 'another-order' })).verifyTransaction({ booking, transactionIndex: 42 }), /verification-pending/);
});

test('named discovery remains explicitly filtered and cannot use the slot as fallback', async () => {
  const config = { ...NAMED, orderLookupVerified: true, orderFilterParameter: 'merchant_confirmed_filter' }, calls = [];
  let responseRow = row(NAMED);
  const provider = createTranzilaAdapter({ config, clock: () => NOW, fetchImpl: async (_url, options) => { calls.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ total: 1, rows: 1, transactions: [responseRow] }) }; } });
  assert.deepEqual(await provider.findTransactionIndexes({ booking }), { complete: true, transactionIndexes: [42] });
  assert.deepEqual(calls[0].ufields, [{ name: 'merchant_confirmed_filter', operator: 'equals', value: ID }]);
  responseRow = row(CONFIG);
  await assert.rejects(provider.findTransactionIndexes({ booking }), /lookup-incomplete/);
  let blockedCalls = 0;
  await assert.rejects(createTranzilaAdapter({ config: { ...config, orderLookupVerified: false }, fetchImpl: () => { blockedCalls++; } }).findTransactionIndexes({ booking }), /not-configured/);
  assert.equal(blockedCalls, 0);
});

test('receipt preserves original index, terminal and numeric/string approval while excluding report PII', async () => {
  for (const authorization_number of [147934, '00147934']) {
    const receipt = await adapter(CONFIG, row(CONFIG, { authorization_number, credit_card_token: 'private-card-token', contact: 'Private Name', email: 'private@example.com' })).verifyTransaction({ booking, transactionIndex: '42' });
    assert.deepEqual(receipt.providerTransaction, references(42, String(authorization_number)));
    for (const privateValue of ['private-card-token', 'Private Name', 'private@example.com']) assert.ok(!JSON.stringify(receipt).includes(privateValue));
  }
});

test('missing, malformed or lossy authorization numbers cannot authenticate a capture', async () => {
  const missing = row(); delete missing.authorization_number;
  await assert.rejects(adapter(CONFIG, missing).verifyTransaction({ booking, transactionIndex: 42 }), /verification-pending/);
  for (const authorization_number of [undefined, null, '', 0, '000', -1, 1.2, Number.MAX_SAFE_INTEGER + 1, true, {}, ['147934'], '1\n2', '1e6', 'x'.repeat(6), '1'.repeat(33)]) await assert.rejects(adapter(CONFIG, row(CONFIG, { authorization_number })).verifyTransaction({ booking, transactionIndex: 42 }), /verification-pending/);
});

test('real HTTP named checkout and verified report save original references privately and atomically', async () => {
  const f = fixture({ paymentConfig: NAMED }), created = await f.call('createPayment', { body: INPUT }), id = created.body.bookingId;
  assert.equal(created.statusCode, 201);
  assert.equal(new URL(created.body.paymentUrl).searchParams.get('chilik_order_id'), id);
  assert.deepEqual(f.requests[0].body.request_params, { chilik_order_id: id });
  f.record(id, 42, { authorization_number: '00147934', credit_card_token: 'private-card-token' });
  const response = await f.call('tranzilaWebhook', { query: { id }, body: { index: 42, ConfirmationCode: '999999', authorization_number: '999999', Response: '000' } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(ledgerEntries(f)[0][1].providerTransaction, references());
  assert.equal(ledgerEntries(f)[0][0], `paymentWebhookDeliveries/${fingerprint(CONFIG.terminal + ':42')}`);
  const status = await f.call('paymentStatus', { method: 'GET', query: { id } });
  for (const serialized of [JSON.stringify(response.body), JSON.stringify(status.body), JSON.stringify(f.booking(id)), JSON.stringify(f.logs), JSON.stringify([...f.db.data.entries()].filter(([path]) => path.startsWith('integrationJobs/') || path.startsWith('bookingAudit/') || path.startsWith('paymentReconciliation/')))]) {
    for (const value of ['authorizationNumber', 'providerTransaction', '00147934', 'private-card-token', '999999']) assert.ok(!serialized.includes(value));
  }
  assert.equal(f.seats(), 2);
});

test('browser approval hint cannot fill a missing server-report approval number', async () => {
  const f = fixture(), created = await f.call('createPayment', { body: INPUT }), id = created.body.bookingId;
  f.record(id, 42, { authorization_number: undefined });
  const response = await f.call('tranzilaWebhook', { query: { id }, body: { index: 42, ConfirmationCode: '147934', authorization_number: '147934', Response: '000' } });
  assert.equal(response.statusCode, 503); assert.equal(f.booking(id).paymentStatus, 'awaiting_payment');
  assert.equal(ledgerEntries(f).length, 0); assert.equal(f.jobsCount(), 1);
});

test('duplicate and distinct captures retain separate immutable original-charge references', async () => {
  const f = fixture(), created = await f.call('createPayment', { body: INPUT }), id = created.body.bookingId;
  f.record(id, 42, { authorization_number: '00147934' });
  await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } });
  const revision = f.booking(id).revision, first = ledgerEntries(f)[0][1];
  await Promise.all([f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } }), f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } })]);
  assert.equal(f.booking(id).revision, revision); assert.deepEqual(ledgerEntries(f)[0][1], first);
  f.record(id, 43, { authorization_number: '00147935' });
  await f.call('tranzilaWebhook', { query: { id }, body: { index: 43 } });
  assert.deepEqual(ledgerEntries(f).map(([, record]) => record.providerTransaction), [references(), references(43, '00147935')]);
  assert.equal(f.booking(id).additionalPaymentReview, true); assert.equal(f.seats(), 2); assert.equal(f.jobsCount(), 4);
});

test('conflicting approval for a previously accepted index cannot overwrite references or resend notifications', async () => {
  const f = fixture(), created = await f.call('createPayment', { body: INPUT }), id = created.body.bookingId;
  f.record(id, 42, { authorization_number: '00147934' }); await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } });
  const revision = f.booking(id).revision;
  f.record(id, 42, { authorization_number: '777777' });
  assert.equal((await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } })).statusCode, 503);
  assert.deepEqual(ledgerEntries(f)[0][1].providerTransaction, references()); assert.equal(f.booking(id).revision, revision); assert.equal(f.jobsCount(), 4);
});

test('invalid receipt references cannot be persisted via internal transition path', async () => {
  const f = fixture(), created = await f.call('createPayment', { body: INPUT }), id = created.body.bookingId;
  const receipt = { verified: true, bookingId: id, transactionKey: CONFIG.terminal + ':42', amount: 500, currency: 'ILS', providerTransaction: references() };
  for (const patch of [{ provider: 'other' }, { terminal: 'other' }, { transactionIndex: '43' }, { transactionIndex: 42 }, { authorizationNumber: '' }, { authorizationNumber: '000' }]) await assert.rejects(f.bookings.change(id, 'paid', 'provider:tranzila', { ...receipt, providerTransaction: { ...references(), ...patch } }), /unverified-provider-event/);
  await assert.rejects(f.bookings.change(id, 'paid', 'admin', receipt), /unverified-provider-event/);
  assert.equal(ledgerEntries(f).length, 0); assert.equal(f.booking(id).paymentStatus, 'awaiting_payment');
});

test('missing callback reconciliation saves the same private references without duplicate fulfillment', async () => {
  const f = fixture({ paymentConfig: NAMED }), created = await f.call('createPayment', { body: INPUT }), id = created.body.bookingId;
  const transaction = row(NAMED, { [NAMED.orderReportField]: id }); let clock = NOW;
  const provider = createTranzilaAdapter({ config: { ...NAMED, orderLookupVerified: true, orderFilterParameter: NAMED.orderParameter }, clock: () => clock, fetchImpl: async () => ({ ok: true, json: async () => ({ transactions: [transaction], total: 1, rows: 1 }) }) });
  const worker = createPaymentReconciler({ db: f.db, bookings: f.bookings, Timestamp, provider, isEnabled: () => true, clock: () => clock });
  await worker.runDue();
  assert.equal(f.booking(id).paymentStatus, 'paid'); assert.deepEqual(ledgerEntries(f)[0][1].providerTransaction, references());
  const revision = f.booking(id).revision; clock += 3 * 60000; f.advance(3 * 60000); await worker.runDue();
  assert.equal(f.booking(id).revision, revision); assert.equal(ledgerEntries(f).length, 1); assert.equal(f.jobsCount(), 4);
});

test('late captures retain cancellation references without restoring seats or creating WhatsApp work', async () => {
  const f = fixture(), created = await f.call('createPayment', { body: INPUT }), id = created.body.bookingId;
  f.advance(16 * 60000); await f.api.expirePaymentHolds();
  f.record(id, 42, { authorization_number: '00147934' }); await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } });
  assert.equal(f.booking(id).paymentStatus, 'pending_review'); assert.equal(f.seats(), 0);
  assert.deepEqual(ledgerEntries(f)[0][1].providerTransaction, references());
  assert.equal([...f.db.data.values()].filter(record => record.kind === 'whatsapp').length, 0);
});

test('admin cancellation keeps original references for manual review and makes no cancellation API request', async () => {
  const f = fixture(), created = await f.call('createPayment', { body: INPUT }), id = created.body.bookingId;
  f.record(id, 42, { authorization_number: '00147934' }); await f.call('tranzilaWebhook', { query: { id }, body: { index: 42 } });
  const requests = f.requests.length;
  const response = await f.call('updateBookingStatus', { token: 'admin', body: { bookingId: id, status: 'cancelled' } });
  assert.equal(response.body.refundStatus, 'manual_review_required'); assert.equal(response.body.paymentStatus, 'paid');
  assert.equal(f.requests.length, requests); assert.equal(f.seats(), 0); assert.deepEqual(ledgerEntries(f)[0][1].providerTransaction, references());
});


test('single-report verification cannot switch a booking to another terminal or use missing binding', async () => {
  for (const paymentTerminal of ['different-terminal', '', undefined]) {
    let calls = 0;
    const provider = createTranzilaAdapter({ config: CONFIG, fetchImpl: async () => {
      calls++; return { ok: true, json: async () => ({ transactions: [row()] }) };
    } });
    await assert.rejects(provider.verifyTransaction({ booking: { ...booking, paymentTerminal }, transactionIndex: 42 }), /invalid-booking-reference/);
    assert.equal(calls, 0, 'terminal mismatch must fail before any report request');
  }
});
