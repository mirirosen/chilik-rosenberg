import React from 'react';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key, i18n: { language: 'he', dir: () => 'rtl' } }) }));
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
beforeEach(() => { document.documentElement.lang = 'he'; localStorage.clear(); sessionStorage.clear(); document.cookie = 'chilik-analytics-opt-out=; Max-Age=0; path=/'; delete window.dataLayer; delete window.gtag; gtagScripts().forEach(s => s.remove()); });
afterEach(() => cleanup());

describe('GA4 configuration', () => {
  it('uses G-CXTM7ZJZYX by default; env overrides it; "off" and preprod disable it', async () => {
    const { analytics } = await fresh();
    expect(analytics.currentMeasurementId()).toBe('G-CXTM7ZJZYX');
    expect(analytics.resolveMeasurementId('', 'booking')).toBe('G-CXTM7ZJZYX');
    expect(analytics.resolveMeasurementId(undefined, 'booking')).toBe('G-CXTM7ZJZYX');
    expect(analytics.resolveMeasurementId('G-OTHER123', 'booking')).toBe('G-OTHER123');
    expect(analytics.resolveMeasurementId('off', 'booking')).toBe('');
    expect(analytics.resolveMeasurementId('not-an-id', 'booking')).toBe('');
    expect(analytics.resolveMeasurementId('', 'preprod')).toBe('');
    expect(analytics.resolveMeasurementId('', 'booking-demo')).toBe('');
  });
});

describe('automatic analytics and retained opt-outs', () => {
  it('loads measurement for a new visitor without displaying an approval banner', async () => {
    const { analytics, ConsentBanner } = await fresh();
    analytics.initAnalytics();
    render(<ConsentBanner />);
    expect(screen.queryByTestId('consent-banner')).toBeNull();
    expect(gtagScripts()).toHaveLength(1);
    expect(analytics.trackBeginBooking({ participants: 2, pricePerPerson: 250, totalPrice: 500 })).toBe(true);
    expect(window.dataLayer.find(entry => entry[0] === 'consent')[2]).toMatchObject({ analytics_storage:'granted', ad_storage:'denied' });
  });
  it('"No thanks" is remembered and never loads gtag', async () => {
    const { analytics, ConsentBanner } = await fresh();
    localStorage.setItem('chilik-analytics-consent', 'denied');
    render(<ConsentBanner />);
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
  it('automatic loading retains the configured property and keeps advertising disabled', async () => {
    const { analytics, ConsentBanner } = await fresh();
    render(<ConsentBanner />);
    analytics.initAnalytics();
    expect(screen.queryByTestId('consent-banner')).toBeNull();
    expect([...gtagScripts()].map(s => s.src)).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-CXTM7ZJZYX']);
    expect(window.dataLayer.find(entry => entry[0] === 'consent')[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' });
    expect(window.dataLayer.find(entry => entry[0] === 'config')[1]).toBe('G-CXTM7ZJZYX');
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
  it('measures only the designated booking coverage link without sending its URL or link text', async () => {
    const { analytics } = await fresh(); analytics.initAnalytics();
    const link = document.createElement('a');
    link.href = 'https://www.mako.co.il/food-restaurants/restaurant-news/Article-f69eb4533183e81027.htm';
    link.dataset.bookingCoverage = 'mako-tour';
    link.textContent = 'Previous tour report';
    link.addEventListener('click', e => e.preventDefault()); document.body.append(link);
    try {
      link.click(); link.dataset.bookingCoverage = 'untrusted'; link.click();
      link.dataset.bookingCoverage = 'mako-tour'; link.href = 'https://example.invalid/?customer=secret'; link.click();
      const button = document.createElement('button'); document.body.append(button); button.click(); button.remove();
      expect(events()).toEqual([['booking_coverage_click', { page_language: 'he' }]]);
    } finally { link.remove(); }
  });
  it('measures the current interface language at each funnel event, including a language change', async () => {
    const { analytics } = await fresh(); analytics.initAnalytics();
    const booking = { participants: 2, pricePerPerson: 250, totalPrice: 500 };
    document.documentElement.lang = 'en';
    analytics.trackBeginBooking(booking);
    document.documentElement.lang = 'he';
    analytics.trackBeginCheckout(booking);
    document.documentElement.lang = 'en';
    analytics.trackPurchase({ ...PAID, language: 'he' });
    expect(events().map(([name, data]) => [name, data.page_language])).toEqual([
      ['begin_booking', 'en'], ['begin_checkout', 'he'], ['purchase', 'en'],
    ]);
  });
  it('keeps the language dimension closed and prevents callers from overriding it', async () => {
    const { analytics } = await fresh(); analytics.initAnalytics();
    document.documentElement.lang = 'en-GB';
    analytics.track('begin_booking', { page_language: 'customer input' });
    expect(events()[0][1].page_language).toBe('en');
    document.documentElement.lang = 'unsupported-customer-input';
    analytics.trackBeginCheckout({ participants: 1, pricePerPerson: 250, totalPrice: 250 });
    expect(events()[1][1]).not.toHaveProperty('page_language');
  });
  it('distinguishes private inquiries without leaking the message or an unrecognized context', async () => {
    const { analytics } = await fresh(); analytics.initAnalytics();
    const link = document.createElement('a'); link.href = 'https://wa.me/972506724312?text=Customer%20secret#fragment';
    link.dataset.contactContext = 'private_tour'; link.addEventListener('click', e => e.preventDefault());
    document.body.append(link);
    try {
      link.click(); link.dataset.contactContext = 'Customer secret'; link.click();
      expect(events().map(([, data]) => data)).toEqual([
        { page_language: 'he', contact_context: 'private_tour', link_url: 'https://wa.me/972506724312' },
        { page_language: 'he', contact_context: 'general', link_url: 'https://wa.me/972506724312' },
      ]);
    } finally { link.remove(); }
  });
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
        ['whatsapp_click', { link_url: 'https://wa.me/972506724312', page_language: 'he', contact_context: 'general' }],
        ['phone_click', { link_url: 'tel', page_language: 'he' }],
      ]);
    } finally { wa.remove(); tel.remove(); }
  });
});

describe('purchase', () => {
  it.each(['getItem', 'setItem'])('storage %s failure does not interrupt a paid confirmation or repeat a purchase in the same page', async method => {
    const { analytics } = await fresh(); analytics.initAnalytics();
    const broken = vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new DOMException('storage unavailable', 'QuotaExceededError'); });
    try {
      expect(() => analytics.trackPurchase(PAID)).not.toThrow();
      expect(analytics.trackPurchase(PAID)).toBe(false);
      expect(events().filter(([name]) => name === 'purchase')).toHaveLength(1);
      expect(analytics.trackPurchase({ ...PAID, bookingId: 'BK-' + 'd'.repeat(24) })).toBe(true);
      expect(events().filter(([name]) => name === 'purchase')).toHaveLength(2);
    } finally { broken.mockRestore(); }
  });
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

describe('page_location and management', () => {
  const configOf = () => window.dataLayer.find(entry => entry[0] === 'config')[2];
  afterEach(() => { window.history.replaceState({}, '', '/'); delete window['ga-disable-G-CXTM7ZJZYX']; });
  it('drops the query string on /booking and /confirmation only', async () => {
    const { analytics } = await fresh();
    expect(analytics.pageLocation('https://www.chilik-tours.com/confirmation?payment=failed&id=BK-' + 'a'.repeat(24))).toBe('https://www.chilik-tours.com/confirmation');
    expect(analytics.pageLocation('https://www.chilik-tours.com/booking?date=2026-10-29&participants=2#x')).toBe('https://www.chilik-tours.com/booking');
    expect(analytics.pageLocation('https://www.chilik-tours.com/en?utm_source=x')).toBe('https://www.chilik-tours.com/en?utm_source=x');
    window.history.replaceState({}, '', '/confirmation?id=' + BOOKING);
    analytics.setConsent(true);
    expect(configOf().page_location).toBe(window.location.origin + '/confirmation');
    expect(analytics.beforeNavigate('/booking?date=2026-10-29&participants=2')).toBe(false);
    expect(window.dataLayer.filter(entry => entry[0] === 'set').at(-1)[1]).toEqual({ page_referrer: window.location.origin + '/confirmation', page_location: window.location.origin + '/booking' });
    // Leaving /booking?id=... for the homepage: the referrer is the query-free booking page.
    expect(analytics.beforeNavigate('/en?utm_source=x')).toBe(false);
    expect(window.dataLayer.filter(entry => entry[0] === 'set').at(-1)[1]).toEqual({ page_referrer: window.location.origin + '/booking', page_location: window.location.origin + '/en?utm_source=x' });
    expect(analytics.beforeNavigate('/terms')).toBe(false);
    expect(window.dataLayer.filter(entry => entry[0] === 'set').at(-1)[1].page_referrer).toBe(window.location.origin + '/en');
  });
  it('page_referrer never carries a query string or fragment', async () => {
    const { analytics } = await fresh();
    expect(analytics.pageReferrer('https://www.chilik-tours.com/booking?id=' + BOOKING + '#x')).toBe('https://www.chilik-tours.com/booking');
    expect(analytics.pageReferrer('https://directng.tranzila.com/t/?contact=Dana&phone=0501234567')).toBe('https://directng.tranzila.com/t/');
    expect(analytics.pageReferrer('')).toBe('');
    const referrer = vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.google.com/search?q=private');
    try {
      analytics.setConsent(true);
      expect(configOf().page_referrer).toBe('https://www.google.com/search');
    } finally { referrer.mockRestore(); }
  });
  it('blocks every hit on /manage-bookings and forces a full page load from the SPA', async () => {
    const { analytics } = await fresh();
    analytics.setConsent(true);
    expect(analytics.beforeNavigate('/manage-bookings')).toBe(true);
    expect(window['ga-disable-G-CXTM7ZJZYX']).toBe(true);
    expect(analytics.beforeNavigate('/terms')).toBe(false);
    expect(window['ga-disable-G-CXTM7ZJZYX']).toBe(false);
    // A stored "accept" never loads gtag when the dashboard is opened directly.
    gtagScripts().forEach(s => s.remove()); delete window.dataLayer;
    window.history.replaceState({}, '', '/manage-bookings');
    const direct = await fresh();
    direct.analytics.initAnalytics();
    expect(gtagScripts()).toHaveLength(0);
    expect(window['ga-disable-G-CXTM7ZJZYX']).toBe(true);
  });
});

describe('withdrawing consent', () => {
  it('storage quota failure still disables measurement, clears GA cookies and persists a fallback across reload', async () => {
    const { analytics } = await fresh(); analytics.initAnalytics();
    document.cookie = '_ga=fixture; path=/';
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    const reload = vi.fn();
    try {
      expect(() => analytics.withdrawConsent({ reload })).not.toThrow();
      expect(window['ga-disable-G-CXTM7ZJZYX']).toBe(true);
      expect(document.cookie).not.toMatch(/_ga=/);
      expect(document.cookie).toContain('chilik-analytics-opt-out=1');
      expect(reload).toHaveBeenCalledTimes(1);
      gtagScripts().forEach(s => s.remove()); delete window.dataLayer; delete window.gtag;
      const next = await fresh(); next.analytics.initAnalytics();
      expect(next.analytics.consentState()).toBe('denied'); expect(gtagScripts()).toHaveLength(0);
    } finally { write.mockRestore(); }
  });
  it('when storage and cookies both reject writes it stays disabled without reloading or SPA re-enabling', async () => {
    const { analytics } = await fresh(); analytics.initAnalytics();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    const cookie = vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});
    const reload = vi.fn();
    try {
      analytics.withdrawConsent({ reload });
      expect(reload).not.toHaveBeenCalled();
      expect(analytics.consentState()).toBe('denied');
      analytics.beforeNavigate('/terms'); analytics.initAnalytics();
      expect(window['ga-disable-G-CXTM7ZJZYX']).toBe(true);
      expect(analytics.trackBeginBooking({participants:1,pricePerPerson:250,totalPrice:250})).toBe(false);
    } finally { write.mockRestore(); cookie.mockRestore(); }
  });
  it('footer opt-out removes GA cookies and persists across reloads', async () => {
    const { analytics } = await fresh();
    const { default: Footer } = await import('../../src/components/Footer');
    const { container } = render(<Footer />);
    expect(container.textContent).toContain('כיבוי המדידה');
    cleanup();
    analytics.setConsent(true);
    document.cookie = '_ga=GA1.1.123; path=/'; document.cookie = '_ga_165V7SRZJK=GS1.1.1; path=/'; document.cookie = 'other=1; path=/';
    const reload = vi.fn();
    render(<Footer />);
    const button = screen.getByRole('button', { name: 'כיבוי המדידה (Google Analytics)' });
    expect(analytics.withdrawConsent({ reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(analytics.consentState()).toBe('denied');
    expect(document.cookie).not.toMatch(/_ga/);
    expect(document.cookie).toContain('other=1');
    expect(window['ga-disable-G-CXTM7ZJZYX']).toBe(true);
    expect(button).toBeTruthy();
    gtagScripts().forEach(s => s.remove()); delete window.dataLayer; delete window.gtag;
    const afterReload = await fresh(); afterReload.analytics.initAnalytics();
    expect(gtagScripts()).toHaveLength(0);
    document.cookie = 'other=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    delete window['ga-disable-G-CXTM7ZJZYX'];
  });
});

describe('privacy policy', () => {
  it('documents GA4, ID, cookies, opt-out link and Google as processor', () => {
    const html = readFileSync('public/privacy.html', 'utf8');
    for (const text of ['Google Analytics 4', 'G-CXTM7ZJZYX', '_ga_*', 'כיבוי המדידה (Google Analytics)', 'https://policies.google.com/privacy', 'מעבד מידע']) expect(html).toContain(text);
  });
});

describe('hosting CSP for GA4', () => {
  it('img-src allows GA collection hosts on public routes', () => {
    const headers = JSON.parse(readFileSync('firebase.hosting.booking.json', 'utf8')).hosting.headers;
    const csp = headers.find(rule => (rule.regex || rule.source) === '^[\\\\/]$').headers.find(h => h.key === 'Content-Security-Policy').value;
    expect(csp).toMatch(/img-src [^;]*https:\/\/\*\.google-analytics\.com/);
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
  it('management keeps its stricter policy', () => {
    expect(csp('^[\\\\/]manage-bookings$')).not.toMatch(/googletagmanager|google-analytics/);
  });
  it.each(['/guides/**','/videos/**'])('%s allows only public content measurement, without booking SDK connections or form submission', route => {
    expect(csp(route)).toContain("script-src 'self' https://www.googletagmanager.com;");
    expect(csp(route)).toMatch(/connect-src [^;]*https:\/\/\*\.google-analytics\.com/);
    expect(csp(route)).not.toMatch(/firebase|cloudfunctions|identitytoolkit|securetoken/);
    expect(csp(route)).toContain("form-action 'none'");
  });
});
