'use strict';
// Pure planning only. No Firestore SDK, filesystem, provider calls or write executor.
// Caller supplies a complete, normalized snapshot; personal fields are ignored.
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function realDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
const integer = value => Number.isSafeInteger(value) && value >= 0;
const states = new Set(['pending', 'payment_pending', 'confirmed', 'cancelled', 'payment_review']);
const payments = new Set(['pending', 'creating', 'awaiting_payment', 'paid', 'failed', 'expired', 'cancelled', 'pending_review']);
function bookingProjection(b) {
  // Deliberately exclude name, email, phone, DOB, notes and arbitrary audit text.
  return ['id', 'tourDate', 'participants', 'schemaVersion', 'capacityReserved', 'status', 'paymentStatus', 'paymentMethod', 'revision', 'holdExpiresAtMs', 'additionalPaymentReview', 'refundStatus'].map(key => [key, b?.[key] ?? null]);
}
function bookingFingerprint(booking) { return hash(bookingProjection(booking)); }
function tourFingerprint(tour) { return hash(['date', 'currentRegistrations', 'maxParticipants', 'revision'].map(key => [key, tour?.[key] ?? null])); }
/**
 * buildReconciliationPlan({bookings, tours, dispositions=[], snapshot, nowMs})
 * bookings: raw lifecycle fields + Firestore document id and holdExpiresAtMs.
 * tours: {date,currentRegistrations,maxParticipants? (already resolved),revision?}.
 * snapshot: {id,complete:true,scopeDates:[YYYY-MM-DD,...]}; complete is an assertion
 * from the caller, NOT verification performed here. Unscoped/partial data blocks.
 * Legacy disposition: {id,expectedBookingFingerprint,classification,reason,
 * reserveSeats?}; reason is required but never echoed. Review classification needs
 * explicit reserveSeats. Dispositions for v2 never override lifecycle invariants.
 * Output is NOT an executable migration and never invents paid/owner/refund state.
 */
function buildReconciliationPlan({ bookings, tours, dispositions = [], snapshot, nowMs } = {}) {
  if (!Array.isArray(bookings) || !Array.isArray(tours) || !Array.isArray(dispositions) || !integer(nowMs)) throw new Error('invalid-reconciliation-input');
  const findings = [];
  const add = (code, { date, id, severity = 'blocking' } = {}) => findings.push({ code, severity, ...(realDate(date) ? { tourDate: date } : {}), ...(safeId(id) ? { bookingId: id } : {}) });
  const scope = new Set(Array.isArray(snapshot?.scopeDates) ? snapshot.scopeDates.filter(realDate) : []);
  if (snapshot?.complete !== true || !safeId(snapshot?.id) || !scope.size || scope.size !== snapshot.scopeDates.length) add('complete-scoped-snapshot-required');
  const tourMap = new Map();
  for (const t of tours) {
    if (!realDate(t?.date)) { add('invalid-tour-date'); continue; }
    if (!scope.has(t.date)) add('tour-outside-snapshot-scope', { date: t.date });
    if (tourMap.has(t.date)) { add('duplicate-tour-date', { date: t.date }); continue; }
    tourMap.set(t.date, t);
    if (!integer(t.currentRegistrations)) add('invalid-stored-count', { date: t.date });
    if (t.maxParticipants !== undefined && (!Number.isSafeInteger(t.maxParticipants) || t.maxParticipants < 1)) add('invalid-effective-capacity', { date: t.date });
  }
  const dispositionMap = new Map();
  for (const d of dispositions) {
    if (!safeId(d?.id)) { add('invalid-disposition-id'); continue; }
    if (dispositionMap.has(d.id)) add('duplicate-disposition', { id: d.id });
    dispositionMap.set(d.id, d);
  }
  const ids = new Set(), rows = [];
  for (const b of bookings) {
    const id = b?.id, date = b?.tourDate;
    if (!safeId(id)) { add('invalid-booking-id'); continue; }
    if (ids.has(id)) { add('duplicate-booking-id', { id }); continue; }
    ids.add(id);
    if (!realDate(date)) { add('invalid-booking-date', { id }); continue; }
    if (!scope.has(date)) add('booking-outside-snapshot-scope', { id, date });
    const row = { bookingId: id, tourDate: date, participants: integer(b.participants) ? b.participants : null, beforeFingerprint: bookingFingerprint(b), source: b.schemaVersion === 2 ? 'v2' : 'legacy', classification: 'unresolved', reservedSeats: null, manualDisposition: false };
    rows.push(row);
    if (!Number.isSafeInteger(b.participants) || b.participants < 1 || b.participants > 20) { add('invalid-participants', { id, date }); continue; }
    if (b.schemaVersion === 2) {
      if (dispositionMap.has(id)) add('v2-disposition-not-allowed', { id, date });
      if (!states.has(b.status) || !payments.has(b.paymentStatus) || !['credit', 'bit', 'bank_transfer'].includes(b.paymentMethod) || typeof b.capacityReserved !== 'boolean' || !Number.isSafeInteger(b.revision) || b.revision < 1) { add('invalid-v2-lifecycle', { id, date }); continue; }
      const reserved = b.capacityReserved, credit = b.paymentMethod === 'credit';
      let valid = false;
      if (b.status === 'pending') { valid = reserved && !credit && b.paymentStatus === 'pending'; row.classification = 'held'; }
      if (b.status === 'payment_pending') { valid = reserved && credit && ['creating', 'awaiting_payment'].includes(b.paymentStatus); row.classification = 'held'; }
      if (b.status === 'confirmed') { valid = reserved && (credit ? b.paymentStatus === 'paid' : ['pending', 'paid'].includes(b.paymentStatus)); row.classification = 'booked'; }
      if (b.status === 'cancelled') { valid = !reserved && ['cancelled', 'expired', 'failed', 'paid', 'pending_review'].includes(b.paymentStatus); row.classification = 'released'; }
      if (b.status === 'payment_review') { valid = !reserved && credit && b.paymentStatus === 'pending_review'; row.classification = 'payment_review'; }
      if (!valid) { row.classification = 'unresolved'; add('contradictory-v2-lifecycle', { id, date }); continue; }
      if (b.status === 'payment_pending') {
        if (!integer(b.holdExpiresAtMs)) { row.classification = 'unresolved'; add('invalid-hold-expiry', { id, date }); continue; }
        if (b.holdExpiresAtMs <= nowMs) add('expired-hold-still-reserved-use-lifecycle-release', { id, date, severity: 'warning' });
      }
      row.reservedSeats = reserved ? b.participants : 0;
      if (b.paymentStatus === 'pending_review' || b.additionalPaymentReview === true) add('payment-review-required-no-financial-action', { id, date, severity: 'warning' });
      if (b.status === 'cancelled' && ['paid', 'pending_review'].includes(b.paymentStatus)) add('cancelled-payment-needs-manual-review-no-refund-inferred', { id, date, severity: 'warning' });
    } else {
      if (b.schemaVersion != null && b.schemaVersion !== 1) { row.source = 'unknown'; add('unsupported-schema-version', { id, date }); continue; }
      const d = dispositionMap.get(id);
      add('legacy-payment-and-ownership-unverified', { id, date, severity: 'warning' });
      if (!d) { add('legacy-reservation-disposition-required', { id, date }); continue; }
      if (d.expectedBookingFingerprint !== row.beforeFingerprint) { add('stale-manual-disposition', { id, date }); continue; }
      if (!['booked', 'held', 'released', 'payment_review'].includes(d.classification) || typeof d.reason !== 'string' || !d.reason.trim() || d.reason.length > 1000 || (d.classification === 'payment_review' && typeof d.reserveSeats !== 'boolean')) { add('invalid-manual-disposition', { id, date }); continue; }
      if ('reserveSeats' in d && d.classification !== 'payment_review' && d.reserveSeats !== ['booked', 'held'].includes(d.classification)) { add('contradictory-manual-disposition', { id, date }); continue; }
      row.classification = d.classification;
      row.reservedSeats = (d.classification === 'payment_review' ? d.reserveSeats : ['booked', 'held'].includes(d.classification)) ? b.participants : 0;
      row.manualDisposition = true;
      row.dispositionFingerprint = hash([d.id, d.expectedBookingFingerprint, d.classification, d.reserveSeats ?? null, d.reason]);
      // Capacity classification only: no migration to schemaVersion2 is proposed.
    }
  }
  for (const id of dispositionMap.keys()) if (!ids.has(id)) add('orphan-manual-disposition', { id });
  const dates = [...new Set([...scope, ...tourMap.keys(), ...rows.map(row => row.tourDate)])].sort();
  const tourPlans = dates.map(date => {
    const tour = tourMap.get(date), relevant = rows.filter(row => row.tourDate === date);
    if (!tour) add('missing-tour-snapshot', { date });
    const totals = { booked: 0, held: 0, released: 0, paymentReview: 0, reviewReserved: 0, unresolvedBookings: 0, reserved: 0 };
    for (const row of relevant) {
      if (row.classification === 'unresolved') { totals.unresolvedBookings++; continue; }
      const key = row.classification === 'payment_review' ? 'paymentReview' : row.classification;
      totals[key] += row.participants;
      totals.reserved += row.reservedSeats;
      if (row.classification === 'payment_review') totals.reviewReserved += row.reservedSeats;
    }
    if (!Object.values(totals).every(integer)) add('aggregate-count-overflow', { date });
    if (Number.isSafeInteger(tour?.maxParticipants) && totals.reserved > tour.maxParticipants) add('reservations-exceed-effective-capacity', { date });
    const blocked = findings.some(f => f.severity === 'blocking' && (!f.tourDate || f.tourDate === date));
    const expectedCount = blocked ? null : totals.reserved;
    const storedCount = integer(tour?.currentRegistrations) ? tour.currentRegistrations : null;
    const mismatch = expectedCount !== null && storedCount !== expectedCount;
    if (mismatch) add('stored-count-mismatch', { date, severity: 'warning' });
    return { tourDate: date, status: blocked ? 'manual_review' : mismatch ? 'count_correction_proposed' : 'consistent', storedCount, expectedCount, delta: expectedCount === null || storedCount === null ? null : expectedCount - storedCount, totals, beforeFingerprint: tour ? tourFingerprint(tour) : null,
      // Absolute set only, NEVER an increment. Future executor must use an atomic
      // snapshot/transaction and reject any changed/added/removed booking in scope.
      countProposal: mismatch ? { operation: 'set-absolute-count-after-review', field: 'currentRegistrations', expectedBefore: storedCount, value: expectedCount, requiresCompleteSnapshotRecheck: true } : null };
  });
  rows.sort((a, b) => a.bookingId.localeCompare(b.bookingId));
  findings.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const preconditions = { snapshotId: safeId(snapshot?.id) ? snapshot.id : null, scopeDates: [...scope].sort(), completeSnapshotAsserted: snapshot?.complete === true, bookingFingerprints: rows.map(row => ({ id: row.bookingId, fingerprint: row.beforeFingerprint })), tourFingerprints: tourPlans.map(tour => ({ date: tour.tourDate, fingerprint: tour.beforeFingerprint })) };
  const blocked = findings.some(f => f.severity === 'blocking');
  return { version: 1, dryRun: true, executable: false, planId: hash([preconditions, rows, tourPlans, findings, nowMs]), asOfMs: nowMs, status: blocked ? 'manual_review_required' : tourPlans.some(t => t.countProposal) ? 'review_count_proposals' : 'consistent', preconditions, bookings: rows, tours: tourPlans, findings, safeguards: ['no-writes', 'no-payment-verification', 'no-refunds', 'no-owner-inference', 'no-schema-migration', 'atomic-snapshot-recheck-required', 'manual-dispositions-are-proposals-not-authorization'] };
}
module.exports = { buildReconciliationPlan, bookingFingerprint, tourFingerprint };
