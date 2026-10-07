'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildReconciliationPlan, bookingFingerprint } = require('../src/reconciliation-core');
const date = '2026-10-08', nowMs = 1791450000000;
const booking = (id, patch = {}) => ({ id, tourDate: date, participants: 2, schemaVersion: 2, revision: 1, capacityReserved: true, status: 'pending', paymentStatus: 'pending', paymentMethod: 'bit', ...patch });
function input(bookings = [], count = 0) { return { bookings, tours: [{ date, currentRegistrations: count, maxParticipants: 30 }], snapshot: { id: 'snapshot-1', complete: true, scopeDates: [date] }, nowMs }; }
const disposition = (b, classification, extra = {}) => ({ id: b.id, expectedBookingFingerprint: bookingFingerprint(b), classification, reason: 'Operator reviewed reservation evidence', ...extra });
const has = (plan, code) => plan.findings.some(f => f.code === code);
function frozen(value) { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); } return value; }

test('mixed booked, held, released and payment review totals use reservation ownership once', () => {
  const p = buildReconciliationPlan(input([
    booking('booked', { status: 'confirmed', participants: 3 }),
    booking('held'),
    booking('released', { status: 'cancelled', paymentStatus: 'cancelled', capacityReserved: false, participants: 4 }),
    booking('review', { status: 'payment_review', paymentStatus: 'pending_review', paymentMethod: 'credit', capacityReserved: false })
  ], 5));
  assert.equal(p.status, 'consistent');
  assert.deepEqual(p.tours[0].totals, { booked: 3, held: 2, released: 4, paymentReview: 2, reviewReserved: 0, unresolvedBookings: 0, reserved: 5 });
  assert.equal(p.tours[0].countProposal, null);
  assert.ok(has(p, 'payment-review-required-no-financial-action'));
});
test('legacy pending and confirmed are ambiguous until explicitly dispositioned', () => {
  const pending = booking('legacy-pending', { schemaVersion: undefined, capacityReserved: undefined });
  const confirmed = booking('legacy-confirmed', { schemaVersion: undefined, capacityReserved: undefined, status: 'confirmed' });
  const data = input([pending, confirmed], 6);
  const unresolved = buildReconciliationPlan(data);
  assert.equal(unresolved.tours[0].expectedCount, null);
  assert.equal(unresolved.tours[0].countProposal, null);
  data.dispositions = [disposition(pending, 'held'), disposition(confirmed, 'booked')];
  const p = buildReconciliationPlan(data);
  assert.equal(p.tours[0].expectedCount, 4);
  assert.equal(p.tours[0].delta, -2);
  assert.deepEqual(p.tours[0].countProposal, { operation: 'set-absolute-count-after-review', field: 'currentRegistrations', expectedBefore: 6, value: 4, requiresCompleteSnapshotRecheck: true });
  assert.equal(p.bookings[0].source, 'legacy');
  assert.equal(p.executable, false);
  assert.ok(p.safeguards.includes('no-schema-migration'));
});
test('legacy cancelled never assumes release; review disposition requires explicit reservation choice', () => {
  const legacy = booking('legacy', { schemaVersion: undefined, status: 'cancelled', paymentStatus: 'completed', capacityReserved: undefined });
  const data = input([legacy], 2);
  assert.equal(buildReconciliationPlan(data).tours[0].expectedCount, null);
  data.dispositions = [disposition(legacy, 'payment_review')];
  assert.ok(has(buildReconciliationPlan(data), 'invalid-manual-disposition'));
  data.dispositions = [disposition(legacy, 'payment_review', { reserveSeats: true })];
  const p = buildReconciliationPlan(data);
  assert.equal(p.tours[0].totals.reviewReserved, 2);
  assert.equal(p.bookings[0].classification, 'payment_review');
  assert.equal(p.bookings[0].paymentStatus, undefined);
  data.dispositions = [disposition(legacy, 'released')];
  assert.equal(buildReconciliationPlan(data).tours[0].expectedCount, 0);
});
test('expired but still-owned holds remain counted until lifecycle release', () => {
  const expired = booking('expired', { status: 'payment_pending', paymentStatus: 'awaiting_payment', paymentMethod: 'credit', holdExpiresAtMs: nowMs - 1 });
  const p = buildReconciliationPlan(input([expired], 2));
  assert.equal(p.tours[0].expectedCount, 2);
  assert.equal(p.tours[0].countProposal, null);
  assert.ok(has(p, 'expired-hold-still-reserved-use-lifecycle-release'));
  const invalid = buildReconciliationPlan(input([{ ...expired, holdExpiresAtMs: undefined }], 2));
  assert.ok(has(invalid, 'invalid-hold-expiry'));
  assert.equal(invalid.tours[0].countProposal, null);
});
test('paid cancellation is released but never proposes financial or owner changes', () => {
  const p = buildReconciliationPlan(input([booking('paid', { status: 'cancelled', paymentStatus: 'paid', capacityReserved: false, paymentMethod: 'credit', refundStatus: 'manual_review_required' })], 2));
  assert.equal(p.tours[0].expectedCount, 0);
  assert.ok(has(p, 'cancelled-payment-needs-manual-review-no-refund-inferred'));
  assert.equal(p.bookings[0].refundStatus, undefined);
  assert.equal(p.bookings[0].ownerUid, undefined);
  assert.equal(p.bookings[0].schemaVersion, undefined);
});
test('invalid participant/count values and contradictory lifecycle never propose corrections', () => {
  for (const participants of [-1, 0, 1.5, '2', NaN, 21]) {
    const p = buildReconciliationPlan(input([booking('bad', { participants })], 0));
    assert.equal(p.tours[0].countProposal, null);
    assert.ok(has(p, 'invalid-participants'));
  }
  for (const count of [-1, 1.5, '2', undefined]) {
    const data = input([booking('good')]); data.tours[0].currentRegistrations = count;
    const p = buildReconciliationPlan(data);
    assert.ok(has(p, 'invalid-stored-count'));
    assert.equal(p.tours[0].countProposal, null);
  }
  for (const patch of [{ status: 'confirmed', capacityReserved: false }, { status: 'cancelled' }, { status: 'made-up' }, { status: 'confirmed', paymentMethod: 'credit' }, { paymentStatus: 'completed' }]) {
    assert.equal(buildReconciliationPlan(input([booking('bad', patch)], 0)).tours[0].expectedCount, null);
  }
});
test('partial snapshots, missing tour snapshots and duplicate booking IDs block proposals', () => {
  const partial = input([booking('a')], 10); partial.snapshot.complete = false;
  assert.equal(buildReconciliationPlan(partial).tours[0].countProposal, null);
  const missing = input([booking('a')]); missing.tours = [];
  assert.ok(has(buildReconciliationPlan(missing), 'missing-tour-snapshot'));
  const duplicate = buildReconciliationPlan(input([booking('a'), booking('a')], 10));
  assert.ok(has(duplicate, 'duplicate-booking-id'));
  assert.equal(duplicate.tours[0].countProposal, null);
  const invalid = buildReconciliationPlan(input([booking('bad', { tourDate: '2026-99-99' })], 10));
  assert.equal(invalid.tours[0].countProposal, null);
});
test('manual dispositions are version-bound, cannot override v2, and cannot be contradictory', () => {
  const legacy = booking('legacy', { schemaVersion: undefined });
  const data = input([legacy], 10);
  data.dispositions = [disposition(legacy, 'held')];
  legacy.participants = 3;
  assert.ok(has(buildReconciliationPlan(data), 'stale-manual-disposition'));
  data.dispositions = [disposition(legacy, 'released', { reserveSeats: true })];
  assert.ok(has(buildReconciliationPlan(data), 'contradictory-manual-disposition'));
  const modern = booking('modern');
  const modernData = input([modern], 5); modernData.dispositions = [disposition(modern, 'released')];
  assert.ok(has(buildReconciliationPlan(modernData), 'v2-disposition-not-allowed'));
  assert.equal(buildReconciliationPlan(modernData).tours[0].countProposal, null);
});
test('repeat-safe absolute proposals stabilize after matching counts, never increment twice', () => {
  const data = input([booking('a')], 4);
  const first = buildReconciliationPlan(data), repeat = buildReconciliationPlan(data);
  assert.deepEqual(first, repeat);
  data.tours[0].currentRegistrations = first.tours[0].countProposal.value;
  const reconciled = buildReconciliationPlan(data);
  assert.equal(reconciled.status, 'consistent');
  assert.equal(reconciled.tours[0].countProposal, null);
  assert.notEqual(first.planId, reconciled.planId);
});
test('plans ignore input ordering, do not mutate input, and expose no customer PII or freeform reasons', () => {
  const a = booking('a', { name: 'PRIVATE NAME', email: 'private@example.test', notes: 'PRIVATE NOTES', dateOfBirth: '2000-01-01' });
  const b = booking('b');
  const data = frozen(input([b, a], 4));
  const p = buildReconciliationPlan(data);
  assert.equal(p.planId, buildReconciliationPlan(input([a, b], 4)).planId);
  assert.doesNotMatch(JSON.stringify(p), /PRIVATE|private@example|2000-01-01/);
  const legacy = booking('legacy', { schemaVersion: undefined });
  const manual = input([legacy], 2); manual.dispositions = [disposition(legacy, 'held', { reason: 'PRIVATE reason with email@example.test' })];
  assert.doesNotMatch(JSON.stringify(buildReconciliationPlan(manual)), /PRIVATE|email@example/);
});
test('overcapacity is highlighted and requires manual resolution, no automatic cancellations', () => {
  const data = input([booking('a', { participants: 20 }), booking('b', { participants: 20 })], 10);
  const p = buildReconciliationPlan(data);
  assert.ok(has(p, 'reservations-exceed-effective-capacity'));
  assert.equal(p.tours[0].countProposal, null);
  assert.equal(p.bookings.filter(b => b.classification === 'held').length, 2);
});
test('complete empty session proposes zero; uncertain records block only affected known session', () => {
  const empty = buildReconciliationPlan(input([], 6));
  assert.equal(empty.tours[0].expectedCount, 0);
  const data = input([booking('legacy', { schemaVersion: undefined })], 6);
  data.snapshot.scopeDates.push('2026-10-15');
  data.tours.push({ date: '2026-10-15', currentRegistrations: 4, maxParticipants: 30 });
  const p = buildReconciliationPlan(data);
  assert.equal(p.tours[0].expectedCount, null);
  assert.equal(p.tours[1].expectedCount, 0);
});

test('unknown future schemas, duplicate dispositions and orphan dispositions fail closed', () => {
  const future = booking('future', { schemaVersion: 3 });
  const data = input([future], 10); data.dispositions = [disposition(future, 'released')];
  assert.ok(has(buildReconciliationPlan(data), 'unsupported-schema-version'));
  const legacy = booking('legacy', { schemaVersion: undefined });
  const duplicate = input([legacy], 10); duplicate.dispositions = [disposition(legacy, 'held'), disposition(legacy, 'released')];
  assert.ok(has(buildReconciliationPlan(duplicate), 'duplicate-disposition'));
  assert.equal(buildReconciliationPlan(duplicate).tours[0].countProposal, null);
  const orphan = input([], 10); orphan.dispositions = [disposition(legacy, 'released')];
  assert.ok(has(buildReconciliationPlan(orphan), 'orphan-manual-disposition'));
  assert.equal(buildReconciliationPlan(orphan).tours[0].countProposal, null);
});
