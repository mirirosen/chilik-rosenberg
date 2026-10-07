import { IS_PREPROD } from './preview';
const FLAG = import.meta.env.VITE_CALENDAR_AVAILABILITY_ENABLED === 'true';
const API_BASE = (import.meta.env.VITE_PAYMENT_API_BASE || '').replace(/\/$/, '');
const DEMO = import.meta.env.VITE_FIREBASE_EMULATORS === 'true';
export const serverAvailabilityEnabled = !IS_PREPROD && FLAG;
function configuredBase() {
  try {
    const url = new URL(API_BASE);
    return !url.username && !url.password && !url.search && !url.hash && (url.protocol === 'https:' || (DEMO && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)));
  } catch { return false; }
}
export function sanitizeAvailabilityResponse(data, nowMs = Date.now()) {
  if (data?.availabilityStatus !== 'ready' || !data.publicAvailability || Array.isArray(data.publicAvailability) || typeof data.publicAvailability !== 'object' || !Number.isFinite(data.validUntilMs) || data.validUntilMs <= nowMs || data.validUntilMs > nowMs + 300000) throw new Error('availability-unavailable');
  const entries = Object.entries(data.publicAvailability);
  if (entries.length < 1 || entries.length > 13) throw new Error('availability-unavailable');
  const rows = {};
  for (const [date, row] of entries) {
    const ms = Date.parse(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== date || new Date(ms).getUTCDay() !== 4 || typeof row?.available !== 'boolean' || !Number.isInteger(row.availableSpots) || !Number.isInteger(row.maxParticipants) || row.maxParticipants < 1 || row.maxParticipants > 100 || row.availableSpots < 0 || row.availableSpots > row.maxParticipants || row.available !== (row.availableSpots > 0) || !Number.isFinite(row.validUntilMs) || row.validUntilMs < data.validUntilMs || row.validUntilMs > nowMs + 300000) throw new Error('availability-unavailable');
    rows[date] = { available: row.available, availableSpots: row.availableSpots, maxParticipants: row.maxParticipants, validUntilMs: row.validUntilMs };
  }
  // Copy a whitelist only. No upstream metadata/customer/calendar fields survive.
  return { availabilityStatus: 'ready', serverAvailabilityEnabled: true, publicAvailability: rows, validUntilMs: data.validUntilMs, tourDates: {} };
}
export async function getServerAvailability({ signal } = {}) {
  if (!serverAvailabilityEnabled || !configuredBase()) throw new Error('availability-unavailable');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${API_BASE}/calendarAvailability`, { method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error('availability-unavailable');
    return sanitizeAvailabilityResponse(await response.json());
  } catch { throw new Error('availability-unavailable'); }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export function freshAvailabilityRow(data, date, nowMs = Date.now()) {
  const row = data?.publicAvailability?.[date];
  return data?.availabilityStatus === 'ready' && data.validUntilMs > nowMs && row?.validUntilMs > nowMs ? row : null;
}
