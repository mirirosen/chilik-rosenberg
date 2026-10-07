'use strict';
const assert = require('node:assert/strict');
const { createBookingApi } = require('../../src/api');
const { createBookingService } = require('../../src/booking-service');
const { createPaymentFlow } = require('../../src/payment-flow');
const { createTranzilaAdapter } = require('../../src/providers/tranzila');
const { createJobRunner } = require('../../src/integration-jobs');
const { createIntegrationAdapters } = require('../../src/integration-adapters');
const { disabledAdapters } = require('../../src/integration-jobs');
const { fakeDb, Timestamp } = require('./fake-db');

// Offline integration: actual API/auth guards/service/checkout/report adapter,
// with a simulated provider HTTP transport and transactional memory store.
// Fixture capture labels are NOT production merchant configuration.
const NOW = Date.parse('2026-10-01T10:00:00Z');
const CONFIG = { enabled: true, merchantConfigurationVerified: true, reportContractVerified: true, terminal: 'fixture-terminal', checkoutUrl: 'https://directng.tranzila.com/fixture-terminal/', appKey: 'fixture-app-key', secret: 'fixture-secret', orderParameter: 'order_id', orderReportField: 'user_defined_3', checkoutTranmode: 'FIXTURE_MODE', capturePairs: [{ txnType: 'FIXTURE_CAPTURE', tranmode: 'FIXTURE_MODE', transtatus: 1 }] };
const INPUT = { name: 'Fixture Customer', phone: '0501234567', email: 'fixture@example.com', participants: 2, tourDate: '2026-10-08', paymentMethod: 'credit', dateOfBirth: '1990-01-01', agreeToTerms: true, language: 'en' };
const KEY = 'e'.repeat(32);
function fixture({ weeklyPolicy, paymentConfig = CONFIG } = {}) {
  let now = NOW, handshakeFailure = false;
  const db = fakeDb(), doc = db.doc, reports = new Map(), requests = [], logs = [];
  db.doc = path => ({ ...doc(path), async get() { const value = db.data.get(path); return { exists: value !== undefined, data: () => value }; } });
  db.collection = collection => {
    const filters = []; let max = Infinity;
    const query = { where(field, op, expected) { filters.push([field, op, expected]); return query; }, limit(n) { max = n; return query; }, async get() {
      const docs = [...db.data.entries()].filter(([path, value]) => path.startsWith(`${collection}/`) && filters.every(([field, op, expected]) => {
        const actual = value[field];
        if (op === '==') return actual === expected;
        if (op === 'in') return expected.includes(actual);
        if (op === '<=') return actual?.toMillis() <= expected.toMillis();
        throw new Error(`Unsupported offline query: ${op}`);
      })).slice(0, max).map(([path, value]) => ({ id: doc(path).id, ref: db.doc(path), data: () => value }));
      return { docs, size: docs.length };
    } }; return query;
  };
  const ts = { ...Timestamp, now: () => Timestamp.fromMillis(now) };
  const rawBookings = createBookingService(db, ts, { weeklyPolicy });
  const bookings = { ...rawBookings, create: (uid, key, input) => rawBookings.create(uid, key, input, now), change: (id, event, actor, receipt, _clock, guards) => rawBookings.change(id, event, actor, receipt, now, guards) };
  const provider = createTranzilaAdapter({ config: paymentConfig, clock: () => now, fetchImpl: async (url, options) => {
    requests.push({ url, method: options.method, body: JSON.parse(options.body) });
    assert.equal(options.redirect, 'error'); assert.equal(options.method, 'POST');
    if (url === 'https://api.tranzila.com/v2/handshake/create') {
      if (handshakeFailure) throw new Error('private-upstream-error');
      return { ok: true, json: async () => ({ error_code: 0, thtk: 'fixture-handshake-token' }) };
    }
    assert.equal(url, 'https://report.tranzila.com/v1/transaction', 'no unrecognized network destinations');
    const row = reports.get(JSON.parse(options.body).transaction_index);
    return { ok: true, json: async () => ({ transactions: row ? [row] : [] }) };
  } });
  const flow = createPaymentFlow({ db, bookings, Timestamp: ts, provider, clock: () => now, urlsFor: id => ({ success: `https://example.com/booking?payment=success&id=${id}`, failure: `https://example.com/booking?payment=failed&id=${id}`, notify: `https://example.com/notify?id=${id}` }) });
  const jobs = createJobRunner(db, ts, { ...createIntegrationAdapters({ db, config: {}, fetchImpl: async () => { throw new Error('External integration forbidden'); } }), whatsapp: disabledAdapters.whatsapp });
  const api = createBookingApi({ enabled: true, schedulesEnabled: true, onRequest: (_options, fn) => fn, onSchedule: (_options, fn) => fn, db, Timestamp: ts, bookings, jobs, paymentFlow: flow, logger: { error: (...args) => logs.push(args) }, verifyIdToken: async (token, revoked) => {
    assert.equal(revoked, true);
    if (!['owner', 'other', 'admin'].includes(token)) throw new Error('invalid-token');
    return { uid: token, ...(token === 'admin' ? { admin: true } : {}), firebase: { sign_in_provider: token === 'admin' ? 'password' : 'anonymous' } };
  } });
  async function call(name, { method = 'POST', token = 'owner', body = {}, query = {}, key = KEY } = {}) {
    const headers = { authorization: `Bearer ${token}`, 'x-idempotency-key': key };
    const req = { method, body, query, get: name => headers[name.toLowerCase()] };
    const res = { statusCode: null, headers: {}, status(n) { this.statusCode = n; return this; }, set(k, v) { this.headers[k] = v; return this; }, json(b) { this.body = JSON.parse(JSON.stringify(b)); return this; }, end() { return this; } };
    await api[name](req, res); return res;
  }
  return { db, api, bookings, jobs, requests, logs, call, advance: ms => { now += ms; }, failHandshake: () => { handshakeFailure = true; }, record: (id, index = 42, patch = {}) => reports.set(index, { index, authorization_number: 147934, amount: 500, currency: '1', processor_response_code: '000', child_terminal: paymentConfig.terminal, [paymentConfig.orderReportField]: id, txn_type: 'FIXTURE_CAPTURE', tranmode: 'FIXTURE_MODE', transtatus: 1, txn_payment_method: 'CC', cancelfdid: null, cancelfdnumber: null, ...patch }), booking: id => db.data.get(`bookings/${id}`), seats: () => db.data.get(bookings.tourRef(INPUT.tourDate).path)?.currentRegistrations, jobsCount: () => [...db.data.keys()].filter(k => k.startsWith('integrationJobs/')).length };
}

module.exports = { fixture, INPUT, KEY, NOW, CONFIG };
