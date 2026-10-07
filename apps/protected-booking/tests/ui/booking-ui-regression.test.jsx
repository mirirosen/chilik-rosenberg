import React, { useState } from 'react';
import { createRequire } from 'node:module';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { getJerusalemDateString, isSelectableTourDate } from '../../src/utils/dateUtils';
const { validateBooking } = createRequire(import.meta.url)('../../../../functions/src/booking-core.js');
const api = vi.hoisted(() => ({ createBooking: vi.fn(), createCreditPayment: vi.fn(), getPaymentStatus: vi.fn(), makeIdempotencyKey: vi.fn() }));
vi.mock('../../src/utils/paymentService', () => api);
vi.mock('../../src/utils/firebase', () => ({ db: {}, APP_ID: 'fixture' }));
vi.mock('../../src/hooks/useFirebaseData', () => ({ useFirebaseData: () => ({ availabilityStatus: 'ready', globalMaxParticipants: 30 }), getEffectiveMax: () => 30, getCurrentRegistrations: () => 0, getAvailableSpots: () => 30 }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'en', dir: () => 'ltr' } }) }));
import BookingSection from '../../src/components/BookingSection';
import BookingForm from '../../src/components/BookingForm';
const NOW = new Date('2026-10-05T12:00:00Z');
const customer = { name: 'Demo Customer', phone: '0500000000', email: 'demo@example.invalid', notes: 'Food preference', howDidYouHear: 'friend', dateOfBirth: '1990-01-01', participants: 2, paymentMethod: 'bit', agreeToTerms: true, tourDate: '2026-10-08' };
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW); window.history.replaceState({}, '', '/booking?date=2026-10-08&participants=2'); api.makeIdempotencyKey.mockResolvedValue('a'.repeat(32)); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each(['', 'invalid', '2026-02-30', '2026-10-01', '2026-10-06', '2027-01-07'])('never advertises an invalid/past/out-of-window date %s', value => {
  const proceed = vi.fn(); const { container } = render(<BookingSection initialSelection={{ date: value, participants: 2 }} onContinue={proceed} />);
  expect(screen.queryByText('bookingSection.dateAvailable')).toBeNull();
  expect(screen.queryByText('bookingSection.continueCta')).toBeNull();
  expect(proceed).not.toHaveBeenCalled();
  if (value) expect(isSelectableTourDate(value, NOW)).toBe(false);
  expect(container.querySelector('.dates-wrapper').getAttribute('dir')).toBe('ltr');
});
it('changing a selected future date to a past date removes the available status and continue action', () => {
  const proceed = vi.fn(); const { container } = render(<BookingSection initialSelection={{ date: '2026-10-08', participants: 2 }} onContinue={proceed} />);
  expect(screen.getByText('bookingSection.continueCta')).toBeTruthy();
  fireEvent.change(container.querySelector('input[type=date]'), { target: { value: '2026-10-01' } });
  expect(screen.queryByText('bookingSection.dateAvailable')).toBeNull();
  expect(screen.queryByText('bookingSection.continueCta')).toBeNull();
  expect(proceed).not.toHaveBeenCalled();
});
it('an expired date supplied directly in the route cannot create a new request', async () => {
  window.history.replaceState({}, '', '/booking?date=2026-10-01&participants=2');
  const { container } = render(<BookingForm initialDraft={customer} />);
  fireEvent.click(container.querySelector('#agreeToTerms'));
  fireEvent.submit(container.querySelector('form'));
  await screen.findByText('booking.validation.dateUnavailable');
  expect(api.makeIdempotencyKey).not.toHaveBeenCalled();
  expect(api.createBooking).not.toHaveBeenCalled();
});
it('date changes restore editable details, adopt the new selection and require consent again without storage', async () => {
  const saved = vi.spyOn(Storage.prototype, 'setItem');
  function Journey() {
    const [draft, setDraft] = useState(null), [selection, setSelection] = useState(false);
    return selection ? <button onClick={() => { window.history.replaceState({}, '', '/booking?date=2026-10-15&participants=3'); setSelection(false); }}>choose another tour</button>
      : <BookingForm initialDraft={draft} onChangeSelection={form => { const { name, phone, email, notes, howDidYouHear, dateOfBirth, paymentMethod } = form; setDraft({ name, phone, email, notes, howDidYouHear, dateOfBirth, paymentMethod }); setSelection(true); }} />;
  }
  const { container } = render(<Journey />);
  for (const [id, value] of Object.entries({ name: customer.name, phone: customer.phone, email: customer.email, notes: customer.notes, howDidYouHear: customer.howDidYouHear, dateOfBirth: customer.dateOfBirth })) fireEvent.change(container.querySelector('#' + id), { target: { value } });
  fireEvent.click(container.querySelector('input[value=bit]')); fireEvent.click(container.querySelector('#agreeToTerms'));
  fireEvent.click(screen.getByText('booking.selection.change')); fireEvent.click(screen.getByText('choose another tour'));
  for (const id of ['name','phone','email','notes','howDidYouHear','dateOfBirth']) expect(container.querySelector('#' + id).value).toBe(customer[id]);
  expect(container.querySelector('input[value=bit]').checked).toBe(true);
  expect(container.querySelector('#agreeToTerms').checked).toBe(false);
  expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  expect(saved).not.toHaveBeenCalled();
});
it('ambiguous existing request can still recover after the date cutoff; a changed request cannot', async () => {
  vi.setSystemTime(new Date('2026-10-08T16:59:00Z'));
  api.createBooking.mockRejectedValue(new Error('network-error'));
  const { container } = render(<BookingForm initialDraft={customer} />);
  fireEvent.click(container.querySelector('#agreeToTerms')); fireEvent.submit(container.querySelector('form'));
  await waitFor(() => expect(api.createBooking).toHaveBeenCalledTimes(1)); await screen.findByRole('alert');
  vi.setSystemTime(new Date('2026-10-08T17:01:00Z'));
  fireEvent.submit(container.querySelector('form')); await waitFor(() => expect(api.createBooking).toHaveBeenCalledTimes(2));
  await screen.findByRole('alert'); fireEvent.change(container.querySelector('#notes'), { target: { value: 'Changed request' } });
  fireEvent.submit(container.querySelector('form')); expect(api.createBooking).toHaveBeenCalledTimes(2);
});
it('Jerusalem midnight and Thursday closing time match the unchanged server guard', () => {
  expect(getJerusalemDateString(new Date('2026-10-04T22:30:00Z'))).toBe('2026-10-05');
  for (const [date, now, valid] of [
    ['2026-10-08', NOW, true], ['2026-10-01', NOW, false], ['2026-02-30', NOW, false],
    ['2026-10-08', new Date('2026-10-08T16:59:00Z'), true],
    ['2026-10-08', new Date('2026-10-08T17:00:00Z'), false],
    ['2027-01-07', NOW, false],
  ]) {
    expect(isSelectableTourDate(date, now)).toBe(valid);
    if (valid) expect(validateBooking({ ...customer, tourDate: date }, now).tourDate).toBe(date);
    else expect(() => validateBooking({ ...customer, tourDate: date }, now)).toThrow('invalid-date');
  }
});
