'use strict';
const crypto = require('crypto');
const { viaProvider } = require('./booking-core');
const failure = code => Object.assign(new Error(code), { status: 409 });
const MAX_PAYMENT_RETRIES = 5;
const MAX_PAYMENT_LOOKUPS = 10;
function createPaymentFlow({ db, bookings, Timestamp, provider, urlsFor, clock = Date.now }) {
  async function create(uid, key, input) {
    // Bit goes through the same Tranzila checkout only when its flag and verified
    // allowlist are on; otherwise it is rejected before anything is created.
    // Every other method keeps the card flow exactly as before.
    const bit = input?.paymentMethod === 'bit';
    if (bit && provider.bitReady?.() !== true) throw failure('invalid-payment-method');
    provider.assertReady(); // Configuration failure creates nothing. No seat is held until payment.
    urlsFor.assertReady?.();
    const booking = await bookings.create(uid, key, { ...input, paymentMethod: bit ? 'bit' : 'credit' }, clock(), ...(bit ? [{ providerCheckout: true }] : []));
    const ref = bookings.bookingRef(booking.bookingId), lease = crypto.randomUUID();
    const state = await db.runTransaction(async tx => {
      const snap = await tx.get(ref), b = snap.data();
      if (b.status !== 'payment_pending' || b.holdExpiresAt.toMillis() <= clock() || !['creating', 'awaiting_payment'].includes(b.paymentStatus)) throw failure('booking-closed');
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
        if (b.initiationLease !== lease || b.paymentStatus !== 'creating' || b.status !== 'payment_pending' || b.holdExpiresAt.toMillis() <= clock()) throw failure('booking-closed');
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
      // initiation closes the booking (and releases a legacy hold), never generates a new idempotency key.
      await bookings.change(booking.bookingId, 'initiation_failed', 'system:initiation', null, clock(), { initiationLease: lease });
      throw error;
    }
  }
  // A declined card returns the customer while the booking is still awaiting_payment.
  // The owner may open a fresh checkout for the SAME booking right away instead of
  // waiting for the 15-minute window to expire. Payment rules are unchanged: no seat
  // is held, 'paid' still comes only from a verified provider receipt, and a second
  // capture for one booking is still routed to review by change(). The retry needs
  // the verified order lookup: without it (or without a bound terminal) it is
  // refused with payment-verification-pending. An existing verified capture is
  // applied instead of opening another checkout. A new checkout opens only when
  // the lookup returned at least one row and every row is a definite decline
  // (successful report, non-000 processor response). An empty lookup (the report
  // may lag a capture made seconds earlier) and any transport, report or
  // verification error refuse the retry. Lookups are capped per booking so a
  // looping client cannot drive unbounded provider report calls.
  async function retry(uid, bookingId) {
    provider.assertReady();
    urlsFor.assertReady?.();
    if (!/^BK-[a-f0-9]{24}$/.test(bookingId || '')) throw Object.assign(new Error('invalid-booking-reference'), { status: 400 });
    const ref = bookings.bookingRef(bookingId), snap = await ref.get();
    if (!snap.exists || snap.data().ownerUid !== uid || !viaProvider(snap.data())) throw Object.assign(new Error('not-found'), { status: 404 });
    const open = b => b.status === 'payment_pending' && b.paymentStatus === 'awaiting_payment' && b.holdExpiresAt?.toMillis() > clock();
    let b = snap.data();
    if (!open(b)) throw failure('booking-closed');
    if ((b.paymentRetries || 0) >= MAX_PAYMENT_RETRIES) throw failure('payment-retry-limit');
    const pending = () => Object.assign(new Error('payment-verification-pending'), { status: 503 });
    if (!b.paymentTerminal || !provider.findTransactionIndexes || !lookupReady()) throw pending();
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (!open(current)) throw failure('booking-closed');
      if ((current.paymentLookups || 0) >= MAX_PAYMENT_LOOKUPS) throw failure('payment-retry-limit');
      tx.update(ref, { paymentLookups: (current.paymentLookups || 0) + 1 });
    });
    let indexes;
    try { ({ transactionIndexes: indexes } = await provider.findTransactionIndexes({ booking: b, nowMs: clock() })); }
    catch { throw pending(); }
    let declines = 0;
    for (const transactionIndex of indexes || []) {
      let receipt;
      try { receipt = await provider.verifyTransaction({ booking: b, transactionIndex }); }
      catch (error) { if (error?.declined === true) { declines++; continue; } throw pending(); }
      if (receipt?.verified !== true || receipt.event !== 'paid') throw pending();
      const updated = await bookings.change(bookingId, 'paid', 'provider:tranzila', receipt, clock());
      return { bookingId, status: updated.status, paymentStatus: updated.paymentStatus, applied: true };
    }
    if (!declines) throw pending();
    const lease = crypto.randomUUID();
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (!open(current)) throw failure('booking-closed');
      if (current.initiationLeaseUntil?.toMillis() > clock()) throw failure('payment-initiation-in-progress');
      tx.update(ref, { initiationLease: lease, initiationLeaseUntil: Timestamp.fromMillis(clock() + 120000) });
    });
    let checkout;
    try { checkout = await provider.createCheckout({ booking: b, urls: urlsFor(bookingId) }); }
    catch (error) {
      // The previous checkout stays as it was; only the retry lease is released.
      await db.runTransaction(async tx => {
        if ((await tx.get(ref)).data().initiationLease === lease) tx.update(ref, { initiationLease: null, initiationLeaseUntil: null });
      });
      throw error;
    }
    await db.runTransaction(async tx => {
      b = (await tx.get(ref)).data();
      if (b.initiationLease !== lease || !open(b) || (b.paymentTerminal && b.paymentTerminal !== checkout.paymentTerminal)) throw failure('booking-closed');
      const now = clock();
      // A new checkout window for the same unreserved booking (no seat is held).
      tx.update(ref, { paymentUrl: checkout.paymentUrl, paymentRetries: (b.paymentRetries || 0) + 1, holdExpiresAt: Timestamp.fromMillis(now + 15 * 60000), initiationLease: null, initiationLeaseUntil: null, updatedAt: Timestamp.fromMillis(now) });
    });
    return { bookingId, paymentUrl: checkout.paymentUrl, retried: true };
  }
  function lookupReady() {
    if (!provider.assertLookupReady) return false;
    try { provider.assertLookupReady(); return true; } catch { return false; }
  }
  async function notify({ bookingId, transactionIndex }) {
    provider.assertReady();
    if (!/^BK-[a-f0-9]{24}$/.test(bookingId || '') || !/^\d{1,12}$/.test(String(transactionIndex || ''))) throw failure('invalid-provider-reference');
    const snap = await bookings.bookingRef(bookingId).get();
    if (!snap.exists || !viaProvider(snap.data())) throw failure('not-found');
    // Browser notification only points to a report. No response, amount, nonce,
    // status or customer data from the callback can establish a receipt.
    const receipt = await provider.verifyTransaction({ booking: snap.data(), transactionIndex });
    return bookings.change(bookingId, receipt.event, 'provider:tranzila', receipt, clock());
  }
  return { create, retry, notify };
}
module.exports = { createPaymentFlow };
