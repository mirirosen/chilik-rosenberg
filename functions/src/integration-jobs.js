'use strict';
const crypto = require('crypto');
// Adapters are intentionally unavailable until merchant-owned configuration,
// permissions and provider idempotency guarantees are verified. No client email.
const disabledAdapters = {
  email: async () => { throw Object.assign(new Error('email-not-configured'), { blocked: true }); },
  calendar: async () => { throw Object.assign(new Error('calendar-not-configured'), { blocked: true }); },
  whatsapp: async () => { throw Object.assign(new Error('whatsapp-not-configured'), { blocked: true }); },
};
function createJobRunner(db, Timestamp, adapters = disabledAdapters) {
  async function run(ref, nowMs = Date.now()) {
    const lease = crypto.randomUUID();
    const claimed = await db.runTransaction(async tx => {
      const snap = await tx.get(ref); if (!snap.exists) return null;
      const job = snap.data();
      if (!['pending', 'retry', 'processing'].includes(job.status) || job.nextAttemptAt.toMillis() > nowMs) return null;
      tx.update(ref, { status: 'processing', lease, attempts: job.attempts + 1, nextAttemptAt: Timestamp.fromMillis(nowMs + 120000), updatedAt: Timestamp.fromMillis(nowMs) });
      return { ...job, attempts: job.attempts + 1 };
    });
    if (!claimed) return;
    let status = 'sent', lastError = null, providerId = null;
    try {
      // Email uses ref.id as its provider idempotency key. Calendar uses one
      // stable mapped/deterministic event identity across booking revisions.
      // Email must render the job's event/revision, not a newer booking status.
      // Calendar must read latest DB state, use ETag updates, timezone
      // Asia/Jerusalem and NO customer attendees. Firestore stays authority.
      const result = await adapters[claimed.kind]({ ...claimed, idempotencyKey: ref.id });
      if (!result?.providerId) throw new Error('provider-acknowledgement-missing');
      providerId = result.providerId;
    } catch (error) {
      status = error?.blocked ? 'blocked' : claimed.attempts >= 8 ? 'failed' : 'retry';
      // Never persist provider response bodies or credentials to admin-readable jobs.
      const safeCodes = new Set(['email-not-configured', 'calendar-not-configured', 'email-snapshot-invalid', 'email-idempotency-window-expired', 'email-payload-changed', 'calendar-event-conflict', 'calendar-data-invalid', 'provider-token-unavailable', 'calendar-binding-unverified', 'calendar-bound-event-missing', 'calendar-count-requires-reconciliation', 'calendar-hold-expiry-pending', 'calendar-concurrent-update', 'whatsapp-not-configured', 'whatsapp-job-invalid', 'whatsapp-snapshot-invalid', 'whatsapp-sender-unverified', 'whatsapp-template-unverified', 'whatsapp-metadata-unavailable', 'whatsapp-payload-changed', 'whatsapp-delivery-uncertain', 'whatsapp-retry-budget-exhausted', 'whatsapp-booking-not-confirmed', 'whatsapp-booking-changed', 'whatsapp-rate-limited', 'whatsapp-provider-rejected']);
      safeCodes.add('whatsapp-provider-message-failed');
      lastError = safeCodes.has(error?.message) ? error.message : 'provider-delivery-failed';
    }
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.data()?.lease !== lease) return;
      tx.update(ref, { status, lastError, providerId, lease: null, nextAttemptAt: Timestamp.fromMillis(nowMs + Math.min(3600000, 30000 * 2 ** claimed.attempts)), updatedAt: Timestamp.fromMillis(nowMs) });
    });
  }
  async function retry(ref, nowMs = Date.now()) {
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref), job = snap.data();
      if (!job) throw new Error('not-found');
      if (!['blocked', 'retry', 'failed'].includes(job.status)) throw new Error('job-not-retryable');
      tx.update(ref, { status: 'pending', attempts: 0, lease: null, lastError: null, nextAttemptAt: Timestamp.fromMillis(nowMs), updatedAt: Timestamp.fromMillis(nowMs) });
    });
  }
  return { run, retry };
}
module.exports = { createJobRunner, disabledAdapters };
