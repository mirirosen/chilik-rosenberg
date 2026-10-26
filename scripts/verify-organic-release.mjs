import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { guidePaths, siteOrigin } from '../src/data/organicContent.js';
import { faqsFor } from './organic-html.mjs';
const mode = process.argv[2] || 'booking';
const out = path.resolve(`dist-${mode}`);
const config = JSON.parse(fs.readFileSync(`firebase.hosting.${mode}.json`, 'utf8')).hosting;
fs.mkdirSync('docs/seo/runtime', { recursive: true });
const results = [];
assert.equal(fs.existsSync(path.join(out, '.vite/manifest.json')), false, 'internal SSR map is never deployable');
const price = Number(fs.readFileSync('functions/src/booking-core.js', 'utf8').match(/const PRICE_PER_PERSON = (\d+);/)[1]);
for (const file of ['index.html', ...guidePaths.map(p => p.slice(1)), 'terms.html', 'booking.html', 'confirmation.html', ...(mode === 'booking' ? ['manage-bookings.html'] : [])]) {
  const dom = new JSDOM(fs.readFileSync(path.join(out, file), 'utf8'), { url: siteOrigin + '/' + file });
  const doc = dom.window.document;
  if (file === 'index.html') {
    const style = doc.querySelector('style[data-public-styles][data-css-href]');
    assert(style, 'complete inline public CSS');
    assert.match(style.dataset.cssHref, /^\/assets\/[A-Za-z0-9_-]+\.css$/);
    assert.equal(style.textContent, fs.readFileSync(path.join(out, style.dataset.cssHref.slice(1)), 'utf8'), 'inline CSS equals complete bundle');
    assert.equal(doc.querySelectorAll('link[rel="stylesheet"],link[data-public-deferred],script[src="/public-style-loader.js"]').length, 0, 'no public style activation dependency');
    const imageHints = [...doc.querySelectorAll('link[rel="preload"][as="image"]')];
    assert.equal(imageHints.length, 2, 'two mutually exclusive viewport poster hints');
    assert.equal(imageHints[0].getAttribute('href'), doc.querySelector('picture source[media]').getAttribute('srcset'));
    assert.equal(imageHints[1].getAttribute('href'), doc.querySelector('img.target-hero__food').getAttribute('src'));
  }
  const privateRoute = /^(booking|confirmation|manage-bookings)\.html$/.test(file);
  assert.equal(doc.querySelectorAll('h1').length, 1, file + ' h1');
  assert(doc.title.trim());
  if (privateRoute) {
    assert.match(doc.querySelector('meta[name="robots"]').content, /noindex/);
    assert.equal(doc.querySelector('link[rel="canonical"]'), null);
    assert.equal(doc.querySelector('#organic-schema'), null);
  } else {
    assert(doc.querySelector('meta[name="description"]').content.trim());
    assert.equal(doc.querySelector('link[rel="canonical"]').href, siteOrigin + (file === 'index.html' ? '/' : file === 'terms.html' ? '/terms' : '/' + file));
  }
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) JSON.parse(script.textContent);
  if (file.startsWith('guides/')) {
    const graph = JSON.parse(doc.querySelector('#organic-schema').textContent)['@graph'];
    const faq = graph.find(node => node['@type'] === 'FAQPage');
    assert(faq && faq.mainEntity.length >= 6, file + ' planning FAQ');
    const visible = [...doc.querySelectorAll('#guide-faq section')].map(section => ({ question: section.querySelector('h3').textContent, answer: section.querySelector('p').textContent }));
    assert.deepEqual(faq.mainEntity.map(question => ({ question: question.name, answer: question.acceptedAnswer.text })), visible, file + ' FAQ/schema parity');
    assert.equal(doc.querySelector('header.guide-header > a.guide-header__brand')?.getAttribute('href'), '/', file + ' brand header links home');
    const ctas = [...doc.querySelectorAll('a.guide-cta__button')];
    assert(doc.querySelector('header.guide-header a.guide-cta__button') && doc.querySelector('main .guide-cta a.guide-cta__button'), file + ' booking CTA at top and end');
    for (const cta of ctas) assert.equal(cta.getAttribute('href'), '/#date-selection', file + ' booking CTA destination');
  }
  const quotedPrices = [...doc.querySelector('main').textContent.matchAll(/(\d+)\s*(?:ש״ח|₪)|₪\s*(\d+)/g)].map(match => Number(match[1] || match[2]));
  for (const quotedPrice of quotedPrices) assert.equal(quotedPrice, price, `${file}: published price diverged from confirmed server price`);
  for (const link of doc.querySelectorAll('a[href]')) {
    const url = new URL(link.href);
    if (url.origin !== siteOrigin) continue;
    const route = config.rewrites.find(rule => rule.source === url.pathname);
    const target = route?.destination.slice(1) || (url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    assert(fs.existsSync(path.join(out, target)), `${file} broken link ${url.pathname}`);
  }
  if (file === 'index.html') {
    const faq = JSON.parse(doc.querySelector('#organic-schema').textContent)['@graph'].find(n => n['@type'] === 'FAQPage');
    assert.deepEqual(faq.mainEntity.map(n => n.acceptedAnswer.text), Object.values(faqsFor('he', mode === 'booking')).map(n => n.answer));
    for (const item of faq.mainEntity) assert(doc.querySelector('#root').textContent.includes(item.acceptedAnswer.text));
  }
  const alternates = [...doc.querySelectorAll('link[hreflang]')];
  for (const alt of alternates) {
    const otherFile = new URL(alt.href).pathname.slice(1);
    const other = new JSDOM(fs.readFileSync(path.join(out, otherFile), 'utf8'));
    assert(other.window.document.querySelector(`link[hreflang="${doc.documentElement.lang}"][href="${siteOrigin}/${file}"]`), 'reciprocal hreflang');
    other.window.close();
  }
  results.push({ file, title: doc.title, private: privateRoute, h1: doc.querySelector('h1').textContent, schemas: doc.querySelectorAll('script[type="application/ld+json"]').length });
  dom.window.close();
}
const xml = new JSDOM(fs.readFileSync(path.join(out, 'sitemap.xml'), 'utf8'), { contentType: 'application/xml' });
const urls = [...xml.window.document.querySelectorAll('loc')].map(n => n.textContent);
assert.deepEqual(urls, ['/', '/terms', ...guidePaths].map(p => siteOrigin + p));
for (const route of ['terms', 'booking', 'confirmation', ...(mode === 'booking' ? ['manage-bookings'] : [])]) assert.equal(config.rewrites.find(r => r.source === '/' + route)?.destination, '/' + route + '.html');
xml.window.close();
fs.writeFileSync(`docs/seo/runtime/verified-${mode}.json`, JSON.stringify({ results, sitemap: urls, status: 'passed' }, null, 2));
console.log(`Passed ${results.length} initial-HTML pages: metadata, text/FAQ parity, schema JSON, links, hreflang, private shells and sitemap.`);
