'use strict';
const crypto = require('crypto');
const { loadPaymentConfiguration } = require('./payment-runtime');
const { createTranzilaAdapter } = require('./providers/tranzila');
const LEASE_MS = 10 * 60000, MAX_ATTEMPTS = 96;
const safeFailure = error => ['provider-lookup-incomplete', 'provider-verification-pending', 'provider-lookup-window-invalid', 'payment-provider-unavailable', 'payment-order-lookup-not-configured'].includes(error?.code) ? error.code : 'payment-reconciliation-unavailable';
function createPaymentReconciler({ db, bookings, Timestamp, provider, isEnabled = () => false, clock = Date.now }) {
  async function run(ref, nowMs = clock()) {
    if (!isEnabled()) return { disabled: true }; // No DB/secret/provider access.
    provider.assertLookupReady();
    if (!/^BK-[a-f0-9]{24}$/.test(ref?.id || '')) return { skipped: true };
    const lease = crypto.randomUUID();
    const claim = await db.runTransaction(async tx => {
      const jobSnap = await tx.get(ref);
      if (!jobSnap.exists) return null;
      const job = jobSnap.data();
      if (!['pending', 'retry', 'processing'].includes(job.status) || job.nextAttemptAt?.toMillis() > nowMs || job.leaseUntil?.toMillis() > nowMs) return null;
      const bookingSnap = await tx.get(bookings.bookingRef(ref.id)), booking = bookingSnap.data();
      if (!bookingSnap.exists || job.bookingId !== ref.id || booking.bookingId !== ref.id || booking.schemaVersion !== 2 || booking.paymentMethod !== 'credit' || booking.paymentTerminal !== job.paymentTerminal || !/^[a-zA-Z0-9_-]+$/.test(job.paymentTerminal || '') || !Number.isInteger(job.attempts) || job.attempts < 0 || !Number.isFinite(job.nextAttemptAt?.toMillis()) || !Number.isFinite(job.monitorUntil?.toMillis()) || !Number.isFinite(job.createdAt?.toMillis()) || job.monitorUntil.toMillis() - job.createdAt.toMillis() !== 24 * 3600000 || job.createdAt.toMillis() > nowMs) {
        tx.update(ref, { status: 'manual_review', lastErrorCode: 'payment-reconciliation-record-invalid', updatedAt: Timestamp.fromMillis(nowMs) }); return null;
      }
      if (job.attempts >= MAX_ATTEMPTS || nowMs > job.monitorUntil.toMillis() + LEASE_MS) {
        tx.update(ref, { status: 'manual_review', lastErrorCode: 'payment-reconciliation-window-exhausted', updatedAt: Timestamp.fromMillis(nowMs) }); return null;
      }
      tx.update(ref, { status: 'processing', lease, leaseUntil: Timestamp.fromMillis(nowMs + LEASE_MS), nextAttemptAt: Timestamp.fromMillis(nowMs + LEASE_MS), attempts: job.attempts + 1, updatedAt: Timestamp.fromMillis(nowMs) });
      return { booking, monitorUntil: job.monitorUntil.toMillis(), attempt: job.attempts + 1 };
    });
    if (!claim) return { skipped: true };
    let verified = 0, pending = false, errorCode = null;
    try {
      const discovery = await provider.findTransactionIndexes({ booking: claim.booking, nowMs });
      if (discovery?.complete !== true || !Array.isArray(discovery.transactionIndexes) || discovery.transactionIndexes.length > 20 || new Set(discovery.transactionIndexes).size !== discovery.transactionIndexes.length || !discovery.transactionIndexes.every(index => Number.isSafeInteger(index) && index > 0 && index < 1e12)) throw Object.assign(new Error(), { code: 'provider-lookup-incomplete' });
      for (const transactionIndex of discovery.transactionIndexes) {
        let receipt;
        try { receipt = await provider.verifyTransaction({ booking: claim.booking, transactionIndex }); }
        catch (error) { pending = true; errorCode = safeFailure(error); continue; }
        if (receipt?.verified !== true || receipt.event !== 'paid') { pending = true; errorCode = 'provider-verification-pending'; continue; }
        // The same atomic receipt/transition path as the webhook authorizes
        // payment. Neither discovery nor a callback hint can create a receipt.
        const owned = await db.runTransaction(async tx => {
          const job = (await tx.get(ref)).data();
          return job?.status === 'processing' && job.lease === lease && job.leaseUntil?.toMillis() > clock();
        });
        if (!owned) return { stale: true };
        await bookings.change(claim.booking.bookingId, receipt.event, 'provider:tranzila', receipt, clock());
        verified++;
      }
    } catch (error) { pending = true; errorCode = safeFailure(error); }
    const finishedMs = clock();
    const saved = await db.runTransaction(async tx => {
      const job = (await tx.get(ref)).data();
      if (!job || job.status !== 'processing' || job.lease !== lease) return false;
      const final = finishedMs >= claim.monitorUntil || claim.attempt >= MAX_ATTEMPTS;
      const status = final ? pending ? 'manual_review' : 'complete' : 'retry';
      const delay = Math.min(15 * 60000, 60000 * 2 ** Math.min(claim.attempt, 4));
      tx.update(ref, { status, lastErrorCode: errorCode, lease: null, leaseUntil: null, lastCheckedAt: Timestamp.fromMillis(finishedMs), nextAttemptAt: Timestamp.fromMillis(Math.min(finishedMs + delay, claim.monitorUntil)), updatedAt: Timestamp.fromMillis(finishedMs) });
      return true;
    });
    return { processed: saved, verified, pending };
  }
  async function runDue() {
    if (!isEnabled()) return { disabled: true };
    provider.assertLookupReady();
    const due = await db.collection('paymentReconciliation').where('status', 'in', ['pending', 'retry', 'processing']).where('nextAttemptAt', '<=', Timestamp.fromMillis(clock())).limit(5).get();
    const results = await Promise.allSettled(due.docs.map(doc => run(doc.ref)));
    if (results.some(result => result.status === 'rejected')) throw new Error('payment-reconciliation-unavailable');
    return { checked: results.length };
  }
  return { run, runDue };
}
function createRuntimeReconciler({ db, bookings, Timestamp, envFor = () => process.env, readSecret = () => '', clock = Date.now, providerFactory = createTranzilaAdapter, diagnosticFactory = options => require('./tranzila-diagnostics').createTranzilaDiagnostics(options), logger = console }) {
  return { async runDue() {
    const env = envFor();
    // Reuse the existing private scheduled handler and its two secret bindings.
    // Diagnostic admission is independent of financial admission and never runs
    // reconciliation, booking writes or checkout initiation in this mode.
    if (env.TRANZILA_DIAGNOSTIC_ENABLED === 'true') return diagnosticFactory({ db, Timestamp, envFor: () => env, readSecret, clock, logger }).runOnce();
    if (env.PAYMENT_RECONCILIATION_ENABLED !== 'true') return { disabled: true };
    const runtime = loadPaymentConfiguration({ env, readSecret });
    if (runtime.reconciliationIssues.length) return { blocked: true };
    return createPaymentReconciler({ db, bookings, Timestamp, provider: providerFactory({ config: runtime.config, clock }), isEnabled: () => true, clock }).runDue();
  } };
}
module.exports = { createPaymentReconciler, createRuntimeReconciler };
