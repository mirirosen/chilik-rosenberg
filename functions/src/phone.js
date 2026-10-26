'use strict';
// Israeli mobile numbers in any common written form (+972 / 972 / 00972 prefix,
// optional trunk 0 after the country code, spaces, dashes, dots, parentheses)
// normalize to the stored national form 05XXXXXXXX. Anything else is null.
function normalizeIsraeliMobile(value) {
  if (typeof value !== 'string' || value.length > 32) return null;
  let digits = value.trim().replace(/[\s\-.()‎‏]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith('972')) digits = `0${digits.slice(3).replace(/^0/, '')}`;
  return /^05\d{8}$/.test(digits) ? digits : null;
}
module.exports = { normalizeIsraeliMobile };
