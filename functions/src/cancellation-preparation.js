'use strict';
const { fingerprint } = require('./booking-core');
const { CONTRACT_GAPS, assertPrivateCharge, cancellationReadinessIssues } = require('./providers/tranzila-cancellation-draft');
const COLLECTION = 'paymentCancellationPreparations';
const fault = (code, status = 409) => Object.assign(new Error(code), { code, status });
function validRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'bookingId') || !/^BK-[a-f0-9]{24}$/.test(input.bookingId || '')) throw fault('invalid-cancellation-preparation-request', 400);
  return input.bookingId;
}
function publicPreparation(record, preparationId, reused) {
  return { bookingId: record.bookingId, preparationId, status: 'prepared_only', executable: false, reused, unresolvedContracts: [...CONTRACT_GAPS] };
}
function createCancellationPreparationService({ db, Timestamp, terminal = '', authorizeOperator, clock = Date.now } = {}) {
  async function prepare(input) {
    const bookingId = validRequest(input);
    // Authorization must be supplied by trusted server code, never request body.
    const actor = typeof authorizeOperator === 'function' ? await authorizeOperator() : null;
    if (!actor || actor.admin !== true || typeof actor.uid !== 'string' || !actor.uid || actor.uid.length > 128) throw fault('cancellation-preparation-forbidden', 403);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(terminal)) throw fault('cancellation-terminal-unconfigured', 503);
    const nowMs = clock();
    if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw fault('cancellation-preparation-clock-invalid');
    const bookingRef = db.doc(`bookings/${bookingId}`);
    const query = db.collection('paymentWebhookDeliveries').where('bookingId', '==', bookingId).where('event', '==', 'paid').limit(2);
    return db.runTransaction(async tx => {
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists) throw fault('cancellation-booking-not-found', 404);
      const booking = bookingSnap.data();
      if (booking.bookingId !== bookingId || booking.paymentMethod !== 'credit' || booking.paymentStatus !== 'paid' || booking.additionalPaymentReview === true) throw fault('cancellation-charge-requires-review');
      // Local booking cancellation does not prove the financial charge was voided.
      if (booking.refundStatus != null && booking.refundStatus !== 'manual_review_required') throw fault('cancellation-outcome-requires-review');
      if (booking.paymentTerminal !== terminal) throw fault('cancellation-terminal-mismatch');
      const deliveries = await tx.get(query);
      if (deliveries.docs.length !== 1) throw fault('cancellation-charge-missing-or-ambiguous');
      const ledgerDoc = deliveries.docs[0], ledger = ledgerDoc.data(), p = ledger.providerTransaction;
      if (ledger.bookingId !== bookingId || ledger.event !== 'paid' || !p) throw fault('unverified-original-charge');
      const charge = { bookingId, provider: p.provider, terminal: p.terminal, transactionIndex: p.transactionIndex, authorizationNumber: p.authorizationNumber, sourceLedgerId: ledgerDoc.id };
      assertPrivateCharge(charge);
      if (charge.terminal !== terminal) throw fault('cancellation-terminal-mismatch');
      const preparationId = fingerprint(`cancel:${charge.terminal}:${charge.transactionIndex}`);
      const ref = db.doc(`${COLLECTION}/${preparationId}`), existing = await tx.get(ref);
      if (existing.exists) {
        const record = existing.data();
        if (record.status !== 'prepared_only') throw fault('cancellation-outcome-requires-review');
        if (record.bookingId !== bookingId || record.sourceLedgerId !== charge.sourceLedgerId || record.executionEnabled !== false || ['provider', 'terminal', 'transactionIndex', 'authorizationNumber'].some(key => record.originalCharge?.[key] !== charge[key])) throw fault('cancellation-preparation-conflict');
        return publicPreparation(record, preparationId, true);
      }
      const now = Timestamp.fromMillis(nowMs);
      const record = { schemaVersion: 1, bookingId, status: 'prepared_only', executionEnabled: false, sourceLedgerId: charge.sourceLedgerId, originalCharge: { provider: charge.provider, terminal: charge.terminal, transactionIndex: charge.transactionIndex, authorizationNumber: charge.authorizationNumber }, unresolvedContracts: [...CONTRACT_GAPS], requestedBy: actor.uid, createdAt: now, updatedAt: now };
      tx.create(ref, record);
      return publicPreparation(record, preparationId, false);
    });
  }
  async function cancel() {
    // No provider request, secret read, retry, refund or booking transition exists.
    throw Object.assign(fault('cancellation-execution-unsupported', 503), { unresolvedContracts: [...CONTRACT_GAPS] });
  }
  return Object.freeze({ prepare, cancel, readinessIssues: cancellationReadinessIssues });
}
module.exports = { COLLECTION, createCancellationPreparationService };
