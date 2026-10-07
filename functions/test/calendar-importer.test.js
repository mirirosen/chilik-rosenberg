'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fakeDb } = require('./helpers/fake-db');
const { createCalendarImporter, calendarReadConfigurationIssues } = require('../src/calendar-importer');
const { APPROVED_WEEK_POLICY, buildCalendarWeekSnapshots, assertWeeklyAvailability } = require('../src/weekly-availability');
const { bindingHash } = require('../src/calendar-count-sync');
const POLICY = { ...APPROVED_WEEK_POLICY, enabled: true };
const NOW = Date.parse('2026-11-01T10:00:00Z');
const CONFIG = { readEnabled: true, provider: 'google', calendarId: 'fixture@example.test', privateEventAccessVerified: true, accessRole: 'owner' };
const RANGE = { fromDate: '2026-11-08', toDate: '2026-11-22' };
const countEvent = (id, count = 27) => ({ id, summary: `${count} אנשים`, transparency: 'transparent', start: { date: '2026-11-12' }, end: { date: '2026-11-13' } });
const reply = (items, extra = {}) => ({ ok: true, status: 200, json: async () => ({ accessRole: 'owner', items, ...extra }) });
function fixture(pages, config = CONFIG) {
  const db = fakeDb(), calls = [], tokens = [];
  const run = createCalendarImporter({ db, config, policy: POLICY, now: () => NOW, getAccessToken: async kind => { tokens.push(kind); return 'fixture-token'; }, fetchImpl: async (url, options) => {
    calls.push({ url, ...options }); const page = pages.shift(); if (page instanceof Error) throw page; return typeof page === 'function' ? page() : page;
  } });
  return { db, calls, tokens, run };
}
test('importer disabled/unverified/insufficient private access fails before token/network/state writes', async () => {
  for (const config of [{}, { ...CONFIG, readEnabled: false }, { ...CONFIG, accessRole: 'reader' }, { ...CONFIG, privateEventAccessVerified: false }]) {
    const f = fixture([], config); await assert.rejects(f.run(RANGE), /calendar-import-not-configured/);
    assert.equal(f.calls.length, 0); assert.equal(f.tokens.length, 0); assert.equal(f.db.data.size, 0);
    assert.ok(calendarReadConfigurationIssues(config).every(code => !code.includes('fixture@')));
  }
});
test('complete paginated content list imports transparent all-day counts and private blocks without retaining private fields', async () => {
  const f = fixture([reply([countEvent('private-source')], { nextPageToken: 'page-2' }), reply([{ id: 'private-tour', summary: 'סיור פרטי Secret Customer', attendees: [{ email: 'private@example.test' }], start: { date: '2026-11-15' }, end: { date: '2026-11-16' } }])]);
  assert.deepEqual(await f.run(RANGE), { status: 'complete', weeks: 2 });
  const first = f.db.data.get('calendarAvailability/2026-11-08'), second = f.db.data.get('calendarAvailability/2026-11-15');
  assert.deepEqual(first.externalDeclaredCounts, [27]); assert.equal(second.blocked, true);
  for (const call of f.calls) {
    assert.equal(call.method, 'GET'); assert.equal(call.redirect, 'error');
    const query = new URL(call.url).searchParams;
    assert.equal(query.get('singleEvents'), 'true'); assert.equal(query.get('timeZone'), 'Asia/Jerusalem');
    assert.equal(query.get('q'), null); // no title/free-busy-only filter
  }
  assert.equal(new URL(f.calls[1].url).searchParams.get('pageToken'), 'page-2');
  const stored = JSON.stringify([...f.db.data.values()]);
  assert.doesNotMatch(stored, /Secret Customer|private@example|private-source|private-tour|סיור/);
});
test('failed later page invalidates the whole range; never publishes a partial count or raw provider error', async () => {
  const f = fixture([reply([countEvent('count')], { nextPageToken: 'next' }), new Error('SECRET TOKEN AND PRIVATE TITLE')]);
  f.db.data.set('calendarAvailability/2026-11-08', { complete: true, validUntilMs: NOW + 300000 });
  await assert.rejects(f.run(RANGE), /calendar-list-unavailable/);
  for (const week of ['2026-11-08', '2026-11-15']) assert.equal(f.db.data.get(`calendarAvailability/${week}`).complete, false);
  assert.doesNotMatch(JSON.stringify([...f.db.data.values()]), /SECRET|PRIVATE/);
});
test('masked titles, page cycles, duplicate IDs and partial week ranges fail closed', async () => {
  for (const pages of [[reply([{ id: 'masked', start: { date: '2026-11-12' } }])], [reply([], { accessRole: 'reader' })], [reply([], { nextPageToken: 'loop' }), reply([], { nextPageToken: 'loop' })], [reply([countEvent('same')], { nextPageToken: 'next' }), reply([countEvent('same')])]]) {
    const f = fixture(pages); await assert.rejects(f.run(RANGE), /calendar-list-incomplete/);
    assert.equal(f.db.data.get('calendarAvailability/2026-11-08').complete, false);
  }
  const f = fixture([]); await assert.rejects(f.run({ fromDate: '2026-11-12', toDate: RANGE.toDate }), /calendar-range-incomplete/);
  assert.equal(f.calls.length, 0); assert.equal(f.db.data.size, 0);
});
test('slow older importer cannot publish or invalidate a newer complete snapshot', async () => {
  for (const oldFails of [false, true]) {
    const db = fakeDb(); let release, entered;
    const enteredPromise = new Promise(resolve => { entered = resolve; });
    const old = createCalendarImporter({ db, config: CONFIG, policy: POLICY, now: () => NOW, getAccessToken: async () => 'fixture', fetchImpl: async () => { entered(); return new Promise(resolve => { release = () => resolve(oldFails ? { ok: false, status: 503, json: async () => ({}) } : reply([countEvent('old', 1)])); }); } });
    const oldResult = old(RANGE); await enteredPromise;
    const latest = createCalendarImporter({ db, config: CONFIG, policy: POLICY, now: () => NOW + 1, getAccessToken: async () => 'fixture', fetchImpl: async () => reply([countEvent('new', 29)]) });
    await latest(RANGE); release();
    if (oldFails) await assert.rejects(oldResult); else assert.equal((await oldResult).status, 'superseded');
    const saved = db.data.get('calendarAvailability/2026-11-08'); assert.equal(saved.complete, true); assert.deepEqual(saved.externalDeclaredCounts, [29]);
  }
});
test('managed Calendar count imports only the reconciled external baseline and website participants are not added twice', async () => {
  const event = countEvent('fixtureevent01', 29), writeId = '12345678-1234-1234-1234-123456789abc';
  event.extendedProperties = { private: { chilikSession: '2026-11-12', chilikSyncWrite: writeId } };
  const f = fixture([reply([event])]);
  const binding = { approved: true, reconciled: true, calendarId: CONFIG.calendarId, eventId: event.id, tourDate: '2026-11-12', weekStart: '2026-11-08', externalParticipants: 27, adoptionCount: 27, adoptionEtag: 'initial' };
  f.db.data.set('calendarSessions/2026-11-12', binding);
  f.db.data.set(`calendarWriteIntents/${writeId}`, { calendarId: CONFIG.calendarId, eventId: event.id, bindingHash: bindingHash(binding), total: 29 });
  await f.run(RANGE);
  const snapshot = f.db.data.get('calendarAvailability/2026-11-08'); assert.deepEqual(snapshot.externalDeclaredCounts, [27]);
  const counter = { reconciled: true, currentRegistrations: 29, heldParticipants: 2, confirmedParticipants: 27, reconciledCalendarCountFingerprint: snapshot.externalCountFingerprint };
  assert.equal(assertWeeklyAvailability(snapshot, counter, { policy: POLICY, weekStart: '2026-11-08', maxParticipants: 30, participants: 1, nowMs: NOW }), 29);
});
test('multi-day numeric annotation contributes once per week, distinct annotations remain distinct', () => {
  const event = { ...countEvent('span'), start: { date: '2026-11-10' }, end: { date: '2026-11-14' } };
  const snapshots = buildCalendarWeekSnapshots([event, countEvent('distinct', 1)], { policy: POLICY, ...RANGE, complete: true, nowMs: NOW });
  assert.deepEqual(snapshots['2026-11-08'].externalDeclaredCounts, [1, 27]);
});

test('a list older than the freshness window never becomes a fresh completed snapshot', async () => {
  const db = fakeDb(); let clock = NOW;
  const run = createCalendarImporter({ db, config: CONFIG, policy: POLICY, now: () => clock, getAccessToken: async () => 'fixture', fetchImpl: async () => { clock += POLICY.maxAgeMs; return reply([]); } });
  await assert.rejects(run(RANGE), /calendar-list-unavailable/);
  assert.equal(db.data.get('calendarAvailability/2026-11-08').complete, false);
});

test('large declared counts cannot silently become an empty week', () => {
  const snapshots = buildCalendarWeekSnapshots([countEvent('large', 1000)], { policy: POLICY, ...RANGE, complete: true, nowMs: NOW });
  assert.deepEqual(snapshots['2026-11-08'].externalDeclaredCounts, [1000]);
  assert.equal(snapshots['2026-11-08'].requiresCountReconciliation, true);
  assert.throws(() => buildCalendarWeekSnapshots([countEvent('unsafe', '99999999999999999999')], { policy: POLICY, ...RANGE, complete: true, nowMs: NOW }), /calendar-data-invalid/);
});
