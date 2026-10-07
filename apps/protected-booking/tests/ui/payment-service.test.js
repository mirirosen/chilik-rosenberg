import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
const mocked = vi.hoisted(() => ({ auth: { currentUser: null, authStateReady: vi.fn() }, signIn: vi.fn() }));
vi.mock('../../src/utils/firebase', () => ({ auth: mocked.auth }));
vi.mock('firebase/auth', () => ({ signInAnonymously: mocked.signIn }));
const booking = { name: 'Test', email: 'private@example.com', phone: '0501234567', dateOfBirth: '1990-01-01', tourDate: '2026-10-08', participants: 2, paymentMethod: 'bit', notes: 'private note', agreeToTerms: true };
async function service() { return import('../../src/utils/paymentService'); }
beforeEach(() => {
  vi.resetModules(); vi.stubEnv('VITE_PAYMENT_API_BASE', 'https://api.example.test'); vi.stubGlobal('crypto', webcrypto);
  mocked.auth.currentUser = { uid: 'owner', getIdToken: vi.fn().mockResolvedValue('fake-id-token') };
  mocked.auth.authStateReady.mockResolvedValue(); sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ bookingId: 'BK-' + 'a'.repeat(24), status: 'pending', paymentStatus: 'pending', totalPrice: 500, pricePerPerson: 250 }) }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('idempotency storage has only digest/random key, scopes owner and preserves exact retry', async () => {
  const s = await service(); const one = await s.makeIdempotencyKey(booking), retry = await s.makeIdempotencyKey(booking);
  expect(retry).toBe(one); expect(sessionStorage.length).toBe(2);
  const stored = sessionStorage.key(0) + sessionStorage.getItem(sessionStorage.key(0));
  for (const secret of ['private', '1990', '0501234567', '@example']) expect(stored.includes(secret)).toBe(false);
  mocked.auth.currentUser.uid = 'other'; await expect(s.makeIdempotencyKey(booking)).rejects.toThrow('booking-session-unavailable');
});
it('status lookup never creates a replacement anonymous owner when session was lost', async () => {
  mocked.auth.currentUser = null; const s = await service();
  await expect(s.getPaymentStatus('BK-' + 'a'.repeat(24))).rejects.toThrow('booking-session-unavailable');
  expect(mocked.signIn).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('request carries bearer owner token and stable idempotency key', async () => {
  const s = await service(); const key = await s.makeIdempotencyKey(booking); await s.createBooking(booking, key);
  expect(fetch.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer fake-id-token', 'x-idempotency-key': key });
});
it('request timeout aborts fetch and rejects instead of checking forever', async () => {
  vi.useFakeTimers(); fetch.mockImplementation((_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('abort')))));
  const s = await service(); const pending = s.getPaymentStatus('BK-' + 'a'.repeat(24));
  const assertion = expect(pending).rejects.toThrow('booking-request-interrupted');
  await vi.advanceTimersByTimeAsync(15001); await assertion;
});
it('token acquisition timeout also settles and never sends a later request', async () => {
  vi.useFakeTimers(); mocked.auth.currentUser.getIdToken.mockImplementation(() => new Promise(() => {}));
  const s = await service(); const pending = s.getPaymentStatus('BK-' + 'a'.repeat(24));
  const assertion = expect(pending).rejects.toThrow('booking-request-interrupted'); await vi.advanceTimersByTimeAsync(15001); await assertion;
  expect(fetch).not.toHaveBeenCalled();
});
it('HTTP404 remains distinguishable from provider pending', async () => {
  fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'not-found' }) }); const s = await service();
  await expect(s.getPaymentStatus('BK-' + 'a'.repeat(24))).rejects.toMatchObject({ message: 'not-found', status: 404 });
});
it('plain HTTP non-demo API configuration cannot transmit customer data', async () => {
  vi.stubEnv('VITE_PAYMENT_API_BASE', 'http://untrusted.example.test'); const s = await service();
  await expect(s.makeIdempotencyKey(booking)).rejects.toThrow('booking-api-not-configured'); expect(fetch).not.toHaveBeenCalled();
});

it('idempotency-key setup also times out when authentication is unavailable', async () => {
  vi.useFakeTimers(); let started; const readyStarted = new Promise(resolve => { started = resolve; });
  mocked.auth.authStateReady.mockImplementationOnce(() => { started(); return new Promise(() => {}); });
  const s = await service(); const pending = s.makeIdempotencyKey(booking);
  const assertion = expect(pending).rejects.toThrow('booking-request-interrupted'); await readyStarted; await vi.advanceTimersByTimeAsync(15001); await assertion;
  expect(fetch).not.toHaveBeenCalled(); expect(sessionStorage.length).toBe(0);
});

it('lost session cannot mint a new owner/key for an existing request', async () => {
  const s = await service(); const key = await s.makeIdempotencyKey(booking); mocked.auth.currentUser = null;
  await expect(s.makeIdempotencyKey(booking)).rejects.toThrow('booking-session-unavailable');
  await expect(s.createBooking(booking, key)).rejects.toThrow('booking-session-unavailable');
  expect(mocked.signIn).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('owner switch between key creation and POST cannot duplicate booking under new owner', async () => {
  const s = await service(); const key = await s.makeIdempotencyKey(booking); mocked.auth.currentUser = { uid: 'other', getIdToken: vi.fn().mockResolvedValue('other-token') };
  await expect(s.createBooking(booking, key)).rejects.toThrow('booking-session-unavailable'); expect(fetch).not.toHaveBeenCalled();
});

it.each([async () => ({}), async () => { throw new Error('broken-json'); }])('malformed success body never confirms booking', async json => {
  const s = await service(); const key = await s.makeIdempotencyKey(booking); fetch.mockResolvedValue({ ok: true, status: 201, json });
  await expect(s.createBooking(booking, key)).rejects.toThrow('invalid-booking-response');
});
it('timeout after response headers but before JSON body never returns empty success', async () => {
  vi.useFakeTimers(); const s = await service();
  fetch.mockResolvedValue({ ok: true, status: 200, json: () => new Promise(() => {}) });
  const pending = s.getPaymentStatus('BK-' + 'a'.repeat(24)); const assertion = expect(pending).rejects.toThrow('booking-request-interrupted');
  await vi.advanceTimersByTimeAsync(15001); await assertion;
});

it('concurrent key creation for the same request converges before any POST', async () => {
  const s = await service(); const keys = await Promise.all([s.makeIdempotencyKey(booking), s.makeIdempotencyKey(booking)]);
  expect(keys[0]).toBe(keys[1]); expect(sessionStorage.length).toBe(2);
});
