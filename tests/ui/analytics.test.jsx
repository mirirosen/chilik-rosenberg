import React from 'react';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'he', dir: () => 'rtl' } }) }));
const gtagScripts = () => document.querySelectorAll('script[src^="https://www.googletagmanager.com/gtag/js"]');
const events = () => (window.dataLayer || []).filter(entry => entry[0] === 'event').map(entry => [entry[1], entry[2]]);
async function fresh(id) {
  vi.resetModules();
  const analytics = await import('../../apps/protected-booking/src/utils/analytics');
  if (id !== undefined) analytics.__setMeasurementIdForTests(id);
  const { default: ConsentBanner } = await import('../../src/components/ConsentBanner');
  return { analytics, ConsentBanner };
}
const BOOKING = 'BK-' + 'b'.repeat(24);
const PAID = { bookingId: BOOKING, status: 'confirmed', paymentStatus: 'paid', totalPrice: 500, pricePerPerson: 250, participants: 2 };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); delete window.dataLayer; delete window.gtag; gtagScripts().forEach(s => s.remove()); });
afterEach(() => cleanup());

describe('GA4 configuration', () => {
  it('uses G-165V7SRZJK by default; env overrides it; "off" and preprod disable it', async () => {
    const { analytics } = await fresh();
    expect(analytics.currentMeasurementId()).toBe('G-165V7SRZJK');
    expect(analytics.resolveMeasurementId('', 'booking')).toBe('G-165V7SRZJK');
    expect(analytics.resolveMeasurementId(undefined, 'booking')).toBe('G-165V7SRZJK');
    expect(analytics.resolveMeasurementId('G-OTHER123', 'booking')).toBe('G-OTHER123');
    expect(analytics.resolveMeasurementId('off', 'booking')).toBe('');
    expect(analytics.resolveMeasurementId('not-an-id', 'booking')).toBe('');
    expect(analytics.resolveMeasurementId('', 'preprod')).toBe('');
    expect(analytics.resolveMeasurementId('', 'booking-demo')).toBe('');
  });
});

describe('consent gating', () => {
  it('nothing loads before an explicit choice: no script, no dataLayer, no events', async () => {
    const { analytics, ConsentBanner } = await fresh();
    analytics.initAnalytics();
    render(<ConsentBanner />);
    expect(screen.getByTestId('consent-banner')).toBeTruthy();
    expect(gtagScripts()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
    expect(analytics.trackBeginBooking({ participants: 2, pricePerPerson: 250, totalPrice: 500 })).toBe(false);
    expect(analytics.trackPurchase(PAID)).toBe(false);
    expect(localStorage.getItem('chilik-analytics-purchase:' + BOOKING)).toBeNull();
  });
  it('"No thanks" is remembered and never loads gtag', async () => {
    const { analytics, ConsentBanner } = await fresh();
    render(<ConsentBanner />);
    fireEvent.click(screen.getByText('לא, תודה'));
    expect(screen.queryByTestId('consent-banner')).toBeNull();
    expect(analytics.consentState()).toBe('denied');
    analytics.initAnalytics();
    expect(gtagScripts()).toHaveLength(0);
    cleanup();
    const again = await fresh();
    const { container } = render(<again.ConsentBanner />);
    expect(container.innerHTML).toBe('');
    again.analytics.initAnalytics();
    expect(gtagScripts()).toHaveLength(0);
  });
  it('"Accept" loads gtag for G-165V7SRZJK with ad storage denied; a returning visitor is not asked again', async () => {
    const { analytics, ConsentBanner } = await fresh();
    render(<ConsentBanner />);
    expect(screen.getByTestId('consent-banner').querySelector('a').getAttribute('href')).toBe('/privacy');
    fireEvent.click(screen.getByText('אישור'));
    expect([...gtagScripts()].map(s => s.src)).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-165V7SRZJK']);
    expect(window.dataLayer.find(entry => entry[0] === 'consent')[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' });
    expect(window.dataLayer.find(entry => entry[0] === 'config')[1]).toBe('G-165V7SRZJK');
    cleanup(); gtagScripts().forEach(s => s.remove());
    const again = await fresh();
    again.analytics.initAnalytics();
    expect(gtagScripts()).toHaveLength(1);
    const { container } = render(<again.ConsentBanner />);
    expect(container.innerHTML).toBe('');
  });
  it('with analytics disabled there is no banner and nothing is stored', async () => {
    const { analytics, ConsentBanner } = await fresh('');
    analytics.initAnalytics(); analytics.setConsent(true);
    const { container } = render(<ConsentBanner />);
    expect(container.innerHTML).toBe('');
    expect(gtagScripts()).toHaveLength(0);
    expect(localStorage.length).toBe(0);
  });
});

describe('events after consent', () => {
  it('begin_booking, begin_checkout, whatsapp_click and phone_click', async () => {
    const { analytics } = await fresh();
    analytics.setConsent(true);
    analytics.trackBeginBooking({ participants: 2, pricePerPerson: 250, totalPrice: 500 });
    analytics.trackBeginCheckout({ participants: 2, pricePerPerson: 250, totalPrice: 500 });
    const wa = document.createElement('a'); wa.href = 'https://wa.me/972506724312?text=private'; document.body.append(wa);
    const tel = document.createElement('a'); tel.href = 'tel:0506724312'; document.body.append(tel);
    wa.addEventListener('click', e => e.preventDefault()); tel.addEventListener('click', e => e.preventDefault());
    try {
      wa.click(); tel.click();
      expect(events()).toEqual([
        ['begin_booking', expect.objectContaining({ currency: 'ILS', value: 500 })],
        ['begin_checkout', expect.objectContaining({ currency: 'ILS', value: 500 })],
        ['whatsapp_click', { link_url: 'https://wa.me/972506724312' }],
        ['phone_click', { link_url: 'tel' }],
      ]);
    } finally { wa.remove(); tel.remove(); }
  });
});

describe('purchase', () => {
  it('fires only for a server-verified paid + confirmed booking, with transaction_id, ILS value and currency', async () => {
    const { analytics } = await fresh();
    analytics.setConsent(true);
    for (const state of [{ ...PAID, status: 'payment_pending', paymentStatus: 'awaiting_payment' }, { ...PAID, status: 'payment_review' }, { ...PAID, paymentStatus: 'pending_review' }, { ...PAID, bookingId: 'not-a-booking' }, { ...PAID, totalPrice: undefined }]) {
      expect(analytics.trackPurchase(state)).toBe(false);
    }
    expect(analytics.trackPurchase(PAID)).toBe(true);
    expect(events()).toEqual([['purchase', expect.objectContaining({ transaction_id: BOOKING, currency: 'ILS', value: 500 })]]);
  });
  it('is deduplicated per booking: a second call and a page reload do not refire', async () => {
    const first = await fresh();
    first.analytics.setConsent(true);
    expect(first.analytics.trackPurchase(PAID)).toBe(true);
    expect(first.analytics.trackPurchase(PAID)).toBe(false);
    expect(localStorage.getItem('chilik-analytics-purchase:' + BOOKING)).toBeTruthy();
    // Simulated reload: fresh module state, same browser storage.
    delete window.dataLayer; delete window.gtag;
    const reloaded = await fresh();
    reloaded.analytics.initAnalytics();
    expect(reloaded.analytics.trackPurchase(PAID)).toBe(false);
    expect(events()).toEqual([]);
    // Another booking is still reported once.
    expect(reloaded.analytics.trackPurchase({ ...PAID, bookingId: 'BK-' + 'c'.repeat(24) })).toBe(true);
  });
});

describe('hosting CSP for GA4', () => {
  const headers = JSON.parse(readFileSync('firebase.hosting.booking.json', 'utf8')).hosting.headers;
  const csp = match => headers.find(rule => (rule.regex || rule.source) === match).headers.find(h => h.key === 'Content-Security-Policy').value;
  it.each(['^[\\\\/]$', '^[\\\\/]en$', '^[\\\\/]booking$', '^[\\\\/]confirmation$', '^[\\\\/]terms$'])('%s allows gtag and GA collection', route => {
    expect(csp(route)).toMatch(/script-src 'self' https:\/\/www\.googletagmanager\.com;/);
    expect(csp(route)).toMatch(/connect-src [^;]*https:\/\/\*\.google-analytics\.com/);
    expect(csp(route)).toMatch(/connect-src [^;]*https:\/\/\*\.analytics\.google\.com/);
  });
  it('management and guides keep their stricter policies', () => {
    expect(csp('^[\\\\/]manage-bookings$')).not.toMatch(/googletagmanager|google-analytics/);
    expect(csp('/guides/**')).toContain("script-src 'none'");
  });
});
