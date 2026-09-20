'use strict';
const crypto = require('crypto');

const PRICE_PER_PERSON = 250;
const HOLD_MINUTES = 15;
const FINAL_PAYMENT_STATES = new Set(['paid', 'failed', 'cancelled', 'expired']);

function safeEqualHex(actual, expected) {
  if (!/^[a-f0-9]{64}$/i.test(actual || '') || !/^[a-f0-9]{64}$/i.test(expected || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !Buffer.isBuffer(rawBody)) return false;
  return safeEqualHex(signature, crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
}
function validateBookingInput(input) {
  const text = (v, max) => typeof v === 'string' && v.trim() && v.trim().length <= max;
  const participants = Number(input?.participants);
  if (!text(input?.name, 120)) throw new Error('invalid-name');
  if (!/^05\d-?\d{7}$/.test(String(input?.phone || '').replace(/\s/g, ''))) throw new Error('invalid-phone');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input?.email || ''))) throw new Error('invalid-email');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input?.tourDate || ''))) throw new Error('invalid-date');
  if (!Number.isInteger(participants) || participants < 1 || participants > 20) throw new Error('invalid-participants');
  return { participants, amount: participants * PRICE_PER_PERSON };
}
function paymentPayload(booking, urls, lang = 'he') {
  return {
    description: `Chilik tour booking ${booking.bookingId}`,
    type: 320,
    amount: booking.totalPrice,
    currency: 'ILS',
    vatType: 0,
    lang: lang === 'en' ? 'en' : 'he',
    maxPayments: 1,
    group: 100,
    client: { name: booking.name, emails: [booking.email], phone: booking.phone, mobile: booking.phone, country: 'IL', add: false },
    income: [{ description: `Bnei Brak culinary tour - ${booking.tourDate}`, quantity: booking.participants, price: PRICE_PER_PERSON, currency: 'ILS', vatType: 0 }],
    remarks: `Booking ${booking.bookingId}`,
    successUrl: urls.success,
    failureUrl: urls.failure,
    notifyUrl: urls.notify,
    custom: booking.bookingId,
  };
}
function webhookFacts(payload) {
  const tx = Array.isArray(payload?.transactions) ? payload.transactions[0] : null;
  return {
    bookingId: String(payload?.custom || payload?.bookingId || payload?.metadata?.bookingId || String(payload?.description || '').match(/BK-[a-f0-9]{20}/i)?.[0] || ''),
    amount: Number(payload?.total ?? tx?.total),
    currency: String(tx?.currency || payload?.currency || 'ILS'),
    transactionId: String(tx?.gatewayTransactionId || tx?.id || payload?.transactionId || payload?.id || ''),
  };
}
function isFreshTimestamp(value, now = Date.now(), toleranceMs = 5 * 60 * 1000) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) && Math.abs(now - time) <= toleranceMs;
}
function holdExpiresAt(now = Date.now()) { return new Date(now + HOLD_MINUTES * 60 * 1000); }
module.exports = { PRICE_PER_PERSON, HOLD_MINUTES, FINAL_PAYMENT_STATES, verifyWebhookSignature, validateBookingInput, paymentPayload, webhookFacts, isFreshTimestamp, holdExpiresAt };
