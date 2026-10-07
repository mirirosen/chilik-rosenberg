import { afterEach, expect, it, vi } from 'vitest';
import { bootstrapProtectedBooking } from '../../src/bootstrap';
const mocks = vi.hoisted(() => ({ initialize: vi.fn(), auth: vi.fn(), db: vi.fn() }));
vi.mock('firebase/app', () => ({ initializeApp: mocks.initialize }));
vi.mock('firebase/auth', () => ({ getAuth: mocks.auth, connectAuthEmulator: vi.fn() }));
vi.mock('firebase/firestore', () => ({ getFirestore: mocks.db, connectFirestoreEmulator: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });

it('does not load the Auth/booking entry under absent, false or malformed build flags', async () => {
  for (const enabled of [undefined, '', 'false', false, true, 'TRUE', '1']) {
    const load = vi.fn(), renderDisabled = vi.fn();
    await bootstrapProtectedBooking({ enabled, load, renderDisabled });
    expect(load).not.toHaveBeenCalled(); expect(renderDisabled).toHaveBeenCalledOnce();
  }
});
it('loads the opt-in entry only with the exact build-time string', async () => {
  const load = vi.fn(), renderDisabled = vi.fn();
  await bootstrapProtectedBooking({ enabled: 'true', load, renderDisabled });
  expect(load).toHaveBeenCalledOnce(); expect(renderDisabled).not.toHaveBeenCalled();
});
it('does not initialize Firebase in a default build even with live config present', async () => {
  vi.stubEnv('MODE', 'production');
  vi.stubEnv('VITE_BOOKING_REVIEW_ENABLED', 'false');
  vi.stubEnv('VITE_BOOKING_FIREBASE_PROJECT_ID', 'hilik-site');
  vi.stubEnv('VITE_BOOKING_FIREBASE_AUTH_DOMAIN', 'hilik-site.firebaseapp.com');
  vi.stubEnv('VITE_BOOKING_FIREBASE_API_KEY', 'synthetic');
  vi.stubEnv('VITE_BOOKING_FIREBASE_APP_ID', 'synthetic');
  const { auth, db } = await import('../../src/utils/firebase');
  expect(auth).toBeUndefined(); expect(db).toBeUndefined(); expect(mocks.initialize).not.toHaveBeenCalled();
});
it('does not initialize Firebase in an opt-in preprod build with live config present', async () => {
  vi.stubEnv('MODE', 'preprod'); vi.stubEnv('VITE_BOOKING_REVIEW_ENABLED', 'true');
  const { auth, db } = await import('../../src/utils/firebase');
  expect(auth).toBeUndefined(); expect(db).toBeUndefined(); expect(mocks.initialize).not.toHaveBeenCalled();
});
