import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'he' } }) }));
vi.mock('../../src/utils/routeMetadata', () => ({ applyRouteMetadata: vi.fn() }));
vi.mock('../../src/components/Header', () => ({ default: () => null }));
vi.mock('../../src/components/Footer', () => ({ default: () => null }));
vi.mock('../../src/InquiryApp', () => ({ default: () => null }));
vi.mock('../../apps/protected-booking/src/components/BookingForm', () => ({
  default: ({ initialDraft, onChangeSelection }) => <div>
    <output data-testid="draft">{JSON.stringify(initialDraft || {})}</output>
    <button onClick={() => onChangeSelection({ name: 'Guest', phone: '0501234567', email: 'guest@example.test', notes: 'Keep this', howDidYouHear: 'search', dateOfBirth: '1990-01-02', paymentMethod: 'credit', tourDate: '2026-10-15', participants: 2, agreeToTerms: true })}>Change selection</button>
  </div>,
}));
vi.mock('../../apps/protected-booking/src/components/BookingSection', () => ({
  default: ({ initialSelection, onContinue }) => <div>
    <output data-testid="selection">{JSON.stringify(initialSelection)}</output>
    <button onClick={() => onContinue('2026-10-22', 3)}>Choose new date</button>
  </div>,
}));

import BookingSiteApp from '../../src/BookingSiteApp';

beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); vi.restoreAllMocks(); });

it('preserves the existing main form draft including birth date across a date-selection round trip without restoring consent', async () => {
  window.history.replaceState({}, '', '/booking?date=2026-10-15&participants=2');
  render(<BookingSiteApp />);
  fireEvent.click(await screen.findByText('Change selection'));
  expect(JSON.parse((await screen.findByTestId('selection')).textContent)).toEqual({ date: '2026-10-15', participants: 2 });
  fireEvent.click(screen.getByText('Choose new date'));
  const draft = JSON.parse((await screen.findByTestId('draft')).textContent);
  expect(draft).toEqual({ name: 'Guest', phone: '0501234567', email: 'guest@example.test', notes: 'Keep this', howDidYouHear: 'search', dateOfBirth: '1990-01-02', paymentMethod: 'credit' });
  expect(draft).not.toHaveProperty('agreeToTerms');
  expect(window.location.pathname).toBe('/booking');
  expect(new URLSearchParams(window.location.search).get('date')).toBe('2026-10-22');
  expect(new URLSearchParams(window.location.search).get('participants')).toBe('3');
});
