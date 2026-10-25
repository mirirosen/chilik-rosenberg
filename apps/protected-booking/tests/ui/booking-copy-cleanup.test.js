import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// Pins the owner-approved booking copy cleanup (task 07): one price, "continue to payment" CTA, one booking reference.
const he = JSON.parse(readFileSync('src/locales/he.json', 'utf8'));
const en = JSON.parse(readFileSync('src/locales/en.json', 'utf8'));
const form = readFileSync('src/components/BookingForm.jsx', 'utf8');
const confirmation = readFileSync('src/components/BookingConfirmation.jsx', 'utf8');
describe('booking copy cleanup', () => {
  it('labels the submit button "continue to payment" in Hebrew and English', () => {
    expect(he.booking.form.submit).toBe('המשך לתשלום');
    expect(en.booking.form.submit).toBe('Continue to payment');
    expect(he.booking.form.submitting).toBe('שולח הזמנה...');
  });
  it('renders the total price exactly once on the form', () => {
    expect(form.match(/₪\{totalPrice\}/g)).toHaveLength(1);
    expect(form.match(/\{formData\.participants\} × ₪\{PRICE_PER_PERSON\}/g)).toHaveLength(1);
  });
  it('renders the booking reference only in the reference card on the confirmation', () => {
    // Rendered text only; props such as bookingId={bookingData.bookingId} are not shown to the customer.
    expect(confirmation.match(/(?<!=)\{bookingData\.bookingId\}/g)).toHaveLength(1);
    expect(confirmation).not.toContain('nextSteps.bookingNumber');
    expect(he.confirmation.nextSteps.bookingNumber).toBeUndefined();
    expect(he.confirmation.paidDetail).not.toMatch(/\{\{bookingId\}\}/);
    expect(en.confirmation.paidDetail).not.toMatch(/\{\{bookingId\}\}/);
    // The /confirmation?id= reload and card-return status card reuses the reference-free paid detail.
    expect(form).toContain("detail: t('confirmation.paidDetail')");
    expect(form).not.toContain('booking.payment.paidDetail');
    expect(he.booking.payment.paidDetail).toBeUndefined();
    expect(en.booking.payment.paidDetail).toBeUndefined();
  });
  it('keeps the no-seat-without-payment notice and the 18+/terms checkbox untouched', () => {
    expect(form).toContain(`<p id="no-hold-notice" className="booking-no-hold-notice mt-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm font-bold text-amber-200 text-right" role="note" data-testid="no-hold-notice">{t('booking.noHoldNotice')}</p>`);
    expect(he.booking.form.agreeToTerms).toBe('אני מאשר/ת שאני בן/בת 18 ומעלה ומסכים/ה לתנאי השימוש והתקנון (כולל מדיניות הביטולים)');
  });
});
