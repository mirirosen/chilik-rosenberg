const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:4174';
const file = process.argv[3] || 'docs/seo/runtime/performance/hydration.json';
(async () => {
  fs.mkdirSync(require('node:path').dirname(file), { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const language of ['he', 'en']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', reducedMotion: 'reduce' });
      if (language === 'en') await context.addInitScript(() => localStorage.setItem('language', 'en'));
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', e => { if (e.type() === 'error' && /hydrat|matching|React error/.test(e.text())) errors.push(e.text()); });
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== base) return route.abort();
        if (/\/assets\/(?:booking|inquiry)-index-[^/]+\.js$/.test(url.pathname)) await gate;
        return route.continue();
      });
      await page.goto(base, { waitUntil: 'commit' });
      await page.locator('.target-hero').waitFor({ state: 'visible' });
      await page.evaluate(() => { window.auditInitialHero = document.querySelector('.target-hero'); window.auditInitialNodes = [...document.querySelectorAll('#root *')]; });
      const before = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent, poster: document.querySelector('.target-hero__food').currentSrc, width: document.querySelector('.target-hero').getBoundingClientRect().width, prerender: document.getElementById('root').dataset.prerender }));
      assert.equal(before.prerender, 'he'); assert(before.width > 0);
      release();
      await page.waitForLoadState('networkidle');
      const after = await page.evaluate(() => ({ reusedHero: window.auditInitialHero === document.querySelector('.target-hero'), reusedNodes: window.auditInitialNodes.filter(node => node.isConnected).length, initialNodes: window.auditInitialNodes.length, lang: document.documentElement.lang, h1: document.querySelector('h1').textContent, deferredStyles: document.querySelectorAll('link[data-public-deferred]').length }));
      assert.equal(after.lang, language);
      assert.equal(after.reusedHero, language === 'he', 'matching SSR hydrates; saved English safely renders');
      if (language === 'he') assert(after.reusedNodes / after.initialNodes > 0.97, 'actual static node reuse');
      assert.equal(after.deferredStyles, 0);
      assert.deepEqual(errors, [], 'no hydration errors');
      await page.locator('#faq button').first().click();
      assert.equal(await page.locator('#faq button').first().getAttribute('aria-expanded'), 'true');
      results.push({ language, before, after, errors, faqWorks: true });
      await context.close();
    }
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#faq [role="region"]:visible').count(), 12, 'all FAQ answers readable without JavaScript');
    assert(await page.locator('img.target-hero__food').isVisible());
    assert.equal(await page.locator('h1').count(), 1);
    results.push({ javaScript: false, faqAnswersVisible: 12, heroVisible: true, h1s: 1 });
    await context.close();
    fs.writeFileSync(file, JSON.stringify({ status: 'passed', base, checkedAt: new Date().toISOString(), results, limits: 'No backend requests or transaction; saved English deliberately uses client rendering.' }, null, 2));
    console.log('Passed actual home hydration, raw hero before JS, saved English, FAQ interaction and no-JS FAQ visibility.');
  } finally { await browser.close(); }
})().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
