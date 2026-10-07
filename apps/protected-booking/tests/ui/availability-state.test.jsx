import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, renderHook, act, screen, cleanup, fireEvent } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ subscriptions: {}, getDoc: vi.fn() }));
vi.mock('../../src/utils/firebase', () => ({ db: {}, APP_ID: 'demo-chilik-repair' }));
vi.mock('firebase/firestore', () => ({
  doc: (...parts) => parts.slice(1).join('/'), collection: (...parts) => parts.slice(1).join('/'),
  getDoc: (...args) => mocks.getDoc(...args),
  onSnapshot: (ref, next, error) => { mocks.subscriptions[ref.endsWith('/global') ? 'settings' : 'tours'] = { next, error }; return vi.fn(); },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'en' } }) }));
vi.mock('../../src/utils/dateUtils', async importOriginal => ({ ...await importOriginal(), getUpcomingThursdays: () => [{ dateStr: '2026-10-08', day: 8, month: 'Oct' }], formatDateHebrew: date => date, getNearestThursday: date => date }));
import { useFirebaseData, getAvailableSpots } from '../../src/hooks/useFirebaseData';
import BookingSection from '../../src/components/BookingSection';
const settings = { exists: () => true, data: () => ({ globalMaxParticipants: 12, blocked: [], soldOut: [] }) };
const tours = { forEach: callback => callback({ id: '2026-10-08', data: () => ({ useGlobalMax: true, currentRegistrations: 10 }) }) };
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-02T12:00:00Z')); mocks.subscriptions = {}; vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('requires both successful snapshots before exposing available seats', () => {
  const { result } = renderHook(useFirebaseData);
  expect(result.current.availabilityStatus).toBe('loading');
  expect(getAvailableSpots(result.current, '2026-10-08')).toBe(0);
  act(() => mocks.subscriptions.settings.next(settings));
  expect(result.current.availabilityStatus).toBe('loading');
  expect(getAvailableSpots(result.current, '2026-10-08')).toBe(0);
  act(() => mocks.subscriptions.tours.next(tours));
  expect(result.current.availabilityStatus).toBe('ready');
  expect(getAvailableSpots(result.current, '2026-10-08')).toBe(2);
});
it.each(['settings', 'tours'])('%s subscription failure does not invent capacity or expose stale seats', part => {
  const { result } = renderHook(useFirebaseData);
  act(() => { mocks.subscriptions.settings.next(settings); mocks.subscriptions.tours.next(tours); });
  act(() => mocks.subscriptions[part].error(new Error('offline')));
  expect(result.current.availabilityStatus).toBe('error');
  expect(getAvailableSpots(result.current, '2026-10-08')).toBe(0);
  expect(result.current.globalMaxParticipants).toBeUndefined();
  act(() => mocks.subscriptions[part].next(part === 'settings' ? settings : tours));
  expect(result.current.availabilityStatus).toBe('ready');
  expect(getAvailableSpots(result.current, '2026-10-08')).toBe(2);
});
it('date cards remain disabled during loading and outage, and recover with data', () => {
  render(<BookingSection />);
  const card = screen.getByRole('button', { name: 'bookingSection.dateCardLabel' });
  expect(card.disabled).toBe(true);
  expect(screen.getByText('common.loading')).toBeTruthy();
  act(() => mocks.subscriptions.settings.error(new Error('permission-denied')));
  expect(card.disabled).toBe(true);
  expect(screen.getByText('common.availabilityUnavailable')).toBeTruthy();
  expect(screen.queryByText('bookingSection.available')).toBeNull();
  act(() => { mocks.subscriptions.settings.next(settings); mocks.subscriptions.tours.next(tours); });
  expect(card.disabled).toBe(false);
  expect(screen.getByText('bookingSection.available')).toBeTruthy();
  expect(mocks.getDoc).not.toHaveBeenCalled();
});

it('participant plus cannot create an uneditable checkout above the server limit of20', () => {
  render(<BookingSection />);
  act(() => {
    mocks.subscriptions.settings.next({ exists: () => true, data: () => ({ globalMaxParticipants: 30 }) });
    mocks.subscriptions.tours.next({ forEach: () => {} });
  });
  fireEvent.click(screen.getByRole('button', { name: 'bookingSection.dateCardLabel' }));
  const count = screen.getByRole('spinbutton');
  fireEvent.change(count, { target: { value: '19' } });
  const plus = count.parentElement.nextElementSibling;
  fireEvent.click(plus);
  expect(count.value).toBe('20');
  expect(plus.disabled).toBe(true);
  fireEvent.click(plus);
  expect(count.value).toBe('20');
  act(() => mocks.subscriptions.tours.error(new Error('offline')));
  expect(screen.queryByText('bookingSection.dateSoldOut')).toBeNull();
  expect(screen.queryByText('bookingSection.continueCta')).toBeNull();
});
