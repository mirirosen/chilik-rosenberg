'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const c = require('../src/payment-core');

const NONCE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const BOOKING = { bookingId: 'BK-0123456789abcdefabcd', name: 'דני כהן', email: 'dani@example.co.il', phone: '050-1234567', totalPrice: 500, tourDate: '2026-10-01', participants: 2 };
const URLS = { success: 'https://www.chilik-tours.com/booking?payment=success&id=BK-x', failure: 'https://www.chilik-tours.com/booking?payment=failed&id=BK-x', notify: 'https://europe-west1-p.cloudfunctions.net/tranzilaWebhook?id=BK-x' };

test('valid input uses server-owned price', () => assert.deepEqual(c.validateBookingInput({ name: 'A', phone: '0501234567', email: 'a@b.co', tourDate: '2026-10-01', participants: 2 }), { participants: 2, amount: 500 }));
test('rejects bad participant bounds', () => assert.throws(() => c.validateBookingInput({ name: 'A', phone: '0501234567', email: 'a@b.co', tourDate: '2026-10-01', participants: 21 }), /invalid-participants/));
test('hold expires fifteen minutes later', () => assert.equal(c.holdExpiresAt(0).toISOString(), '1970-01-01T00:15:00.000Z'));
test('nonce is 32 hex chars', () => assert.match(c.makePaymentNonce(), /^[a-f0-9]{32}$/));

test('payment URL targets the Tranzila iframe endpoint with trusted params', () => {
  const url = c.buildTranzilaPaymentUrl({ terminal: 'chilik-tours', booking: BOOKING, urls: URLS, nonce: NONCE });
  assert.ok(url.startsWith('https://direct.tranzila.com/chilik-tours/iframenew.php?'));
  const q = new URL(url).searchParams;
  assert.equal(q.get('sum'), '500.00');       // major units, not agorot
  assert.equal(q.get('currency'), '1');       // ILS
  assert.equal(q.get('cred_type'), '1');
  assert.equal(q.get('supplier'), 'chilik-tours');
  assert.equal(q.get('bookingId'), BOOKING.bookingId);
  assert.equal(q.get('paymentNonce'), NONCE);
  assert.equal(q.get('success_url_address'), URLS.success);
  assert.equal(q.get('notify_url_address'), URLS.notify);
  assert.equal(q.get('phone'), '0501234567'); // digits only
  assert.equal(q.get('TranzilaPW'), null);    // password never sent unless required
});

test('payment URL rejects bad config', () => {
  assert.throws(() => c.buildTranzilaPaymentUrl({ terminal: '', booking: BOOKING, urls: URLS, nonce: NONCE }), /missing-terminal/);
  assert.throws(() => c.buildTranzilaPaymentUrl({ terminal: 't', booking: { ...BOOKING, totalPrice: 0 }, urls: URLS, nonce: NONCE }), /invalid-amount/);
  assert.throws(() => c.buildTranzilaPaymentUrl({ terminal: 't', booking: BOOKING, urls: { ...URLS, notify: 'http://evil/x' }, nonce: NONCE }), /invalid-url:notify/);
  assert.throws(() => c.buildTranzilaPaymentUrl({ terminal: 't', booking: BOOKING, urls: URLS, nonce: 'short' }), /invalid-nonce/);
});

test('notify parser reads urlencoded body', () => {
  const n = c.parseTranzilaNotify('Response=000&sum=500&ConfirmationCode=1234567&index=42&bookingId=BK-x&paymentNonce=abc');
  assert.equal(n.response, '000');
  assert.equal(n.sum, 500);
  assert.equal(n.confirmationCode, '1234567');
  assert.equal(n.bookingId, 'BK-x');
  assert.equal(n.paymentNonce, 'abc');
});

test('approved notify with matching sum+nonce verifies', () => {
  const v = c.verifyTranzilaNotify({ response: '000', sum: 500, paymentNonce: NONCE }, { totalPrice: 500, tranzilaNonce: NONCE });
  assert.deepEqual(v, { ok: true });
});

test('declined notify is not-approved (never paid)', () => {
  const v = c.verifyTranzilaNotify({ response: '001', sum: 500, paymentNonce: NONCE }, { totalPrice: 500, tranzilaNonce: NONCE });
  assert.equal(v.ok, false);
  assert.equal(v.approved, false);
});

test('paid-looking notify with wrong sum is suspicious (never auto-paid)', () => {
  const v = c.verifyTranzilaNotify({ response: '000', sum: 1, paymentNonce: NONCE }, { totalPrice: 500, tranzilaNonce: NONCE });
  assert.equal(v.ok, false);
  assert.equal(v.approved, true);
  assert.match(v.reason, /sum-mismatch/);
});

test('paid-looking notify with wrong nonce is suspicious (never auto-paid)', () => {
  const v = c.verifyTranzilaNotify({ response: '000', sum: 500, paymentNonce: '0'.repeat(32) }, { totalPrice: 500, tranzilaNonce: NONCE });
  assert.equal(v.ok, false);
  assert.equal(v.approved, true);
  assert.match(v.reason, /nonce-mismatch/);
});
