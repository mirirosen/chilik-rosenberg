'use strict';
// Booking phone numbers. Israeli mobiles in any common written form (+972 / 972 /
// 00972 prefix, optional trunk 0 after the country code) normalize to the stored
// national form 05XXXXXXXX. Other countries need an explicit international prefix
// ('+' or '00') followed by a country code, and are stored as E.164 (+digits).
// Spaces, ASCII/unicode dashes, dots, parentheses and LRM/RLM marks are ignored.
// Anything else is null.
const SEPARATORS = /[\s\-.()‎‏‐-―−﹘﹣－]/g;
function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 32) return null;
  let digits = value.trim().replace(/\(0\)/g, '').replace(SEPARATORS, '');
  let international = false;
  if (digits.startsWith('+')) { digits = digits.slice(1); international = true; }
  else if (digits.startsWith('00')) { digits = digits.slice(2); international = true; }
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith('972')) digits = `0${digits.slice(3).replace(/^0/, '')}`;
  else if (international) return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
  return /^05\d{8}$/.test(digits) ? digits : null;
}
// Stored phone (05XXXXXXXX or +E.164) -> E.164 digits without '+', for wa.me / WhatsApp.
function phoneToE164Digits(phone) {
  const normalized = normalizePhone(String(phone || ''));
  if (!normalized) return '';
  return normalized.startsWith('+') ? normalized.slice(1) : `972${normalized.slice(1)}`;
}
module.exports = { normalizePhone, phoneToE164Digits };
