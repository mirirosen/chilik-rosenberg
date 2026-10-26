'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { normalizePhone, phoneToE164Digits } = require('../src/phone');
const { validateBooking } = require('../src/booking-core');
const { renderContactCard } = require('../src/booking-contact-card');

test('Israeli mobile numbers in common written forms normalize to 05XXXXXXXX', () => {
  for (const raw of ['0501234567', '050-1234567', '050 123 4567', '(050) 123-4567', '+972501234567', '+972 50-123-4567', '+972 (0)50 123 4567', '972501234567', '9720501234567', '00972501234567', '050.123.4567', ' 0501234567 ', '050–1234567', '050‑123‒4567', '‎+972 50‐123—4567', '050 1234567']) {
    assert.equal(normalizePhone(raw), '0501234567', raw);
  }
});

test('international numbers with + or 00 and a country code are stored as E.164', () => {
  for (const [raw, e164] of [['+1 415 555 0100', '+14155550100'], ['+1 (415) 555-0100', '+14155550100'], ['001-415-555-0100', '+14155550100'], ['+44 20 7946 0958', '+442079460958'], ['+44 (0)20 7946 0958', '+442079460958'], ['+33 6 12 34 56 78', '+33612345678'], ['+49–151–12345678', '+4915112345678']]) {
    assert.equal(normalizePhone(raw), e164, raw);
  }
});

test('non-mobile Israeli, prefix-less foreign, malformed or non-string phones are rejected', () => {
  for (const raw of ['', '031234567', '+97231234567', '14155550100', '05012345', '050123456789', '05O1234567', '+972+501234567', '972-50-123-456', '+0501234567', '+05X1234567', '+', '+123456', '+1234567890123456', '00', '+1 415 555 0100 ext 2', null, undefined, 501234567, '0'.repeat(40)]) {
    assert.equal(normalizePhone(raw), null, String(raw));
  }
});

test('WhatsApp digits: Israeli mobiles become 9725..., international keeps its country code', () => {
  assert.equal(phoneToE164Digits('0501234567'), '972501234567');
  assert.equal(phoneToE164Digits('+14155550100'), '14155550100');
  assert.equal(phoneToE164Digits('garbage'), '');
});

test('booking validation stores the normalized national or E.164 form', () => {
  const now = new Date('2026-10-01T10:00:00Z');
  const base = { name: 'Test', email: '', participants: 1, tourDate: '2026-10-08', paymentMethod: 'credit', agreeToTerms: true, adultConfirmed: true };
  assert.equal(validateBooking({ ...base, phone: '+972 50-123-4567' }, now).phone, '0501234567');
  assert.equal(validateBooking({ ...base, phone: '050-1234567' }, now).phone, '0501234567');
  assert.equal(validateBooking({ ...base, phone: '+1 415 555 0100' }, now).phone, '+14155550100');
  assert.throws(() => validateBooking({ ...base, phone: '415 555 0100' }, now), /invalid-phone/);
  assert.throws(() => validateBooking({ ...base, phone: '+05 0123 4567' }, now), /invalid-phone/);
});

test('admin contact card carries international numbers as E.164', () => {
  const card = renderContactCard({ name: 'Test', phone: '+14155550100', tourDate: '2026-10-08', participants: 2 }).toString('utf8');
  assert.ok(card.includes('TEL;VALUE=uri;TYPE=cell:tel:+14155550100\r\n'));
  assert.throws(() => renderContactCard({ name: 'Test', phone: '+97231234567', tourDate: '2026-10-08', participants: 2 }), /invalid-contact-data/);
});
