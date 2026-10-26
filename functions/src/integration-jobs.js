'use strict';
const crypto = require('crypto');
const { FIREBASE_PROJECT } = require('./deployment-config');
// Every test/staging email goes here, never to a customer.
const TEST_RECIPIENT = 'hr20192022@gmail.com';
const blocked = code => Object.assign(new Error(code), { blocked: true });
// Unit tests run the runner ungated; the deployed runner always uses loadIntegrationGates().
const OPEN_GATES = Object.freeze({ cutoffMs: -Infinity, customerMessagesEnabled: true, testMode: false });
function runtimeProject(env) {
  if (env.GCLOUD_PROJECT || env.GCP_PROJECT) return env.GCLOUD_PROJECT || env.GCP_PROJECT;
  try { return JSON.parse(env.FIREBASE_CONFIG || '{}').projectId || ''; } catch { return ''; }
}
// Deployed gates, all fail closed:
// - CHILIK_INTEGRATION_CUTOFF_ISO: jobs created before it are skipped forever; while it
//   is missing or not a valid ISO time the runner claims nothing (jobs wait, none sent).
// - NOTIFY_CUSTOMER_EMAILS (same flag name as the notifications codebase, read from this
//   codebase's own settings): customer emails are blocked unless exactly 'true'.
// - Test mode (CHILIK_TEST_MODE=true, or any project other than production): emails go
//   to TEST_RECIPIENT only and WhatsApp is blocked.
function loadIntegrationGates(env = process.env) {
  const cutoffMs = Date.parse(env.CHILIK_INTEGRATION_CUTOFF_ISO || '');
  return {
    cutoffMs: /^\d{4}-\d{2}-\d{2}T/.test(env.CHILIK_INTEGRATION_CUTOFF_ISO || '') && Number.isFinite(cutoffMs) ? cutoffMs : null,
    customerMessagesEnabled: env.NOTIFY_CUSTOMER_EMAILS === 'true',
    testMode: env.CHILIK_TEST_MODE === 'true' || runtimeProject(env) !== FIREBASE_PROJECT,
  };
}
// Adapters are intentionally unavailable until merchant-owned configuration,
// permissions and provider idempotency guarantees are verified. No client email.
const disabledAdapters = {
  email: async () => { throw Object.assign(new Error('email-not-configured'), { blocked: true }); },
  calendar: async () => { throw Object.assign(new Error('calendar-not-configured'), { blocked: true }); },
  whatsapp: async () => { throw Object.assign(new Error('whatsapp-not-configured'), { blocked: true }); },
};
function createJobRunner(db, Timestamp, adapters = disabledAdapters, gates = OPEN_GATES) {
  async function run(ref, nowMs = Date.now()) {
    // No valid cutoff: claim nothing. Pending jobs wait; nothing is sent or lost.
    if (typeof gates.cutoffMs !== 'number' || Number.isNaN(gates.cutoffMs)) return;
    const lease = crypto.randomUUID();
    const claimed = await db.runTransaction(async tx => {
      const snap = await tx.get(ref); if (!snap.exists) return null;
      const job = snap.data();
      if (!['pending', 'retry', 'processing'].includes(job.status) || job.nextAttemptAt.toMillis() > nowMs) return null;
      // Jobs from before the cutoff never send. 'skipped' is terminal and not retryable.
      if (gates.cutoffMs !== -Infinity && !(job.createdAt?.toMillis?.() >= gates.cutoffMs)) {
        tx.update(ref, { status: 'skipped', lastError: 'before-integration-cutoff', lease: null, updatedAt: Timestamp.fromMillis(nowMs) });
        return null;
      }
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
      // Customer emails stay behind the customer flag; test mode never reaches a
      // customer (email goes to TEST_RECIPIENT) or a phone (WhatsApp blocked).
      if (claimed.kind === 'email' && gates.customerMessagesEnabled !== true) throw blocked('customer-messages-disabled');
      if (claimed.kind === 'whatsapp' && gates.testMode === true) throw blocked('test-mode-whatsapp-disabled');
      const job = claimed.kind === 'email' && gates.testMode === true && claimed.emailSnapshot ? { ...claimed, emailSnapshot: { ...claimed.emailSnapshot, email: TEST_RECIPIENT } } : claimed;
      const result = await adapters[claimed.kind]({ ...job, idempotencyKey: ref.id });
      if (!result?.providerId) throw new Error('provider-acknowledgement-missing');
      providerId = result.providerId;
    } catch (error) {
      status = error?.blocked ? 'blocked' : claimed.attempts >= 8 ? 'failed' : 'retry';
      // Never persist provider response bodies or credentials to admin-readable jobs.
      const safeCodes = new Set(['email-not-configured', 'calendar-not-configured', 'email-snapshot-invalid', 'email-idempotency-window-expired', 'email-payload-changed', 'calendar-event-conflict', 'calendar-data-invalid', 'provider-token-unavailable', 'calendar-binding-unverified', 'calendar-bound-event-missing', 'calendar-count-requires-reconciliation', 'calendar-hold-expiry-pending', 'calendar-concurrent-update', 'whatsapp-not-configured', 'whatsapp-job-invalid', 'whatsapp-snapshot-invalid', 'whatsapp-sender-unverified', 'whatsapp-template-unverified', 'whatsapp-metadata-unavailable', 'whatsapp-payload-changed', 'whatsapp-delivery-uncertain', 'whatsapp-retry-budget-exhausted', 'whatsapp-booking-not-confirmed', 'whatsapp-booking-changed', 'whatsapp-rate-limited', 'whatsapp-provider-rejected']);
      for (const code of ['whatsapp-provider-message-failed', 'customer-messages-disabled', 'test-mode-whatsapp-disabled']) safeCodes.add(code);
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
module.exports = { createJobRunner, disabledAdapters, loadIntegrationGates, TEST_RECIPIENT };
