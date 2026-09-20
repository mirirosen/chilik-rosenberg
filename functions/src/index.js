'use strict';
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const core = require('./payment-core');
admin.initializeApp();
const db = admin.firestore();

const MORNING_CLIENT_ID = defineSecret('MORNING_SANDBOX_CLIENT_ID');
const MORNING_CLIENT_SECRET = defineSecret('MORNING_SANDBOX_CLIENT_SECRET');
const MORNING_WEBHOOK_SECRET = defineSecret('MORNING_SANDBOX_WEBHOOK_SECRET');
const PUBLIC_SITE_URL = defineString('PUBLIC_SITE_URL', { default: 'https://www.chilik-tours.com' });
const APP_ID = 'hilik-rosenberg-v1';
const AUTH_URL = 'https://api.sandbox.morning.dev/idp/v1/oauth/token';
const API_URL = 'https://sandbox.d.greeninvoice.co.il/api/v1';
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
async function morningToken() {
  const r = await fetch(AUTH_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ grant_type: 'client_credentials', client_id: MORNING_CLIENT_ID.value(), client_secret: MORNING_CLIENT_SECRET.value() }) });
  if (!r.ok) throw new Error(`morning-auth-${r.status}`);
  return (await r.json()).accessToken;
}
async function createMorningForm(booking, notifyUrl) {
  const token = await morningToken();
  const base = PUBLIC_SITE_URL.value().replace(/\/$/, '');
  const payload = core.paymentPayload(booking, { success: `${base}/booking?payment=success&id=${encodeURIComponent(booking.bookingId)}`, failure: `${base}/booking?payment=failed&id=${encodeURIComponent(booking.bookingId)}`, notify: notifyUrl });
  const r = await fetch(`${API_URL}/payments/form`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.success || !/^https:\/\//.test(data.url || '')) throw new Error(`morning-form-${r.status}-${data.errorCode || 'unknown'}`);
  return { url: data.url, payload };
}

exports.createPayment = onRequest({ region: 'europe-west1', secrets: [MORNING_CLIENT_ID, MORNING_CLIENT_SECRET] }, async (req, res) => {
  if (!cors(req, res)) return json(res, 403, { error: 'origin-not-allowed' });
  if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' });
  const idem = req.get('x-idempotency-key');
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(idem || '')) return json(res, 400, { error: 'invalid-idempotency-key' });
  let validated;
  try { validated = core.validateBookingInput(req.body); } catch (e) { return json(res, 400, { error: e.message }); }
  const bookingId = `BK-${crypto.createHash('sha256').update(idem).digest('hex').slice(0, 20)}`;
  const ref = bookingRef(bookingId);
  try {
    const existing = await ref.get();
    if (existing.exists && existing.data().paymentUrl && existing.data().paymentStatus === 'awaiting_payment') return json(res, 200, { bookingId, paymentUrl: existing.data().paymentUrl, reused: true });
    let createdNew = false;
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
      tx.set(ref, { bookingId, name: req.body.name.trim(), phone: req.body.phone.trim(), email: req.body.email.trim(), participants: validated.participants, tourDate: req.body.tourDate, notes: String(req.body.notes || '').trim().slice(0, 1000), howDidYouHear: String(req.body.howDidYouHear || '').slice(0, 80), dateOfBirth: String(req.body.dateOfBirth || ''), paymentMethod: 'credit', totalPrice: validated.amount, pricePerPerson: core.PRICE_PER_PERSON, status: 'payment_pending', paymentStatus: 'creating', idempotencyKeyHash: crypto.createHash('sha256').update(idem).digest('hex'), holdExpiresAt: admin.firestore.Timestamp.fromDate(core.holdExpiresAt()), createdAt: now, updatedAt: now });
      tx.set(tourRef(req.body.tourDate), { date: req.body.tourDate, useGlobalMax: td.useGlobalMax !== false, customMax: td.customMax || null, currentRegistrations: current + validated.participants, updatedAt: now }, { merge: true });
    });
    const fresh = await ref.get();
    if (!createdNew && !fresh.data()?.paymentUrl) return json(res, 409, { error: 'payment-initiation-in-progress' });
    if (fresh.data()?.paymentUrl) return json(res, 200, { bookingId, paymentUrl: fresh.data().paymentUrl, reused: true });
    const notifyUrl = `https://europe-west1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/morningWebhook?id=${encodeURIComponent(bookingId)}`;
    const form = await createMorningForm(fresh.data(), notifyUrl);
    await ref.update({ paymentStatus: 'awaiting_payment', paymentUrl: form.url, morningRequestCreatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return json(res, 201, { bookingId, paymentUrl: form.url });
  } catch (e) {
    const snap = await ref.get().catch(() => null);
    if (snap?.exists && snap.data().paymentStatus === 'creating') await releaseHold(ref, 'initiation_failed').catch(() => {});
    const status = ['tour-unavailable', 'capacity-exceeded'].includes(e.message) ? 409 : 502;
    return json(res, status, { error: e.message.startsWith('morning-') ? 'payment-provider-unavailable' : e.message });
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

exports.morningWebhook = onRequest({ region: 'europe-west1', secrets: [MORNING_WEBHOOK_SECRET] }, async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'method-not-allowed' });
  const raw = req.rawBody;
  if (!core.verifyWebhookSignature(raw, req.get('x-webhook-signature'), MORNING_WEBHOOK_SECRET.value())) return json(res, 401, { error: 'invalid-signature' });
  if (!core.isFreshTimestamp(req.get('x-webhook-timestamp'))) return json(res, 401, { error: 'stale-delivery' });
  const deliveryId = req.get('x-webhook-delivery-id');
  if (!deliveryId) return json(res, 400, { error: 'missing-delivery-id' });
  const facts = core.webhookFacts({ ...req.body, bookingId: req.query.id || req.body?.bookingId });
  if (!facts.bookingId || !facts.transactionId) return json(res, 400, { error: 'missing-payment-reference' });
  try {
    await db.runTransaction(async tx => {
      const deliveryRef = db.doc(`paymentWebhookDeliveries/${deliveryId}`), delivery = await tx.get(deliveryRef);
      if (delivery.exists) return;
      const ref = bookingRef(facts.bookingId), booking = await tx.get(ref);
      if (!booking.exists) throw new Error('booking-not-found');
      const b = booking.data();
      if (b.paymentStatus === 'paid') { tx.create(deliveryRef, { duplicate: true, createdAt: admin.firestore.Timestamp.now() }); return; }
      if (facts.currency !== 'ILS' || facts.amount !== b.totalPrice) throw new Error('payment-mismatch');
      tx.update(ref, { status: 'confirmed', paymentStatus: 'paid', morningTransactionId: facts.transactionId, paidAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now() });
      tx.create(deliveryRef, { bookingId: facts.bookingId, transactionId: facts.transactionId, createdAt: admin.firestore.Timestamp.now() });
    });
    return json(res, 200, { received: true });
  } catch (e) { return json(res, e.message === 'booking-not-found' ? 404 : 409, { error: e.message }); }
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
