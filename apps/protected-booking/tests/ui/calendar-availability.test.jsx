import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { act, renderHook, render, screen, fireEvent, cleanup } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ onSnapshot: vi.fn(), getDoc: vi.fn() }));
vi.mock('../../src/utils/firebase', () => ({ db: {}, APP_ID: 'fixture' }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), collection: vi.fn(), onSnapshot: mocks.onSnapshot, getDoc: mocks.getDoc }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'en' } }) }));
const NOW = Date.parse('2026-11-06T10:00:00Z'), DATE = '2026-11-12';
const payload = (spots = 3, expires = NOW + 300000) => ({ availabilityStatus: 'ready', validUntilMs: expires, publicAvailability: { [DATE]: { available: spots > 0, availableSpots: spots, maxParticipants: 30, validUntilMs: expires } } });
const reply = data => ({ ok: true, json: async () => data });
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(NOW); vi.stubEnv('MODE', 'test'); vi.stubEnv('VITE_CALENDAR_AVAILABILITY_ENABLED', 'true'); vi.stubEnv('VITE_PAYMENT_API_BASE', 'https://fixture.example.test'); vi.stubGlobal('fetch', vi.fn()); mocks.onSnapshot.mockClear(); mocks.getDoc.mockClear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('disabled and preprod modes make no public availability network request', async () => {
  vi.stubEnv('VITE_CALENDAR_AVAILABILITY_ENABLED', 'false');
  let api = await import('../../src/utils/calendarAvailability');
  await expect(api.getServerAvailability()).rejects.toThrow('availability-unavailable');
  vi.resetModules(); vi.stubEnv('VITE_CALENDAR_AVAILABILITY_ENABLED', 'true'); vi.stubEnv('MODE', 'preprod');
  api = await import('../../src/utils/calendarAvailability');
  await expect(api.getServerAvailability()).rejects.toThrow('availability-unavailable'); expect(fetch).not.toHaveBeenCalled();
});
it('public transport sends no token/customer credentials and removes unexpected private metadata', async () => {
  const data = payload(); data.title = 'PRIVATE TITLE'; data.publicAvailability[DATE].attendees = [{ email: 'private@example.test' }];
  fetch.mockResolvedValue(reply(data));
  const api = await import('../../src/utils/calendarAvailability');
  const result = await api.getServerAvailability();
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE|attendees|private@example/);
  expect(fetch).toHaveBeenCalledWith('https://fixture.example.test/calendarAvailability', expect.objectContaining({ method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error' }));
  expect(fetch.mock.calls[0][1].headers).toBeUndefined();
});
it('expired, malformed and contradictory availability never advertises seats', async () => {
  const { sanitizeAvailabilityResponse } = await import('../../src/utils/calendarAvailability');
  const negative = payload(); negative.publicAvailability[DATE].availableSpots = -1;
  const contradiction = payload(); contradiction.publicAvailability[DATE].available = false;
  for (const data of [payload(3, NOW), negative, contradiction, { ...payload(), publicAvailability: {} }]) expect(() => sanitizeAvailabilityResponse(data)).toThrow('availability-unavailable');
});
it('enabled hook uses server quota, no Firestore fallback, and blocks stale/missing dates', async () => {
  fetch.mockResolvedValue(reply(payload(2, NOW + 20000)));
  const { useFirebaseData, getAvailableSpots } = await import('../../src/hooks/useFirebaseData');
  const { result } = renderHook(useFirebaseData);
  expect(result.current.availabilityStatus).toBe('loading');
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(getAvailableSpots(result.current, DATE)).toBe(2);
  expect(getAvailableSpots(result.current, '2026-11-19')).toBe(0);
  expect(mocks.onSnapshot).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(20001); });
  expect(result.current.availabilityStatus).toBe('error'); expect(getAvailableSpots(result.current, DATE)).toBe(0);
});
it('admin capacity subscriptions remain available when public server availability is enabled', async () => {
  const subscriptions = [];
  mocks.onSnapshot.mockImplementation((_ref, callback) => { subscriptions.push(callback); return vi.fn(); });
  const { useFirebaseData } = await import('../../src/hooks/useFirebaseData');
  const { result } = renderHook(() => useFirebaseData({ admin: true }));
  expect(subscriptions).toHaveLength(2);
  act(() => {
    subscriptions[0]({ exists: () => true, data: () => ({ globalMaxParticipants: 17 }) });
    subscriptions[1]({ forEach: () => {} });
  });
  expect(result.current.globalMaxParticipants).toBe(17);
  act(() => subscriptions[0]({ exists: () => true, data: () => ({ globalMaxParticipants: 12 }) }));
  expect(result.current.globalMaxParticipants).toBe(12);
  expect(result.current.serverAvailabilityEnabled).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
  mocks.onSnapshot.mockReset();
});
it('outage after fresh data discards advertised seats rather than using public legacy counters', async () => {
  fetch.mockResolvedValueOnce(reply(payload())).mockRejectedValueOnce(new Error('PRIVATE UPSTREAM'));
  const { useFirebaseData, getAvailableSpots } = await import('../../src/hooks/useFirebaseData');
  const { result } = renderHook(useFirebaseData);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(getAvailableSpots(result.current, DATE)).toBe(3);
  await act(async () => { vi.advanceTimersByTime(30000); await Promise.resolve(); });
  expect(result.current.availabilityStatus).toBe('error'); expect(getAvailableSpots(result.current, DATE)).toBe(0);
});
it('an older response cannot overwrite a newer availability refresh', async () => {
  let release;
  fetch.mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockResolvedValueOnce(reply(payload(1)));
  const { useFirebaseData, getAvailableSpots } = await import('../../src/hooks/useFirebaseData');
  const { result } = renderHook(useFirebaseData);
  await act(async () => { vi.advanceTimersByTime(30000); await Promise.resolve(); await Promise.resolve(); });
  expect(getAvailableSpots(result.current, DATE)).toBe(1);
  await act(async () => { release(reply(payload(3))); await Promise.resolve(); });
  expect(getAvailableSpots(result.current, DATE)).toBe(1);
});
it('continue rechecks sanitized server availability and a newly blocked date never opens checkout', async () => {
  fetch.mockResolvedValueOnce(reply(payload())).mockResolvedValueOnce(reply(payload(0)));
  const { default: BookingSection } = await import('../../src/components/BookingSection');
  const onContinue = vi.fn(); render(<BookingSection onContinue={onContinue} />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  const card = screen.getAllByRole('button', { name: 'bookingSection.dateCardLabel' })[0];
  fireEvent.click(card); fireEvent.click(screen.getByText('bookingSection.continueCta'));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(fetch).toHaveBeenCalledTimes(2); expect(onContinue).not.toHaveBeenCalled(); expect(mocks.getDoc).not.toHaveBeenCalled();
});
it('upcoming Thursdays and cutoff follow Jerusalem before and after DST', async () => {
  const { getUpcomingThursdays, isThursday, getNearestThursday } = await import('../../src/utils/dateUtils');
  vi.setSystemTime(Date.parse('2026-10-08T16:59:00Z')); expect(getUpcomingThursdays(1)[0].dateStr).toBe('2026-10-08');
  vi.setSystemTime(Date.parse('2026-10-08T17:00:00Z')); expect(getUpcomingThursdays(1)[0].dateStr).toBe('2026-10-15');
  vi.setSystemTime(Date.parse('2026-11-12T18:00:00Z')); expect(getUpcomingThursdays(1)[0].dateStr).toBe('2026-11-19');
  expect(isThursday('2026-11-12')).toBe(true); expect(isThursday('2026-02-30')).toBe(false);
  expect(getNearestThursday(new Date('2026-11-11T22:30:00Z')).toISOString().slice(0, 10)).toBe('2026-11-19');
});
