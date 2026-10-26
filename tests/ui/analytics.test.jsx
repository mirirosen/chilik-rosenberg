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
beforeEach(() => { localStorage.clear(); delete window.dataLayer; delete window.gtag; gtagScripts().forEach(s => s.remove()); });
afterEach(() => cleanup());

describe('GA4 without a measurement ID (default build)', () => {
  it('is completely inert: no banner, no script, no events, no stored consent', async () => {
    const { analytics, ConsentBanner } = await fresh();
    expect(analytics.analyticsConfigured()).toBe(false);
    expect(analytics.consentState()).toBe('unavailable');
    analytics.initAnalytics(); analytics.setConsent(true);
    expect(analytics.track('begin_checkout')).toBe(false);
    expect(analytics.trackPurchase({ bookingId: 'BK-' + 'a'.repeat(24), status: 'confirmed', paymentStatus: 'paid', totalPrice: 500 })).toBe(false);
    const { container } = render(<ConsentBanner />);
    expect(container.innerHTML).toBe('');
    expect(gtagScripts()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
    expect(localStorage.length).toBe(0);
  });
});

describe('GA4 with a measurement ID', () => {
  it('loads nothing before consent, and nothing after "No thanks"', async () => {
    const { analytics, ConsentBanner } = await fresh('G-TEST1234');
    analytics.initAnalytics();
    expect(gtagScripts()).toHaveLength(0);
    render(<ConsentBanner />);
    fireEvent.click(screen.getByText('לא, תודה'));
    expect(screen.queryByTestId('consent-banner')).toBeNull();
    expect(gtagScripts()).toHaveLength(0);
    expect(analytics.consentState()).toBe('denied');
    expect(analytics.track('click_phone')).toBe(false);
  });
  it('loads gtag only after explicit consent and sends checkout, purchase and contact-click events', async () => {
    const { analytics, ConsentBanner } = await fresh('G-TEST1234');
    render(<ConsentBanner />);
    expect(screen.getByTestId('consent-banner').querySelector('a').getAttribute('href')).toBe('/privacy');
    fireEvent.click(screen.getByText('אישור'));
    expect(gtagScripts()).toHaveLength(1);
    expect(analytics.consentState()).toBe('granted');
    expect(window.dataLayer.find(entry => entry[0] === 'consent')[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' });

    analytics.trackBeginCheckout({ participants: 2, pricePerPerson: 250, totalPrice: 500 });
    const id = 'BK-' + 'b'.repeat(24);
    expect(analytics.trackPurchase({ bookingId: id, status: 'payment_pending', paymentStatus: 'awaiting_payment', totalPrice: 500 })).toBe(false);
    expect(analytics.trackPurchase({ bookingId: id, status: 'payment_review', paymentStatus: 'paid', totalPrice: 500 })).toBe(false);
    expect(analytics.trackPurchase({ bookingId: id, status: 'confirmed', paymentStatus: 'paid', totalPrice: 500, pricePerPerson: 250, participants: 2 })).toBe(true);
    expect(analytics.trackPurchase({ bookingId: id, status: 'confirmed', paymentStatus: 'paid', totalPrice: 500 })).toBe(false); // once per booking

    const wa = document.createElement('a'); wa.href = 'https://wa.me/972506724312?text=private'; document.body.append(wa);
    const tel = document.createElement('a'); tel.href = 'tel:0506724312'; document.body.append(tel);
    wa.addEventListener('click', e => e.preventDefault()); tel.addEventListener('click', e => e.preventDefault());
    wa.click(); tel.click();
    expect(events()).toEqual([
      ['begin_checkout', expect.objectContaining({ currency: 'ILS', value: 500 })],
      ['purchase', expect.objectContaining({ transaction_id: id, currency: 'ILS', value: 500 })],
      ['click_whatsapp', { link_url: 'https://wa.me/972506724312' }],
      ['click_phone', { link_url: 'tel' }],
    ]);
    wa.remove(); tel.remove();
  });
  it('a returning visitor who accepted earlier is not asked again', async () => {
    localStorage.setItem('chilik-analytics-consent', 'granted');
    const { analytics, ConsentBanner } = await fresh('G-TEST1234');
    analytics.initAnalytics();
    expect(gtagScripts()).toHaveLength(1);
    const { container } = render(<ConsentBanner />);
    expect(container.innerHTML).toBe('');
  });
});

describe('hosting CSP for GA4', () => {
  const headers = JSON.parse(readFileSync('firebase.hosting.booking.json', 'utf8')).hosting.headers;
  const csp = match => headers.find(rule => (rule.regex || rule.source) === match).headers.find(h => h.key === 'Content-Security-Policy').value;
  it.each(['^[\\\\/]$', '^[\\\\/]en$', '^[\\\\/]booking$', '^[\\\\/]confirmation$', '^[\\\\/]terms$'])('%s allows gtag and GA collection', route => {
    expect(csp(route)).toMatch(/script-src 'self' https:\/\/www\.googletagmanager\.com;/);
    expect(csp(route)).toMatch(/connect-src [^;]*https:\/\/\*\.google-analytics\.com/);
  });
  it('management and guides keep their stricter policies', () => {
    expect(csp('^[\\\\/]manage-bookings$')).not.toMatch(/googletagmanager|google-analytics/);
    expect(csp('/guides/**')).toContain("script-src 'none'");
  });
});
