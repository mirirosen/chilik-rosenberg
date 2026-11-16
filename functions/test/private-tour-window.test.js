'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { APPROVED_WEEK_POLICY, buildCalendarWeekSnapshots, weekStartDate, assertWeeklyAvailability } = require('../src/weekly-availability');
const { publicAvailability } = require('../src/calendar-api');
const { createBookingService } = require('../src/booking-service');

const POLICY = { ...APPROVED_WEEK_POLICY, enabled: true };
const SETTINGS = 'artifacts/hilik-rosenberg-v1/public/data/settings/global';
const input = date => ({ name: 'Fixture Customer', phone: '0501234567', participants: 2, tourDate: date, paymentMethod: 'bank_transfer', adultConfirmed: true, agreeToTerms: true });
const timed = (start, end) => ({ summary: 'סיור פרטי Synthetic', start: { dateTime: start }, end: { dateTime: end } });
const allDay = (start, end) => ({ summary: 'סיור פרטי Synthetic', start: { date: start }, end: { date: end } });

function scenario(events, date = '2026-11-26') {
  const now = Date.parse(`${date}T10:00:00Z`) - 3 * 86400000;
  const week = weekStartDate(date, POLICY), end = new Date(Date.parse(`${week}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const db = fakeDb(), service = createBookingService(db, Timestamp, { weeklyPolicy: POLICY });
  const snapshot = buildCalendarWeekSnapshots(events, { policy: POLICY, fromDate: week, toDate: end, complete: true, nowMs: now })[week];
  db.data.set(SETTINGS, { globalMaxParticipants: 30 });
  db.data.set(`calendarAvailability/${week}`, snapshot);
  db.data.set(`bookingWeeks/${week}`, { reconciled: true, currentRegistrations: 0, confirmedParticipants: 0, heldParticipants: 0 });
  return { db, service, snapshot, week, now, options: { policy: POLICY, weekStart: week, tourDate: date, maxParticipants: 30, participants: 2, nowMs: now }, row: async () => (await publicAvailability(db, POLICY, now)).publicAvailability[date] };
}

// These catch the reported production failure through both real consumers.
for (const [date, events] of [
  ['2026-11-26', [allDay('2026-11-25', '2026-11-26')]],
  ['2026-12-10', [timed('2026-12-09T17:30:00+02:00', '2026-12-09T18:30:00+02:00'), timed('2026-12-09T20:30:00+02:00', '2026-12-09T21:30:00+02:00')]],
]) {
  test(`${date}: previous-day private tours permit public availability and registration`, async () => {
    const f = scenario(events, date);
    const row = await f.row();
    assert.equal(row.available, true);
    assert.equal(row.availableSpots, 30);
    const booking = await f.service.create('fixture-owner', 'a'.repeat(32), input(date), f.now);
    assert.equal(booking.tourDate, date);
    await f.service.change(booking.bookingId, 'confirm', 'fixture-admin', null, f.now);
    assert.equal(f.db.data.get(`bookingWeeks/${f.week}`).confirmedParticipants, 2);
    assert.doesNotMatch(JSON.stringify(row), /Synthetic|privateTour|blocked|event/);
  });
}

// Literal expected outcomes are independent of the overlap implementation.
for (const [name, event, available] of [
  ['morning on the same date', timed('2026-11-26T10:00:00+02:00', '2026-11-26T13:00:00+02:00'), true],
  ['ends exactly at 20:00', timed('2026-11-26T19:00:00+02:00', '2026-11-26T20:00:00+02:00'), true],
  ['starts exactly at 23:00', timed('2026-11-26T23:00:00+02:00', '2026-11-27T00:00:00+02:00'), true],
  ['overlaps the public start', timed('2026-11-26T19:30:00+02:00', '2026-11-26T20:00:01+02:00'), false],
  ['overlaps the public end', timed('2026-11-26T22:59:59+02:00', '2026-11-27T00:30:00+02:00'), false],
  ['contains the public tour', timed('2026-11-26T18:00:00+02:00', '2026-11-27T01:00:00+02:00'), false],
  ['overnight ends in the morning', timed('2026-11-25T23:30:00+02:00', '2026-11-26T01:00:00+02:00'), true],
  ['overnight reaches the public tour', timed('2026-11-25T23:30:00+02:00', '2026-11-26T20:01:00+02:00'), false],
  ['all day on Wednesday with Thursday exclusive end', allDay('2026-11-25', '2026-11-26'), true],
  ['all day on Thursday', allDay('2026-11-26', '2026-11-27'), false],
  ['multiple days including Thursday', allDay('2026-11-25', '2026-11-27'), false],
  ['cancelled overlapping tour', { ...timed('2026-11-26T20:00:00+02:00', '2026-11-26T22:00:00+02:00'), status: 'cancelled' }, true],
]) {
  test(`private tour ${name}: public projection and checkout agree`, async () => {
    const f = scenario([event]);
    const row = await f.row();
    assert.equal(row.available, available);
    assert.equal(row.availableSpots, available ? 30 : 0);
    const create = () => f.service.create('fixture-owner', 'b'.repeat(32), input('2026-11-26'), f.now);
    if (available) assert.equal((await create()).status, 'pending');
    else {
      await assert.rejects(create(), /tour-unavailable/);
      assert.equal([...f.db.data.keys()].filter(k => k.startsWith('bookings/')).length, 0);
    }
  });
}

for (const [date, start, end, available] of [
  ['2026-03-26', '2026-03-26T17:00:00Z', '2026-03-26T18:00:00Z', true],
  ['2026-03-26', '2026-03-26T18:00:00Z', '2026-03-26T18:01:00Z', false],
  ['2026-04-02', '2026-04-02T16:00:00Z', '2026-04-02T17:00:00Z', true],
  ['2026-04-02', '2026-04-02T17:00:00Z', '2026-04-02T17:01:00Z', false],
  ['2026-10-22', '2026-10-22T17:00:00Z', '2026-10-22T17:01:00Z', false],
  ['2026-10-29', '2026-10-29T17:00:00Z', '2026-10-29T18:00:00Z', true],
]) {
  test(`${date}: Jerusalem public start uses the correct DST offset for ${start}`, async () => {
    assert.equal((await scenario([timed(start, end)], date).row()).available, available);
  });
}

test('confirmation rechecks a newly imported overlapping private tour without reserving seats', async () => {
  const f = scenario([]);
  const booking = await f.service.create('fixture-owner', 'c'.repeat(32), input('2026-11-26'), f.now);
  f.db.data.set(`calendarAvailability/${f.week}`, scenario([timed('2026-11-26T21:00:00+02:00', '2026-11-26T22:00:00+02:00')]).snapshot);
  await assert.rejects(f.service.change(booking.bookingId, 'confirm', 'fixture-admin', null, f.now), /capacity-full-at-confirmation/);
  assert.equal(f.db.data.get(`bookingWeeks/${f.week}`).currentRegistrations, 0);
  assert.equal(f.db.data.get(`bookings/${booking.bookingId}`).capacityReserved, false);
});

test('legacy snapshots without private intervals fail closed until a complete import', async () => {
  const f = scenario([]);
  delete f.snapshot.privateTourWindows;
  assert.equal((await f.row()).available, false);
  await assert.rejects(f.service.create('fixture-owner', 'd'.repeat(32), input('2026-11-26'), f.now), /calendar-unavailable/);
});

test('missing or mismatched selected date cannot skip the private-window check', () => {
  const f = scenario([]), c = f.db.data.get(`bookingWeeks/${f.week}`);
  assert.throws(() => assertWeeklyAvailability(f.snapshot, c, { ...f.options, tourDate: undefined }), /calendar-unavailable/);
  assert.throws(() => assertWeeklyAvailability(f.snapshot, c, { ...f.options, tourDate: '2026-12-10' }), /calendar-unavailable/);
});

test('malformed private intervals fail closed', async () => {
  for (const windows of [null, [{ startMs: 1, endMs: 0 }], [{ startMs: '1', endMs: 2 }]]) {
    const f = scenario([]);
    f.snapshot.privateTourWindows = windows;
    assert.equal((await f.row()).available, false);
  }
});
