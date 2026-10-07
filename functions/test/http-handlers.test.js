'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const bookingModule = require('../src/booking-service');

// Exercise the actual exported handler bodies and actual access/lifecycle logic.
// Firebase transport and token verification are injected: no SDK initialization,
// credentials, sockets, emulator, or production project can be used by this file.
// Real Firestore concurrency belongs to booking-emulator.test.cjs.
const NOW = Date.parse('2026-10-01T10:00:00Z');
const ID = `BK-${'a'.repeat(24)}`;
const KEY = 'b'.repeat(32);
const INPUT = { name: 'Test Customer', phone: '0501234567', email: 'customer@example.com', participants: 2, tourDate: '2026-10-08', paymentMethod: 'bit', dateOfBirth: '1990-01-01', agreeToTerms: true };
function fixture(env = { CHILIK_BOOKING_RUNTIME_ENABLED: 'true', CHILIK_BOOKING_SCHEDULERS_ENABLED: 'true' }) {
  const db = fakeDb(), originalDoc = db.doc, verifications = [], logs = [];
  let reads = 0, transactions = 0;
  db.doc = p => ({ ...originalDoc(p), async get() { reads++; const data = db.data.get(p); return { exists: data !== undefined, data: () => data }; } });
  const originalTransaction = db.runTransaction;
  db.runTransaction = fn => { transactions++; return originalTransaction(fn); };
  const users = {
    customer: { uid: 'customer', firebase: { sign_in_provider: 'anonymous' } },
    stranger: { uid: 'stranger', firebase: { sign_in_provider: 'anonymous' } },
    admin: { uid: 'admin', admin: true, firebase: { sign_in_provider: 'password' } },
    anonymousAdmin: { uid: 'stranger', admin: true, firebase: { sign_in_provider: 'anonymous' } },
    stringAdmin: { uid: 'stranger', admin: 'true', firebase: { sign_in_provider: 'password' } },
  };
  const firestore = () => db;
  firestore.Timestamp = { ...Timestamp, now: () => Timestamp.fromMillis(NOW) };
  const admin = { initializeApp() {}, firestore, auth: () => ({ async verifyIdToken(token, revoked) {
    verifications.push({ token, revoked });
    if (!users[token]) throw new Error('upstream-token-detail-MUST-NOT-LEAK');
    return users[token];
  } }) };
  const modules = {
    'firebase-functions/v2/https': { onRequest: (_options, fn) => fn },
    'firebase-functions/v2/scheduler': { onSchedule: (_options, fn) => fn },
    'firebase-functions/params': { defineSecret: name => ({ name, value() { throw new Error('Secret access forbidden in disabled HTTP tests'); } }) },
    'firebase-admin': admin,
    './deployment-config': require('../src/deployment-config'),
    './access': require('../src/access'),
    './api': require('../src/api'),
    './providers/tranzila': { ...require('../src/providers/tranzila'), createTranzilaAdapter: options => require('../src/providers/tranzila').createTranzilaAdapter({ ...options, fetchImpl: async () => { throw new Error('Network forbidden in HTTP handler tests'); } }) },
    './payment-flow': require('../src/payment-flow'),
    './payment-runtime': require('../src/payment-runtime'),
    './payment-reconciliation': require('../src/payment-reconciliation'),
    './integration-adapters': { ...require('../src/integration-adapters'), createIntegrationAdapters: options => require('../src/integration-adapters').createIntegrationAdapters({ ...options, fetchImpl: async () => { throw new Error('Network forbidden in HTTP handler tests'); } }) },
    './booking-service': { createBookingService: (...args) => {
      const service = bookingModule.createBookingService(...args);
      return { ...service, create: (uid, key, input) => service.create(uid, key, input, NOW), change: (id, event, actor, receipt, _nowMs, guards) => service.change(id, event, actor, receipt, NOW, guards) };
    } },
    './integration-jobs': require('../src/integration-jobs'),
    './calendar-runtime': require('../src/calendar-runtime'),
    './calendar-api': require('../src/calendar-api'),
    './whatsapp-runtime': require('../src/whatsapp-runtime'),
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8'), {
    exports, require: id => { if (!Object.hasOwn(modules, id)) throw new Error(`Unapproved test dependency: ${id}`); return modules[id]; },
    console: { error: (...args) => logs.push(args) },
    process: { env },
  }, { filename: 'src/index.js' });
  async function call(name, { method = 'POST', token = 'customer', headers = {}, body = {}, query = {}, rawBody } = {}) {
    const h = { ...(token ? { authorization: `Bearer ${token}` } : {}), 'x-idempotency-key': KEY, ...headers };
    const req = { method, body, query, rawBody, get: key => h[key.toLowerCase()] };
    const response = { headers: {}, statusCode: null, body: undefined, status(n) { this.statusCode = n; return this; }, set(k, v) { this.headers[k] = v; return this; }, json(value) { this.body = JSON.parse(JSON.stringify(value)); return this; }, end() { return this; } };
    await exports[name](req, response);
    return response;
  }
  return { db, call, verifications, logs, counts: () => ({ reads, transactions }), seedBooking: (extra = {}) => db.data.set(`bookings/${ID}`, { bookingId: ID, ownerUid: 'customer', name: 'Private name', email: 'private@example.com', phone: '0501234567', notes: 'Private notes', status: 'pending', paymentStatus: 'pending', totalPrice: 500, pricePerPerson: 250, ...extra }) };
}
const endpoints = [['createBooking', 'POST'], ['createPayment', 'POST'], ['paymentStatus', 'GET'], ['updateBookingStatus', 'POST'], ['retryIntegrationJob', 'POST']];

test('all protected handlers reject missing, malformed, invalid and revoked tokens before DB work', async () => {
  for (const [name, method] of endpoints) {
    for (const authorization of [undefined, 'Basic customer', 'Bearer invalid', 'Bearer revoked']) {
      const f = fixture(), result = await f.call(name, { method, token: null, headers: { authorization } });
      assert.equal(result.statusCode, 401, name);
      assert.deepEqual(result.body, { error: 'authentication-required' });
      assert.deepEqual(f.counts(), { reads: 0, transactions: 0 });
      assert.ok(!JSON.stringify([result.body, f.logs]).includes('upstream-token-detail'));
    }
  }
});
test('nonadmins, string claims and anonymous admin claims cannot mutate statuses or retry jobs', async () => {
  for (const name of ['updateBookingStatus', 'retryIntegrationJob']) for (const token of ['customer', 'stringAdmin', 'anonymousAdmin']) {
    const f = fixture(), r = await f.call(name, { token, body: { bookingId: ID, status: 'confirmed', jobId: `${ID}-1-email` } });
    assert.equal(r.statusCode, 403); assert.deepEqual(r.body, { error: 'admin-required' });
    assert.deepEqual(f.counts(), { reads: 0, transactions: 0 });
    assert.equal(f.verifications[0].revoked, true);
  }
});
test('status hides missing and cross-owner bookings; owner/admin see only public fields', async () => {
  const f = fixture(); f.seedBooking();
  for (const token of ['stranger', 'anonymousAdmin', 'stringAdmin']) {
    const r = await f.call('paymentStatus', { method: 'GET', token, query: { id: ID } });
    assert.equal(r.statusCode, 404); assert.deepEqual(r.body, { error: 'not-found' });
  }
  const missing = await f.call('paymentStatus', { method: 'GET', query: { id: `BK-${'c'.repeat(24)}` } });
  assert.equal(missing.statusCode, 404);
  for (const token of ['customer', 'admin']) {
    const r = await f.call('paymentStatus', { method: 'GET', token, query: { id: ID } });
    assert.equal(r.statusCode, 200);
    assert.deepEqual(Object.keys(r.body).sort(), ['bookingId', 'paymentStatus', 'pricePerPerson', 'reused', 'status', 'totalPrice']);
    assert.equal(r.headers['Cache-Control'], 'no-store');
  }
});
test('malformed status IDs, admin transition requests and retry IDs fail without DB work', async () => {
  const f = fixture();
  for (const id of ['', '../bookings/private', 'BK-nothex']) assert.equal((await f.call('paymentStatus', { method: 'GET', query: { id } })).statusCode, 400);
  for (const body of [{}, { bookingId: ID, status: 'paid' }, { bookingId: '../private', status: 'confirmed' }]) assert.equal((await f.call('updateBookingStatus', { token: 'admin', body })).statusCode, 400);
  for (const jobId of ['', '../jobs/private', `${ID}-1-unknown`]) assert.equal((await f.call('retryIntegrationJob', { token: 'admin', body: { jobId } })).statusCode, 400);
  assert.deepEqual(f.counts(), { reads: 0, transactions: 0 });
});
test('invalid booking input and idempotency key cannot create a booking or capacity hold', async () => {
  const f = fixture();
  for (const body of [{}, { ...INPUT, participants: 0 }, { ...INPUT, agreeToTerms: false }, { ...INPUT, tourDate: '2026-99-99' }, { ...INPUT, paymentMethod: 'free' }]) {
    const r = await f.call('createBooking', { body }); assert.equal(r.statusCode, 409);
  }
  const r = await f.call('createBooking', { body: INPUT, headers: { 'x-idempotency-key': 'short' } });
  assert.equal(r.statusCode, 409); assert.deepEqual(r.body, { error: 'invalid-idempotency-key' });
  assert.equal(f.db.data.size, 0); assert.equal(f.counts().transactions, 0);
});
test('valid noncredit booking is authenticated, price-owned and HTTP-idempotent', async () => {
  const f = fixture();
  const first = await f.call('createBooking', { body: { ...INPUT, totalPrice: 1 } });
  const second = await f.call('createBooking', { body: { ...INPUT, totalPrice: 1 } });
  assert.equal(first.statusCode, 201); assert.equal(first.body.totalPrice, 500);
  assert.equal(second.statusCode, 200); assert.equal(second.body.reused, true);
  assert.equal(first.body.bookingId, second.body.bookingId);
  assert.equal(f.db.data.get(`bookings/${first.body.bookingId}`).ownerUid, 'customer');
  assert.equal([...f.db.data.keys()].filter(k => k.startsWith('integrationJobs/')).length, 2);
  assert.equal((await f.call('createBooking', { body: { ...INPUT, name: 'Changed' } })).statusCode, 409);
});
test('credit creation and every untrusted callback fail closed with zero DB reads or writes', async () => {
  const f = fixture();
  const calls = [await f.call('createBooking', { body: { ...INPUT, paymentMethod: 'credit' } }), await f.call('createPayment', { body: INPUT })];
  for (const response of ['000', '001', '', 'invalid']) calls.push(await f.call('tranzilaWebhook', { token: null, query: { id: ID }, body: { Response: response, sum: 500, bookingId: ID, paymentNonce: 'public-nonce' }, rawBody: Buffer.from(`Response=${response}&sum=500&bookingId=${ID}&paymentNonce=public-nonce`) }));
  for (const r of calls) { assert.equal(r.statusCode, 503); assert.deepEqual(r.body, { error: 'payment-verification-not-configured' }); }
  assert.deepEqual(f.counts(), { reads: 0, transactions: 0 }); assert.equal(f.db.data.size, 0);
});
test('method and CORS checks run before authentication or data access', async () => {
  const f = fixture();
  for (const [name, method] of endpoints) assert.equal((await f.call(name, { method: method === 'GET' ? 'POST' : 'GET', token: null })).statusCode, 405);
  assert.equal((await f.call('tranzilaWebhook', { method: 'GET', token: null })).statusCode, 405);
  assert.equal((await f.call('createBooking', { headers: { origin: 'https://untrusted.example' } })).statusCode, 403);
  const preflight = await f.call('createBooking', { method: 'OPTIONS', token: null, headers: { origin: 'https://www.chilik-tours.com' } });
  assert.equal(preflight.statusCode, 204); assert.equal(preflight.headers['Access-Control-Allow-Origin'], 'https://www.chilik-tours.com');
  assert.equal(f.verifications.length, 0); assert.deepEqual(f.counts(), { reads: 0, transactions: 0 });
});
test('unexpected database errors are redacted from HTTP response and application logs', async () => {
  const f = fixture(); f.db.runTransaction = async () => { throw new Error('private-database-detail-MUST-NOT-LEAK'); };
  const r = await f.call('createBooking', { body: INPUT });
  assert.equal(r.statusCode, 500); assert.deepEqual(r.body, { error: 'request-failed' });
  assert.ok(!JSON.stringify([r.body, f.logs]).includes('private-database-detail'));
});
test('authorized admin transition and retry delegate to real services; expected errors are safe', async () => {
  const f = fixture(), created = await f.call('createBooking', { body: INPUT });
  const bookingId = created.body.bookingId;
  const changed = await f.call('updateBookingStatus', { token: 'admin', body: { bookingId, status: 'confirmed' } });
  assert.equal(changed.statusCode, 200); assert.equal(changed.body.status, 'confirmed');
  const jobId = `${bookingId}-1-email`, jobPath = `integrationJobs/${jobId}`;
  f.db.data.set(jobPath, { ...f.db.data.get(jobPath), status: 'blocked' });
  assert.equal((await f.call('retryIntegrationJob', { token: 'admin', body: { jobId } })).statusCode, 200);
  assert.equal(f.db.data.get(jobPath).status, 'pending');
  assert.equal((await f.call('retryIntegrationJob', { token: 'admin', body: { jobId } })).statusCode, 409);
  assert.equal((await f.call('retryIntegrationJob', { token: 'admin', body: { jobId: `${ID}-1-email` } })).statusCode, 404);
});
