'use strict';
const { validateBooking, fingerprint, identifiers, transition, fault } = require('./booking-core');
const { APPROVED_WEEK_POLICY, validatePolicy, weekStartDate, assertWeeklyCounter, assertWeeklyAvailability } = require('./weekly-availability');
const { enqueueConfirmedBookingWhatsApp } = require('./whatsapp-outbox');
const APP_ID = 'hilik-rosenberg-v1';
function createBookingService(db, Timestamp, { weeklyPolicy = APPROVED_WEEK_POLICY } = {}) {
  const tourRef = date => db.doc(`artifacts/${APP_ID}/public/data/tourDates/${date}`);
  const bookingRef = id => db.doc(`bookings/${id}`);
  const settingsRef = () => db.doc(`artifacts/${APP_ID}/public/data/settings/global`);
  const weekRef = key => db.doc(`bookingWeeks/${key}`);
  const calendarWeekRef = key => db.doc(`calendarAvailability/${key}`);
  function jobs(tx, booking, revision, now, kinds = ['email', 'calendar']) {
    for (const kind of kinds) {
      const id = `${booking.bookingId}-${revision}-${kind}`;
      const emailSnapshot = kind === 'email' ? { bookingId: booking.bookingId, revision, status: booking.status, email: booking.email, tourDate: booking.tourDate, participants: booking.participants, totalPrice: booking.totalPrice } : null;
      tx.create(db.doc(`integrationJobs/${id}`), { ...(emailSnapshot ? { emailSnapshot } : {}), kind, bookingId: booking.bookingId, tourDate: booking.tourDate, revision, event: booking.status, language: booking.language || 'he', status: 'pending', attempts: 0, nextAttemptAt: now, createdAt: now, updatedAt: now });
    }
  }
  async function create(uid, key, input, nowMs = Date.now()) {
    const data = validateBooking(input, new Date(nowMs)), id = identifiers(uid, key), ref = bookingRef(id), digest = fingerprint(data);
    return db.runTransaction(async tx => {
      const [existing, tour, settings] = await Promise.all([tx.get(ref), tx.get(tourRef(data.tourDate)), tx.get(settingsRef())]);
      if (existing.exists) {
        const b = existing.data();
        if (b.requestFingerprint !== digest || b.ownerUid !== uid) throw fault('idempotency-conflict');
        if (b.status === 'cancelled' || ['expired', 'failed'].includes(b.paymentStatus)) throw fault('booking-closed');
        return { ...b, reused: true };
      }
      let weekly = null;
      if (weeklyPolicy?.enabled === true) {
        // Not activated by this patch/runtime. A future approved configuration
        // requires an explicitly chosen week policy and a fresh complete sync.
        validatePolicy(weeklyPolicy, true);
        const key = weekStartDate(data.tourDate, weeklyPolicy);
        const [calendar, counter] = await Promise.all([tx.get(calendarWeekRef(key)), tx.get(weekRef(key))]);
        const max = settings.data()?.globalMaxParticipants ?? 30;
        const current = assertWeeklyAvailability(calendar.data(), counter.data(), { policy: weeklyPolicy, weekStart: key, maxParticipants: max, participants: data.participants, nowMs });
        weekly = { key, current, held: counter.data().heldParticipants, confirmed: counter.data().confirmedParticipants };
      }
      const td = tour.data() || {}, sd = settings.data() || {};
      if ((sd.blocked || []).includes(data.tourDate) || (sd.soldOut || []).includes(data.tourDate)) throw fault('tour-unavailable');
      const max = td.useGlobalMax === false ? td.customMax : sd.globalMaxParticipants ?? 30;
      const current = td.currentRegistrations ?? 0;
      if (!Number.isInteger(max) || max < 1 || !Number.isInteger(current) || current < 0) throw fault('capacity-requires-reconciliation');
      if (current + data.participants > max) throw fault('capacity-exceeded');
      const now = Timestamp.fromMillis(nowMs), credit = data.paymentMethod === 'credit';
      const booking = { ...data, ...(weekly ? { weekStart: weekly.key } : {}), bookingId: id, ownerUid: uid, requestFingerprint: digest, schemaVersion: 2, capacityReserved: true, revision: 1, status: credit ? 'payment_pending' : 'pending', paymentStatus: credit ? 'creating' : 'pending', holdExpiresAt: credit ? Timestamp.fromMillis(nowMs + 15 * 60000) : null, createdAt: now, updatedAt: now };
      tx.create(ref, booking);
      tx.set(tourRef(data.tourDate), { date: data.tourDate, currentRegistrations: current + data.participants, updatedAt: now }, { merge: true });
      if (weekly) tx.set(weekRef(weekly.key), { currentRegistrations: weekly.current + data.participants, heldParticipants: weekly.held + data.participants, confirmedParticipants: weekly.confirmed, updatedAt: now }, { merge: true });
      // A credit hold changes availability immediately, before payment capture.
      // It needs a calendar job even when no customer email is due yet.
      jobs(tx, booking, 1, now, credit ? ['calendar'] : ['email', 'calendar']);
      return booking;
    });
  }
  // Every caller must authorize the actor before entering. Provider events additionally
  // require an independently verified receipt with a unique provider transaction key.
  async function change(id, event, actor, receipt = null, nowMs = Date.now(), guards = {}) {
    return db.runTransaction(async tx => {
      const ref = bookingRef(id), snap = await tx.get(ref);
      if (!snap.exists) throw fault('not-found');
      const b = snap.data();
      if (event === 'initiation_failed') {
        if (!guards.initiationLease) throw fault('invalid-initiation-lease');
        if (b.initiationLease !== guards.initiationLease || b.paymentStatus !== 'creating') return b;
      }
      const tr = tourRef(b.tourDate), tour = await tx.get(tr);
      const weeklyRef = b.weekStart ? weekRef(b.weekStart) : null;
      const weekly = weeklyRef ? await tx.get(weeklyRef) : null;
      const deliveryRef = receipt ? db.doc(`paymentWebhookDeliveries/${fingerprint(receipt.transactionKey)}`) : null;
      const delivery = deliveryRef ? await tx.get(deliveryRef) : null;
      if (['paid', 'decline'].includes(event) && (!receipt || receipt.verified !== true || receipt.bookingId !== id || receipt.amount !== b.totalPrice || receipt.currency !== 'ILS' || !receipt.transactionKey)) throw fault('unverified-provider-event');
      // Original charge references come only from the independently verified
      // provider receipt. Keep an explicit whitelist in the private ledger,
      // never the booking/status response, notifications or integration jobs.
      let providerTransaction;
      if (receipt?.providerTransaction != null) {
        const p = receipt.providerTransaction;
        if (event !== 'paid' || actor !== 'provider:tranzila' || p.provider !== 'tranzila' || !/^[a-zA-Z0-9_-]+$/.test(p.terminal || '') || typeof p.transactionIndex !== 'string' || !/^[1-9]\d{0,11}$/.test(p.transactionIndex) || typeof p.authorizationNumber !== 'string' || !/^\d{1,32}$/.test(p.authorizationNumber) || /^0+$/.test(p.authorizationNumber) || receipt.transactionKey !== `${p.terminal}:${p.transactionIndex}` || (b.paymentTerminal && b.paymentTerminal !== p.terminal)) throw fault('unverified-provider-event');
        providerTransaction = { provider: 'tranzila', terminal: p.terminal, transactionIndex: p.transactionIndex, authorizationNumber: p.authorizationNumber };
      }
      if (delivery?.exists) {
        if (delivery.data().bookingId !== id) throw fault('provider-transaction-reused');
        const original = delivery.data().providerTransaction;
        if (original && providerTransaction && ['provider', 'terminal', 'transactionIndex', 'authorizationNumber'].some(key => original[key] !== providerTransaction[key])) throw fault('provider-transaction-reference-conflict');
        // A decline and a later verified capture can share one transaction ID.
        if (delivery.data().event === event || delivery.data().event === 'paid') return b;
      }
      const patch = event === 'paid' && ['paid', 'pending_review'].includes(b.paymentStatus)
        ? { additionalPaymentReview: true, paymentReviewReason: 'multiple-approved-transactions' }
        : transition(b, event, nowMs);
      if (!patch) return b;
      const current = tour.data()?.currentRegistrations || 0;
      const release = b.capacityReserved && patch.capacityReserved === false ? b.participants : 0;
      if (release && current < release) throw fault('capacity-requires-reconciliation');
      if (release && weeklyRef && (weekly?.data()?.reconciled !== true || !Number.isInteger(weekly.data().currentRegistrations) || weekly.data().currentRegistrations < release)) throw fault('capacity-requires-reconciliation');
      const now = Timestamp.fromMillis(nowMs), revision = b.revision + 1, updated = { ...b, ...patch, revision, updatedAt: now };
      let weeklyPatch;
      if (weeklyRef) {
        const counter = assertWeeklyCounter(weekly?.data());
        const held = booking => booking.capacityReserved && booking.status !== 'confirmed' ? booking.participants : 0;
        const confirmed = booking => booking.capacityReserved && booking.status === 'confirmed' ? booking.participants : 0;
        weeklyPatch = { currentRegistrations: counter.currentRegistrations - release, heldParticipants: counter.heldParticipants + held(updated) - held(b), confirmedParticipants: counter.confirmedParticipants + confirmed(updated) - confirmed(b), updatedAt: now };
        assertWeeklyCounter({ ...counter, ...weeklyPatch });
      }
      // All reads above; no Firestore reads after the first write.
      if (deliveryRef) {
        const record = { bookingId: id, event, ...(providerTransaction ? { providerTransaction } : {}), updatedAt: now };
        if (delivery?.exists) tx.update(deliveryRef, record);
        else tx.create(deliveryRef, { ...record, createdAt: now });
      }
      if (release) tx.set(tr, { currentRegistrations: current - release, updatedAt: now }, { merge: true });
      if (weeklyRef) tx.set(weeklyRef, weeklyPatch, { merge: true });
      tx.update(ref, { ...patch, revision, updatedAt: now });
      tx.create(db.doc(`bookingAudit/${id}-${revision}`), { bookingId: id, event, actor, fromStatus: b.status, toStatus: updated.status, createdAt: now });
      // First real confirmation only. Pending holds, browser return parameters,
      // late captures under review, repeated callbacks and cancellation never send.
      if (b.status !== 'confirmed' && updated.status === 'confirmed') enqueueConfirmedBookingWhatsApp(tx, db, updated, now);
      if (patch.status || patch.paymentStatus) jobs(tx, updated, revision, now);
      return updated;
    });
  }
  return { create, change, bookingRef, tourRef };
}
module.exports = { createBookingService };
