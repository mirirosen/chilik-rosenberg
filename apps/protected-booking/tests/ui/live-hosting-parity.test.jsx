// Features that were live on www.chilik-tours.com but missing from the repo (recovered 2026-10-24):
// the combined 18+/terms consent (no date of birth), the admin "set / forgot password" flow,
// the Terms contents list and the booking-screen picker design.
import React from 'react';
import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
const require = createRequire(import.meta.url);
const { validateBooking } = require('../../../../functions/src/booking-core.js');
const protectedHe = require('../../src/locales/he.json'), protectedEn = require('../../src/locales/en.json');
const siteHe = require('../../../../src/locales/he.json'), siteEn = require('../../../../src/locales/en.json');

const mocks = vi.hoisted(() => ({
  api: { createBooking: vi.fn(), createCreditPayment: vi.fn(), getPaymentStatus: vi.fn(), makeIdempotencyKey: vi.fn() },
  auth: { currentUser: null }, sendPasswordResetEmail: vi.fn(), language: 'en',
}));
vi.mock('../../src/utils/paymentService', () => mocks.api);
vi.mock('../../src/utils/firebase', () => ({ auth: mocks.auth, db: {}, APP_ID: 'fixture' }));
vi.mock('../../src/utils/preview', () => ({ IS_PREPROD: false }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: mocks.language, dir: () => (mocks.language === 'he' ? 'rtl' : 'ltr') } }) }));
vi.mock('../../src/hooks/useFirebaseData', () => ({ useFirebaseData: () => ({ availabilityStatus: 'ready', blocked: [], soldOut: [], globalMaxParticipants: 30, tourDates: {} }), getEffectiveMax: () => 30, getCurrentRegistrations: () => 0, getAvailableSpots: () => 30, usesGlobalMax: () => true }));
vi.mock('../../src/utils/dateUtils', async importOriginal => ({ ...await importOriginal(), getUpcomingThursdays: () => [{ dateStr: '2026-10-08', day: 8, month: 'Oct' }], formatDateHebrew: date => date }));
vi.mock('../../src/components/AdminBookings', () => ({ default: () => null }));
vi.mock('firebase/auth', () => ({
  onIdTokenChanged: (_auth, listener) => { listener(null); return vi.fn(); },
  signInWithEmailAndPassword: vi.fn(), signOut: vi.fn(),
  sendPasswordResetEmail: (...args) => mocks.sendPasswordResetEmail(...args),
}));
import BookingForm from '../../src/components/BookingForm';
import BookingSection from '../../src/components/BookingSection';
import Admin from '../../src/components/Admin';
import Terms from '../../src/components/Terms';

const ID = 'BK-' + 'a'.repeat(24);
function fill(container, values) {
  for (const [id, value] of Object.entries(values)) fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
  fireEvent.click(container.querySelector('input[value="credit"]'));
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
  mocks.language = 'en';
  mocks.api.makeIdempotencyKey.mockResolvedValue('a'.repeat(32));
  mocks.api.createCreditPayment.mockResolvedValue({ bookingId: ID, paymentUrl: 'https://directng.tranzila.com/fixture/' });
  window.history.replaceState({}, '', '/booking?date=2026-10-08&participants=2');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); window.history.replaceState({}, '', '/'); });

describe('combined 18+ and terms consent', () => {
  it('uses the exact live texts in both languages and both bundled locale copies', () => {
    for (const he of [protectedHe, siteHe]) {
      expect(he.booking.form.agreeToTerms).toBe('אני מאשר/ת שאני בן/בת 18 ומעלה ומסכים/ה לתנאי השימוש והתקנון (כולל מדיניות הביטולים)');
      expect(he.booking.validation.termsRequired).toBe('יש לאשר גיל 18 ומעלה ואת תנאי השימוש והתקנון');
      expect(he.booking.form.optional).toBe('(לא חובה)');
    }
    for (const en of [protectedEn, siteEn]) {
      expect(en.booking.form.agreeToTerms).toBe('I confirm that I am 18 or older and agree to the terms and conditions (including the cancellation policy)');
      expect(en.booking.validation.termsRequired).toBe('Confirm that you are 18 or older and accept the terms and conditions');
      expect(en.booking.form.optional).toBe('(optional)');
    }
  });

  it('has no date-of-birth field and blocks submission until the single checkbox is ticked', async () => {
    const { container } = render(<BookingForm />);
    expect(container.querySelector('#dateOfBirth')).toBeNull();
    expect(container.querySelector('label[for="agreeToTerms"], label:has(#agreeToTerms)')?.textContent).toContain('booking.form.agreeToTerms');
    fill(container, { name: 'Test Customer', phone: '0501234567' });
    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByText('booking.validation.termsRequired')).toBeTruthy();
    expect(container.querySelector('#agreeToTerms').getAttribute('aria-invalid')).toBe('true');
    expect(mocks.api.createCreditPayment).not.toHaveBeenCalled();
  });

  it('sends adultConfirmed:true, never a birth date (even from an old draft), and accepts a missing email', async () => {
    const redirect = vi.fn();
    const { container } = render(<BookingForm onPaymentRedirect={redirect} initialDraft={{ dateOfBirth: '1990-01-01' }} />);
    expect(screen.getAllByText('booking.form.optional')).toHaveLength(2); // email + how did you hear
    fill(container, { name: 'Test Customer', phone: '0501234567' });
    fireEvent.click(container.querySelector('#agreeToTerms'));
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(redirect).toHaveBeenCalled());
    const sent = mocks.api.createCreditPayment.mock.calls[0][0];
    expect(sent).toMatchObject({ adultConfirmed: true, agreeToTerms: true, email: '', howDidYouHear: '' });
    expect(sent).not.toHaveProperty('dateOfBirth');
    // The live createPayment (validateBooking) accepts exactly this shape.
    expect(validateBooking({ ...sent, tourDate: '2026-10-08' }, new Date('2026-10-02T12:00:00Z'))).toMatchObject({ adultConfirmed: true, email: '' });
    expect(() => validateBooking({ ...sent, adultConfirmed: false, tourDate: '2026-10-08' }, new Date('2026-10-02T12:00:00Z'))).toThrow('adult-required');
  });

  it('still rejects an email that is given but invalid', async () => {
    const { container } = render(<BookingForm />);
    fill(container, { name: 'Test Customer', phone: '0501234567', email: 'not-an-email' });
    fireEvent.click(container.querySelector('#agreeToTerms'));
    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByText('booking.validation.emailInvalid')).toBeTruthy();
    expect(mocks.api.createCreditPayment).not.toHaveBeenCalled();
  });

  it('keeps the no-seat notice and shows the 3-step progress on the details step', () => {
    const { container } = render(<BookingForm />);
    expect(screen.getByTestId('no-hold-notice').textContent).toBe('booking.noHoldNotice');
    const steps = container.querySelector('ol.booking-flow-steps');
    expect(steps.querySelector('[aria-current="step"]').textContent).toBe('2bookingDesign.details');
    expect(container.querySelector('.booking-form-card h1').textContent).toBe('booking.title');
  });
});

describe('admin password setup / reset', () => {
  it('shows the live login copy and only enables the setup link once an email is typed', async () => {
    render(<Admin />);
    await waitFor(() => expect(document.querySelector('#admin-email')).toBeTruthy());
    expect(screen.getByText('ניהול ההזמנות החדשות. בכניסה הראשונה הזינו את האימייל ובחרו ״הגדרת סיסמה״.')).toBeTruthy();
    const setup = screen.getByRole('button', { name: 'הגדרת סיסמה / שכחתי סיסמה' });
    expect(setup.disabled).toBe(true);
    fireEvent.change(document.querySelector('#admin-email'), { target: { value: '   ' } });
    expect(setup.disabled).toBe(true);
  });

  it('sends a Firebase password-reset email to the trimmed address and shows a neutral confirmation', async () => {
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    render(<Admin />);
    await waitFor(() => expect(document.querySelector('#admin-email')).toBeTruthy());
    fireEvent.change(document.querySelector('#admin-email'), { target: { value: '  owner@example.test ' } });
    fireEvent.click(screen.getByRole('button', { name: 'הגדרת סיסמה / שכחתי סיסמה' }));
    expect((await screen.findByRole('status')).textContent).toBe('אם לחשבון יש גישה לניהול, יישלח אליו קישור להגדרת סיסמה. בדקו גם את תיקיית הספאם.');
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(mocks.auth, 'owner@example.test');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports a send failure without revealing whether the account exists', async () => {
    mocks.sendPasswordResetEmail.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/too-many-requests' }));
    render(<Admin />);
    await waitFor(() => expect(document.querySelector('#admin-email')).toBeTruthy());
    fireEvent.change(document.querySelector('#admin-email'), { target: { value: 'owner@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'הגדרת סיסמה / שכחתי סיסמה' }));
    expect((await screen.findByRole('alert')).textContent).toBe('לא ניתן לשלוח קישור כרגע. נסו שוב בעוד מעט.');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('other live-only markup', () => {
  it('Terms lists its 7 sections and every link targets an existing section', () => {
    mocks.language = 'he';
    const { container } = render(<Terms />);
    const nav = screen.getByRole('navigation', { name: 'נושאי התקנון' });
    const links = [...nav.querySelectorAll('a')];
    expect(links).toHaveLength(7);
    expect(links[2].textContent).toBe('3. מדיניות ביטול רכישה');
    for (const link of links) expect(container.querySelector(link.getAttribute('href'))).toBeTruthy();
  });

  it('the picker uses the booking-screen layout and owns the page h1 only on /booking', () => {
    const { container, unmount } = render(<BookingSection standalone />);
    expect(container.querySelector('section.booking-screen#date-selection')).toBeTruthy();
    expect(container.querySelector('h1#inquiry-title')).toBeTruthy();
    expect(container.querySelector('.booking-screen__steps [aria-current="step"]').textContent).toBe('1bookingDesign.select');
    expect(container.querySelector('.booking-screen__portrait img').getAttribute('width')).toBe('376');
    unmount();
    const home = render(<BookingSection />);
    expect(home.container.querySelector('h2#inquiry-title')).toBeTruthy();
  });
});
