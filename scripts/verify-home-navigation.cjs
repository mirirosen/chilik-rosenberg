const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:4174';
const file = process.argv[3] || 'docs/seo/runtime/performance/navigation.json';
(async () => {
  fs.mkdirSync(require('node:path').dirname(file), { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), results = [];
  try {
    for (const [language, width] of [['he', 390], ['he', 1440], ['en', 390], ['en', 1440]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.addInitScript(lang => localStorage.setItem('language', lang), language);
      const page = await context.newPage();
      await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      for (const id of ['journey', 'menu', 'videos', 'lectures', 'about', 'media', 'faq']) {
        await page.goto(base + '/#' + id, { waitUntil: 'networkidle' });
        const result = await page.locator('#' + id).evaluate(element => {
          const heading = element.querySelector('h2'), header = document.querySelector('.main-header');
          const rect = heading.getBoundingClientRect();
          return { headingTop: rect.top, headingBottom: rect.bottom, headerBottom: header.getBoundingClientRect().bottom, viewport: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth, text: heading.textContent };
        });
        assert(result.headingTop >= result.headerBottom - 2 && result.headingBottom < result.viewport, id + ' heading reachable');
        assert.equal(result.overflow, false);
        results.push({ language, width, id, ...result });
      }
      // Navigate with the existing fixed header after arriving at the bottom.
      if (width === 390) await page.locator('.mobile-menu-trigger').click();
      await page.locator(width === 390 ? '.mobile-navigation a[href="/#menu"]' : '.main-header a[href="/#menu"]').click();
      const menuTop = await page.locator('#menu h2').evaluate(node => node.getBoundingClientRect().top);
      const headerBottom = await page.locator('.main-header').evaluate(node => node.getBoundingClientRect().bottom);
      assert(menuTop >= headerBottom - 2 && menuTop < 900, 'arrival from an already scrolled page');
      await page.locator(width === 390 ? '.mobile-header-cta' : '.main-header .header-cta').click();
      await page.waitForFunction(() => document.activeElement?.id === 'inquiry-title');
      results.push({ language, width, alreadyScrolledMenuArrival: true, inquiryHeadingFocused: true });
      await context.close();
    }
    fs.writeFileSync(file, JSON.stringify({ status: 'passed', checkedAt: new Date().toISOString(), base, results, limits: 'Fresh hash navigation, no external backend requests or customer mutation.' }, null, 2));
    console.log('Passed 28 hash arrivals in all language/viewport combinations, 4 scrolled-page arrivals and 4 CTA focus arrivals.');
  } finally { await browser.close(); }
})().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
