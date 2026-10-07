'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createBookingService } = require('../src/booking-service');
const { APPROVED_WEEK_POLICY, weekStartDate, localDateAt, buildCalendarWeekSnapshots, assertWeeklyAvailability, weekIsFull } = require('../src/weekly-availability');
// Approved business rules, enabled only in this isolated test fixture.
const POLICY = { ...APPROVED_WEEK_POLICY, enabled: true };
const counter = n => ({ reconciled:true,currentRegistrations:n,heldParticipants:n,confirmedParticipants:0 });
const NOW = Date.parse('2026-10-02T10:00:00Z'), DATE = '2026-10-08', WEEK = '2026-10-04';
const INPUT = { name: 'Fixture Customer', phone: '0501234567', email: 'fixture@example.test', participants: 2, tourDate: DATE, paymentMethod: 'bit', dateOfBirth: '1990-01-01', agreeToTerms: true };
const snapshots = (events = [], options = {}) => buildCalendarWeekSnapshots(events, { policy: POLICY, fromDate: '2026-10-04', toDate: '2026-10-18', complete: true, nowMs: NOW, ...options });
function fixture(policy = POLICY) {
  const db = fakeDb(), service = createBookingService(db, Timestamp, { weeklyPolicy: policy });
  db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global', { globalMaxParticipants: 30 });
  db.data.set(`bookingWeeks/${WEEK}`, counter(0));
  db.data.set(`calendarAvailability/${WEEK}`, snapshots()[WEEK]);
  return { db, service, count: () => db.data.get(`bookingWeeks/${WEEK}`).currentRegistrations };
}
test('week boundaries are explicit and configurable; Saturday/Sunday differ', () => {
  assert.equal(weekStartDate('2026-10-10', POLICY), '2026-10-04'); assert.equal(weekStartDate('2026-10-11', POLICY), '2026-10-11');
  assert.equal(weekStartDate('2026-10-11', { ...POLICY, weekStartsOn: 1 }), '2026-10-05');
  assert.throws(() => weekStartDate(DATE, { ...POLICY, weekStartsOn: null }), /availability-policy-unconfirmed/);
  assert.throws(() => weekStartDate(DATE, { ...POLICY, timeZone: undefined }), /availability-policy-unconfirmed/);
});
test('Asia/Jerusalem calendar dates remain correct across spring/fall DST changes', () => {
  assert.equal(localDateAt('2026-03-26T21:30:00Z', 'Asia/Jerusalem'), '2026-03-26');
  assert.equal(localDateAt('2026-03-27T21:30:00Z', 'Asia/Jerusalem'), '2026-03-28');
  assert.equal(localDateAt('2026-10-24T22:30:00Z', 'Asia/Jerusalem'), '2026-10-25');
  assert.equal(localDateAt('2026-10-25T22:30:00Z', 'Asia/Jerusalem'), '2026-10-26');
  const result = snapshots([{summary:'סיור פרטי',start:{dateTime:'2026-10-25T01:30:00+03:00'},end:{dateTime:'2026-10-25T01:45:00+02:00'}}], {fromDate:'2026-10-18',toDate:'2026-11-01'});
  assert.equal(result['2026-10-25'].blocked,true); assert.equal(result['2026-10-18'].blocked,false);
});
test('all-day exclusive end blocks only its own week; an overnight event can block two weeks', () => {
  const one = snapshots([{summary:'סיור פרטי',start:{date:'2026-10-10'},end:{date:'2026-10-11'}}]);
  assert.equal(one[WEEK].blocked,true); assert.equal(one['2026-10-11'].blocked,false);
  const two = snapshots([{summary:'סיור פרטי',start:{dateTime:'2026-10-10T23:30:00+03:00'},end:{dateTime:'2026-10-11T00:30:00+03:00'}}]);
  assert.equal(two[WEEK].blocked,true); assert.equal(two['2026-10-11'].blocked,true);
  const midnight = snapshots([{summary:'סיור פרטי',start:{dateTime:'2026-10-10T23:30:00+03:00'},end:{dateTime:'2026-10-11T00:00:00+03:00'}}]);
  assert.equal(midnight['2026-10-11'].blocked,false);
});
test('private snapshots discard titles, IDs and attendees and handle cancellations', () => {
  const result = snapshots([{id:'private-source-id',summary:'סיור  פרטי Customer Secret',attendees:[{email:'secret@example.test'}],start:{date:DATE},end:{date:'2026-10-09'}},{summary:'סיור פרטי',status:'cancelled'}]);
  const json = JSON.stringify(result); for(const value of ['Customer Secret','secret@example.test','private-source-id','סיור']) assert.ok(!json.includes(value));
  assert.equal(result[WEEK].blocked,true);
  assert.throws(() => snapshots([], {complete:false}), /calendar-unavailable/);
  assert.throws(() => snapshots([{summary:'סיור פרטי',recurrence:['RRULE:FREQ=WEEKLY'],start:{date:DATE},end:{date:'2026-10-09'}}]), /calendar-data-invalid/);
  assert.throws(() => snapshots([{summary:'סיור פרטי',start:{dateTime:'2026-10-08T20:00:00'},end:{dateTime:'2026-10-08T22:00:00'}}]), /calendar-data-invalid/);
});
test('stale, incomplete and policy-mismatched snapshots fail closed', () => {
  const snapshot = snapshots()[WEEK], counter = { reconciled:true,currentRegistrations:0,heldParticipants:0,confirmedParticipants:0 }, options = {policy:POLICY,weekStart:WEEK,maxParticipants:30,participants:2,nowMs:NOW};
  assert.equal(assertWeeklyAvailability(snapshot,counter,options),0);
  assert.throws(() => assertWeeklyAvailability(snapshot,counter,{...options,nowMs:NOW+300001}), /calendar-unavailable/);
  assert.throws(() => assertWeeklyAvailability({...snapshot,complete:false},counter,options), /calendar-unavailable/);
  assert.throws(() => assertWeeklyAvailability(snapshot,counter,{...options,policy:{...POLICY,weekStartsOn:1}}), /calendar-unavailable/);
  assert.throws(() => assertWeeklyAvailability(snapshot,{...counter,reconciled:false},options), /capacity-requires-reconciliation/);
  assert.throws(() => assertWeeklyAvailability(snapshot,counter,{...options,policy:{...POLICY,approved:false}}), /availability-policy-unconfirmed/);
});
test('transparent/free business events are read by content; external count is not added twice', () => {
  const countDate='2026-11-12', week='2026-11-08';
  const result=snapshots([{summary:'27 אנשים',transparency:'transparent',status:'confirmed',start:{date:countDate},end:{date:'2026-11-13'}}],{fromDate:'2026-11-08',toDate:'2026-11-15'});
  const snapshot=result[week], options={policy:POLICY,weekStart:week,maxParticipants:30,participants:2,nowMs:NOW};
  assert.equal(snapshot.requiresCountReconciliation,true); assert.deepEqual(snapshot.externalDeclaredCounts,[27]);
  assert.throws(()=>assertWeeklyAvailability(snapshot,{reconciled:true,currentRegistrations:27,heldParticipants:0,confirmedParticipants:27},options),/capacity-requires-reconciliation/);
  const counter={reconciled:true,currentRegistrations:27,heldParticipants:0,confirmedParticipants:27,reconciledCalendarCountFingerprint:snapshot.externalCountFingerprint};
  assert.equal(assertWeeklyAvailability(snapshot,counter,options),27); // not 54
  const blocked=snapshots([{summary:'סיור פרטי Synthetic',transparency:'transparent',status:'confirmed',start:{date:countDate},end:{date:'2026-11-13'}}],{fromDate:'2026-11-08',toDate:'2026-11-15'});
  assert.equal(blocked[week].blocked,true); assert.ok(!JSON.stringify(blocked).includes('Synthetic'));
});
test('>= versus > is an explicit policy choice; neither permits overbooking', () => {
  assert.equal(weekIsFull(30,30,POLICY),true); const alternate={...POLICY,fullWhen:'over-capacity'}; assert.equal(weekIsFull(30,30,alternate),false);
  assert.throws(() => assertWeeklyAvailability(snapshots([], {policy:alternate})[WEEK],counter(30),{policy:alternate,weekStart:WEEK,maxParticipants:30,participants:1,nowMs:NOW}), /capacity-exceeded/);
});
test('server blocks a private-tour week without exposing event details', async () => {
  const {db,service,count}=fixture(); db.data.set(`calendarAvailability/${WEEK}`,snapshots([{summary:'סיור פרטי Secret',start:{date:DATE},end:{date:'2026-10-09'}}])[WEEK]);
  await assert.rejects(service.create('owner','a'.repeat(32),INPUT,NOW), /tour-unavailable/); assert.equal(count(),0); assert.equal([...db.data.keys()].filter(k=>k.startsWith('bookings/')).length,0);
});
test('concurrent quantities enforce 30/week separately from 20/order and retries count once', async () => {
  const {db,service,count}=fixture();
  const result=await Promise.allSettled([service.create('owner','a'.repeat(32),{...INPUT,participants:20},NOW),service.create('owner','b'.repeat(32),{...INPUT,participants:10},NOW),service.create('owner','c'.repeat(32),{...INPUT,participants:1},NOW)]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,2); assert.equal(count(),30);
  assert.match(result[2].reason.message,/capacity-exceeded/);
  const retry=await service.create('owner','a'.repeat(32),{...INPUT,participants:20},NOW+POLICY.maxAgeMs+1); assert.equal(retry.reused,true); assert.equal(count(),30);
  await assert.rejects(service.create('owner','d'.repeat(32),{...INPUT,participants:21},NOW), /invalid-participants/);
  await service.change(result[0].value.bookingId,'cancel','fixture-admin',null,NOW); await service.change(result[0].value.bookingId,'cancel','fixture-admin',null,NOW); assert.equal(count(),10);
  await service.change(result[1].value.bookingId,'confirm','fixture-admin',null,NOW); assert.equal(count(),10);
  assert.equal(db.data.get(`bookingWeeks/${WEEK}`).heldParticipants,0); assert.equal(db.data.get(`bookingWeeks/${WEEK}`).confirmedParticipants,10);
  assert.equal([...db.data.keys()].filter(k=>k.startsWith('whatsappOutbox/')).length,0);
});
test('expiry releases date and week capacity once; late capture cannot reclaim seats', async () => {
  const {db,service,count}=fixture(); const b=await service.create('owner','a'.repeat(32),{...INPUT,paymentMethod:'credit'},NOW);
  assert.equal(count(),2); await service.change(b.bookingId,'expire','fixture-expiry',null,NOW+900001); await service.change(b.bookingId,'expire','fixture-expiry',null,NOW+900002); assert.equal(count(),0);
  const receipt={verified:true,bookingId:b.bookingId,amount:500,currency:'ILS',transactionKey:'fixture:42'};
  const late=await service.change(b.bookingId,'paid','fixture-provider',receipt,NOW+900003); assert.equal(late.paymentStatus,'pending_review'); assert.equal(count(),0);
  assert.equal(db.data.get(service.tourRef(DATE).path).currentRegistrations,0);
});
test('editable global quota is enforced and unapproved runtime policy is not usable', async () => {
  const {db,service,count}=fixture(); db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global',{globalMaxParticipants:15});
  await service.create('owner','a'.repeat(32),{...INPUT,participants:10},NOW); await assert.rejects(service.create('owner','b'.repeat(32),{...INPUT,participants:8},NOW), /capacity-exceeded/); assert.equal(count(),10);
  db.data.set('artifacts/hilik-rosenberg-v1/public/data/settings/global',{globalMaxParticipants:5});
  await assert.rejects(service.create('owner','c'.repeat(32),{...INPUT,participants:1},NOW), /capacity-exceeded/); assert.equal(count(),10); // no automatic cancellation
  const notApproved=fixture({...POLICY,approved:false}); await assert.rejects(notApproved.service.create('owner','a'.repeat(32),INPUT,NOW), /availability-policy-unconfirmed/); assert.equal(notApproved.count(),0);
});
