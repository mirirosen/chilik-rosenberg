'use strict';
const crypto = require('crypto');
const PRICE_PER_PERSON = 250;
const fault = code => Object.assign(new Error(code), { code });
function localDate(now) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
function realDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value; }
function validateBooking(input, now = new Date()) {
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
  if (!text(input?.name, 120)) throw fault('invalid-name');
  if (typeof input.phone !== 'string' || !/^05\d-?\d{7}$/.test(String(input.phone || '').replace(/\s/g, ''))) throw fault('invalid-phone');
  if (!text(input.email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw fault('invalid-email');
  if (!realDate(input.tourDate) || new Date(input.tourDate + 'T12:00:00Z').getUTCDay() !== 4 || (input.tourDate < localDate(now) || (input.tourDate === localDate(now) && Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hourCycle: 'h23' }).format(now)) >= 20)) || new Date(input.tourDate + 'T12:00:00Z') - now > 84 * 86400000) throw fault('invalid-date');
  if (!['number', 'string'].includes(typeof input.participants) || (typeof input.participants === 'string' && !/^\d+$/.test(input.participants))) throw fault('invalid-participants');
  const participants = Number(input.participants);
  if (input.notes != null && (typeof input.notes !== 'string' || input.notes.length > 1000)) throw fault('invalid-notes');
  if (!Number.isInteger(participants) || participants < 1 || participants > 20) throw fault('invalid-participants');
  if (!['credit', 'bit', 'bank_transfer'].includes(input.paymentMethod)) throw fault('invalid-payment-method');
  if (input.agreeToTerms !== true) throw fault('terms-required');
  if (!realDate(input.dateOfBirth)) throw fault('invalid-birth-date');
  const today = localDate(now), adultCutoff = `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;
  if (input.dateOfBirth > adultCutoff || input.dateOfBirth < '1900-01-01') throw fault('adult-required');
  return { name: input.name.trim(), phone: input.phone.replace(/\D/g, ''), email: input.email.trim().toLowerCase(), participants, tourDate: input.tourDate, paymentMethod: input.paymentMethod, notes: String(input.notes || '').trim().slice(0, 1000), howDidYouHear: String(input.howDidYouHear || '').slice(0, 80), adultConfirmed: true, termsVersion: '2026-10', totalPrice: participants * PRICE_PER_PERSON, pricePerPerson: PRICE_PER_PERSON, language: input.language === 'en' ? 'en' : 'he' };
}
function fingerprint(data) { return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'); }
function identifiers(uid, key) {
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key || '')) throw fault('invalid-idempotency-key');
  return `BK-${fingerprint([uid, key]).slice(0, 24)}`;
}
function transition(booking, event, nowMs = Date.now()) {
  if (booking.schemaVersion !== 2 || typeof booking.capacityReserved !== 'boolean') throw fault('legacy-booking-requires-reconciliation');
  const active = booking.capacityReserved;
  if (event === 'confirm') {
    if (booking.status === 'confirmed') return null;
    if (booking.status !== 'pending' || !active || booking.paymentMethod === 'credit') throw fault('invalid-transition');
    return { status: 'confirmed' };
  }
  if (event === 'cancel') {
    if (booking.status === 'cancelled') return null;
    return { status: 'cancelled', capacityReserved: false, ...(['paid', 'pending_review'].includes(booking.paymentStatus) ? { refundStatus: 'manual_review_required' } : { paymentStatus: 'cancelled' }) };
  }
  if (event === 'expire' || event === 'decline' || event === 'initiation_failed') {
    if (!['creating', 'awaiting_payment'].includes(booking.paymentStatus) || !active) return null;
    if (event === 'expire' && booking.holdExpiresAt.toMillis() > nowMs) return null;
    return { status: 'cancelled', paymentStatus: event === 'expire' ? 'expired' : 'failed', capacityReserved: false };
  }
  if (event === 'paid') {
    if (booking.paymentMethod !== 'credit') throw fault('invalid-transition');
    if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'pending_review') return null;
    // Late captured money must never confirm released/expired seats or revive cancellation.
    if (!active || booking.status === 'cancelled' || booking.holdExpiresAt.toMillis() <= nowMs) return { status: 'payment_review', paymentStatus: 'pending_review', capacityReserved: false, paymentReviewReason: 'late-payment-after-hold' };
    return { status: 'confirmed', paymentStatus: 'paid' };
  }
  throw fault('invalid-transition');
}
module.exports = { validateBooking, fingerprint, identifiers, transition, fault };
