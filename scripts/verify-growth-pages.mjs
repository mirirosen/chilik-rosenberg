import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { growthPages } from '../src/data/growthPages.js';
import { siteOrigin } from '../src/data/organicContent.js';

export function verifyGrowthPages({ out, mode }) {
  const paths = growthPages.map(page => page.path);
  for (const page of growthPages) {
    const dom = new JSDOM(fs.readFileSync(path.join(out, page.path.slice(1)), 'utf8'), { url: siteOrigin + page.path });
    const doc = dom.window.document;
    assert.equal(doc.querySelectorAll('h1').length, 1, page.path + ' single heading');
    assert.equal(doc.querySelector('link[rel=canonical]').href, siteOrigin + page.path);
    assert.equal(doc.documentElement.lang, 'he');
    assert.equal(doc.documentElement.dir, 'rtl');
    assert.match(doc.querySelector('meta[name=robots]').content, /^index, follow/);
    assert(doc.querySelector('main').textContent.includes(page.intro));
    const graph = JSON.parse(doc.querySelector('#organic-schema').textContent)['@graph'];
    const visible = [...doc.querySelectorAll('[data-question]')].map(item => ({ question: item.querySelector('summary').textContent, answer: item.querySelector('[data-answer]').textContent }));
    const structured = graph.find(node => node['@type'] === 'FAQPage').mainEntity.map(item => ({ question: item.name, answer: item.acceptedAnswer.text }));
    assert.deepEqual(structured, visible, page.path + ' answer parity');
    const modules = [...doc.querySelectorAll('script[type=module]')];
    assert.equal(modules.length, mode === 'booking' ? 1 : 0);
    for (const node of modules) assert(fs.existsSync(path.join(out, node.getAttribute('src').slice(1))));
    if (mode === 'booking') assert(doc.getElementById('analytics-opt-out').hidden);
    const primary = [...doc.querySelectorAll('.guide-cta__button')];
    assert(primary.length >= 2);
    for (const item of primary) assert.equal(item.getAttribute('href'), page.primaryAction === 'lecture' ? 'https://wa.me/972506724312' : '/#date-selection');
    if (page.primaryAction === 'lecture') assert(!('offers' in graph.find(node => node['@type'] === 'Service')));
    for (const item of doc.querySelectorAll('a[href]')) {
      const url = new URL(item.href);
      if (url.origin !== siteOrigin) continue;
      if (url.pathname === page.path && url.hash) assert(doc.getElementById(url.hash.slice(1)));
      const file = ({ '/': 'index.html', '/en': 'en.html', '/terms': 'terms.html' })[url.pathname] || url.pathname.slice(1);
      assert(fs.existsSync(path.join(out, file)), page.path + ' broken link ' + url.pathname);
    }
    dom.window.close();
  }
  // Discoverability must exist in real initial HTML in each public edition.
  for (const file of ['index.html', ...(mode === 'booking' ? ['en.html'] : [])]) {
    const dom = new JSDOM(fs.readFileSync(path.join(out, file), 'utf8'));
    for (const route of paths) assert(dom.window.document.querySelector('a[href="' + route + '"]'), file + ' discovers ' + route);
    dom.window.close();
  }
  console.log('Passed four growth pages: initial HTML, six question topics, canonical, answer/schema parity, actions, links and public discovery.');
}
