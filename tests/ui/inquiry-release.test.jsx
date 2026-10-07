import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import i18n from '../../src/inquiry-i18n';
import InquiryApp from '../../src/InquiryApp';
import { inquiryReference, inquiryRoute } from '../../src/utils/inquiryRoutes';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('Public inquiry must not request APIs'); }));
  vi.stubGlobal('matchMedia', query => ({ media: query, matches: query.includes('reduce') && !query.includes('no-preference'), addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });
  window.history.replaceState({}, '', '/');
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('approved public inquiry release', () => {
  it.each(['he', 'en'])('keeps the %s homepage manual, without booking or availability controls', async lang => {
    await i18n.changeLanguage(lang); const { container } = render(<InquiryApp />);
    expect(screen.getByRole('heading', { name: i18n.t('inquiry.title'), exact: true })).toBeTruthy();
    expect(container.querySelector('input, select, textarea, form, .date-card')).toBeNull();
    expect(screen.getByText(i18n.t('inquiry.notice'), { exact: true })).toBeTruthy();
    const contact = screen.getByRole('link', { name: i18n.t('inquiry.cta'), exact: true });
    const url = new URL(contact.href); expect(url.origin).toBe('https://wa.me'); expect(url.pathname).toBe('/972506724312');
    expect(url.searchParams.get('text')).toBe(i18n.t('inquiry.draft'));
    expect(container.querySelector('a[href="tel:0506724312"]')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(document.documentElement.dir).toBe(lang === 'he' ? 'rtl' : 'ltr');
  });

  it.each(['/booking?date=2026-10-08&participants=2', '/confirmation?id=BK-aaaaaaaaaaaaaaaaaaaa', '/booking?status=paid&bookingId=BK-aaaaaaaaaaaaaaaaaaaa', '/booking?payment=cancelled&email=private@example.invalid'])('does not infer a financial result or submit customer details at %s', async url => {
    await i18n.changeLanguage('en'); window.history.replaceState({}, '', url); const { container } = render(<InquiryApp />);
    expect(container.querySelector('input, select, textarea, form, .date-card')).toBeNull();
    expect(container.textContent).not.toContain('private@example.invalid');
    expect(screen.getByRole('link', { name: 'Contact Chilik on WhatsApp', exact: true })).toBeTruthy();
    if (!url.startsWith('/booking?date=')) expect(screen.getByText(i18n.t('inquiry.statusNotice'), { exact: true })).toBeTruthy();
    expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignores arbitrary query text and only quotes a correctly shaped reference as unverified', () => {
    expect(inquiryReference('?bookingId=BK-aaaaaaaaaaaaaaaaaaaa')).toBe('BK-aaaaaaaaaaaaaaaaaaaa');
    expect(inquiryReference('?id=<img src=x onerror=alert(1)>')).toBeNull();
    expect(inquiryReference('?email=private@example.invalid')).toBeNull();
    expect(inquiryRoute('/booking', '?success=true')).toBe('confirmation');
    expect(inquiryRoute('/admin')).toBe('not-found');
    expect(inquiryRoute('/missing')).toBe('not-found');
    expect(inquiryRoute('/%D7%AA%D7%A7%D7%A0%D7%95%D7%9F')).toBe('terms');
  });

  it('keeps legal provisions and replaces interactive payment instructions with manual arrangements', async () => {
    await i18n.changeLanguage('en'); window.history.replaceState({}, '', '/terms'); const { container } = render(<InquiryApp />);
    expect(screen.getByText(i18n.t('inquiry.paymentNotice'), { exact: true })).toBeTruthy();
    expect(container.querySelector('[lang="he"][dir="rtl"]')).toBeTruthy();
    expect(container.querySelector('input, select, textarea, form')).toBeNull();
    expect(screen.queryByRole('button', { name: /Bit|credit|bank/i })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('promises no automatic emails, reminders or post-payment confirmation on the inquiry terms page (M8)', async () => {
    await i18n.changeLanguage('he'); window.history.replaceState({}, '', '/terms'); const { container } = render(<InquiryApp />);
    for (const promise of ['מייל אישור', 'תזכורת', 'לאחר ביצוע התשלום', 'יישלחו במייל']) expect(container.textContent).not.toContain(promise);
    expect(container.textContent).toContain('האתר אינו שולח מיילים או תזכורות אוטומטיים');
    expect(container.textContent).toContain('השעה המדויקת של תחילת הסיור מתואמת אישית עם חיליק');
  });

  it('pins the hosting-only target and sends admin to preserved legacy HTML', () => {
    const config = JSON.parse(fs.readFileSync('firebase.hosting.inquiry.json', 'utf8'));
    expect(Object.keys(config)).toEqual(['hosting']); expect(config.hosting.site).toBe('hilik-site');
    expect(config.hosting.public).toBe('dist-inquiry');
    expect(config.hosting.rewrites.find(rule => rule.source === '/admin').destination).toBe('/legacy-admin.html');
    expect(config.hosting.rewrites.every(rule => !rule.function && !rule.run && !rule.pinTag)).toBe(true);
    expect(config.hosting.predeploy).toBeUndefined(); expect(config.hosting.postdeploy).toBeUndefined();
    expect(config.hosting.headers.find(rule => rule.regex && new RegExp(rule.regex).test('/admin')).headers.some(header => header.key === 'Content-Security-Policy')).toBe(false);
  });
});
