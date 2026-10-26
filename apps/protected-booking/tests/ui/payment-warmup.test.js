import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const preview = vi.hoisted(() => ({ IS_PREPROD: false }));
vi.mock('../../src/utils/preview', () => preview);
async function load() { return import('../../src/utils/paymentWarmup'); }
beforeEach(() => {
  vi.resetModules(); preview.IS_PREPROD = false; sessionStorage.clear();
  vi.stubEnv('VITE_PAYMENT_API_BASE', 'https://us-central1-hilik-site.cloudfunctions.net/');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 0 }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('sends one warmup GET to each payment function once per browser session', async () => {
  const { warmPaymentFunctions, WARMUP_SESSION_KEY } = await load();
  expect(warmPaymentFunctions()).toBe(true);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(['createPayment', 'paymentStatus', 'tranzilaWebhook'].map(n => `https://us-central1-hilik-site.cloudfunctions.net/${n}?warmup=1`));
  for (const [, init] of fetch.mock.calls) expect(init).toMatchObject({ method: 'GET', mode: 'no-cors', credentials: 'omit', cache: 'no-store' });
  // No custom headers (no preflight, no Authorization) and no body.
  for (const [, init] of fetch.mock.calls) { expect(init.headers).toBeUndefined(); expect(init.body).toBeUndefined(); }
  expect(sessionStorage.getItem(WARMUP_SESSION_KEY)).toBe('1');
  expect(warmPaymentFunctions()).toBe(false); expect(warmPaymentFunctions()).toBe(false);
  // A fresh module (e.g. remounted lazy chunk) still honors the session flag.
  vi.resetModules(); expect((await load()).warmPaymentFunctions()).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it('a failed warmup is swallowed and not retried in the same session', async () => {
  fetch.mockRejectedValue(new TypeError('network'));
  const { warmPaymentFunctions } = await load();
  expect(() => warmPaymentFunctions()).not.toThrow();
  await Promise.resolve();
  expect(warmPaymentFunctions()).toBe(false); expect(fetch).toHaveBeenCalledTimes(3);
});

it('never warms in preprod, without an https API base, or when sessionStorage is unavailable', async () => {
  preview.IS_PREPROD = true; expect((await load()).warmPaymentFunctions()).toBe(false);
  preview.IS_PREPROD = false;
  for (const base of ['', 'http://us-central1-hilik-site.cloudfunctions.net', 'https://u:p@example.test', 'https://example.test/?x=1']) {
    vi.resetModules(); vi.stubEnv('VITE_PAYMENT_API_BASE', base); expect((await load()).warmPaymentFunctions()).toBe(false);
  }
  vi.resetModules(); vi.stubEnv('VITE_PAYMENT_API_BASE', 'https://example.test');
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  expect((await load()).warmPaymentFunctions()).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
