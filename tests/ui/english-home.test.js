import { describe, it, expect, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
import { applyRouteMetadata } from '../../src/utils/routeMetadata';
import { inquiryRoute } from '../../src/utils/inquiryRoutes';
import { organicSeoPlugin, sitemapPaths, sitemapLastmod } from '../../scripts/organic-html.mjs';

const template = '<!doctype html><html lang="he" dir="rtl"><head><title>old</title></head><body><div id="root"></div></body></html>';
const translate = resources => key => key.split('.').reduce((value, part) => value[part], resources);
afterEach(() => { document.head.innerHTML = ''; });

describe('indexable English homepage (/en)', () => {
  it('booking site: English home has its own canonical and schema URL; Hebrew stays at /', () => {
    applyRouteMetadata({ route: 'home', language: 'en', t: translate(en), englishHome: true, isPreprod: false });
    expect(document.querySelector('link[rel="canonical"]').href).toBe('https://www.chilik-tours.com/en');
    expect(document.querySelector('meta[property="og:url"]').content).toBe('https://www.chilik-tours.com/en');
    const graph = JSON.parse(document.querySelector('#organic-schema').textContent)['@graph'];
    expect(graph.find(n => n['@type'] === 'WebPage').url).toBe('https://www.chilik-tours.com/en');
    applyRouteMetadata({ route: 'home', language: 'he', t: translate(he), englishHome: true, isPreprod: false });
    expect(document.querySelector('link[rel="canonical"]').href).toBe('https://www.chilik-tours.com/');
  });
  it('inquiry site (no /en page) keeps the single / canonical', () => {
    applyRouteMetadata({ route: 'home', language: 'en', t: translate(en), isPreprod: false });
    expect(document.querySelector('link[rel="canonical"]').href).toBe('https://www.chilik-tours.com/');
  });
  it('/en routes to the homepage', () => {
    expect(inquiryRoute('/en')).toBe('home');
    expect(inquiryRoute('/english')).toBe('not-found');
  });
  it('booking home HTML declares he, en and x-default alternates; inquiry declares none', () => {
    const booking = new JSDOM(organicSeoPlugin('booking').transformIndexHtml(template)).window.document;
    expect([...booking.querySelectorAll('link[hreflang]')].map(l => `${l.hreflang} ${l.href}`)).toEqual(['he https://www.chilik-tours.com/', 'en https://www.chilik-tours.com/en', 'x-default https://www.chilik-tours.com/']);
    const inquiry = new JSDOM(organicSeoPlugin('inquiry').transformIndexHtml(template)).window.document;
    expect(inquiry.querySelectorAll('link[hreflang]')).toHaveLength(0);
  });
  it('sitemap lists /en for the booking site only, with a real lastmod date', () => {
    expect(sitemapPaths('booking')).toContain('/en');
    expect(sitemapPaths('inquiry')).not.toContain('/en');
    expect(sitemapLastmod()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
