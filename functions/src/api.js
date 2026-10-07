'use strict';
const { FUNCTION_REGION, BOOKING_RUNTIME, INTEGRATION_RUNTIME } = require('./deployment-config');
const { authenticate, canReadStatus } = require('./access');

// Firebase transport, verified identity and provider services are supplied by the
// runtime. Tests use this same handler factory without credentials or network.
function createBookingApi({ onRequest, onSchedule, db, Timestamp, bookings, jobs, paymentFlow, paymentReconciler, paymentSecrets = [], verifyIdToken, integrationSecrets = [], logger = console, enabled = false, schedulesEnabled = false }) {
  const api = {};
  const region = FUNCTION_REGION;
  const origins = new Set(['https://livechilik-tours.com', 'https://www.chilik-tours.com', 'https://chilik-tours.com', 'https://hilik-site.web.app', 'https://hilik-site.firebaseapp.com', 'http://localhost:3000', 'http://localhost:5173']);
  function json(res, status, body) { return res.status(status).set('Cache-Control', 'no-store').json(body); }
  function cors(req, res) {
    const origin = req.get('origin');
    if (origin && !origins.has(origin)) { json(res, 403, { error: 'origin-not-allowed' }); return false; }
    if (origin) res.set('Access-Control-Allow-Origin', origin).set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST,GET,OPTIONS').set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Idempotency-Key');
    if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
    return true;
  }
  const identity = (req, needsAdmin) => authenticate(req, verifyIdToken, needsAdmin);
  function endpoint(method, action, needsAdmin = false, needsPaymentSecrets = false) {
    return onRequest({ region, serviceAccount: BOOKING_RUNTIME, invoker: 'private', minInstances: 0, maxInstances: 1, concurrency: 1, memory: '256MiB', cpu: 1, timeoutSeconds: 60, ...(needsPaymentSecrets && paymentSecrets.length ? { secrets: paymentSecrets } : {}) }, async (req, res) => {
      if (enabled !== true) return json(res, 503, { error: 'booking-runtime-disabled' });
      if (!cors(req, res)) return;
      if (req.method !== method) return json(res, 405, { error: 'method-not-allowed' });
      try { return await action(req, res, await identity(req, needsAdmin)); }
      catch (error) {
        const safe = /^(invalid-|terms-required|adult-required|idempotency-conflict|booking-closed|tour-unavailable|capacity-|legacy-booking-|not-found|job-not-retryable)/.test(error.message);
        const status = error.status || (error.message === 'not-found' ? 404 : safe ? 409 : 500);
        logger.error('booking-api', { code: safe ? error.message : 'request-failed' });
        return json(res, status, { error: error.status || safe ? error.message : 'request-failed' });
      }
    });
  }
  function publicBooking(b) {
    return { bookingId: b.bookingId, status: b.status, paymentStatus: b.paymentStatus, totalPrice: b.totalPrice, pricePerPerson: b.pricePerPerson, reused: b.reused === true,
      ...(b.refundStatus === 'manual_review_required' ? { refundStatus: b.refundStatus } : {}),
      ...(b.additionalPaymentReview === true ? { additionalPaymentReview: true } : {}) };
  }
  async function create(req, res, user) {
    if (req.body?.paymentMethod === 'credit') {
      const result = await paymentFlow.create(user.uid, req.get('x-idempotency-key'), req.body);
      return json(res, result.reused ? 200 : 201, result);
    }
    const result = await bookings.create(user.uid, req.get('x-idempotency-key'), req.body);
    return json(res, result.reused ? 200 : 201, publicBooking(result));
  }
  api.createBooking = endpoint('POST', create, false, true);
  api.createPayment = endpoint('POST', async (req, res, user) => {
    const result = await paymentFlow.create(user.uid, req.get('x-idempotency-key'), req.body);
    return json(res, result.reused ? 200 : 201, result);
  }, false, true);
  api.paymentStatus = endpoint('GET', async (req, res, user) => {
    const id = String(req.query.id || '');
    if (!/^BK-[a-f0-9]{20,24}$/.test(id)) return json(res, 400, { error: 'invalid-id' });
    const snap = await bookings.bookingRef(id).get();
    if (!snap.exists || !canReadStatus(snap.data(), user)) return json(res, 404, { error: 'not-found' });
    return json(res, 200, publicBooking(snap.data()));
  });
  api.updateBookingStatus = endpoint('POST', async (req, res, user) => {
    const { bookingId, status } = req.body || {};
    if (!/^BK-[a-f0-9]{24}$/.test(bookingId || '') || !['confirmed', 'cancelled'].includes(status)) return json(res, 400, { error: 'invalid-status-request' });
    const b = await bookings.change(bookingId, status === 'confirmed' ? 'confirm' : 'cancel', user.uid);
    return json(res, 200, publicBooking(b));
  }, true);
  api.retryIntegrationJob = endpoint('POST', async (req, res) => {
    const jobId = String(req.body?.jobId || '');
    if (!/^BK-[a-f0-9]{24}-\d+-(email|calendar|whatsapp)$/.test(jobId)) return json(res, 400, { error: 'invalid-job-id' });
    await jobs.retry(db.doc(`integrationJobs/${jobId}`));
    return json(res, 200, { queued: true });
  }, true);
  api.tranzilaWebhook = onRequest({ region, serviceAccount: BOOKING_RUNTIME, invoker: 'private', minInstances: 0, maxInstances: 1, concurrency: 1, memory: '256MiB', cpu: 1, timeoutSeconds: 60, ...(paymentSecrets.length ? { secrets: paymentSecrets } : {}) }, async (req, res) => {
    if (enabled !== true) return json(res, 503, { error: 'booking-runtime-disabled' });
    if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' });
    try {
      const data = typeof req.body === 'object' && req.body ? req.body : {};
      const result = await paymentFlow.notify({ bookingId: String(req.query.id || data.bookingId || ''), transactionIndex: data.index });
      return json(res, 200, { received: true, paymentStatus: result.paymentStatus });
    } catch (error) {
      return json(res, error.status || 503, { error: error.code || 'provider-verification-pending' });
    }
  });
  if (enabled === true && schedulesEnabled === true && paymentReconciler) api.reconcilePayments = onSchedule({ schedule: 'every 5 minutes', region, serviceAccount: BOOKING_RUNTIME, maxInstances: 1, timeoutSeconds: 540, ...(paymentSecrets.length ? { secrets: paymentSecrets } : {}) }, () => paymentReconciler.runDue());
  if (enabled === true && schedulesEnabled === true) api.expirePaymentHolds = onSchedule({ schedule: 'every 5 minutes', region, serviceAccount: BOOKING_RUNTIME }, async () => {
    const due = await db.collection('bookings').where('schemaVersion', '==', 2).where('paymentStatus', 'in', ['creating', 'awaiting_payment']).where('holdExpiresAt', '<=', Timestamp.now()).limit(100).get();
    const results = await Promise.allSettled(due.docs.map(d => bookings.change(d.id, 'expire', 'system:expiry')));
    if (results.some(r => r.status === 'rejected')) throw new Error('hold-expiry-requires-review');
  });
  if (enabled === true && schedulesEnabled === true) api.processIntegrationJobs = onSchedule({ schedule: 'every 1 minutes', region, serviceAccount: INTEGRATION_RUNTIME, maxInstances: 1, timeoutSeconds: 300, ...(integrationSecrets.length ? { secrets: integrationSecrets } : {}) }, async () => {
    const due = await db.collection('integrationJobs').where('status', 'in', ['pending', 'retry', 'processing']).where('nextAttemptAt', '<=', Timestamp.now()).limit(100).get();
    const results = await Promise.allSettled(due.docs.map(d => jobs.run(d.ref)));
    if (results.some(r => r.status === 'rejected')) throw new Error('integration-job-processing-failed');
  });

  return api;
}
module.exports = { createBookingApi };
