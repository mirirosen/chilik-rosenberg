import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ auth: { currentUser: null } }));
vi.mock('../../src/utils/firebase', () => state);
let adminRequest, adminErrorMessage;
beforeEach(async () => { vi.resetModules(); vi.stubEnv('VITE_PAYMENT_API_BASE', 'https://api.example.test'); state.auth.currentUser = { uid: 'admin', getIdToken: vi.fn().mockResolvedValue('test-token') }; vi.stubGlobal('fetch', vi.fn()); ({ adminRequest, adminErrorMessage } = await import('../../src/utils/adminService')); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('validates mutation acknowledgements instead of treating malformed success as saved', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  await expect(adminRequest('retryIntegrationJob', { jobId: 'job' })).rejects.toThrow('invalid-admin-response');
  fetch.mockResolvedValue({ ok: true, json: async () => ({ queued: true }) });
  await expect(adminRequest('retryIntegrationJob', { jobId: 'job' })).resolves.toEqual({ queued: true });
  fetch.mockResolvedValue({ ok: true, json: async () => ({ bookingId: 'booking', status: 'cancelled' }) });
  await expect(adminRequest('updateBookingStatus', { bookingId: 'booking', status: 'cancelled' })).resolves.toHaveProperty('status', 'cancelled');
});
it('maps authentication-required to sign-in guidance', () => { expect(adminErrorMessage(new Error('authentication-required'))).toContain('להתחבר מחדש'); });
it('rejects an identity change before sending', async () => {
  state.auth.currentUser.getIdToken.mockImplementation(async () => { state.auth.currentUser = { uid: 'different' }; return 'test-token'; });
  await expect(adminRequest('retryIntegrationJob', {})).rejects.toThrow('admin-session-changed'); expect(fetch).not.toHaveBeenCalled();
});
it('bounds a stalled JSON body', async () => {
  vi.useFakeTimers(); fetch.mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
  const promise = adminRequest('retryIntegrationJob', {}); const assertion = expect(promise).rejects.toThrow('admin-timeout');
  await vi.advanceTimersByTimeAsync(15000); await assertion;
});
