'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { readFileSync } = require('node:fs');
const { fingerprint } = require('../src/booking-core');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createCancellationPreparationService, COLLECTION } = require('../src/cancellation-preparation');
const { CONTRACT_GAPS, buildCancellationRequestDraft, signCancellationRequestDraft } = require('../src/providers/tranzila-cancellation-draft');
const ID = 'BK-' + 'a'.repeat(24), NOW = 1791288000000, TERMINAL = 'fixture-terminal';
const ledgerId = fingerprint(`${TERMINAL}:42`);
const charge = { bookingId: ID, provider: 'tranzila', terminal: TERMINAL, transactionIndex: '42', authorizationNumber: '00147934', sourceLedgerId: ledgerId };
// Fixture mapping deliberately differs from Reports index; it proves no fallback.
const resolution = { verified: true, terminal: TERMINAL, reportIndex: '42', apiTransactionId: 90142, evidenceId: 'offline-fixture-only' };
function fixture(options = {}) {
  const db = fakeDb(), originalCollection = db.collection;
  db.collection = name => {
    const wrap = query => ({ where: (...args) => wrap(query.where(...args)), limit: count => ({ get: async () => { const snap = await query.get(); return { docs: snap.docs.slice(0, count) }; } }) });
    return wrap(originalCollection(name));
  };
  db.data.set(`bookings/${ID}`, { bookingId: ID, paymentMethod: 'credit', paymentStatus: 'paid', paymentTerminal: TERMINAL, totalPrice: 500, status: 'confirmed' });
  db.data.set(`paymentWebhookDeliveries/${ledgerId}`, { bookingId: ID, event: 'paid', providerTransaction: { provider: charge.provider, terminal: charge.terminal, transactionIndex: charge.transactionIndex, authorizationNumber: charge.authorizationNumber }, contact: 'must-not-copy', credit_card_token: 'must-not-copy-token' });
  const service = createCancellationPreparationService({ db, Timestamp, terminal: TERMINAL, clock: () => NOW, authorizeOperator: async () => ({ uid: 'verified-operator', admin: true }), ...options });
  return { db, service, preparationPath: `${COLLECTION}/${fingerprint(`cancel:${TERMINAL}:42`)}` };
}
test('cancel request draft uses documented four fields and explicit server mapping, preserving approval zeros', () => {
  const draft = buildCancellationRequestDraft({ charge, resolution });
  assert.deepEqual(draft, { terminal_name: TERMINAL, txn_type: 'cancel', reference_txn_id: 90142, authorization_number: '00147934' });
  assert.notEqual(draft.reference_txn_id, Number(charge.transactionIndex));
  for (const forbidden of ['sum', 'card_number', 'cvv', 'TranzilaPW', 'credit_pass', 'thtk', 'bookingId']) assert.equal(Object.hasOwn(draft, forbidden), false);
});
test('draft cannot guess mapping or cross terminals, indexes or malformed approvals', () => {
  for (const patch of [null, {}, { ...resolution, verified: false }, { ...resolution, terminal: 'other' }, { ...resolution, reportIndex: '43' }, { ...resolution, apiTransactionId: '90142' }, { ...resolution, apiTransactionId: Number.MAX_SAFE_INTEGER + 1 }, { ...resolution, evidenceId: '' }]) assert.throws(() => buildCancellationRequestDraft({ charge, resolution: patch }), /mapping-unverified/);
  for (const patch of [{ provider: 'browser' }, { transactionIndex: '0042' }, { authorizationNumber: 147934 }, { authorizationNumber: '000' }, { sourceLedgerId: 'forged' }]) assert.throws(() => buildCancellationRequestDraft({ charge: { ...charge, ...patch }, resolution }), /unverified-original-charge/);
});
test('offline signature uses exact HMAC headers, POST URL and private JSON draft with no transport', () => {
  const nonce = 'ab'.repeat(40), draft = signCancellationRequestDraft({ charge, resolution, appKey: 'fixture-app-key', secret: 'fixture-secret', nowMs: NOW, nonce });
  const seconds = String(Math.floor(NOW / 1000));
  assert.equal(draft.url, 'https://api.tranzila.com/v1/transaction/credit_card/create');
  assert.equal(draft.method, 'POST'); assert.equal(draft.redirect, 'error'); assert.equal(draft.executable, false);
  assert.equal(draft.headers['X-tranzila-api-request-time'], seconds);
  assert.equal(draft.headers['X-tranzila-api-app-key'], 'fixture-app-key');
  assert.equal(draft.headers['X-tranzila-api-nonce'], nonce);
  assert.equal(draft.headers['X-tranzila-api-access-token'], crypto.createHmac('sha256', 'fixture-secret' + seconds + nonce).update('fixture-app-key').digest('hex'));
  assert.equal(JSON.parse(draft.body).txn_type, 'cancel');
  assert.ok(!draft.body.includes('fixture-secret')); assert.equal(Object.keys(draft.headers).length, 5);
});
test('invalid signing inputs fail without echoing credentials', () => {
  for (const patch of [{ appKey: '' }, { secret: '' }, { appKey: 'private\nheader' }, { nonce: 'short' }, { nowMs: NaN }]) {
    assert.throws(() => signCancellationRequestDraft({ charge, resolution, appKey: 'private-app-key', secret: 'private-secret', nowMs: NOW, nonce: 'ab'.repeat(40), ...patch }), error => error.code === 'cancellation-signing-input-invalid' && !error.message.includes('private'));
  }
});
test('preparation loads original verified ledger server-side and returns no private references', async () => {
  const f = fixture(), before = structuredClone(f.db.data.get(`bookings/${ID}`));
  const result = await f.service.prepare({ bookingId: ID }), record = f.db.data.get(f.preparationPath);
  assert.equal(result.status, 'prepared_only'); assert.equal(result.executable, false); assert.equal(result.reused, false);
  assert.deepEqual(record.originalCharge, { provider: charge.provider, terminal: TERMINAL, transactionIndex: '42', authorizationNumber: '00147934' });
  assert.equal(record.executionEnabled, false); assert.deepEqual(f.db.data.get(`bookings/${ID}`), before);
  for (const privateValue of ['authorizationNumber', '00147934', 'transactionIndex', 'originalCharge', 'sourceLedgerId', 'fixture-secret', 'must-not-copy']) assert.ok(!JSON.stringify(result).includes(privateValue));
  for (const privateValue of ['must-not-copy', 'must-not-copy-token', 'X-tranzila', 'appKey', 'secret']) assert.ok(!JSON.stringify(record).includes(privateValue));
});
test('browser fields and forged identities cannot enter preparation', async () => {
  const f = fixture();
  for (const extra of [{ terminal: 'other' }, { transactionIndex: '42' }, { authorizationNumber: '00147934' }, { admin: true }, { providerTransaction: charge }, { enabled: true }]) await assert.rejects(f.service.prepare({ bookingId: ID, ...extra }), /invalid-cancellation-preparation-request/);
  assert.equal(f.db.data.size, 2);
  for (const authorizeOperator of [undefined, async () => ({ uid: 'browser', admin: false }), async () => ({ uid: 'browser', admin: 'true' })]) {
    const denied = fixture({ authorizeOperator }); await assert.rejects(denied.service.prepare({ bookingId: ID }), /forbidden/); assert.equal(denied.db.data.size, 2);
  }
});
test('cross-terminal bookings and ledgers are rejected before preparation writes', async () => {
  const bookingMismatch = fixture(); bookingMismatch.db.data.get(`bookings/${ID}`).paymentTerminal = 'other';
  await assert.rejects(bookingMismatch.service.prepare({ bookingId: ID }), /terminal-mismatch/); assert.equal(bookingMismatch.db.data.size, 2);
  const ledgerMismatch = fixture(); ledgerMismatch.db.data.get(`paymentWebhookDeliveries/${ledgerId}`).providerTransaction.terminal = 'other';
  await assert.rejects(ledgerMismatch.service.prepare({ bookingId: ID }), /unverified-original-charge/); assert.equal(ledgerMismatch.db.data.size, 2);
});
test('missing, ambiguous and review charges cannot be selected silently', async () => {
  for (const state of ['missing', 'multiple', 'pending', 'additional', 'wrong-ledger-id']) {
    const f = fixture();
    if (state === 'missing') f.db.data.delete(`paymentWebhookDeliveries/${ledgerId}`);
    if (state === 'multiple') f.db.data.set('paymentWebhookDeliveries/second', { bookingId: ID, event: 'paid', providerTransaction: charge });
    if (state === 'pending') f.db.data.get(`bookings/${ID}`).paymentStatus = 'pending_review';
    if (state === 'additional') f.db.data.get(`bookings/${ID}`).additionalPaymentReview = true;
    if (state === 'wrong-ledger-id') { f.db.data.set('paymentWebhookDeliveries/forged', f.db.data.get(`paymentWebhookDeliveries/${ledgerId}`)); f.db.data.delete(`paymentWebhookDeliveries/${ledgerId}`); }
    await assert.rejects(f.service.prepare({ bookingId: ID })); assert.equal(f.db.data.has(f.preparationPath), false);
  }
});
test('concurrent duplicate preparation creates one private plan and never a financial operation', async () => {
  const f = fixture(), results = await Promise.all([f.service.prepare({ bookingId: ID }), f.service.prepare({ bookingId: ID })]);
  assert.deepEqual(results.map(r => r.reused).sort(), [false, true]); assert.equal(f.db.data.size, 3);
  assert.equal(results[0].preparationId, results[1].preparationId);
});
test('existing attempted, timeout-uncertain, already-canceled or unknown states require review and cannot retry', async () => {
  for (const state of ['attempted', 'outcome_unknown', 'timeout', 'cancelled', 'verified_cancelled', 'unexpected']) {
    const f = fixture(); await f.service.prepare({ bookingId: ID });
    f.db.data.get(f.preparationPath).status = state;
    const before = JSON.stringify(f.db.data.get(f.preparationPath));
    await assert.rejects(f.service.prepare({ bookingId: ID }), /outcome-requires-review/);
    await assert.rejects(f.service.cancel({ bookingId: ID }), /execution-unsupported/);
    assert.equal(JSON.stringify(f.db.data.get(f.preparationPath)), before);
  }
});
test('local booking cancellation permits only preparation, while financial refund outcomes block it', async () => {
  const f = fixture(); Object.assign(f.db.data.get(`bookings/${ID}`), { status: 'cancelled', refundStatus: 'manual_review_required' });
  assert.equal((await f.service.prepare({ bookingId: ID })).executable, false);
  for (const refundStatus of ['refunded', 'cancelled', 'unknown']) {
    const blocked = fixture(); blocked.db.data.get(`bookings/${ID}`).refundStatus = refundStatus;
    await assert.rejects(blocked.service.prepare({ bookingId: ID }), /outcome-requires-review/);
  }
});
test('conflicting original approval cannot overwrite a prepared private plan', async () => {
  const f = fixture(); await f.service.prepare({ bookingId: ID });
  f.db.data.get(`paymentWebhookDeliveries/${ledgerId}`).providerTransaction.authorizationNumber = '00999999';
  await assert.rejects(f.service.prepare({ bookingId: ID }), /preparation-conflict/);
  assert.equal(f.db.data.get(f.preparationPath).originalCharge.authorizationNumber, '00147934');
});
test('provider-looking success/error responses and timeout transports cannot activate the stub', async () => {
  for (const response of [{ error_code: 0, transaction_result: { processor_response_code: '000' } }, { error_code: 23001 }, { timeout: true }]) {
    let transports = 0, secretReads = 0;
    const f = fixture({ enabled: true, entitlementVerified: true, resultContractVerified: true, feesVerified: true, readSecret: () => { secretReads++; return 'forbidden'; }, fetchImpl: async () => { transports++; if (response.timeout) throw new Error('private-timeout'); return response; } });
    await assert.rejects(f.service.cancel({ bookingId: ID, response }), error => error.code === 'cancellation-execution-unsupported' && !error.message.includes('private'));
    assert.equal(transports, 0); assert.equal(secretReads, 0); assert.equal(f.db.data.size, 2);
    const issues = f.service.readinessIssues(); issues.length = 0;
    assert.deepEqual(f.service.readinessIssues(), ['cancellation-execution-unsupported', ...CONTRACT_GAPS]);
  }
});
test('preparation has no deployed/browser entrypoint and no security-rule publication is configured', () => {
  // Live database policy remains unknown; do not claim client deny from a draft.
  for (const config of ['../../firebase.json','../../firebase.backend.private.json']) {
    assert.equal(JSON.parse(readFileSync(require.resolve(config), 'utf8')).firestore, undefined);
  }
  const index = readFileSync(require.resolve('../src/index.js'), 'utf8');
  assert.ok(!index.includes('cancellation-preparation'));
  // Signing and execution are deliberately absent from the preparation interface.
  assert.deepEqual(Object.keys(fixture().service).sort(), ['cancel', 'prepare', 'readinessIssues']);
});
