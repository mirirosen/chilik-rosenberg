'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('crypto');
const { authHeaders, createTranzilaAdapter } = require('../src/providers/tranzila');
const booking = { bookingId: 'BK-' + 'a'.repeat(24), totalPrice: 500, language: 'en', paymentTerminal: 'test-terminal' };
// Fixture labels are deliberately NOT production Tranzila transaction-mode defaults.
const config = { enabled: true, merchantConfigurationVerified: true, reportContractVerified: true, terminal: 'test-terminal', checkoutUrl: 'https://directng.tranzila.com/test-terminal/', appKey: 'test-key', secret: 'test-secret', orderParameter: 'order_id', orderReportField: 'user_defined_3', checkoutTranmode: 'FIXTURE_MODE', capturePairs: [{ txnType: 'FIXTURE_CAPTURE', tranmode: 'FIXTURE_MODE', transtatus: 1 }] };
const row = { index: 42, authorization_number: 147934, amount: 500, currency: '1', processor_response_code: '000', child_terminal: config.terminal, user_defined_3: booking.bookingId, txn_type: 'FIXTURE_CAPTURE', tranmode: 'FIXTURE_MODE', transtatus: 1, txn_payment_method: 'CC', cancelfdid: null, cancelfdnumber: null };
const urls = { success: 'https://example.com/success', failure: 'https://example.com/failure', notify: 'https://example.com/notify' };
const respond = body => async () => ({ ok: true, json: async () => body });
test('documented PHP-compatible HMAC uses secret+seconds+80-hex nonce as key', () => {
  const nonce = 'ab'.repeat(40), h = authHeaders('key', 'secret', 1700000000000, nonce);
  assert.equal(h['X-tranzila-api-access-token'], crypto.createHmac('sha256', 'secret1700000000' + nonce).update('key').digest('hex'));
});

test('HMAC agrees with independently computed fixed golden digest', () => {
  // Python hmac.new(('secret1700000000'+'ab'*40).encode(), b'key', sha256).
  const headers = authHeaders('key', 'secret', 1700000000000, 'ab'.repeat(40));
  assert.equal(headers['X-tranzila-api-request-time'], '1700000000');
  assert.equal(headers['X-tranzila-api-access-token'], 'fad53aa8e9184c674a236996f71322635da1726987f8e076aec24d18e024a0ed');
});
test('disabled/unverified/missing configuration never makes network request', async () => {
  for (const c of [{}, { ...config, enabled: false }, { ...config, merchantConfigurationVerified: false }, { ...config, orderReportField: '' }]) {
    let calls = 0; const p = createTranzilaAdapter({ config: c, fetchImpl: async () => { calls++; } });
    await assert.rejects(p.createCheckout({ booking, urls }), /not-configured/); assert.equal(calls, 0);
  }
});
test('handshake URL carries token and public order reference but no secrets/PII', async () => {
  let request;
  const p = createTranzilaAdapter({ config, fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, json: async () => ({ error_code: 0, thtk: 'safe-handshake-token' }) }; } });
  const result = await p.createCheckout({ booking, urls }); const url = new URL(result.paymentUrl);
  assert.equal(request.url, 'https://api.tranzila.com/v2/handshake/create');
  assert.equal(JSON.parse(request.options.body).request_params.order_id, booking.bookingId);
  assert.equal(url.hostname, 'directng.tranzila.com'); assert.equal(url.searchParams.get('thtk'), 'safe-handshake-token');
  for (const sensitive of ['TranzilaPW', 'email', 'phone', 'secret', 'appKey']) assert.equal(url.searchParams.has(sensitive), false);
  assert.equal(result.paymentUrl.includes('test-secret'), false);
});
test('only independently queried and fully bound successful capture produces receipt', async () => {
  const p = createTranzilaAdapter({ config, fetchImpl: respond({ transactions: [row] }) });
  const receipt = await p.verifyTransaction({ booking, transactionIndex: '42' });
  assert.equal(receipt.verified, true); assert.equal(receipt.transactionKey, 'test-terminal:42');
});
test('wrong order/terminal/index/amount/currency/type/cancellation/decline never fulfill', async () => {
  for (const patch of [{ user_defined_3: 'other' }, { child_terminal: 'other' }, { index: 43 }, { amount: 499 }, { currency: '2' }, { txn_type: 'VERIFY' }, { tranmode: 'CREDIT' }, { cancelfdid: 1 }, { cancelfdnumber: 1 }, { processor_response_code: '001' }]) {
    const p = createTranzilaAdapter({ config, fetchImpl: respond({ transactions: [{ ...row, ...patch }] }) });
    await assert.rejects(p.verifyTransaction({ booking, transactionIndex: 42 }), /verification-pending/);
  }
});
test('ambiguous/empty report and transport outage fail closed', async () => {
  for (const transactions of [[], [row, row]]) await assert.rejects(createTranzilaAdapter({ config, fetchImpl: respond({ transactions }) }).verifyTransaction({ booking, transactionIndex: 42 }), /verification-pending/);
  await assert.rejects(createTranzilaAdapter({ config, fetchImpl: async () => ({ ok: false }) }).verifyTransaction({ booking, transactionIndex: 42 }), /provider-unavailable/);
});
test('upstream transport and JSON errors cannot escape with credentials or signed-header details', async () => {
  for (const fetchImpl of [async () => { throw Object.assign(new Error('private-secret signed-header-value'), { code: 'private-secret-code' }); }, async () => ({ ok: true, json: async () => { throw new Error('private-json-token'); } })]) {
    const p = createTranzilaAdapter({ config, fetchImpl });
    await assert.rejects(p.verifyTransaction({ booking, transactionIndex: 42 }), error => error.code === 'payment-provider-unavailable' && !error.message.includes('private'));
  }
});
