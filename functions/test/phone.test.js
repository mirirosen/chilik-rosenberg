'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { normalizeIsraeliMobile } = require('../src/phone');
const { validateBooking } = require('../src/booking-core');

test('Israeli mobile numbers in common written forms normalize to 05XXXXXXXX', () => {
  for (const raw of ['0501234567', '050-1234567', '050 123 4567', '(050) 123-4567', '+972501234567', '+972 50-123-4567', '+972 (0)50 123 4567', '972501234567', '9720501234567', '00972501234567', '050.123.4567', ' 0501234567 ']) {
    assert.equal(normalizeIsraeliMobile(raw), '0501234567', raw);
  }
});

test('non-mobile, foreign, malformed or non-string phones are rejected', () => {
  for (const raw of ['', '031234567', '+97231234567', '+14155550100', '05012345', '050123456789', '05O1234567', '+972+501234567', '972-50-123-456', null, undefined, 501234567, '0'.repeat(40)]) {
    assert.equal(normalizeIsraeliMobile(raw), null, String(raw));
  }
});

test('booking validation stores the normalized national form', () => {
  const now = new Date('2026-10-01T10:00:00Z');
  const base = { name: 'Test', email: '', participants: 1, tourDate: '2026-10-08', paymentMethod: 'credit', agreeToTerms: true, adultConfirmed: true };
  assert.equal(validateBooking({ ...base, phone: '+972 50-123-4567' }, now).phone, '0501234567');
  assert.equal(validateBooking({ ...base, phone: '050-1234567' }, now).phone, '0501234567');
  assert.throws(() => validateBooking({ ...base, phone: '+1 415 555 0100' }, now), /invalid-phone/);
});
