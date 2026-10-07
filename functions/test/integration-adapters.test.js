'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createIntegrationAdapters, EMAIL_WINDOW_MS } = require('../src/integration-adapters');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sessionId = sha('chilik-tours:2026-10-08');
const baseJob = () => ({ idempotencyKey: 'BK-123456789012345678901234-1-email', bookingId: 'BK-123456789012345678901234', tourDate: '2026-10-08', revision: 1, event: 'pending', language: 'en', emailSnapshot: { bookingId: 'BK-123456789012345678901234', revision: 1, status: 'pending', email: 'customer@example.test', tourDate: '2026-10-08', participants: 2, totalPrice: 500 } });
const emailConfig = () => ({ email: { enabled: true, provider: 'resend', idempotencyVerified: true, from: 'bookings@example.test' } });
const calendarConfig = () => ({ calendar: { enabled: true, provider: 'google', mode: 'mirror', idempotencyVerified: true, calendarId: 'business@example.test', startTime: '20:00', endTime: '00:30', endDayOffset: 1 } });
const response = (status, data = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
function mockDb(bookings = []) {
  const records = new Map();
  let queue = Promise.resolve();
  const db = {
    records, bookings,
    doc(path) { return { path, update: async data => { records.set(path, { ...records.get(path), ...data }); } }; },
    runTransaction(fn) {
      const promise = queue.then(async () => {
        const writes = [];
        const result = await fn({ get: async ref => ({ exists: records.has(ref.path), data: () => records.get(ref.path) }), create: (ref, data) => writes.push(() => { assert.equal(records.has(ref.path), false); records.set(ref.path, data); }) });
        writes.forEach(write => write());
        return result;
      });
      queue = promise.catch(() => {});
      return promise;
    },
    collection(name) { assert.equal(name, 'bookings'); return { where: (key, op, date) => { assert.equal(key, 'tourDate'); assert.equal(op, '=='); return { get: async () => ({ docs: db.bookings.filter(b => b.tourDate === date).map(b => ({ data: () => b })) }) }; } }; }
  };
  return db;
}
function setup(config, responses, db = mockDb(), now = () => 1000) {
  const calls = [], tokens = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, ...options, payload: options.body && JSON.parse(options.body) });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(url, options) : next;
  };
  const adapters = createIntegrationAdapters({ db, config, fetchImpl, now, getAccessToken: async kind => { tokens.push(kind); return 'mock-token'; } });
  return { ...adapters, calls, tokens, db };
}
test('disabled/default and unverified adapters fail closed before token/network use', async () => {
  const s = setup({}, []);
  await assert.rejects(s.email(baseJob()), e => e.blocked);
  await assert.rejects(s.calendar(baseJob()), e => e.blocked);
  assert.deepEqual(s.calls, []); assert.deepEqual(s.tokens, []);
  const c = emailConfig(); c.email.idempotencyVerified = false;
  await assert.rejects(setup(c, []).email(baseJob()), e => e.blocked);
});
test('email uses immutable snapshot, stable key, text only and private receipt acknowledgement', async () => {
  const db = mockDb([{ ...baseJob().emailSnapshot, status: 'cancelled' }]);
  const s = setup(emailConfig(), [response(200, { id: 'mail-1' })], db);
  const job = baseJob(); job.emailSnapshot.notes = 'SECRET NOTES'; job.emailSnapshot.dateOfBirth = 'SECRET DOB';
  assert.deepEqual(await s.email(job), { providerId: 'mail-1' });
  assert.equal(s.calls[0].url, 'https://api.resend.com/emails');
  assert.equal(s.calls[0].headers['Idempotency-Key'], job.idempotencyKey);
  assert.deepEqual(s.calls[0].payload.to, ['customer@example.test']);
  assert.match(s.calls[0].payload.text, /request received/);
  assert.doesNotMatch(s.calls[0].body, /cancelled|SECRET/);
  assert.equal(s.calls[0].redirect, 'error');
  assert.equal(s.calls[0].payload.html, undefined);
  assert.deepEqual(await s.email(job), { providerId: 'mail-1' });
  assert.equal(s.calls.length, 1);
  const receipt = [...db.records.values()][0];
  assert.deepEqual(Object.keys(receipt).sort(), ['firstAttemptMs', 'payloadHash', 'providerId']);
});
test('response loss retries with identical request body/key inside provider window', async () => {
  const s = setup(emailConfig(), [new Error('network body has secret'), response(200, { id: 'already-sent' })]);
  await assert.rejects(s.email(baseJob()), /provider-request-uncertain/);
  assert.deepEqual(await s.email(baseJob()), { providerId: 'already-sent' });
  assert.equal(s.calls[0].body, s.calls[1].body);
  assert.equal(s.calls[0].headers['Idempotency-Key'], s.calls[1].headers['Idempotency-Key']);
});
test('uncertain sends cannot be retried after retention window or with changed payload', async () => {
  let now = 1000;
  const s = setup(emailConfig(), [new Error('lost')], mockDb(), () => now);
  await assert.rejects(s.email(baseJob()));
  now += EMAIL_WINDOW_MS;
  await assert.rejects(s.email(baseJob()), e => e.blocked && e.message === 'email-idempotency-window-expired');
  const changed = baseJob(); changed.emailSnapshot.email = 'other@example.test';
  await assert.rejects(s.email(changed), e => e.blocked && e.message === 'email-payload-changed');
  assert.equal(s.calls.length, 1);
});
test('email snapshot mismatched revisions and missing snapshots are blocked', async () => {
  const s = setup(emailConfig(), []);
  const job = baseJob(); job.emailSnapshot.revision = 2;
  await assert.rejects(s.email(job), e => e.blocked);
  delete job.emailSnapshot;
  await assert.rejects(s.email(job), e => e.blocked);
  assert.equal(s.calls.length, 0);
});
test('concurrent emails share provider key and payload', async () => {
  const s = setup(emailConfig(), [response(200, { id: 'same' }), response(200, { id: 'same' })]);
  const results = await Promise.all([s.email(baseJob()), s.email(baseJob())]);
  assert.deepEqual(results, [{ providerId: 'same' }, { providerId: 'same' }]);
  assert.equal(new Set(s.calls.map(c => c.headers['Idempotency-Key'])).size, 1);
});
test('calendar creates deterministic, private transparent session from current DB with no attendees', async () => {
  const db = mockDb([
    { tourDate: '2026-10-08', status: 'confirmed', participants: 3, schemaVersion: 2, capacityReserved: true, email: 'PRIVATE' },
    { tourDate: '2026-10-08', status: 'pending', participants: 2, schemaVersion: 2, capacityReserved: true },
    { tourDate: '2026-10-08', status: 'cancelled', participants: 8 }
  ]);
  const s = setup(calendarConfig(), [response(404), response(200, { id: sessionId })], db);
  assert.deepEqual(await s.calendar(baseJob()), { providerId: sessionId });
  const c = s.calls[1];
  assert.equal(c.payload.id, sessionId); assert.match(c.payload.summary, /3 confirmed, 2 pending/);
  assert.equal(c.payload.end.dateTime, '2026-10-09T00:30:00');
  assert.equal(c.payload.start.timeZone, 'Asia/Jerusalem');
  assert.deepEqual(c.payload.attendees, []); assert.equal(c.payload.visibility, 'private');
  assert.equal(c.payload.transparency, 'transparent'); assert.doesNotMatch(c.body, /PRIVATE|customer/);
  assert.match(c.url, /sendUpdates=none$/);
});
test('calendar ETag conflict rereads latest DB and never overwrites newer state blindly', async () => {
  const db = mockDb([{ tourDate: '2026-10-08', status: 'confirmed', participants: 2, schemaVersion: 2, capacityReserved: true }]);
  const event = etag => ({ id: sessionId, etag, extendedProperties: { private: { chilikSession: '2026-10-08' } } });
  const s = setup(calendarConfig(), [response(200, event('v1')), () => { db.bookings[0].participants = 4; return response(412); }, response(200, event('v2')), response(200, { id: sessionId })], db);
  await s.calendar(baseJob());
  assert.equal(s.calls[1].headers['If-Match'], 'v1');
  assert.equal(s.calls[3].headers['If-Match'], 'v2');
  assert.match(s.calls[1].payload.summary, /2 confirmed/);
  assert.match(s.calls[3].payload.summary, /4 confirmed/);
});
test('calendar duplicate creation conflict retries as conditional update', async () => {
  const db = mockDb([{ tourDate: '2026-10-08', status: 'confirmed', participants: 2, schemaVersion: 2, capacityReserved: true }]);
  const s = setup(calendarConfig(), [response(404), response(409), response(200, { id: sessionId, etag: 'new', extendedProperties: { private: { chilikSession: '2026-10-08' } } }), response(200, { id: sessionId })], db);
  await s.calendar(baseJob());
  assert.equal(s.calls[1].method, 'POST'); assert.equal(s.calls[3].method, 'PATCH');
});
test('empty session does not create event; existing empty session becomes transparent', async () => {
  const s = setup(calendarConfig(), [response(404)]);
  assert.deepEqual(await s.calendar(baseJob()), { providerId: `not-needed:${sessionId}` });
  assert.equal(s.calls.length, 1);
  const t = setup(calendarConfig(), [response(200, { id: sessionId, etag: 'v1', extendedProperties: { private: { chilikSession: '2026-10-08' } } }), response(200, { id: sessionId })]);
  await t.calendar(baseJob()); assert.match(t.calls[1].payload.summary, /No active reservations/);
  assert.equal(t.calls[1].payload.transparency, 'transparent');
});
test('calendar cannot adopt unowned events or silently switch availability authority', async () => {
  const s = setup(calendarConfig(), [response(200, { etag: 'human-event' })]);
  await assert.rejects(s.calendar(baseJob()), e => e.blocked && e.message === 'calendar-event-conflict');
  assert.equal(s.calls.length, 1);
  const c = calendarConfig(); c.calendar.mode = 'availability';
  const t = setup(c, []); await assert.rejects(t.calendar(baseJob()), e => e.blocked);
  assert.equal(t.calls.length, 0);
});
test('provider errors are sanitized and auth errors are blocked', async () => {
  const s = setup(emailConfig(), [response(401, { error: 'SECRET TOKEN' })]);
  await assert.rejects(s.email(baseJob()), e => e.blocked && !e.message.includes('SECRET'));
});
test('invalid calendar dates and identifiers fail closed before provider use', async () => {
  const s = setup(calendarConfig(), []);
  for (const change of [{ tourDate: '2026-99-99' }, { tourDate: '2026-02-30' }, { bookingId: 'bad\nheader' }]) {
    await assert.rejects(s.calendar({ ...baseJob(), ...change }), e => e.blocked && e.message === 'invalid-integration-job');
  }
  assert.equal(s.calls.length, 0); assert.equal(s.tokens.length, 0);
});
test('recorded email acknowledgements do not require renewed provider credentials', async () => {
  const db = mockDb();
  const s = setup(emailConfig(), [response(200, { id: 'saved' })], db);
  await s.email(baseJob());
  const offline = createIntegrationAdapters({ db, config: emailConfig(), fetchImpl: () => assert.fail('network forbidden'), getAccessToken: () => assert.fail('token forbidden') });
  assert.deepEqual(await offline.email(baseJob()), { providerId: 'saved' });
});

test('mirror response loss uses the deterministic event ID on retry and never inserts twice', async () => {
  const db = mockDb([{ tourDate: '2026-10-08', status: 'confirmed', participants: 2, schemaVersion: 2, capacityReserved: true }]);
  const s = setup(calendarConfig(), [response(404), new Error('lost response'), response(200, { id: sessionId, etag: 'saved', extendedProperties: { private: { chilikSession: '2026-10-08' } } }), response(200, { id: sessionId })], db);
  await assert.rejects(s.calendar(baseJob()), /provider-request-uncertain/);
  await s.calendar(baseJob());
  assert.equal(s.calls.filter(c => c.method === 'POST').length, 1);
  assert.equal(s.calls.at(-1).headers['If-Match'], 'saved');
});

test('mirror omits expired credit holds and released confirmed reservations; active legacy data blocks', async () => {
  const db = mockDb([
    { tourDate: '2026-10-08', status: 'payment_pending', participants: 2, schemaVersion: 2, capacityReserved: true, paymentMethod: 'credit', holdExpiresAt: { toMillis: () => 999 } },
    { tourDate: '2026-10-08', status: 'confirmed', participants: 8, schemaVersion: 2, capacityReserved: false }
  ]);
  const s = setup(calendarConfig(), [response(404)], db);
  await s.calendar(baseJob()); assert.equal(s.calls.length, 1);
  db.bookings.push({ tourDate: '2026-10-08', status: 'pending', participants: 1 });
  const legacy = setup(calendarConfig(), [response(404)], db);
  await assert.rejects(legacy.calendar(baseJob()), e => e.blocked && e.message === 'calendar-data-invalid');
  assert.equal(legacy.calls.length, 1);
});

test('mirror refuses tombstones, guest events and deletion between read and patch', async () => {
  for (const changed of [{ status: 'cancelled' }, { attendees: [{ email: 'private@example.test' }] }, { recurringEventId: 'series' }]) {
    const s = setup(calendarConfig(), [response(200, { id: sessionId, etag: 'v1', extendedProperties: { private: { chilikSession: '2026-10-08' } }, ...changed })]);
    await assert.rejects(s.calendar(baseJob()), /calendar-event-conflict/); assert.equal(s.calls.length, 1);
  }
  const s = setup(calendarConfig(), [response(200, { id: sessionId, etag: 'v1', extendedProperties: { private: { chilikSession: '2026-10-08' } } }), response(404)]);
  await assert.rejects(s.calendar(baseJob()), /calendar-event-conflict/); assert.ok(s.calls.every(c => c.method !== 'POST'));
});
