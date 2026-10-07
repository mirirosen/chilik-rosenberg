import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ initialize: vi.fn(), auth: vi.fn(), db: vi.fn(), snapshot: vi.fn() }));
vi.mock('firebase/app', () => ({ initializeApp: mocks.initialize }));
vi.mock('firebase/auth', () => ({ getAuth: mocks.auth, connectAuthEmulator: vi.fn(), signInAnonymously: vi.fn() }));
vi.mock('firebase/firestore', () => ({ getFirestore: mocks.db, connectFirestoreEmulator: vi.fn(), doc: vi.fn(), collection: vi.fn(), onSnapshot: mocks.snapshot }));
beforeEach(() => { vi.resetModules(); vi.stubEnv('MODE', 'preprod'); vi.stubEnv('VITE_PAYMENT_API_BASE', 'https://production.example.test'); vi.stubGlobal('fetch', vi.fn()); localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
it('never initializes Firebase auth or database in preprod', async () => {
  const firebase = await import('../../src/utils/firebase');
  expect(firebase.auth).toBeUndefined(); expect(firebase.db).toBeUndefined();
  expect(mocks.initialize).not.toHaveBeenCalled(); expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.db).not.toHaveBeenCalled();
});
it('returns clearly isolated sample availability without Firestore subscriptions', async () => {
  const { useFirebaseData } = await import('../../src/hooks/useFirebaseData');
  const { result } = renderHook(() => useFirebaseData());
  expect(result.current).toMatchObject({ availabilityStatus: 'ready', globalMaxParticipants: 30, tourDates: {} });
  expect(mocks.snapshot).not.toHaveBeenCalled();
});
it('rejects payment and admin requests even when a live API environment variable is present', async () => {
  const payment = await import('../../src/utils/paymentService');
  const admin = await import('../../src/utils/adminService');
  expect(payment.paymentsConfigured).toBe(false);
  await expect(payment.makeIdempotencyKey({})).rejects.toThrow('booking-api-not-configured');
  await expect(payment.getPaymentStatus('BK-test')).rejects.toThrow('booking-api-not-configured');
  await expect(admin.adminRequest('retryIntegrationJob', {})).rejects.toThrow('admin-service-unavailable');
  expect(fetch).not.toHaveBeenCalled();
});
it('does not perform geolocation or programmatic WhatsApp navigation', async () => {
  const { detectUserLanguage } = await import('../../src/utils/detectLanguage');
  const { handleWhatsApp } = await import('../../src/utils/whatsapp');
  const original = location.href;
  expect(await detectUserLanguage()).toBe('he'); handleWhatsApp(null, true);
  expect(location.href).toBe(original); expect(fetch).not.toHaveBeenCalled();
});
it('removes contact hrefs including dynamically added links but preserves internal navigation', async () => {
  const { disablePreviewContacts } = await import('../../src/utils/preview');
  document.body.innerHTML = '<a href="tel:0500000000">Call</a><a href="https://wa.me/123">WhatsApp</a><a href="/#menu">Menu</a>';
  const stop = disablePreviewContacts();
  expect(document.querySelectorAll('a[aria-disabled="true"]')).toHaveLength(2);
  expect(document.querySelector('a[href="/#menu"]')).not.toBeNull();
  document.body.insertAdjacentHTML('beforeend', '<a href="mailto:sample@example.test">Mail</a>');
  await Promise.resolve();
  expect(document.querySelectorAll('a[aria-disabled="true"]')).toHaveLength(3); stop();
});
