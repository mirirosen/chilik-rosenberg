import { it, expect } from 'vitest';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
import { whatsappNumber } from '../../src/data/content';
it('keeps the approved contact while offering no manual Bit or bank-transfer payment destinations', () => {
  expect(whatsappNumber).toBe('972506724312');
  for (const locale of [he,en]) {
    const modal = locale.terms.paymentModal;
    expect(modal.credit.phone).toContain('0506724312');
    expect(modal.bit).toBeUndefined();
    expect(modal.bank).toBeUndefined();
    expect(locale.terms.section2.bank).toBeUndefined();
    expect(locale.booking.paymentMethods.bankTransfer).toBeUndefined();
  }
});
