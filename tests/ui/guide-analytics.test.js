import { beforeEach, afterEach, it, expect, vi } from 'vitest';

const scripts = () => document.querySelectorAll('script[src^="https://www.googletagmanager.com/gtag/js"]');
beforeEach(() => {
  document.documentElement.lang = 'he';
  vi.resetModules(); vi.stubEnv('MODE', 'booking'); vi.stubEnv('VITE_GA4_MEASUREMENT_ID', '');
  localStorage.clear(); document.cookie = 'chilik-analytics-opt-out=; Max-Age=0; path=/';
  scripts().forEach(s => s.remove()); delete window.gtag; delete window.dataLayer;
  document.body.innerHTML = '<a href="https://wa.me/972506724312">Contact</a><button id="analytics-opt-out" hidden>Turn off analytics</button>';
});
afterEach(() => vi.unstubAllEnvs());

it('uses the rendered English guide language and excludes private message text from contact measurement', async () => {
  document.documentElement.lang = 'en';
  const contact = document.querySelector('a');
  contact.href += '?text=message-not-for-analytics'; contact.dataset.contactContext = 'private_tour';
  contact.addEventListener('click', e => e.preventDefault());
  await import('../../src/guideAnalytics.js'); contact.click();
  const event = window.dataLayer.find(e => e[0] === 'event');
  expect(event[2]).toEqual({ page_language: 'en', contact_context: 'private_tour', link_url: 'https://wa.me/972506724312' });
});

it('measures static guides in the same owner-controlled property and exposes opt-out', async () => {
  await import('../../src/guideAnalytics.js');
  expect(scripts()).toHaveLength(1);
  expect(scripts()[0].src).toContain('G-CXTM7ZJZYX');
  expect(document.querySelector('#analytics-opt-out').hidden).toBe(false);
  const contact = document.querySelector('a');
  contact.addEventListener('click', e => e.preventDefault()); contact.click();
  expect(window.dataLayer.filter(e => e[0] === 'event').map(e => e[1])).toEqual(['whatsapp_click']);
});

it('a saved refusal prevents measurement and hides opt-out on a static guide', async () => {
  localStorage.setItem('chilik-analytics-consent', 'denied');
  await import('../../src/guideAnalytics.js');
  expect(scripts()).toHaveLength(0); expect(window.dataLayer).toBeUndefined();
  expect(document.querySelector('#analytics-opt-out').hidden).toBe(true);
});

it.each(['inquiry', 'booking-demo', 'preprod'])('%s never starts guide measurement', async mode => {
  vi.stubEnv('MODE', mode);
  await import('../../src/guideAnalytics.js');
  expect(scripts()).toHaveLength(0); expect(window.dataLayer).toBeUndefined();
});
