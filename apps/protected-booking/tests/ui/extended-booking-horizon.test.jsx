import { it, expect, vi, afterEach } from 'vitest';
import { getUpcomingThursdays, isSelectableTourDate } from '../../src/utils/dateUtils';
import { sanitizeAvailabilityResponse } from '../../src/utils/calendarAvailability';
const NOW = Date.parse('2026-11-16T10:00:00Z');
afterEach(() => { vi.useRealTimers(); });
it('public picker includes both full future years and keeps a bounded final date', () => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  const dates = getUpcomingThursdays();
  expect(dates.filter(d => d.dateStr.startsWith('2027-'))).toHaveLength(52);
  expect(dates.filter(d => d.dateStr.startsWith('2028-'))).toHaveLength(52);
  expect(dates.at(-1).dateStr).toBe('2028-12-28');
  expect(isSelectableTourDate('2028-12-28')).toBe(true);
  expect(isSelectableTourDate('2029-01-04')).toBe(false);
});
it('client accepts a complete extended public response without retaining private metadata', () => {
  const rows = {};
  for (let day = Date.parse('2027-01-07T00:00:00Z'); day <= Date.parse('2028-12-28T00:00:00Z'); day += 7*86400000) {
    rows[new Date(day).toISOString().slice(0,10)] = { available:true, availableSpots:30, maxParticipants:30, validUntilMs:NOW+300000, privateTitle:'Secret' };
  }
  const result = sanitizeAvailabilityResponse({ availabilityStatus:'ready', publicAvailability:rows, validUntilMs:NOW+300000 }, NOW);
  expect(Object.keys(result.publicAvailability)).toHaveLength(104);
  expect(result.publicAvailability['2028-12-28'].availableSpots).toBe(30);
  expect(JSON.stringify(result)).not.toContain('Secret');
});
