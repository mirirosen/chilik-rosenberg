import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { assertPublicInquiryHtml } from './public-inquiry-gate.mjs';

fs.mkdirSync('docs/seo/runtime/performance', { recursive: true });
const inquiry = fs.readFileSync('dist-inquiry/index.html', 'utf8');
const demo = fs.readFileSync('dist-booking-demo/index.html', 'utf8');
assertPublicInquiryHtml(inquiry);
assert.throws(() => assertPublicInquiryHtml(demo), /Preprod or non-inquiry/);
const stripped = new JSDOM(demo);
stripped.window.document.querySelectorAll('meta[name="robots"],meta[http-equiv="Content-Security-Policy"],.preprod-banner').forEach(node => node.remove());
assert.throws(() => assertPublicInquiryHtml(stripped.serialize()), /Preprod or non-inquiry/, 'stripping isolation metas cannot disguise the actual demo entry');
stripped.window.close();
assert.throws(() => assertPublicInquiryHtml(inquiry.replace('</body>', '<div class="preprod-banner"></div></body>')), /Preprod/);
let shells = 0;
for (const mode of ['booking', 'inquiry']) {
  const home = new JSDOM(fs.readFileSync(`dist-${mode}/index.html`, 'utf8'));
  const root = home.window.document.getElementById('root');
  const entry = home.window.document.querySelector('script[type="module"][src]');
  assert.equal(entry.parentElement, home.window.document.body);
  assert(root.compareDocumentPosition(entry) & home.window.Node.DOCUMENT_POSITION_FOLLOWING, 'root precedes async execution, including cache hits');
  assert.equal(entry.hasAttribute('async'), true);
  assert.equal(home.window.document.querySelectorAll('link[data-public-deferred],script[src="/public-style-loader.js"]').length, 0);
  assert(home.window.document.querySelector('style[data-public-styles][data-css-href]'), 'all public styles delivered in HTML');
  home.window.close();
  for (const route of ['terms','booking','confirmation', ...(mode === 'booking' ? ['manage-bookings'] : [])]) {
    const dom = new JSDOM(fs.readFileSync(`dist-${mode}/${route}.html`, 'utf8'));
    const doc = dom.window.document;
    assert.equal(doc.getElementById('root').hasAttribute('data-prerender'), false);
    assert.equal(doc.querySelectorAll('style[data-public-styles],link[data-public-deferred],script[src="/public-style-loader.js"]').length, 0);
    assert.equal(doc.querySelectorAll('[fetchpriority="low"],script[type="module"][async]').length, 0, 'private scheduling restored');
    assert.equal(doc.querySelectorAll('link[rel="preload"][as="image"]').length, 0, 'private pages do not fetch home posters');
    assert(doc.querySelector('link[rel="stylesheet"][media="all"]'), 'cached complete stylesheet in client-rendered shell');
    dom.window.close(); shells++;
  }
}
fs.writeFileSync('docs/seo/runtime/performance/build-boundaries.json', JSON.stringify({ checkedAt: new Date().toISOString(), status: 'passed', shells, inquiryAccepted: true, genuineDemoRejected: true, strippedDemoRejected: true, bannerRejected: true }, null, 2));
console.log('Passed real public inquiry/demo controls, stripped demo rejection and seven isolated full-style shells.');
