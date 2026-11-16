'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBooking } = require('../src/booking-core');
const { upcomingThursdays, calendarImportRange } = require('../src/calendar-runtime');
const { buildCalendarWeekSnapshots, APPROVED_WEEK_POLICY, weekStartDate } = require('../src/weekly-availability');
const { publicAvailability } = require('../src/calendar-api');
const { createBookingService } = require('../src/booking-service');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const NOW = Date.parse('2026-11-16T10:00:00Z');
const POLICY = { ...APPROVED_WEEK_POLICY, enabled: true };
const INPUT = { name: 'Fixture Customer', phone: '0501234567', participants: 1, paymentMethod: 'credit', adultConfirmed: true, agreeToTerms: true };

for (const date of ['2027-01-07', '2027-12-30', '2028-01-06', '2028-12-28']) {
  test(`registration date validation accepts ${date}`, () => {
    assert.equal(validateBooking({ ...INPUT, tourDate: date }, new Date(NOW)).tourDate, date);
  });
}
test('registration stays closed beyond the approved 2028 year and on non-Thursdays', () => {
  for (const date of ['2029-01-04', '2028-12-29', '2028-02-29']) assert.throws(() => validateBooking({ ...INPUT, tourDate: date }, new Date(NOW)), /invalid-date/);
});
test('published dates include every Thursday of both future years', () => {
  const dates = upcomingThursdays(NOW);
  assert.equal(dates[0], '2026-11-19');
  assert.equal(dates.at(-1), '2028-12-28');
  assert.equal(dates.filter(d => d.startsWith('2027-')).length, 52);
  assert.equal(dates.filter(d => d.startsWith('2028-')).length, 52);
  assert.equal(dates.includes('2029-01-04'), false);
});
test('calendar import covers complete weeks through the approved final year', () => {
  assert.deepEqual(calendarImportRange(NOW), { fromDate: '2026-11-15', toDate: '2029-01-07' });
  const weeks = buildCalendarWeekSnapshots([], { policy: POLICY, fromDate: '2026-11-15', toDate: '2029-01-07', complete: true, nowMs: NOW });
  assert.equal(Object.keys(weeks).length, 112);
  assert.equal(weeks['2028-12-24'].complete, true);
});

function seedDates(db, dates, events = []) {
  db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 30 });
  for (const date of dates) {
    const week = weekStartDate(date, POLICY), end = new Date(Date.parse(`${week}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
    db.data.set(`calendarAvailability/${week}`, buildCalendarWeekSnapshots(events, { policy: POLICY, fromDate: week, toDate: end, complete: true, nowMs: NOW })[week]);
    db.data.set(`bookingWeeks/${week}`, { reconciled: true, currentRegistrations: 0, confirmedParticipants: 0, heldParticipants: 0 });
  }
}
test('public projection advertises all 104 future dates after verified counters exist', async () => {
  const db = fakeDb(); seedDates(db, upcomingThursdays(NOW));
  const result = await publicAvailability(db, POLICY, NOW);
  const future = Object.entries(result.publicAvailability).filter(([date]) => date >= '2027-01-01');
  assert.equal(future.length, 104);
  assert.ok(future.every(([,row]) => row.available && row.availableSpots === 30));
  assert.deepEqual(Object.keys(result.publicAvailability['2028-12-28']).sort(), ['available','availableSpots','maxParticipants','validUntilMs']);
});
test('future full capacity and private overlap are enforced at both projection and checkout', async () => {
  const db = fakeDb(), date = '2028-12-28', week = '2028-12-24';
  seedDates(db, [date]);
  const service = createBookingService(db, Timestamp, { weeklyPolicy: POLICY });
  db.data.set(`bookingWeeks/${week}`, { reconciled: true, currentRegistrations: 30, confirmedParticipants: 30, heldParticipants: 0 });
  assert.equal((await publicAvailability(db, POLICY, NOW)).publicAvailability[date]?.available, false);
  await assert.rejects(service.create('fixture-owner','a'.repeat(32),{...INPUT,tourDate:date},NOW), /capacity-exceeded/);
  seedDates(db, [date], [{ summary: 'סיור פרטי Fixture', start: { dateTime: '2028-12-28T21:00:00+02:00' }, end: { dateTime: '2028-12-28T22:00:00+02:00' } }]);
  assert.equal((await publicAvailability(db, POLICY, NOW)).publicAvailability[date]?.available, false);
  await assert.rejects(service.create('fixture-owner','b'.repeat(32),{...INPUT,tourDate:date},NOW), /tour-unavailable/);
});
