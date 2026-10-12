// QA runner uses the declared project browser dependency; no user data.
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const base = `http://127.0.0.1:${process.argv[2] || '4173'}`;
const guides = ['/guides/bnei-brak-food-tour.html', '/guides/private-tour-bnei-brak.html', '/guides/bnei-brak-food-tour-en.html'];
(async () => {
  fs.mkdirSync('docs/seo/runtime', { recursive: true });
  const httpResults = [];
  for (const route of ['terms', 'booking', 'confirmation', 'manage-bookings']) {
    const response = await fetch(`${base}/${route}.html`, { redirect: 'manual' });
    assert.equal(response.status, 301); assert.equal(response.headers.get('location'), '/' + route);
    const target = await fetch(base + response.headers.get('location'));
    if (route !== 'terms') { assert.match(target.headers.get('x-robots-tag'), /noindex/); assert.equal(target.headers.get('referrer-policy'), 'no-referrer'); assert.equal(target.headers.get('cache-control'), 'no-store'); }
    assert(target.headers.get('content-security-policy'));
    httpResults.push({ alias: '/' + route + '.html', status: 301, target: '/' + route, protectionsPreserved: true });
  }
  for (const route of ['/', '/terms', '/booking', '/confirmation', '/manage-bookings', ...guides, '/missing-seo-audit']) {
    const response = await fetch(base + route);
    const html = await response.text();
    assert.equal(response.status, route === '/missing-seo-audit' ? 404 : 200);
    if (['/booking', '/confirmation', '/manage-bookings'].includes(route)) {
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      assert(!html.includes('rel="canonical"'));
      assert(!html.includes('application/ld+json'));
    }
    httpResults.push({ route, status: response.status, robots: response.headers.get('x-robots-tag') });
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const raw = new JSDOM(await (await fetch(base)).text()).window.document;
  const expected = { title: raw.title, description: raw.querySelector('meta[name="description"]').content, robots: raw.querySelector('meta[name="robots"]').content, h1: raw.querySelector('h1').textContent };
  const results = [];
  try {
    for (const locale of ['en-US', 'he-IL']) {
      const context = await browser.newContext({ locale, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      await page.goto(base, { waitUntil: 'networkidle' });
      const language = await page.evaluate(() => document.documentElement.lang);
      assert.equal(language, 'he', 'canonical root default must not depend on browser locale');
      const head = await page.evaluate(() => ({ title: document.title, description: document.querySelector('meta[name="description"]').content, robots: document.querySelector('meta[name="robots"]').content, h1: document.querySelector('h1').textContent }));
      assert.deepEqual(head, expected, 'raw/rendered metadata and H1 parity');
      results.push({ locale, freshStorage: true, canonicalDefault: language, rawRenderedParity: true });
      await context.close();
    }
    for (const js of [false, true]) for (const language of js ? ['he', 'en'] : ['he']) {
      const context = await browser.newContext({ javaScriptEnabled: js, locale: language === 'he' ? 'he-IL' : 'en-GB', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      // Availability/Auth requests are blocked intentionally: checkout is not exercised.
      await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      if (js) await page.addInitScript(lang => localStorage.setItem('language', lang), language);
      await page.goto(base, { waitUntil: 'networkidle' });
      const home = await page.evaluate(() => {
        const graph = JSON.parse(document.querySelector('#organic-schema').textContent)['@graph'];
        const faq = graph.find(n => n['@type'] === 'FAQPage');
        return { title: document.title, lang: document.documentElement.lang, h1s: document.querySelectorAll('h1').length, overflow: document.documentElement.scrollWidth > innerWidth, answers: faq.mainEntity.map(n => n.acceptedAnswer.text), text: document.body.textContent, canonical: document.querySelector('link[rel="canonical"]').href };
      });
      assert.equal(home.h1s, 1); assert.equal(home.overflow, false); assert.equal(home.answers.length, 12);
      for (const answer of home.answers) assert(home.text.includes(answer), 'FAQ/schema parity after JavaScript');
      assert.equal(home.canonical, 'https://www.chilik-tours.com/');
      if (js) {
        assert.equal(home.lang, language);
        await page.locator('#tour-overview').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `docs/seo/runtime/candidate-mobile-${language}.png` });
        const question = page.locator('#faq button').first();
        await question.click();
        assert.equal(await question.getAttribute('aria-expanded'), 'true');
        const answerId = await question.getAttribute('aria-controls');
        assert(await page.locator('#' + answerId).isVisible());
      } else await page.screenshot({ path: 'docs/seo/runtime/candidate-no-js.png' });
      for (const route of ['/terms', '/booking', '/confirmation', '/manage-bookings']) {
        await page.goto(base + route, { waitUntil: 'networkidle' });
        const metadata = await page.evaluate(() => ({ canonical: document.querySelector('link[rel="canonical"]')?.href, schema: !!document.querySelector('#organic-schema'), robots: document.querySelector('meta[name="robots"]')?.content, text: document.body.textContent }));
        assert.equal(metadata.schema, false);
        if (route === '/terms') assert.equal(metadata.canonical, 'https://www.chilik-tours.com/terms');
        else { assert.equal(metadata.canonical, undefined); assert.match(metadata.robots, /noindex/); }
      }
      results.push({ js, language, title: home.title, faqParity: true, noOverflow: true, errors });
      await context.close();
    }
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      for (const guide of guides) {
        await page.goto(base + guide, { waitUntil: 'networkidle' });
        const result = await page.evaluate(() => ({ h1s: document.querySelectorAll('h1').length, overflow: document.documentElement.scrollWidth > innerWidth, lang: document.documentElement.lang, canonical: document.querySelector('link[rel="canonical"]').href }));
        assert.equal(result.h1s, 1); assert.equal(result.overflow, false);
        assert.equal(result.canonical, 'https://www.chilik-tours.com' + guide);
        results.push({ guide, width, ...result });
      }
      await page.close();
    }
    fs.writeFileSync('docs/seo/runtime/candidate-browser.json', JSON.stringify({ status: 'passed', httpResults, results, limits: 'Local Hosting approximation; external availability/auth blocked; no checkout transaction or deployed verification.' }, null, 2));
    console.log('Passed: raw HTTP and privacy shells; JavaScript/no-JS home; 12 FAQ/schema answers in HE/EN; FAQ interaction; private/legal routes; 3 guides at 390/1440px.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
