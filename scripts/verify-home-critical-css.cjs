const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:4174';
const label = process.argv[3] || 'full-styles';
(async () => {
  fs.mkdirSync('docs/seo/runtime/performance', { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), results = [];
  try {
    for (const language of ['he','en']) for (const width of [360,390,768,1024,1440,1920]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      await context.addInitScript(language => localStorage.setItem('language', language), language);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const publicCssRequests = [];
      page.on('request', request => { if (/\/assets\/(?:booking|inquiry)-index-[^/]+\.css$/.test(new URL(request.url()).pathname)) publicCssRequests.push(request.url()); });
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== base) return route.abort();
        return route.continue();
      });
      await page.goto(base, { waitUntil: 'commit' });
      await page.waitForFunction(() => document.querySelector('.target-hero__food')?.complete);
      await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 10000 });
      const { hero } = JSON.parse(fs.readFileSync(`src/locales/${language}.json`));
      const expectedTitle = `${hero.keyword} ${hero.title}`;
      await page.waitForFunction(expected => document.querySelector('.target-hero h1')?.textContent === expected, expectedTitle);
      assert.equal(publicCssRequests.length, 0, 'public CSS requires no separate network request');
      const inline = await page.locator('style[data-public-styles]').evaluate(style => ({ text: style.textContent, href: style.dataset.cssHref }));
      const complete = await (await fetch(base + inline.href)).text();
      assert.equal(inline.text, complete, 'every bundled style is delivered inline');
      const snapshot = () => page.evaluate(() => [...document.querySelectorAll('.main-header,.main-header *, .target-hero,.target-hero *, .target-intro,.target-intro *, .mobile-navigation[open], .mobile-navigation[open] *')].map(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
        // Bounding rectangles cover spacing. Chromium can serialize used auto
        // margins as 0 before a style swap and as resolved pixels afterwards,
        // even with identical rectangles; do not mistake that for a reflow.
        return { tag: node.tagName, class: node.getAttribute('class'), rect: [rect.x, rect.y, rect.width, rect.height], styles: ['display','position','fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','padding','borderRadius','objectFit','overflow','transform'].map(key => style[key]) };
      }));
      const before = await snapshot();
      await page.screenshot({ path: `docs/seo/runtime/performance/${label}-${language}-${width}-before.png` });
      let menuBefore;
      if (width < 1280) {
        await page.locator('.mobile-menu-trigger').click();
        await page.waitForFunction(() => document.querySelector('.mobile-navigation').open);
        menuBefore = await snapshot();
        await page.screenshot({ path: `docs/seo/runtime/performance/${label}-${language}-${width}-menu-before.png` });
      }
      // Swap to the actual complete external bundle as a reference. This would
      // fail if the inline build omitted LTR, responsive or interactive rules.
      await page.evaluate(href => new Promise((resolve, reject) => {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
        link.onload = () => { document.querySelector('style[data-public-styles]').remove(); resolve(); };
        link.onerror = reject; document.head.append(link);
      }), inline.href);
      await page.waitForLoadState('networkidle');
      assert.equal(publicCssRequests.length, 1, 'external reference was actually loaded');
      if (menuBefore) assert.deepEqual(await snapshot(), menuBefore, 'open menu and first viewport unchanged by full CSS');
      if (menuBefore) await page.locator('.mobile-navigation__close').click();
      const after = await snapshot();
      await page.screenshot({ path: `docs/seo/runtime/performance/${label}-${language}-${width}-after.png` });
      fs.writeFileSync(`docs/seo/runtime/performance/${label}-${language}-${width}-geometry.json`, JSON.stringify({ before, after }, null, 2));
      assert.deepEqual(after, before, 'first viewport geometry and design identical before and after full CSS');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      // A broken-CSS negative control must change the sampled geometry/styles.
      await page.locator(`link[href="${inline.href}"]`).evaluate(node => node.remove());
      assert.notDeepEqual(await snapshot(), after, 'negative control detects missing public styles');
      results.push({ language, width, checkedElements: before.length, completeCssByteParity: true, zeroInitialCssRequests: true, externalReferenceParity: true, missingCssNegativeControl: true, earlyMenuWorks: !!menuBefore, errors });
      await context.close();
    }
    fs.writeFileSync(`docs/seo/runtime/performance/${label}.json`, JSON.stringify({ status: 'passed', base, browser: browser.version(), checkedAt: new Date().toISOString(), results, limits: 'Inline complete bundle compared byte-for-byte and geometrically to actual external reference, with missing-CSS negative control. External backend blocked; no customer mutation.' }, null, 2));
    console.log('Passed complete CSS bytes, zero initial CSS requests, external-reference geometry and missing-CSS negative control in HE/EN at six widths.');
  } finally { await browser.close(); }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
