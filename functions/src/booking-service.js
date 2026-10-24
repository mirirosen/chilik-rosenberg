'use strict';
const { validateBooking, fingerprint, identifiers, transition, fault } = require('./booking-core');
const { APPROVED_WEEK_POLICY, validatePolicy, weekStartDate, assertWeeklyCounter, assertWeeklyAvailability } = require('./weekly-availability');
const { enqueueConfirmedBookingWhatsApp } = require('./whatsapp-outbox');
const APP_ID = 'hilik-rosenberg-v1';
const FULL_CODES = ['capacity-exceeded', 'tour-unavailable'];
// Daily tour cap. Throws tour-unavailable/capacity-exceeded when there is no room.
function assertTourRoom(td, sd, date, participants) {
  td = td || {}; sd = sd || {};
  if ((sd.blocked || []).includes(date) || (sd.soldOut || []).includes(date)) throw fault('tour-unavailable');
  const max = td.useGlobalMax === false ? td.customMax : sd.globalMaxParticipants ?? 30;
  const current = td.currentRegistrations ?? 0;
  if (!Number.isInteger(max) || max < 1 || !Number.isInteger(current) || current < 0) throw fault('capacity-requires-reconciliation');
  if (current + participants > max) throw fault('capacity-exceeded');
}
function createBookingService(db, Timestamp, { weeklyPolicy = APPROVED_WEEK_POLICY } = {}) {
  const tourRef = date => db.doc(`artifacts/${APP_ID}/public/data/tourDates/${date}`);
  const bookingRef = id => db.doc(`bookings/${id}`);
  const settingsRef = () => db.doc(`artifacts/${APP_ID}/public/data/settings/global`);
  const weekRef = key => db.doc(`bookingWeeks/${key}`);
  const calendarWeekRef = key => db.doc(`calendarAvailability/${key}`);
  function jobs(tx, booking, revision, now, kinds = ['email', 'calendar']) {
    for (const kind of kinds) {
      if (kind === 'email' && !booking.email) continue;
      const id = `${booking.bookingId}-${revision}-${kind}`;
      const emailSnapshot = kind === 'email' ? { bookingId: booking.bookingId, revision, status: booking.status, email: booking.email, tourDate: booking.tourDate, participants: booking.participants, totalPrice: booking.totalPrice } : null;
      tx.create(db.doc(`integrationJobs/${id}`), { ...(emailSnapshot ? { emailSnapshot } : {}), kind, bookingId: booking.bookingId, tourDate: booking.tourDate, revision, event: booking.status, language: booking.language || 'he', status: 'pending', attempts: 0, nextAttemptAt: now, createdAt: now, updatedAt: now });
    }
  }
  // Creating a booking never reserves capacity (bank transfer, bit or card).
  // Availability is still checked so an already full tour is rejected early,
  // but tour/week counters change only when payment is confirmed (see change()).
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
      let weekKey = null;
      if (weeklyPolicy?.enabled === true) {
        validatePolicy(weeklyPolicy, true);
        weekKey = weekStartDate(data.tourDate, weeklyPolicy);
        const [calendar, counter] = await Promise.all([tx.get(calendarWeekRef(weekKey)), tx.get(weekRef(weekKey))]);
        assertWeeklyAvailability(calendar.data(), counter.data(), { policy: weeklyPolicy, weekStart: weekKey, maxParticipants: settings.data()?.globalMaxParticipants ?? 30, participants: data.participants, nowMs });
      }
      assertTourRoom(tour.data(), settings.data(), data.tourDate, data.participants);
      const now = Timestamp.fromMillis(nowMs), credit = data.paymentMethod === 'credit';
      // holdExpiresAt is only the card checkout window (abandoned checkouts are
      // closed by expirePaymentHolds); no seat is held during it.
      const booking = { ...data, ...(weekKey ? { weekStart: weekKey } : {}), bookingId: id, ownerUid: uid, requestFingerprint: digest, schemaVersion: 2, capacityReserved: false, revision: 1, status: credit ? 'payment_pending' : 'pending', paymentStatus: credit ? 'creating' : 'pending', holdExpiresAt: credit ? Timestamp.fromMillis(nowMs + 15 * 60000) : null, createdAt: now, updatedAt: now };
      tx.create(ref, booking);
      // Availability is unchanged, so no calendar job is due at creation.
      jobs(tx, booking, 1, now, credit ? [] : ['email']);
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
      // Payment confirmation of an unreserved booking may reserve its seats now.
      const mayReserve = ['confirm', 'paid'].includes(event) && b.capacityReserved === false && b.status !== 'cancelled';
      const weeklyEnabled = mayReserve && weeklyPolicy?.enabled === true;
      const weekKey = b.weekStart || (weeklyEnabled ? weekStartDate(b.tourDate, weeklyPolicy) : null);
      const tr = tourRef(b.tourDate), tour = await tx.get(tr);
      const weeklyRef = weekKey ? weekRef(weekKey) : null;
      const weekly = weeklyRef ? await tx.get(weeklyRef) : null;
      const settings = mayReserve ? await tx.get(settingsRef()) : null;
      const calendar = weeklyEnabled ? await tx.get(calendarWeekRef(weekKey)) : null;
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
      // Room check for the reservation, inside this transaction: the daily tour
      // cap plus the weekly quota (incl. calendar external participants) when enabled.
      let room = { available: false, code: null };
      if (mayReserve) {
        try {
          if (weeklyEnabled) {
            validatePolicy(weeklyPolicy, true);
            assertWeeklyAvailability(calendar.data(), weekly?.data(), { policy: weeklyPolicy, weekStart: weekKey, maxParticipants: settings.data()?.globalMaxParticipants ?? 30, participants: b.participants, nowMs });
          }
          assertTourRoom(tour.data(), settings.data(), b.tourDate, b.participants);
          room = { available: true, code: null };
        } catch (error) {
          if (!error.code) throw error;
          room = { available: false, code: error.code };
        }
      }
      let patch;
      try {
        patch = event === 'paid' && ['paid', 'pending_review'].includes(b.paymentStatus)
          ? { additionalPaymentReview: true, paymentReviewReason: 'multiple-approved-transactions' }
          : transition(b, event, nowMs, { capacityAvailable: room.available });
      } catch (error) {
        // A stale calendar or an unreconciled counter is not "full": report the real cause.
        if (error.code === 'capacity-full-at-confirmation' && room.code && !FULL_CODES.includes(room.code)) throw fault(room.code);
        throw error;
      }
      if (!patch) return b;
      if (patch.paymentReviewReason === 'overbooked-at-payment' && room.code) patch.capacityCheckCode = room.code;
      const current = tour.data()?.currentRegistrations || 0;
      const release = b.capacityReserved && patch.capacityReserved === false ? b.participants : 0;
      const reserve = !b.capacityReserved && patch.capacityReserved === true ? b.participants : 0;
      if (reserve && weekKey && !b.weekStart) patch.weekStart = weekKey;
      if (release && current < release) throw fault('capacity-requires-reconciliation');
      if (release && weeklyRef && (weekly?.data()?.reconciled !== true || !Number.isInteger(weekly.data().currentRegistrations) || weekly.data().currentRegistrations < release)) throw fault('capacity-requires-reconciliation');
      const now = Timestamp.fromMillis(nowMs), revision = b.revision + 1, updated = { ...b, ...patch, revision, updatedAt: now };
      const held = booking => booking.capacityReserved && booking.status !== 'confirmed' ? booking.participants : 0;
      const confirmed = booking => booking.capacityReserved && booking.status === 'confirmed' ? booking.participants : 0;
      const heldDelta = held(updated) - held(b), confirmedDelta = confirmed(updated) - confirmed(b);
      let weeklyPatch;
      // Unreserved bookings never touch the weekly counter (cancel, expire, review).
      if (weeklyRef && (release || reserve || heldDelta || confirmedDelta)) {
        const counter = assertWeeklyCounter(weekly?.data());
        weeklyPatch = { currentRegistrations: counter.currentRegistrations - release + reserve, heldParticipants: counter.heldParticipants + heldDelta, confirmedParticipants: counter.confirmedParticipants + confirmedDelta, updatedAt: now };
        assertWeeklyCounter({ ...counter, ...weeklyPatch });
      }
      // All reads above; no Firestore reads after the first write.
      if (deliveryRef) {
        const record = { bookingId: id, event, ...(providerTransaction ? { providerTransaction } : {}), updatedAt: now };
        if (delivery?.exists) tx.update(deliveryRef, record);
        else tx.create(deliveryRef, { ...record, createdAt: now });
      }
      if (release || reserve) tx.set(tr, { date: b.tourDate, currentRegistrations: current - release + reserve, updatedAt: now }, { merge: true });
      if (weeklyPatch) tx.set(weeklyRef, weeklyPatch, { merge: true });
      tx.update(ref, { ...patch, revision, updatedAt: now });
      tx.create(db.doc(`bookingAudit/${id}-${revision}`), { bookingId: id, event, actor, fromStatus: b.status, toStatus: updated.status, createdAt: now });
      // Verified money for a full tour: keep the payment record and alert the owner.
      if (patch.paymentReviewReason === 'overbooked-at-payment') tx.create(db.doc(`adminNotices/${id}-${revision}`), { type: 'overbooked-at-payment', bookingId: id, tourDate: b.tourDate, participants: b.participants, totalPrice: b.totalPrice, paymentMethod: b.paymentMethod, capacityCheckCode: room.code, status: 'open', createdAt: now, updatedAt: now });
      // First real confirmation only. Pending requests, browser return parameters,
      // late captures under review, repeated callbacks and cancellation never send.
      if (b.status !== 'confirmed' && updated.status === 'confirmed') enqueueConfirmedBookingWhatsApp(tx, db, updated, now);
      if (patch.status || patch.paymentStatus) jobs(tx, updated, revision, now);
      return updated;
    });
  }
  return { create, change, bookingRef, tourRef };
}
module.exports = { createBookingService, assertTourRoom };
