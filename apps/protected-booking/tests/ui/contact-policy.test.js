import { it, expect } from 'vitest';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
import { whatsappNumber } from '../../src/data/content';
it('keeps the approved contact while withholding unverified payment destinations', () => {
  expect(whatsappNumber).toBe('972506724312');
  for (const locale of [he,en]) {
    const modal = locale.terms.paymentModal;
    expect(modal.credit.phone).toContain('0506724312');
    expect(JSON.stringify(modal.bit)).not.toMatch(/\d{9,}/);
    expect(modal.bank.accountNumber).toBe('');
    expect(modal.bank.bankName).toBe('');
    expect(modal.bank.branchNumber).toBe('');
    expect(modal.bit.line1).toBeTruthy();
  }
});
