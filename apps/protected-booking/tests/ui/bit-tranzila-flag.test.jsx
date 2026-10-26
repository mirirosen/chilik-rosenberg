// Task 08: bank transfer removed, manual Bit hidden, Bit via Tranzila behind VITE_BIT_TRANZILA_ENABLED (OFF by default).
import React from 'react';
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';

const mocks = vi.hoisted(() => ({ createBooking: vi.fn(), createCreditPayment: vi.fn(), getPaymentStatus: vi.fn(), makeIdempotencyKey: vi.fn() }));
vi.mock('../../src/utils/paymentService', () => mocks);
vi.mock('../../src/utils/firebase', () => ({ auth: { currentUser: null }, db: {}, APP_ID: 'fixture' }));
vi.mock('../../src/utils/preview', () => ({ IS_PREPROD: false }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'he', dir: () => 'rtl' } }) }));
vi.mock('../../src/hooks/useFirebaseData', () => ({ useFirebaseData: () => ({ availabilityStatus: 'ready', blocked: [], soldOut: [], globalMaxParticipants: 30, tourDates: {} }), getEffectiveMax: () => 30, getCurrentRegistrations: () => 0, getAvailableSpots: () => 30 }));

const CHECKOUT = { bookingId: 'BK-' + 'a'.repeat(24), paymentUrl: 'https://directng.tranzila.com/fixture/' };
async function load(flag) {
  vi.resetModules();
  if (flag === undefined) vi.unstubAllEnvs(); else vi.stubEnv('VITE_BIT_TRANZILA_ENABLED', flag);
  return (await import('../../src/components/BookingForm')).default;
}
function fill(container) {
  for (const [id, value] of Object.entries({ name: 'Test Customer', phone: '0501234567' })) fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
  fireEvent.click(container.querySelector('#agreeToTerms'));
}
const methods = container => [...container.querySelectorAll('input[name="paymentMethod"]')].map(input => input.value);
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
  mocks.makeIdempotencyKey.mockResolvedValue('a'.repeat(32));
  mocks.createCreditPayment.mockResolvedValue(CHECKOUT);
  window.history.replaceState({}, '', '/booking?date=2026-10-08&participants=2');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('flag OFF (default build and deploy/booking-hosting.env)', () => {
  it('the live hosting env never enables Bit', () => {
    const env = readFileSync('../../deploy/booking-hosting.env', 'utf8');
    expect(env).not.toMatch(/^\s*VITE_BIT_TRANZILA_ENABLED\s*=\s*true/m);
  });
  for (const flag of [undefined, 'false', '']) {
    it(`offers only the card, no Bit and no bank transfer (flag=${JSON.stringify(flag)})`, async () => {
      const BookingForm = await load(flag);
      const { container } = render(<BookingForm />);
      expect(methods(container)).toEqual(['credit']);
      expect(container.querySelector('input[value="credit"]').checked).toBe(true);
      expect(container.textContent).not.toContain('booking.paymentMethods.bit');
      expect(container.textContent).not.toContain('bankTransfer');
      expect(container.querySelector('button[type="submit"]').textContent).toBe('booking.form.submit');
    });
  }
  it('sends a draft that still carries bank_transfer or bit as a card checkout, never bit', async () => {
    const BookingForm = await load(undefined);
    for (const paymentMethod of ['bank_transfer', 'bit']) {
      const redirect = vi.fn();
      const { container } = render(<BookingForm initialDraft={{ paymentMethod }} onPaymentRedirect={redirect} />);
      expect(methods(container)).toEqual(['credit']);
      fill(container); fireEvent.submit(container.querySelector('form'));
      await waitFor(() => expect(redirect).toHaveBeenCalledWith(CHECKOUT.paymentUrl));
      cleanup();
    }
    expect(mocks.createCreditPayment.mock.calls.map(call => call[0].paymentMethod)).toEqual(['credit', 'credit']);
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
  it('the card request keeps the exact live createPayment payload shape', async () => {
    const BookingForm = await load(undefined);
    const { container } = render(<BookingForm onPaymentRedirect={() => {}} />);
    fill(container); fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mocks.createCreditPayment).toHaveBeenCalledTimes(1));
    const [body, key] = mocks.createCreditPayment.mock.calls[0];
    expect(Object.keys(body).sort()).toEqual(['adultConfirmed', 'agreeToTerms', 'email', 'howDidYouHear', 'language', 'name', 'notes', 'participants', 'paymentMethod', 'phone', 'tourDate']);
    expect(body).toMatchObject({ paymentMethod: 'credit', participants: 2, tourDate: '2026-10-08', agreeToTerms: true, adultConfirmed: true, language: 'he' });
    expect(key).toBe('a'.repeat(32));
  });
  it('Terms lists only the card payment, no manual Bit or bank-transfer details', async () => {
    vi.resetModules();
    const Terms = (await import('../../src/components/Terms')).default;
    const { container } = render(<Terms />);
    expect(container.textContent).toContain('terms.section2.credit');
    expect(container.textContent).not.toContain('terms.section2.bit');
    expect(container.textContent).not.toContain('terms.section2.bank');
  });
});

describe('flag ON (VITE_BIT_TRANZILA_ENABLED=true)', () => {
  it('offers card and Bit (never bank transfer); Bit switches the button and goes to the Tranzila checkout', async () => {
    const BookingForm = await load('true');
    const redirect = vi.fn();
    const { container } = render(<BookingForm onPaymentRedirect={redirect} />);
    expect(methods(container)).toEqual(['credit', 'bit']);
    const submit = container.querySelector('button[type="submit"]');
    expect(submit.textContent).toBe('booking.form.submit');
    fireEvent.click(container.querySelector('input[value="bit"]'));
    expect(submit.textContent).toBe('booking.form.submitBit');
    fill(container); fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith(CHECKOUT.paymentUrl));
    expect(mocks.createCreditPayment.mock.calls[0][0].paymentMethod).toBe('bit');
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
});

describe('approved copy', () => {
  it('uses the approved button texts and no bank-transfer or manual-Bit option copy', () => {
    expect(he.booking.form.submit).toBe('המשך לתשלום מאובטח בכרטיס');
    expect(he.booking.form.submitBit).toBe('המשך לתשלום ב-Bit');
    expect(en.booking.form.submit).toBe('Continue to secure card payment');
    expect(en.booking.form.submitBit).toBe('Continue to payment with Bit');
    for (const locale of [he, en]) {
      expect(locale.booking.paymentMethods.bankTransfer).toBeUndefined();
      expect(JSON.stringify([locale.booking, locale.confirmation])).not.toMatch(/העברה בנקאית|bank transfer|בתיאום מראש|arrange/i);
    }
  });
});
