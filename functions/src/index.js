'use strict';
/**
 * Tranzila card-payment integration — Firebase Cloud Functions (2nd gen).
 *
 * SANDBOX-READY, NOT PRODUCTION-READY: requires the Tranzila terminal
 * credentials (see TRANZILA_SETUP.md). With placeholder config the functions
 * fail closed (4xx/5xx, no payment URL is ever issued).
 *
 * Endpoints (region europe-west1):
 * - POST /createPayment        create booking (idempotent) + capacity hold, return { bookingId, paymentUrl }
 * - POST /tranzilaWebhook      Tranzila's server-to-server notify POST (urlencoded).
 *                              AUTHORITATIVE source of truth for "paid" — the
 *                              success_url_address browser redirect is NOT.
 *                              Verified: Response=000 + sum match + nonce match.
 * - GET  /paymentStatus?id=…    polled by the booking form after redirect-back
 * - (scheduled) expirePaymentHolds — releases 15-min capacity holds
 *
 * No card data ever touches our servers. No secrets are committed — terminal
 * name is a non-secret param; the optional terminal password lives in Secret
 * Manager. Never commit functions/.env.
 */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const core = require('./payment-core');
admin.initializeApp();
const db = admin.firestore();

// Tranzila terminal name (supplier), e.g. "chilik-tours". Non-secret: it appears in the payment URL.
const TRANZILA_TERMINAL = defineString('TRANZILA_TERMINAL', { default: '' });
// Terminal password — only needed when the terminal is configured to require it
// in the payment request, and later for server-side handshake verification.
const TRANZILA_PW = defineSecret('TRANZILA_PW');
const TRANZILA_REQUIRE_PW = defineString('TRANZILA_REQUIRE_PW', { default: 'false' });
// tranmode for the iframe payment page. Default 'AK' per Tranzila docs examples;
// confirm the approved mode in my.tranzila.com during sandbox testing.
const TRANZILA_TRANMODE = defineString('TRANZILA_TRANMODE', { default: 'AK' });
const PUBLIC_SITE_URL = defineString('PUBLIC_SITE_URL', { default: 'https://www.chilik-tours.com' });
const APP_ID = 'hilik-rosenberg-v1';
const allowedOrigins = new Set(['https://www.chilik-tours.com', 'https://chilik-tours.com', 'http://localhost:3000', 'http://localhost:5173']);

function json(res, status, body) { res.status(status).set('Cache-Control', 'no-store').json(body); }
function cors(req, res) {
  const origin = req.get('origin');
  if (origin && allowedOrigins.has(origin)) res.set('Access-Control-Allow-Origin', origin).set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST,GET,OPTIONS').set('Access-Control-Allow-Headers', 'Content-Type,X-Idempotency-Key');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  return !origin || allowedOrigins.has(origin);
}
function tourRef(date) { return db.doc(`artifacts/${APP_ID}/public/data/tourDates/${date}`); }
function settingsRef() { return db.doc(`artifacts/${APP_ID}/public/data/settings/global`); }
function bookingRef(id) { return db.doc(`bookings/${id}`); }

function requireTranzilaConfig() {
  if (!TRANZILA_TERMINAL.value()) {
    const err = new Error('payment provider not configured');
    err.status = 503;
    throw err;
  }
}

function functionBaseUrl() {
  return `https://europe-west1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net`;
}

exports.createPayment = onRequest({ region: 'europe-west1' }, async (req, res) => {
  if (!cors(req, res)) return json(res, 403, { error: 'origin-not-allowed' });
  if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' });
  try { requireTranzilaConfig(); } catch (e) { return json(res, e.status || 503, { error: 'payment-provider-not-configured' }); }

  const idem = req.get('x-idempotency-key');
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(idem || '')) return json(res, 400, { error: 'invalid-idempotency-key' });
  let validated;
  try { validated = core.validateBookingInput(req.body); } catch (e) { return json(res, 400, { error: e.message }); }
  const bookingId = `BK-${crypto.createHash('sha256').update(idem).digest('hex').slice(0, 20)}`;
  const ref = bookingRef(bookingId);
  try {
    const existing = await ref.get();
    if (existing.exists && existing.data().paymentUrl && existing.data().paymentStatus === 'awaiting_payment') {
      return json(res, 200, { bookingId, paymentUrl: existing.data().paymentUrl, reused: true });
    }
    let createdNew = false;
    const nonce = core.makePaymentNonce();
    await db.runTransaction(async tx => {
      const [booking, tour, settings] = await Promise.all([tx.get(ref), tx.get(tourRef(req.body.tourDate)), tx.get(settingsRef())]);
      if (booking.exists) return;
      createdNew = true;
      const td = tour.exists ? tour.data() : {};
      const sd = settings.exists ? settings.data() : {};
      if ((sd.blocked || []).includes(req.body.tourDate) || (sd.soldOut || []).includes(req.body.tourDate)) throw new Error('tour-unavailable');
      const max = td.useGlobalMax === false ? (td.customMax || sd.globalMaxParticipants || 30) : (sd.globalMaxParticipants || 30);
      const current = td.currentRegistrations || 0;
      if (current + validated.participants > max) throw new Error('capacity-exceeded');
      const now = admin.firestore.Timestamp.now();
      tx.set(ref, {
        bookingId,
        name: req.body.name.trim(),
        phone: req.body.phone.trim(),
        email: req.body.email.trim(),
        participants: validated.participants,
        tourDate: req.body.tourDate,
        notes: String(req.body.notes || '').trim().slice(0, 1000),
        howDidYouHear: String(req.body.howDidYouHear || '').slice(0, 80),
        dateOfBirth: String(req.body.dateOfBirth || ''),
        paymentMethod: 'credit',
        totalPrice: validated.amount,
        pricePerPerson: core.PRICE_PER_PERSON,
        status: 'payment_pending',
        paymentStatus: 'creating',
        tranzilaNonce: nonce,
        idempotencyKeyHash: crypto.createHash('sha256').update(idem).digest('hex'),
        holdExpiresAt: admin.firestore.Timestamp.fromDate(core.holdExpiresAt()),
        createdAt: now,
        updatedAt: now,
      });
      tx.set(tourRef(req.body.tourDate), { date: req.body.tourDate, useGlobalMax: td.useGlobalMax !== false, customMax: td.customMax || null, currentRegistrations: current + validated.participants, updatedAt: now }, { merge: true });
    });
    const fresh = await ref.get();
    if (!createdNew && !fresh.data()?.paymentUrl) return json(res, 409, { error: 'payment-initiation-in-progress' });
    if (fresh.data()?.paymentUrl) return json(res, 200, { bookingId, paymentUrl: fresh.data().paymentUrl, reused: true });

    // Build the Tranzila payment-page URL server-side (terminal name + optional
    // password never leave the server; the browser only gets the final URL).
    const base = PUBLIC_SITE_URL.value().replace(/\/$/, '');
    const notifyUrl = `${functionBaseUrl()}/tranzilaWebhook?id=${encodeURIComponent(bookingId)}`;
    let paymentUrl;
    try {
      paymentUrl = core.buildTranzilaPaymentUrl({
        terminal: TRANZILA_TERMINAL.value(),
        booking: { bookingId, ...fresh.data() },
        urls: {
          success: `${base}/booking?payment=success&id=${encodeURIComponent(bookingId)}`,
          failure: `${base}/booking?payment=failed&id=${encodeURIComponent(bookingId)}`,
          notify: notifyUrl,
        },
        nonce: fresh.data().tranzilaNonce,
        tranmode: TRANZILA_TRANMODE.value(),
        tranzilaPW: TRANZILA_REQUIRE_PW.value() === 'true' ? TRANZILA_PW.value() : '',
      });
    } catch (e) {
      console.error('createPayment: Tranzila URL build failed', { bookingId, err: String(e) });
      await releaseHold(ref, 'initiation_failed').catch(() => {});
      return json(res, 502, { error: 'payment-provider-unavailable' });
    }
    await ref.update({ paymentStatus: 'awaiting_payment', paymentUrl, tranzilaRequestCreatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return json(res, 201, { bookingId, paymentUrl });
  } catch (e) {
    const snap = await ref.get().catch(() => null);
    if (snap?.exists && snap.data().paymentStatus === 'creating') await releaseHold(ref, 'initiation_failed').catch(() => {});
    const status = ['tour-unavailable', 'capacity-exceeded'].includes(e.message) ? 409 : 502;
    return json(res, status, { error: e.message });
  }
});

async function releaseHold(ref, reason) {
  await db.runTransaction(async tx => {
    const booking = await tx.get(ref); if (!booking.exists) return;
    const b = booking.data(); if (core.FINAL_PAYMENT_STATES.has(b.paymentStatus) || b.paymentStatus === 'paid') return;
    const tr = tourRef(b.tourDate), tour = await tx.get(tr), current = tour.data()?.currentRegistrations || 0;
    tx.set(tr, { currentRegistrations: Math.max(0, current - b.participants), updatedAt: admin.firestore.Timestamp.now() }, { merge: true });
    tx.update(ref, { status: 'cancelled', paymentStatus: reason === 'expired' ? 'expired' : 'failed', failureReason: reason, updatedAt: admin.firestore.Timestamp.now() });
  });
}

/**
 * Tranzila server-to-server notify (notify_url_address). Body is
 * application/x-www-form-urlencoded; parsed from the raw body so we never
 * depend on framework body-parser behavior.
 *
 * Verification (see payment-core.verifyTranzilaNotify): Response=000, exact
 * sum match, and the per-booking nonce echoed back. Tri-state outcome:
 *   paid           -> status 'confirmed', paymentStatus 'paid'
 *   declined/error -> paymentStatus 'failed'
 *   suspicious     -> paymentStatus 'pending_review' (manual check in my.tranzila.com)
 */
exports.tranzilaWebhook = onRequest({ region: 'europe-west1', secrets: [TRANZILA_PW] }, async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' });
  let notify;
  try { notify = core.parseTranzilaNotify(req.rawBody); }
  catch (e) { return json(res, 400, { error: 'unparseable-body' }); }

  const bookingId = String(req.query.id || notify.bookingId || '');
  if (!/^BK-[a-f0-9]{20}$/.test(bookingId)) return json(res, 400, { error: 'missing-payment-reference' });

  const ref = bookingRef(bookingId);
  try {
    const snap = await ref.get();
    if (!snap.exists) { console.error('tranzilaWebhook: unknown booking', bookingId); return json(res, 404, { error: 'booking-not-found' }); }
    const booking = snap.data();

    // Idempotency: already paid -> just acknowledge.
    if (booking.paymentStatus === 'paid') return json(res, 200, { received: true, duplicate: true });

    const verdict = core.verifyTranzilaNotify(notify, booking);

    if (!verdict.ok && !verdict.approved) {
      // Declined / cancelled / error at the payment page.
      console.warn('tranzilaWebhook: not-approved callback', { bookingId, reason: verdict.reason });
      await ref.update({ paymentStatus: 'failed', paymentFailureReason: verdict.reason, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return json(res, 200, { received: true });
    }
    if (!verdict.ok) {
      // Claims to be paid but identity/amount don't match ours -> manual review, never auto-paid.
      console.error('tranzilaWebhook: suspicious paid callback', { bookingId, reason: verdict.reason });
      await ref.update({ paymentStatus: 'pending_review', paymentFailureReason: verdict.reason, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return json(res, 422, { error: 'verification-failed' });
    }

    // Delivery dedup: same Tranzila transaction delivered twice.
    const deliveryId = notify.confirmationCode && notify.index
      ? `tranzila-txn-${notify.confirmationCode}-${notify.index}`
      : null;
    await db.runTransaction(async tx => {
      if (deliveryId) {
        const deliveryRef = db.doc(`paymentWebhookDeliveries/${deliveryId}`);
        if ((await tx.get(deliveryRef)).exists) return;
        tx.create(deliveryRef, { bookingId, confirmationCode: notify.confirmationCode, createdAt: admin.firestore.Timestamp.now() });
      }
      const b = (await tx.get(ref)).data();
      if (b.paymentStatus === 'paid') return;
      tx.update(ref, {
        status: 'confirmed',
        paymentStatus: 'paid',
        tranzilaConfirmationCode: notify.confirmationCode || null,
        tranzilaIndex: notify.index || null,
        paidAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });
    return json(res, 200, { received: true });
  } catch (e) {
    console.error('tranzilaWebhook: processing failed', { bookingId, err: String(e) });
    return json(res, 500, { error: 'processing-failed' });
  }
});

exports.paymentStatus = onRequest({ region: 'europe-west1' }, async (req, res) => {
  if (!cors(req, res)) return json(res, 403, { error: 'origin-not-allowed' });
  if (req.method !== 'GET') return json(res, 405, { error: 'method-not-allowed' });
  const id = String(req.query.id || ''); if (!/^BK-[a-f0-9]{20}$/.test(id)) return json(res, 400, { error: 'invalid-id' });
  const snap = await bookingRef(id).get(); if (!snap.exists) return json(res, 404, { error: 'not-found' });
  const b = snap.data(); return json(res, 200, { bookingId: id, paymentStatus: b.paymentStatus, status: b.status });
});

exports.expirePaymentHolds = require('firebase-functions/v2/scheduler').onSchedule({ schedule: 'every 5 minutes', region: 'europe-west1' }, async () => {
  const now = admin.firestore.Timestamp.now();
  const snaps = await db.collection('bookings').where('paymentStatus', 'in', ['creating', 'awaiting_payment']).where('holdExpiresAt', '<=', now).limit(100).get();
  await Promise.all(snaps.docs.map(d => releaseHold(d.ref, 'expired')));
});
