import React, { useState } from 'react';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { fixture: offlineSystem, KEY: OFFLINE_KEY } = require('../../../../functions/test/helpers/offline-system.js');
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ createBooking: vi.fn(), createCreditPayment: vi.fn(), getPaymentStatus: vi.fn(), makeIdempotencyKey: vi.fn(), cloud: { blocked: [], soldOut: [], globalMaxParticipants: 2, tourDates: {} } }));
vi.mock('../../src/utils/paymentService', () => mocks);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'en', dir: () => 'ltr' } }) }));
vi.mock('../../src/utils/firebase', () => ({ db: {}, APP_ID: 'demo-chilik-repair' }));
vi.mock('firebase/firestore', () => ({ doc: (...parts) => parts.join('/'), getDoc: async ref => ({ exists: () => true, data: () => ref.endsWith('global') ? mocks.cloud : { useGlobalMax: true, currentRegistrations: mocks.cloud.tourDates['2026-10-08']?.currentRegistrations || 0 } }) }));
vi.mock('../../src/hooks/useFirebaseData', () => ({ useFirebaseData: () => ({ availabilityStatus: 'ready', ...mocks.cloud }), getEffectiveMax: () => mocks.cloud.globalMaxParticipants, getCurrentRegistrations: (_, date) => mocks.cloud.tourDates[date]?.currentRegistrations || 0, getAvailableSpots: (_, date) => mocks.cloud.globalMaxParticipants - (mocks.cloud.tourDates[date]?.currentRegistrations || 0) }));
vi.mock('../../src/utils/dateUtils', async importOriginal => ({ ...await importOriginal(), getUpcomingThursdays: () => [{ dateStr: '2026-10-08', day: 8, month: 'Oct' }], formatDateHebrew: date => date, getNearestThursday: date => date }));
import BookingForm from '../../src/components/BookingForm';
import BookingSection from '../../src/components/BookingSection';
const ID = 'BK-' + 'a'.repeat(24);
function fillForm(container, method = 'bit') {
  for (const [id, value] of Object.entries({ name: 'Test Customer', phone: '0501234567', email: 'test@example.com', howDidYouHear: 'friend', dateOfBirth: '1990-01-01' })) fireEvent.change(container.querySelector(`#${id}`), { target: { value } });
  fireEvent.click(container.querySelector(`input[value="${method}"]`)); fireEvent.click(container.querySelector('input[type="checkbox"]'));
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
  mocks.cloud = { blocked: [], soldOut: [], globalMaxParticipants: 2, tourDates: {} };
  mocks.makeIdempotencyKey.mockResolvedValue('a'.repeat(32));
  mocks.getPaymentStatus.mockResolvedValue({ paymentStatus: 'paid', status: 'confirmed' });
  window.history.replaceState({}, '', '/booking?date=2026-10-08&participants=2');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = vi.fn(() => { throw new Error('External network forbidden in UI tests'); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('offline booking components', () => {
  it('invalid submission names field errors and focuses the first invalid field', async () => {
    const { container } = render(<BookingForm />);
    fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(document.activeElement.id).toBe('name'));
    for (const id of ['name', 'phone', 'email', 'howDidYouHear', 'dateOfBirth', 'agreeToTerms']) {
      const field = container.querySelector(`#${id}`);
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')).toBe(`${id}-error`);
      expect(container.querySelector(`#${id}-error`).textContent).toBeTruthy();
    }
    expect(screen.getByRole('radiogroup').getAttribute('aria-labelledby')).toBe('payment-method-label');
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
  it('reports unknown availability while allowing an existing request to reach its server key', async () => {
    mocks.cloud = { ...mocks.cloud, availabilityStatus: 'error' };
    const success = vi.fn(); mocks.createBooking.mockResolvedValue({ bookingId: ID, status: 'pending', paymentStatus: 'pending', totalPrice: 500, pricePerPerson: 250 });
    const { container } = render(<BookingForm onSuccess={success} />);
    expect(screen.getByRole('status').textContent).toBe('common.availabilityUnavailable');
    fillForm(container); fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(success).toHaveBeenCalled());
  });

  it('homepage selects live availability and passes exact date/count to booking form', async () => {
    const success = vi.fn(); mocks.createBooking.mockResolvedValue({ bookingId: ID, status: 'pending', paymentStatus: 'pending', totalPrice: 250, pricePerPerson: 250 });
    function Journey() { const [form, setForm] = useState(false); return form ? <BookingForm onSuccess={success} /> : <BookingSection onContinue={(date, participants) => { window.history.replaceState({}, '', `/booking?date=${date}&participants=${participants}`); setForm(true); }} />; }
    const { container } = render(<Journey />);
    fireEvent.click(screen.getByRole('button', { name: 'bookingSection.dateCardLabel' }));
    fireEvent.click(screen.getByText('bookingSection.continueCta'));
    await waitFor(() => expect(container.querySelector('#name')).not.toBeNull());
    fillForm(container); fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(success).toHaveBeenCalled());
    expect(mocks.createBooking.mock.calls[0][0]).toMatchObject({ tourDate: '2026-10-08', participants: 1, paymentMethod: 'bit', agreeToTerms: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('ambiguous last-seat submission can retry same key despite own reservation filling date', async () => {
    const success = vi.fn(); mocks.createBooking.mockRejectedValueOnce(new Error('network-error')).mockResolvedValueOnce({ bookingId: ID, status: 'pending', totalPrice: 500 });
    const rendered = render(<BookingForm onSuccess={success} />); fillForm(rendered.container);
    fireEvent.submit(rendered.container.querySelector('form'));
    await screen.findByRole('alert');
    mocks.cloud = { ...mocks.cloud, tourDates: { '2026-10-08': { currentRegistrations: 2 } }, soldOut: ['2026-10-08'] };
    rendered.rerender(<BookingForm onSuccess={success} />);
    fireEvent.submit(rendered.container.querySelector('form'));
    await waitFor(() => expect(success).toHaveBeenCalled());
    expect(mocks.createBooking).toHaveBeenCalledTimes(2);
    expect(mocks.createBooking.mock.calls[0][1]).toBe(mocks.createBooking.mock.calls[1][1]);
  });
  it('unconfigured Bit booking shows booking outage rather than advising Bit again', async () => {
    mocks.makeIdempotencyKey.mockRejectedValueOnce(new Error('booking-api-not-configured'));
    const { container } = render(<BookingForm />); fillForm(container); fireEvent.submit(container.querySelector('form'));
    expect((await screen.findByRole('alert')).textContent).toBe('booking.payment.bookingUnavailable');
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });
  it.each([
    [{ paymentStatus: 'paid', status: 'confirmed' }, 'paidTitle'],
    [{ paymentStatus: 'pending', status: 'confirmed' }, 'confirmedTitle'],
    [{ paymentStatus: 'cancelled', status: 'cancelled' }, 'cancelledTitle'],
    [{ paymentStatus: 'paid', status: 'cancelled', refundStatus: 'manual_review_required' }, 'refundReviewTitle'],
    [{ paymentStatus: 'pending_review', status: 'payment_review' }, 'reviewTitle'],
    [{ paymentStatus: 'expired', status: 'cancelled' }, 'failedTitle'],
  ])('return ignores browser success/failure and renders server state %s', async (state, title) => {
    window.history.replaceState({}, '', `/booking?payment=failed&id=${ID}`); mocks.getPaymentStatus.mockResolvedValue(state);
    render(<BookingForm />); await screen.findByText(`booking.payment.${title}`); expect(screen.getByText(ID)).toBeTruthy();
  });
  it('status auth/ownership failure is unavailable, preserves reference and supports refresh', async () => {
    window.history.replaceState({}, '', `/booking?payment=success&id=${ID}`); mocks.getPaymentStatus.mockRejectedValueOnce(new Error('not-found')).mockResolvedValueOnce({ status: 'confirmed', paymentStatus: 'paid' });
    render(<BookingForm />); await screen.findByText('booking.payment.statusUnavailableTitle');
    expect(screen.getByText(ID)).toBeTruthy(); fireEvent.click(screen.getByText('booking.payment.refreshStatus')); await screen.findByText('booking.payment.paidTitle');
  });
  it('confirmation refresh uses the authenticated status endpoint with only its reference', async () => {
    window.history.replaceState({}, '', `/confirmation?id=${ID}`);
    mocks.getPaymentStatus.mockResolvedValue({ status: 'confirmed', paymentStatus: 'paid' });
    render(<BookingForm statusBookingId={ID} />);
    await screen.findByText('booking.payment.paidTitle');
    expect(mocks.getPaymentStatus).toHaveBeenCalledWith(ID, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(mocks.createBooking).not.toHaveBeenCalled();
    expect(mocks.createCreditPayment).not.toHaveBeenCalled();
  });
  it('missing/invalid references never poll and unmount aborts in-flight status request', async () => {
    window.history.replaceState({}, '', '/booking?payment=success&id=bad'); const first = render(<BookingForm />);
    await screen.findByText('booking.payment.statusUnavailableTitle'); expect(mocks.getPaymentStatus).not.toHaveBeenCalled(); first.unmount();
    window.history.replaceState({}, '', `/booking?payment=success&id=${ID}`); mocks.getPaymentStatus.mockImplementationOnce(() => new Promise(() => {}));
    const second = render(<BookingForm />); const signal = mocks.getPaymentStatus.mock.calls[0][1].signal; second.unmount(); expect(signal.aborted).toBe(true);
  });
  it('real React checkout connects to real API, simulated provider report, return page and admin cancellation', async () => {
    const system = offlineSystem(), redirect = vi.fn();
    const bodyOrThrow = response => { if (response.statusCode >= 400) throw Object.assign(new Error(response.body.error), { status: response.statusCode }); return response.body; };
    mocks.makeIdempotencyKey.mockResolvedValue(OFFLINE_KEY);
    mocks.createCreditPayment.mockImplementation((body, key) => system.call('createPayment', { body, key }).then(bodyOrThrow));
    mocks.getPaymentStatus.mockImplementation(id => system.call('paymentStatus', { method: 'GET', query: { id } }).then(bodyOrThrow));
    const checkout = render(<BookingForm onPaymentRedirect={redirect} />); fillForm(checkout.container, 'credit');
    fireEvent.submit(checkout.container.querySelector('form'));
    await waitFor(() => expect(redirect).toHaveBeenCalledTimes(1));
    const url = new URL(redirect.mock.calls[0][0]), id = url.searchParams.get('order_id');
    expect(system.booking(id).paymentStatus).toBe('awaiting_payment'); expect(system.seats()).toBe(2);
    system.record(id);
    const notify = await system.call('tranzilaWebhook', { query: { id }, body: { index: 42, Response: 'malicious-ignored' } });
    expect(notify.statusCode).toBe(200); expect(system.booking(id).paymentStatus).toBe('paid');
    expect(system.jobsCount()).toBe(4); // hold Calendar + confirmed Calendar/email/WhatsApp
    expect([...system.db.data.values()].filter(job => job.kind === 'whatsapp')).toHaveLength(1);
    checkout.unmount(); window.history.replaceState({}, '', `/booking?payment=success&id=${id}`);
    render(<BookingForm />); await screen.findByText('booking.payment.paidTitle');
    await system.call('updateBookingStatus', { token: 'admin', body: { bookingId: id, status: 'cancelled' } });
    fireEvent.click(screen.getByText('booking.payment.refreshStatus')); await screen.findByText('booking.payment.refundReviewTitle');
    expect(system.seats()).toBe(0); expect(system.jobsCount()).toBe(6); expect(global.fetch).not.toHaveBeenCalled(); // cancellation adds Calendar/email, no second WhatsApp
    expect([...system.db.data.values()].filter(job => job.kind === 'whatsapp')).toHaveLength(1);
  });

  it('rapid repeated submit starts one request while the first remains in flight', async () => {
    let finish; mocks.createBooking.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { container } = render(<BookingForm />); fillForm(container);
    fireEvent.submit(container.querySelector('form')); fireEvent.submit(container.querySelector('form'));
    await waitFor(() => expect(mocks.createBooking).toHaveBeenCalledTimes(1));
    await act(async () => finish({ bookingId: ID, status: 'pending' }));
  });

});
