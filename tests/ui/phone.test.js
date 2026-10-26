import { describe, expect, it } from 'vitest';
import { normalizePhone, phoneToE164Digits } from '../../apps/protected-booking/src/utils/phone';

describe('booking phone normalization', () => {
  it('accepts +972 / 972 / spaces / dashes / parentheses and returns 05XXXXXXXX', () => {
    for (const raw of ['0501234567', '050-1234567', '050 123 4567', '(050) 123-4567', '+972501234567', '+972 50-123-4567', '+972 (0)50 123 4567', '972501234567', '00972501234567', '050–1234567', '‎+972 50‑123‒4567']) {
      expect(normalizePhone(raw), raw).toBe('0501234567');
    }
  });
  it('returns E.164 for international numbers written with + or 00', () => {
    expect(normalizePhone('+1 (415) 555-0100')).toBe('+14155550100');
    expect(normalizePhone('0044 20 7946 0958')).toBe('+442079460958');
    expect(normalizePhone('+44 (0)20 7946 0958')).toBe('+442079460958');
    expect(phoneToE164Digits('+14155550100')).toBe('14155550100');
    expect(phoneToE164Digits('050-1234567')).toBe('972501234567');
  });
  it('rejects landlines, prefix-less foreign, + without a country code and malformed numbers', () => {
    for (const raw of ['', '031234567', '+97231234567', '14155550100', '+0501234567', '+123456', '05012345', '050123456789', '05O1234567', null]) {
      expect(normalizePhone(raw), String(raw)).toBeNull();
    }
  });
});
