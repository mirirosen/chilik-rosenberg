'use strict';
// Explicit one-shot initialization for years whose complete booking/Calendar
// audits were empty. Not an HTTP export, scheduler or general migration.
const { APPROVED_WEEK_POLICY, weekStartDate, policyFingerprint, assertWeeklyCounter } = require('./weekly-availability');
const APP = 'artifacts/hilik-rosenberg-v1/public/data';
const FROM = '2027-01-01', THROUGH = '2028-12-31';
const fault = code => Object.assign(new Error(code), { code });
const validCount = n => Number.isSafeInteger(n) && n >= 0;
const validMax = n => Number.isInteger(n) && n >= 1 && n <= 100;
const POLICY = { ...APPROVED_WEEK_POLICY, enabled: true };
function scopedDates() {
  const dates = [];
  for (let ms = Date.parse(`${FROM}T00:00:00Z`); ms <= Date.parse(`${THROUGH}T00:00:00Z`); ms += 86400000) {
    if (new Date(ms).getUTCDay() === 4) dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}
async function initialize2027And2028Capacity({ db, Timestamp, apply = false, nowMs = Date.now() }) {
  if (typeof apply !== 'boolean' || !Number.isSafeInteger(nowMs) || nowMs < 0) throw fault('invalid-capacity-initialization');
  const dates = scopedDates(), weeks = dates.map(date => weekStartDate(date, POLICY));
  const auditRef = db.doc('capacityInitializations/years-2027-2028');
  return db.runTransaction(async tx => {
    const refs = dates.flatMap((date, i) => [db.doc(`bookingWeeks/${weeks[i]}`), db.doc(`${APP}/tourDates/${date}`), db.doc(`calendarAvailability/${weeks[i]}`)]);
    const [settingsDoc, auditDoc, ...docs] = await tx.getAll(db.doc(`${APP}/settings/global`), auditRef, ...refs);
    const max = settingsDoc.data()?.globalMaxParticipants ?? 30;
    if (!settingsDoc.exists || !validMax(max)) throw fault('capacity-requires-reconciliation');
    const plans = dates.map((date, i) => {
      const [counter, tour, calendar] = docs.slice(i * 3, i * 3 + 3), td = tour.data();
      if (counter.exists) assertWeeklyCounter(counter.data());
      if (tour.exists && (!validCount(td.currentRegistrations) || !validMax(td.useGlobalMax === false ? td.customMax : max))) throw fault('capacity-requires-reconciliation');
      return { date, week: weeks[i], counter, tour, calendar, refs: refs.slice(i * 3, i * 3 + 3) };
    });
    const weeksToCreate = plans.filter(p => !p.counter.exists).length, toursToCreate = plans.filter(p => !p.tour.exists).length;
    const result = { fromDate: FROM, throughDate: THROUGH, dates: dates.length, weeksToCreate, toursToCreate, createdWeeks: 0, createdTours: 0, applied: apply };
    // An idempotent rerun cannot reset counters after real customers register.
    if (!weeksToCreate && !toursToCreate) return result;
    const inScope = collection => db.collection(collection).where('tourDate', '>=', FROM).where('tourDate', '<=', THROUGH);
    const [bookings, legacy, bindings] = await Promise.all([tx.get(inScope('bookings')), tx.get(inScope(`${APP}/bookings`)), tx.get(inScope('calendarSessions'))]);
    // Recheck in the SAME transaction as all counter creations. Any changed
    // booking or external baseline requires a new reconciliation, never zeroing.
    if (bookings.docs.length || legacy.docs.length || bindings.docs.length) throw fault('capacity-audit-changed');
    for (const p of plans) {
      const s = p.calendar.data();
      if (!s || s.weekStart !== p.week || s.complete !== true || s.policyFingerprint !== policyFingerprint(POLICY) || !Array.isArray(s.privateTourWindows) || !Number.isFinite(s.verifiedAtMs) || s.verifiedAtMs > nowMs || nowMs - s.verifiedAtMs > POLICY.maxAgeMs || !Number.isFinite(s.validUntilMs) || s.validUntilMs <= nowMs) throw fault('calendar-unavailable');
      if (s.requiresCountReconciliation || s.externalDeclaredCounts?.length) throw fault('capacity-audit-changed');
      if ((p.tour.exists && p.tour.data().currentRegistrations !== 0) || (p.counter.exists && p.counter.data().currentRegistrations !== 0)) throw fault('capacity-audit-changed');
    }
    if (!apply) return result;
    const updatedAt = Timestamp.fromMillis(nowMs);
    for (const p of plans) {
      if (!p.counter.exists) tx.create(p.refs[0], { reconciled: true, currentRegistrations: 0, heldParticipants: 0, confirmedParticipants: 0, externalParticipants: 0, updatedAt });
      if (!p.tour.exists) tx.create(p.refs[1], { date: p.date, currentRegistrations: 0, useGlobalMax: true, updatedAt });
    }
    if (!auditDoc.exists) tx.create(auditRef, { fromDate: FROM, throughDate: THROUGH, auditedBookings: 0, auditedLegacyBookings: 0, auditedCountBindings: 0, createdWeeks: weeksToCreate, createdTours: toursToCreate, completedAt: updatedAt });
    return { ...result, createdWeeks: weeksToCreate, createdTours: toursToCreate };
  });
}
module.exports = { initialize2027And2028Capacity };
