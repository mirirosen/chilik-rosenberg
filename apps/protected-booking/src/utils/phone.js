// Mirrors functions/src/phone.js: Israeli mobile numbers written with +972 / 972 /
// 00972, an optional trunk 0, spaces, dashes, dots or parentheses normalize to
// the stored national form 05XXXXXXXX. Anything else returns null.
export function normalizeIsraeliMobile(value) {
  if (typeof value !== 'string' || value.length > 32) return null;
  let digits = value.trim().replace(/[\s\-.()‎‏]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  else if (digits.startsWith('00')) digits = digits.slice(2);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith('972')) digits = `0${digits.slice(3).replace(/^0/, '')}`;
  return /^05\d{8}$/.test(digits) ? digits : null;
}
