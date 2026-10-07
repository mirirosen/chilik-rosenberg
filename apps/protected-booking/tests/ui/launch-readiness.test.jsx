import React from 'react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import en from '../../src/locales/en.json';
import he from '../../src/locales/he.json';
import { applyRouteMetadata, routeFromPath } from '../../src/utils/routeMetadata';

let language = 'en';
const translate = (locale, key) => key.split('.').reduce((value, part) => value?.[part], locale) || key;
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  t: key => translate(language === 'he' ? he : en, key), i18n: { language }
}) }));
import Terms from '../../src/components/Terms';
import Footer from '../../src/components/Footer';

beforeEach(() => {
  language = 'en';
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(['he', 'en'])('gives public pages distinct %s metadata and clean canonical URLs', lang => {
  const locale = lang === 'he' ? he : en;
  const doc = document.implementation.createHTMLDocument('');
  const apply = route => applyRouteMetadata({ document: doc, route, language: lang, t: key => translate(locale, key) });
  apply('home');
  expect(doc.title).toBe(locale.seo.home.title);
  expect(doc.querySelector('link[rel=canonical]').href).toBe('https://www.chilik-tours.com/');
  apply('terms');
  expect(doc.title).toBe(locale.seo.terms.title);
  expect(doc.querySelector('meta[name=description]').content).toBe(locale.seo.terms.description);
  expect(doc.querySelector('link[rel=canonical]').href).toBe('https://www.chilik-tours.com/terms');
  expect(doc.querySelector('meta[property="og:locale"]').content).toBe(lang === 'he' ? 'he_IL' : 'en_GB');
  expect(doc.querySelector('meta[name=robots]').content).toBe('index, follow');
});

it.each(['/admin', '/booking', '/confirmation', '/nonexistent'])('removes public canonical on private/result/unknown route %s', pathname => {
  const doc = document.implementation.createHTMLDocument('');
  const apply = route => applyRouteMetadata({ document: doc, route, language: 'en', t: key => translate(en, key) });
  apply('home');
  apply(routeFromPath(pathname));
  expect(doc.querySelector('meta[name=robots]').content).toBe('noindex, nofollow');
  expect(doc.querySelector('link[rel=canonical]')).toBeNull();
  expect(doc.querySelector('meta[property="og:url"]')).toBeNull();
  expect(doc.title).not.toBe(en.seo.home.title);
  apply('home');
  expect(doc.querySelector('link[rel=canonical]').href).toBe('https://www.chilik-tours.com/');
});

it('keeps every preprod page unindexed without a public canonical', () => {
  const doc = document.implementation.createHTMLDocument('');
  for (const route of ['home','terms','booking','confirmation','admin','not-found']) {
    applyRouteMetadata({ document: doc, route, language: 'en', isPreprod: true, t: key => translate(en, key) });
    expect(doc.querySelector('meta[name=robots]').content).toBe('noindex, nofollow');
    expect(doc.querySelector('link[rel=canonical]')).toBeNull();
  }
});

it('localizes ordinary Terms controls while explicitly retaining the Hebrew policy', () => {
  const { container } = render(<Terms />);
  expect(container.firstChild.getAttribute('dir')).toBe('ltr');
  expect(screen.getByText(en.terms.ui.languageNotice)).toBeTruthy();
  expect(screen.getByRole('heading', { name: '1. General' })).toBeTruthy();
  expect(screen.getByRole('button', { name: en.terms.ui.register })).toBeTruthy();
  expect(screen.getByRole('link', { name: en.terms.section7.whatsapp })).toBeTruthy();
  expect(container.querySelectorAll('section[lang="he"][dir="rtl"]')).toHaveLength(4);
  expect(screen.getByText('ביטול עד 7 ימים לפני מועד הסיור - החזר כספי מלא (100%) ✓')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: en.terms.backToTop }));
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  fireEvent.click(screen.getByRole('button', { name: /Credit Card.*Click for payment details/ }));
  expect(screen.getAllByRole('button', { name: en.common.close, exact: true })).toHaveLength(2);
});

it('keeps approved contact destinations in Terms and Footer with English address labels', () => {
  const { container } = render(<><Terms /><Footer /></>);
  for (const link of container.querySelectorAll('a[href^="tel:"]')) expect(link.getAttribute('href')).toBe('tel:0506724312');
  for (const link of container.querySelectorAll('a[href^="https://wa.me/"]')) expect(new URL(link.href).pathname).toBe('/972506724312');
  expect(container.textContent).toContain(en.footer.address);
  expect(container.textContent).not.toContain('0505804367');
});

it('keeps the original Hebrew policy provisions unchanged after trailing-whitespace cleanup except language attributes', () => {
  const source = readFileSync('src/components/Terms.jsx','utf8');
  // Hashes of the unchanged integrated-source policy blocks after trailing-whitespace cleanup. This fixture
  // protects copy without depending on the author's Windows source path.
  for (const [from,to,hash] of [
    ['AGE RESTRICTION - PROMINENT WARNING','Section 1: כללי','5ae90d5cff9a1a7e528eb17efe9aa87163187193a83bf71e5b3687a4fdf47cdb'],
    ['Section 3: מדיניות ביטול רכישה','Section 6: פרטיות','2c93cab6fff60848fbde18ca0a9683c4ce6672a826bd5d9443c83627400ca077']
  ]) {
    const block = text => text.slice(text.indexOf('{/* '+from),text.indexOf('{/* '+to)).replaceAll('<section lang="he" dir="rtl" ', '<section ');
    expect(createHash('sha256').update(block(source)).digest('hex')).toBe(hash);
  }
});
