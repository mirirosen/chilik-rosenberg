import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
const state = vi.hoisted(() => ({ cloud: null, refresh: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: (key, values) => key === 'bookingSection.dateCardLabel' ? `Tour ${values.date}` : key,
  i18n: { language: 'en' },
}) }));
vi.mock('../../src/utils/firebase', () => ({ db: null, APP_ID: 'demo-uiux' }));
vi.mock('../../src/utils/paymentWarmup', () => ({ warmPaymentFunctions: () => false }));
vi.mock('../../src/hooks/useFirebaseData', () => ({ useFirebaseData: () => state.cloud, getAvailableSpots: () => 0 }));
vi.mock('../../src/utils/calendarAvailability', async original => ({ ...await original(), serverAvailabilityEnabled: true, getServerAvailability: () => state.refresh() }));
import { getUpcomingThursdays, formatDateHebrew } from '../../src/utils/dateUtils';
import BookingSection from '../../src/components/BookingSection';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-16T10:00:00Z'));
  const publicAvailability = Object.fromEntries(getUpcomingThursdays().map(({ dateStr }) => [dateStr, { available: true, availableSpots: 30, maxParticipants: 30, validUntilMs: Date.now() + 300000 }]));
  publicAvailability['2026-12-03'] = { ...publicAvailability['2026-12-03'], available: false, availableSpots: 0 };
  state.cloud = { availabilityStatus: 'ready', serverAvailabilityEnabled: true, publicAvailability, validUntilMs: Date.now() + 300000 };
  state.refresh.mockReset().mockImplementation(async () => state.cloud);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('full dates identify the year in both languages', () => {
  expect(formatDateHebrew('2027-01-07', 'he')).toContain('2027');
  expect(formatDateHebrew('2027-01-07', 'en')).toContain('2027');
});
it('jumps directly to the final month without extending the booking horizon', () => {
  render(<BookingSection />);
  const month = screen.getByRole('combobox', { name: 'bookingDesign.monthYear' });
  fireEvent.change(month, { target: { value: '2028-12' } });
  const cards = screen.getAllByRole('button', { name: /^Tour / });
  expect(cards).toHaveLength(4);
  expect(cards.every(card => card.textContent.includes('2028'))).toBe(true);
  expect(screen.getByRole('button', { name: /December 28, 2028/ }).disabled).toBe(false);
  expect(screen.getByRole('button', { name: 'bookingDesign.nextDates' }).disabled).toBe(true);
});
it('restores and focuses the selected future date while preserving a closed day', () => {
  render(<BookingSection standalone initialSelection={{ date: '2027-01-07', participants: 2 }} />);
  const selected = screen.getByRole('button', { name: /January 7, 2027/ });
  expect(selected.getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(selected);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2026-12' } });
  expect(screen.getByRole('button', { name: /December 3, 2026/ }).disabled).toBe(true);
});
it('refreshes capacity for a distant selection before handing the exact date and quantity onward', async () => {
  const onContinue = vi.fn(); render(<BookingSection onContinue={onContinue} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '2028-12' } });
  fireEvent.click(screen.getByRole('button', { name: /December 28, 2028/ }));
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
  state.refresh.mockResolvedValueOnce({ ...state.cloud, publicAvailability: { ...state.cloud.publicAvailability, '2028-12-28': { ...state.cloud.publicAvailability['2028-12-28'], availableSpots: 1 } } });
  fireEvent.click(screen.getByRole('button', { name: /bookingDesign.continue/ }));
  await waitFor(() => expect(state.refresh).toHaveBeenCalledTimes(1));
  expect(onContinue).not.toHaveBeenCalled();
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: /bookingDesign.continue/ }));
  await waitFor(() => expect(onContinue).toHaveBeenCalledWith('2028-12-28', 2));
});
it('keeps a restored closed date closed and gives focus to the picker heading', () => {
  render(<BookingSection standalone initialSelection={{ date: '2026-12-03', participants: 1 }} />);
  expect(screen.getByRole('button', { name: /December 3, 2026/ }).disabled).toBe(true);
  expect(document.activeElement.id).toBe('inquiry-title');
  expect(screen.getByRole('button', { name: 'bookingDesign.chooseDate' }).disabled).toBe(true);
});
