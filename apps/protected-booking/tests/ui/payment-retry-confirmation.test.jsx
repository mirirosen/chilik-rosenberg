import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ createBooking: vi.fn(), createCreditPayment: vi.fn(), getPaymentStatus: vi.fn(), makeIdempotencyKey: vi.fn(), retryCreditPayment: vi.fn() }));
vi.mock('../../src/utils/paymentService', () => mocks);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'en', dir: () => 'ltr' } }) }));
vi.mock('../../src/utils/firebase', () => ({ db: {}, APP_ID: 'demo-chilik-repair' }));
vi.mock('../../src/hooks/useFirebaseData', () => ({ useFirebaseData: () => ({ availabilityStatus: 'ready', blocked: [], soldOut: [], globalMaxParticipants: 30, tourDates: {} }), getEffectiveMax: () => 30, getCurrentRegistrations: () => 0, getAvailableSpots: () => 30 }));
import BookingForm from '../../src/components/BookingForm';

const ID = 'BK-' + 'a'.repeat(24);
const OPEN = { bookingId: ID, status: 'payment_pending', paymentStatus: 'awaiting_payment', totalPrice: 500, pricePerPerson: 250, tourDate: '2026-10-08', participants: 2 };
beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState({}, '', '/'); });

describe('declined card return', () => {
  it('shows a clear decline message and opens a fresh checkout for the same booking immediately', async () => {
    window.history.replaceState({}, '', `/booking?payment=failed&id=${ID}`);
    mocks.getPaymentStatus.mockResolvedValue(OPEN);
    mocks.retryCreditPayment.mockResolvedValue({ bookingId: ID, paymentUrl: 'https://directng.tranzila.com/t/?retry', retried: true });
    const redirect = vi.fn();
    render(<BookingForm onPaymentRedirect={redirect} />);
    await screen.findByText('booking.payment.declinedTitle');
    expect(screen.getByText('booking.payment.declinedDetail')).toBeTruthy();
    expect(screen.getByTestId('no-hold-notice')).toBeTruthy();
    expect(mocks.getPaymentStatus).toHaveBeenCalledTimes(1); // no 15-second polling loop before the retry is offered
    fireEvent.click(screen.getByText('booking.payment.retryPayment'));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://directng.tranzila.com/t/?retry'));
    expect(mocks.retryCreditPayment).toHaveBeenCalledWith(ID);
    expect(mocks.createCreditPayment).not.toHaveBeenCalled();
  });
  it('a success return that is still unpaid never offers a second payment', async () => {
    window.history.replaceState({}, '', `/booking?payment=success&id=${ID}`);
    mocks.getPaymentStatus.mockResolvedValue(OPEN);
    render(<BookingForm />);
    await screen.findByText('booking.payment.checkingTitle');
    expect(screen.queryByText('booking.payment.retryPayment')).toBeNull();
  });
  it('closed booking or retry limit shows the reason; a capture found by the server shows the paid state', async () => {
    window.history.replaceState({}, '', `/booking?payment=failed&id=${ID}`);
    mocks.getPaymentStatus.mockResolvedValue(OPEN);
    mocks.retryCreditPayment.mockRejectedValueOnce(new Error('booking-closed')).mockRejectedValueOnce(new Error('payment-retry-limit')).mockResolvedValueOnce({ bookingId: ID, status: 'confirmed', paymentStatus: 'paid' });
    render(<BookingForm onPaymentRedirect={vi.fn()} />);
    fireEvent.click(await screen.findByText('booking.payment.retryPayment'));
    expect((await screen.findByRole('alert')).textContent).toBe('booking.payment.closedRequest');
    fireEvent.click(screen.getByText('booking.payment.retryPayment'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('booking.payment.retryLimit'));
    mocks.getPaymentStatus.mockResolvedValue({ ...OPEN, status: 'confirmed', paymentStatus: 'paid' });
    fireEvent.click(screen.getByText('booking.payment.retryPayment'));
    await screen.findByText('booking.payment.paidTitle');
  });
});

describe('confirmation and pending screens', () => {
  it('paid confirmation shows reference, date, participants, amount and next steps without inventing a meeting point', async () => {
    window.history.replaceState({}, '', `/confirmation?id=${ID}`);
    mocks.getPaymentStatus.mockResolvedValue({ ...OPEN, status: 'confirmed', paymentStatus: 'paid' });
    const { container } = render(<BookingForm statusBookingId={ID} />);
    await screen.findByText('booking.payment.paidTitle');
    const summary = screen.getByTestId('confirmation-summary');
    expect(summary.textContent).toContain(ID);
    expect(summary.textContent).toContain('Thursday, 8 October 2026');
    expect(summary.textContent).toContain('confirmation.participants2');
    expect(summary.textContent).toContain('booking.payment.amountPaid₪500');
    expect(summary.textContent).toContain('confirmation.nextSteps.title');
    expect(summary.textContent).toContain('booking.payment.nextMeeting');
    expect(container.textContent.split(ID)).toHaveLength(2);
  });
  it('missing summary fields are omitted rather than guessed', async () => {
    window.history.replaceState({}, '', `/confirmation?id=${ID}`);
    mocks.getPaymentStatus.mockResolvedValue({ bookingId: ID, status: 'confirmed', paymentStatus: 'paid' });
    render(<BookingForm statusBookingId={ID} />);
    await screen.findByText('booking.payment.paidTitle');
    const summary = screen.getByTestId('confirmation-summary').textContent;
    expect(summary).not.toContain('confirmation.tourDate');
    expect(summary).not.toContain('confirmation.participants');
    expect(summary).not.toContain('₪');
  });
  it('pending screen "check again" re-polls the server status', async () => {
    window.history.replaceState({}, '', `/booking?payment=success&id=${ID}`);
    mocks.getPaymentStatus.mockResolvedValue({ ...OPEN, status: 'payment_review', paymentStatus: 'pending_review' });
    render(<BookingForm />);
    await screen.findByText('booking.payment.reviewTitle');
    mocks.getPaymentStatus.mockResolvedValue({ ...OPEN, status: 'confirmed', paymentStatus: 'paid' });
    fireEvent.click(screen.getByText('booking.payment.refreshStatus'));
    await screen.findByText('booking.payment.paidTitle');
    expect(mocks.getPaymentStatus).toHaveBeenCalledTimes(2);
  });
});
