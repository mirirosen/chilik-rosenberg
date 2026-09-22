'use strict';
/**
 * payment-core — shared, provider-specific logic for the Tranzila integration.
 *
 * Pure functions only (no Firebase / network). Covered by
 * functions/test/payment-core.test.js — run `npm test` inside functions/.
 *
 * Tranzila integration model (docs.tranzila.com):
 * - The payment page URL *is* the product: we build a signed iframe URL
 *   (https://direct.tranzila.com/{terminal}/iframenew.php?...). No
 *   server-to-server "create payment" call is needed.
 * - After the customer pays, the browser returns to success_url_address /
 *   fail_url_address, and Tranzila POSTs the transaction result
 *   (application/x-www-form-urlencoded) to notify_url_address.
 * - A notify POST is never trusted on shape alone. Verification is:
 *     1. Response === '000' (Tranzila's approved code)
 *     2. sum matches the booking's totalPrice exactly
 *     3. paymentNonce matches the random nonce we stored on the booking
 *        (unforgeable without reading our database)
 *   Anything else -> 'failed' (declined) or 'pending_review' (suspicious),
 *   never auto-'paid'.
 */
const crypto = require('crypto');
const querystring = require('querystring');

const PRICE_PER_PERSON = 250;
const HOLD_MINUTES = 15;
const FINAL_PAYMENT_STATES = new Set(['paid', 'failed', 'cancelled', 'expired']);

const TRANZILA_DIRECT_BASE = 'https://direct.tranzila.com';
const TRANZILA_APPROVED_RESPONSE = '000';

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

function holdExpiresAt(now = Date.now()) { return new Date(now + HOLD_MINUTES * 60 * 1000); }

function makePaymentNonce() { return crypto.randomBytes(16).toString('hex'); }

/**
 * Build the Tranzila payment-page URL (iframe endpoint, works full-page too).
 *
 * @param {object} args
 * @param {string} args.terminal   Tranzila terminal name (supplier), e.g. "chilik-tours"
 * @param {object} args.booking    { bookingId, name, email, phone, totalPrice, tourDate, participants }
 * @param {object} args.urls       { success, failure, notify } absolute HTTPS URLs
 * @param {string} args.nonce      random per-booking nonce, echoed back in the notify POST
 * @param {string} [args.tranmode] default 'AK' (charge; confirm against terminal config)
 * @param {string} [args.tranzilaPW] optional terminal password — only sent when the
 *        terminal is configured to require it (TRANZILA_REQUIRE_PW=true)
 * @param {string} [args.lang]     'he' | 'en'
 */
function buildTranzilaPaymentUrl({ terminal, booking, urls, nonce, tranmode = 'AK', tranzilaPW = '', lang = 'he' }) {
  if (!terminal || typeof terminal !== 'string') throw new Error('missing-terminal');
  const total = Number(booking?.totalPrice);
  if (!Number.isFinite(total) || total <= 0 || total > 20000) throw new Error('invalid-amount');
  for (const [k, v] of Object.entries(urls || {})) {
    if (!/^https:\/\//.test(String(v || ''))) throw new Error(`invalid-url:${k}`);
  }
  if (!/^[a-f0-9]{32}$/.test(nonce || '')) throw new Error('invalid-nonce');

  const params = {
    supplier: terminal,
    sum: total.toFixed(2), // ILS major units — NOT agorot
    currency: 1,           // 1 = ILS
    cred_type: 1,          // regular (single) charge
    tranmode,
    contact: String(booking.name || '').trim().slice(0, 60),
    email: String(booking.email || '').trim().slice(0, 80),
    phone: String(booking.phone || '').replace(/[^\d]/g, '').slice(0, 15),
    lang: lang === 'en' ? 'en' : 'he',
    nologo: 1,
    success_url_address: urls.success,
    fail_url_address: urls.failure,
    notify_url_address: urls.notify,
    // Echoed back verbatim in the notify POST — the basis of verification:
    bookingId: booking.bookingId,
    paymentNonce: nonce,
  };
  if (tranzilaPW) params.TranzilaPW = tranzilaPW;
  // Drop empty optionals so we never send `email=` etc.
  for (const k of ['contact', 'email', 'phone']) if (!params[k]) delete params[k];

  return `${TRANZILA_DIRECT_BASE}/${encodeURIComponent(terminal)}/iframenew.php?${querystring.stringify(params)}`;
}

/** Parse Tranzila's urlencoded notify POST body into a plain object. */
function parseTranzilaNotify(rawBody) {
  const b = querystring.parse(String(rawBody || ''));
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  return {
    response: String(first(b.Response) || ''),
    sum: Number(first(b.sum)),
    bookingId: String(first(b.bookingId) || ''),
    paymentNonce: String(first(b.paymentNonce) || ''),
    confirmationCode: String(first(b.ConfirmationCode) || ''),
    index: String(first(b.index) || ''),
  };
}

/**
 * Verify a parsed notify against the booking. Tri-state:
 * - { ok:true }                                   -> mark paid
 * - { ok:false, approved:false } (declined/error)  -> mark failed
 * - { ok:false, approved:true }  (suspicious paid) -> mark pending_review (manual)
 */
function verifyTranzilaNotify(notify, booking) {
  if (!notify || notify.response !== TRANZILA_APPROVED_RESPONSE) {
    return { ok: false, approved: false, reason: `not-approved (Response=${(notify && notify.response) || 'missing'})` };
  }
  const expected = Number(booking?.totalPrice).toFixed(2);
  if (!Number.isFinite(notify.sum) || notify.sum.toFixed(2) !== expected) {
    return { ok: false, approved: true, reason: `sum-mismatch (got ${notify.sum}, expected ${expected})` };
  }
  if (!notify.paymentNonce || notify.paymentNonce !== booking.tranzilaNonce) {
    return { ok: false, approved: true, reason: 'nonce-mismatch' };
  }
  return { ok: true };
}

module.exports = {
  PRICE_PER_PERSON,
  HOLD_MINUTES,
  FINAL_PAYMENT_STATES,
  validateBookingInput,
  holdExpiresAt,
  makePaymentNonce,
  buildTranzilaPaymentUrl,
  parseTranzilaNotify,
  verifyTranzilaNotify,
};
