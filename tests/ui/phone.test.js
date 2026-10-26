import { describe, expect, it } from 'vitest';
import { normalizeIsraeliMobile } from '../../apps/protected-booking/src/utils/phone';

describe('booking phone normalization', () => {
  it('accepts +972 / 972 / spaces / dashes / parentheses and returns 05XXXXXXXX', () => {
    for (const raw of ['0501234567', '050-1234567', '050 123 4567', '(050) 123-4567', '+972501234567', '+972 50-123-4567', '+972 (0)50 123 4567', '972501234567', '00972501234567']) {
      expect(normalizeIsraeliMobile(raw), raw).toBe('0501234567');
    }
  });
  it('rejects landlines, foreign and malformed numbers', () => {
    for (const raw of ['', '031234567', '+97231234567', '+14155550100', '05012345', '050123456789', '05O1234567', null]) {
      expect(normalizeIsraeliMobile(raw), String(raw)).toBeNull();
    }
  });
});
