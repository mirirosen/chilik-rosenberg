'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { buildCalendarWeekSnapshots, APPROVED_WEEK_POLICY } = require('../src/weekly-availability');
const { publicAvailability } = require('../src/calendar-api');
const { initialize2027And2028Capacity } = require('../src/capacity-initialization');
const NOW = Date.parse('2026-11-16T10:00:00Z'), POLICY = { ...APPROVED_WEEK_POLICY, enabled: true };
const SETTINGS = 'artifacts/hilik-rosenberg-v1/public/data/settings/global';
const TOUR = 'artifacts/hilik-rosenberg-v1/public/data/tourDates/';
function fixture(events = []) {
  const db = fakeDb(); db.data.set(SETTINGS, { globalMaxParticipants: 30, blocked: [], soldOut: [] });
  const weeks = buildCalendarWeekSnapshots(events, { policy: POLICY, fromDate: '2027-01-03', toDate: '2028-12-31', complete: true, nowMs: NOW });
  for (const [week, snapshot] of Object.entries(weeks)) db.data.set(`calendarAvailability/${week}`, snapshot);
  return { db, run: apply => initialize2027And2028Capacity({ db, Timestamp, apply, nowMs: NOW }) };
}
const counters = db => [...db.data.keys()].filter(k => k.startsWith('bookingWeeks/'));
test('dry-run audits all 104 dates without creating capacity', async () => {
  const f = fixture(), result = await f.run(false);
  assert.equal(result.dates, 104); assert.equal(result.weeksToCreate, 104); assert.equal(result.toursToCreate, 104);
  assert.equal(result.applied, false); assert.equal(counters(f.db).length, 0);
});
test('explicit apply initializes all verified-empty weeks and dates', async () => {
  const f = fixture(), result = await f.run(true);
  assert.equal(result.applied, true); assert.equal(result.createdWeeks, 104); assert.equal(result.createdTours, 104);
  assert.equal(counters(f.db).length, 104);
  const { updatedAt, ...counter } = f.db.data.get('bookingWeeks/2028-12-24');
  assert.deepEqual(counter, { reconciled:true,currentRegistrations:0,heldParticipants:0,confirmedParticipants:0,externalParticipants:0 });
  assert.equal(updatedAt.toMillis(), NOW);
  assert.equal(f.db.data.get(TOUR+'2028-12-28').currentRegistrations, 0);
  assert.equal(f.db.data.has(TOUR+'2029-01-04'), false);
});
test('a rerun never resets existing reservations', async () => {
  const f = fixture(); await f.run(true);
  const existing = { ...f.db.data.get('bookingWeeks/2027-01-03'), currentRegistrations:7, confirmedParticipants:7 };
  f.db.data.set('bookingWeeks/2027-01-03', existing); f.db.data.get(TOUR+'2027-01-07').currentRegistrations = 7;
  f.db.data.set('bookings/new-reservation', { tourDate:'2027-01-07', participants:7, capacityReserved:true, status:'confirmed' });
  const result = await f.run(true);
  assert.equal(result.createdWeeks, 0); assert.equal(result.createdTours, 0);
  assert.equal(f.db.data.get('bookingWeeks/2027-01-03'), existing);
});
test('a booking appearing after dry-run aborts the entire initialization', async () => {
  const f = fixture(); await f.run(false);
  f.db.data.set('bookings/changed', { tourDate:'2028-12-28',participants:2,status:'confirmed',capacityReserved:true });
  await assert.rejects(f.run(true), /capacity-audit-changed/);
  assert.equal(counters(f.db).length, 0);
});
test('legacy bookings, calendar count bindings and count annotations require reconciliation', async () => {
  for (const [path, value] of [
    ['artifacts/hilik-rosenberg-v1/public/data/bookings/legacy', { tourDate:'2027-01-07',participants:2 }],
    ['calendarSessions/external', { tourDate:'2027-01-07',externalParticipants:2 }],
  ]) {
    const f = fixture(); f.db.data.set(path, value);
    await assert.rejects(f.run(true), /capacity-audit-changed/); assert.equal(counters(f.db).length, 0);
  }
  const f = fixture([{summary:'8 אנשים',start:{date:'2027-01-07'},end:{date:'2027-01-08'}}]);
  await assert.rejects(f.run(true), /capacity-audit-changed/); assert.equal(counters(f.db).length, 0);
});
test('unknown existing counts and unreconciled counters are never overwritten', async () => {
  const daily = fixture(); daily.db.data.set(TOUR+'2027-01-07', { date:'2027-01-07',currentRegistrations:4 });
  await assert.rejects(daily.run(true), /capacity-audit-changed/);
  assert.equal(daily.db.data.get(TOUR+'2027-01-07').currentRegistrations, 4); assert.equal(counters(daily.db).length, 0);
  const weekly = fixture(); weekly.db.data.set('bookingWeeks/2027-01-03', { reconciled:false,currentRegistrations:4 });
  await assert.rejects(weekly.run(true), /capacity-requires-reconciliation/);
  assert.equal(weekly.db.data.get('bookingWeeks/2027-01-03').reconciled, false); assert.equal(counters(weekly.db).length, 1);
});
test('missing or stale final-week snapshot prevents every write', async () => {
  for (const change of [db => db.data.delete('calendarAvailability/2028-12-24'), db => { db.data.get('calendarAvailability/2028-12-24').validUntilMs=NOW; }]) {
    const f = fixture(); change(f.db);
    await assert.rejects(f.run(true), /calendar-unavailable/); assert.equal(counters(f.db).length, 0);
  }
});
test('custom caps, manual blocks and overlapping private events remain effective', async () => {
  const f = fixture([{summary:'סיור פרטי Fixture',start:{dateTime:'2028-12-28T21:00:00+02:00'},end:{dateTime:'2028-12-28T22:00:00+02:00'}}]);
  const custom = { date:'2027-01-07',currentRegistrations:0,useGlobalMax:false,customMax:11 };
  f.db.data.set(TOUR+'2027-01-07', custom); f.db.data.get(SETTINGS).blocked=['2027-01-14'];
  const before = JSON.stringify(f.db.data.get('calendarAvailability/2028-12-24'));
  await f.run(true);
  const rows = (await publicAvailability(f.db, POLICY, NOW)).publicAvailability;
  assert.equal(rows['2027-01-07'].availableSpots, 11);
  assert.equal(rows['2027-01-14'].available, false); assert.equal(rows['2028-12-28'].available, false);
  assert.equal(f.db.data.get(TOUR+'2027-01-07'), custom);
  assert.equal(JSON.stringify(f.db.data.get('calendarAvailability/2028-12-24')), before);
});
