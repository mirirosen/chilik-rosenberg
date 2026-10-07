'use strict';
const crypto = require('crypto');
const failure = code => Object.assign(new Error(code), { status: 409 });
function createPaymentFlow({ db, bookings, Timestamp, provider, urlsFor, clock = Date.now }) {
  async function create(uid, key, input) {
    provider.assertReady(); // Configuration failure cannot consume any seats.
    urlsFor.assertReady?.();
    const booking = await bookings.create(uid, key, { ...input, paymentMethod: 'credit' }, clock());
    const ref = bookings.bookingRef(booking.bookingId), lease = crypto.randomUUID();
    const state = await db.runTransaction(async tx => {
      const snap = await tx.get(ref), b = snap.data();
      if (!b.capacityReserved || b.holdExpiresAt.toMillis() <= clock() || !['creating', 'awaiting_payment'].includes(b.paymentStatus)) throw failure('booking-closed');
      if (b.paymentStatus === 'awaiting_payment' && b.paymentUrl) return b;
      if (b.initiationLeaseUntil?.toMillis() > clock()) throw failure('payment-initiation-in-progress');
      tx.update(ref, { initiationLease: lease, initiationLeaseUntil: Timestamp.fromMillis(clock() + 120000) });
      return null;
    });
    if (state) return { bookingId: booking.bookingId, paymentUrl: state.paymentUrl, reused: true };
    try {
      const checkout = await provider.createCheckout({ booking, urls: urlsFor(booking.bookingId) });
      await db.runTransaction(async tx => {
        const b = (await tx.get(ref)).data();
        if (b.initiationLease !== lease || b.paymentStatus !== 'creating' || !b.capacityReserved || b.holdExpiresAt.toMillis() <= clock()) throw failure('booking-closed');
        const terminal = checkout.paymentTerminal;
        const jobRef = /^[a-zA-Z0-9_-]+$/.test(terminal || '') ? db.doc(`paymentReconciliation/${booking.bookingId}`) : null;
        const job = jobRef ? await tx.get(jobRef) : null;
        if (job?.exists && job.data().paymentTerminal !== terminal) throw failure('booking-closed');
        const now = Timestamp.fromMillis(clock());
        tx.update(ref, { paymentUrl: checkout.paymentUrl, ...(jobRef ? { paymentTerminal: terminal } : {}), paymentStatus: 'awaiting_payment', initiationLease: null, initiationLeaseUntil: null, updatedAt: now });
        if (jobRef && !job.exists) tx.create(jobRef, { bookingId: booking.bookingId, paymentTerminal: terminal, status: 'pending', attempts: 0, nextAttemptAt: now, monitorUntil: Timestamp.fromMillis(clock() + 24 * 3600000), createdAt: now, updatedAt: now });
      });
      return { bookingId: booking.bookingId, paymentUrl: checkout.paymentUrl };
    } catch (error) {
      // No URL was delivered; handshake alone is not a charge. A failed/uncertain
      // initiation releases the hold, never generates a new idempotency key.
      await bookings.change(booking.bookingId, 'initiation_failed', 'system:initiation', null, clock(), { initiationLease: lease });
      throw error;
    }
  }
  async function notify({ bookingId, transactionIndex }) {
    provider.assertReady();
    if (!/^BK-[a-f0-9]{24}$/.test(bookingId || '') || !/^\d{1,12}$/.test(String(transactionIndex || ''))) throw failure('invalid-provider-reference');
    const snap = await bookings.bookingRef(bookingId).get();
    if (!snap.exists || snap.data().paymentMethod !== 'credit') throw failure('not-found');
    // Browser notification only points to a report. No response, amount, nonce,
    // status or customer data from the callback can establish a receipt.
    const receipt = await provider.verifyTransaction({ booking: snap.data(), transactionIndex });
    return bookings.change(bookingId, receipt.event, 'provider:tranzila', receipt, clock());
  }
  return { create, notify };
}
module.exports = { createPaymentFlow };
