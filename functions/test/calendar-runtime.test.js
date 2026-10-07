'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fakeDb } = require('./helpers/fake-db');
const { createCalendarRuntime, upcomingThursdays, calendarImportRange } = require('../src/calendar-runtime');
const { createCalendarApi, publicAvailability } = require('../src/calendar-api');
const { createGoogleCalendarTokenProvider, tokenConfigurationReady, SECRET_NAMES, READ_SCOPE, WRITE_SCOPE } = require('../src/google-calendar-token');
const { APPROVED_WEEK_POLICY, buildCalendarWeekSnapshots } = require('../src/weekly-availability');
const NOW = Date.parse('2026-11-06T10:00:00Z'), DATE = '2026-11-12', WEEK = '2026-11-08';
const POLICY = { ...APPROVED_WEEK_POLICY, enabled: true };
const CONFIG = { enabled: true, readEnabled: true, provider: 'google', mode: 'reconciled-event', calendarId: 'fixture@example.test', accessRole: 'owner', privateEventAccessVerified: true, reconciliationVerified: true, idempotencyVerified: true, oauth: { enabled: true, existingGrantVerified: true, grantedScopes: [WRITE_SCOPE] } };
function transport(runtime, db = fakeDb(), logger = { error: () => {} }) {
  const schedules = [];
  const api = createCalendarApi({ db, runtime, now: () => NOW, logger, onRequest: (_options, fn) => fn, onSchedule: (options, fn) => { schedules.push(options); return fn; } });
  async function request(method = 'GET', origin) {
    const req = { method, get: () => origin }, res = { headers: {}, status(n) { this.statusCode = n; return this; }, set(k, v) { this.headers[k] = v; return this; }, json(value) { this.body = value; return this; }, end() { return this; } };
    await api.calendarAvailability(req, res); return res;
  }
  return { api, request, schedules };
}
function seed(db, participants = 27) {
  db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 30 });
  db.data.set(`bookingWeeks/${WEEK}`, { reconciled: true, currentRegistrations: participants, confirmedParticipants: participants, heldParticipants: 0 });
  db.data.set(`calendarAvailability/${WEEK}`, buildCalendarWeekSnapshots([], { policy: POLICY, fromDate: WEEK, toDate: '2026-11-15', complete: true, nowMs: NOW })[WEEK]);
}
test('default runtime declares no secrets, schedules nothing and public endpoint fails before database/network access', async () => {
  const forbidden = () => assert.fail('disabled access');
  const runtime = createCalendarRuntime({ db: { runTransaction: forbidden }, secretFactory: forbidden, OAuth2ClientFactory: forbidden, getAccessToken: forbidden, fetchImpl: forbidden });
  assert.deepEqual(runtime.secretBindings, []); assert.equal(runtime.policy.enabled, false);
  assert.equal((await runtime.importUpcoming()).status, 'disabled');
  const t = transport(runtime, { runTransaction: forbidden });
  assert.equal(t.schedules.length, 0); assert.equal(t.api.refreshCalendarAvailability, undefined);
  const res = await t.request(); assert.equal(res.statusCode, 503); assert.deepEqual(res.body, { error: 'availability-unavailable' });
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('approved mocked scheduler has bounded backoff, correct complete horizon and verified secret bindings', async () => {
  const db = fakeDb(), declared = [], reads = [], network = [];
  class Auth { setCredentials(credentials) { assert.equal(credentials.refresh_token, 'fixture-refresh'); } async getAccessToken() { return { token: 'fixture-token' }; } }
  const runtime = createCalendarRuntime({ db, config: CONFIG, features: { scheduler: true, weeklyEnforcement: true }, now: () => NOW,
    secretFactory: name => { declared.push(name); return { value: () => { reads.push(name); return name.endsWith('REFRESH_TOKEN') ? 'fixture-refresh' : 'fixture-value'; } }; },
    OAuth2ClientFactory: () => Auth, fetchImpl: async (url, options) => { network.push({ url, ...options }); return { ok: true, status: 200, json: async () => ({ accessRole: 'owner', items: [] }) }; } });
  const t = transport(runtime, db);
  assert.equal(reads.length, 0); assert.deepEqual(declared.sort(), Object.values(SECRET_NAMES).sort());
  assert.equal(t.schedules[0].schedule, 'every 2 minutes'); assert.equal(t.schedules[0].timeZone, 'Asia/Jerusalem'); assert.equal(t.schedules[0].retryCount, 3); assert.equal(t.schedules[0].secrets.length, 3);
  assert.deepEqual(await t.api.refreshCalendarAvailability(), { status: 'complete', weeks: 13 });
  assert.equal(reads.length, 3); assert.equal(network.length, 1); assert.equal(network[0].method, 'GET');
  assert.deepEqual(calendarImportRange(NOW), { fromDate: '2026-11-01', toDate: '2027-01-31' });
});
test('scheduler failure exposes no provider detail or credential value', async () => {
  const logs = [], runtime = { readsEnabled: true, publicEnabled: false, secretBindings: [], importUpcoming: async () => { throw new Error('PRIVATE TITLE TOKEN'); } };
  const t = transport(runtime, fakeDb(), { error: (...args) => logs.push(args) });
  await assert.rejects(t.api.refreshCalendarAvailability(), /calendar-import-failed/);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE|TITLE|TOKEN/);
});
test('owned scope is sufficient for existing count writes; readonly can never be used for writes; off reads no secrets', async () => {
  let reads = 0, calls = 0;
  class Auth { constructor(id, secret) { assert.equal(id, 'fixture'); assert.equal(secret, 'fixture'); } setCredentials() {} async getAccessToken() { calls++; return { token: 'fixture-access' }; } }
  const options = { readSecret: async () => { reads++; return 'fixture'; }, OAuth2ClientFactory: () => Auth };
  await assert.rejects(createGoogleCalendarTokenProvider({ ...options })('google-calendar'), e => e.blocked);
  const readConfig = { enabled: true, existingGrantVerified: true, grantedScopes: [READ_SCOPE] };
  for (const scope of ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar']) assert.equal(tokenConfigurationReady({ ...readConfig, grantedScopes: [scope] }, true), true); // reuse verified existing grant; never request broader scopes
  for (const scope of [READ_SCOPE, 'https://www.googleapis.com/auth/calendar.events.readonly', 'https://www.googleapis.com/auth/calendar.freebusy']) assert.equal(tokenConfigurationReady({ ...readConfig, grantedScopes: [scope] }, true), false);
  await assert.rejects(createGoogleCalendarTokenProvider({ ...options, config: readConfig, writes: true })('google-calendar'), e => e.blocked);
  assert.equal(reads, 0); assert.equal(calls, 0);
  const provider = createGoogleCalendarTokenProvider({ ...options, config: { ...readConfig, grantedScopes: [WRITE_SCOPE] }, writes: true });
  assert.equal(await provider('google-calendar'), 'fixture-access'); assert.equal(await provider('google-calendar'), 'fixture-access');
  assert.equal(reads, 3); assert.equal(calls, 2);
  await assert.rejects(provider('resend'), e => e.blocked);
});
test('secret/SDK refresh errors are sanitized and never stored', async () => {
  const provider = createGoogleCalendarTokenProvider({ config: CONFIG.oauth, readSecret: () => { throw new Error('REAL PRIVATE VALUE'); } });
  await assert.rejects(provider('google-calendar'), e => e.blocked && e.message === 'provider-token-unavailable');
});
test('public projection uses combined weekly quota and date cap without exposing source annotations or exact blocked reasons', async () => {
  const db = fakeDb(); seed(db);
  db.data.get(`calendarAvailability/${WEEK}`).summary = 'SECRET TITLE'; db.data.get(`calendarAvailability/${WEEK}`).sourceId = 'private-source';
  const result = await publicAvailability(db, POLICY, NOW);
  assert.equal(result.publicAvailability[DATE].availableSpots, 3);
  assert.deepEqual(Object.keys(result.publicAvailability[DATE]).sort(), ['available', 'availableSpots', 'maxParticipants', 'validUntilMs']);
  assert.doesNotMatch(JSON.stringify(result), /SECRET|private-source|Fingerprint|weekStart|externalDeclared|heldParticipants|confirmedParticipants/);
  db.data.set(`artifacts/hilik-rosenberg-v1/public/data/tourDates/${DATE}`, { useGlobalMax: false, customMax: 12, currentRegistrations: 10 });
  assert.equal((await publicAvailability(db, POLICY, NOW)).publicAvailability[DATE].availableSpots, 2);
  db.data.get(`calendarAvailability/${WEEK}`).blocked = true;
  const blocked = (await publicAvailability(db, POLICY, NOW)).publicAvailability[DATE];
  db.data.get(`calendarAvailability/${WEEK}`).blocked = false; db.data.get(`bookingWeeks/${WEEK}`).reconciled = false;
  assert.deepEqual((await publicAvailability(db, POLICY, NOW)).publicAvailability[DATE], blocked);
});
test('missing, stale, unreconciled, full, manually blocked and quota-reduced data all return zero seats', async () => {
  const changes = [db => db.data.delete(`calendarAvailability/${WEEK}`), db => { db.data.get(`calendarAvailability/${WEEK}`).validUntilMs = NOW; }, db => { db.data.get(`bookingWeeks/${WEEK}`).reconciled = false; }, db => { db.data.get('artifacts/hilik-rosenberg-v1/public/data/settings/global').globalMaxParticipants = 27; }, db => { db.data.get('artifacts/hilik-rosenberg-v1/public/data/settings/global').blocked = [DATE]; }];
  for (const change of changes) { const db = fakeDb(); seed(db); change(db); const row = (await publicAvailability(db, POLICY, NOW)).publicAvailability[DATE]; assert.equal(row.available, false); assert.equal(row.availableSpots, 0); }
});
test('public endpoint method/origin/DB errors are generic and do not use Calendar tokens', async () => {
  const db = fakeDb(); seed(db); const t = transport({ publicEnabled: true, readsEnabled: false, policy: POLICY }, db);
  assert.equal((await t.request()).statusCode, 200); assert.equal((await t.request('POST')).statusCode, 405);
  assert.equal((await t.request('GET', 'https://unknown.example')).statusCode, 403); assert.equal((await t.request('OPTIONS')).statusCode, 204);
  const bad = transport({ publicEnabled: true, readsEnabled: false, policy: POLICY }, { runTransaction: async () => { throw new Error('PRIVATE DB BODY'); } });
  assert.deepEqual((await bad.request()).body, { error: 'availability-unavailable' });
});
test('Thursday cutoff follows Jerusalem, including DST and a UTC previous-day boundary', () => {
  assert.equal(upcomingThursdays(Date.parse('2026-10-08T16:59:00Z'))[0], '2026-10-08');
  assert.equal(upcomingThursdays(Date.parse('2026-10-08T17:00:00Z'))[0], '2026-10-15');
  assert.equal(upcomingThursdays(Date.parse('2026-11-12T18:00:00Z'))[0], '2026-11-19');
  assert.equal(upcomingThursdays(Date.parse('2026-11-11T22:30:00Z'))[0], '2026-11-12');
});
