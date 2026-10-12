// Check cancellation while the real compiled main picker chunk is still loading.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.argv[2] || 'http://127.0.0.1:4174';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base) return route.abort();
      if (/\/BookingSection-[^/]+\.js$/.test(url.pathname)) await gate;
      return route.continue();
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    assert(await page.locator('body').evaluate(node => node.classList.contains('booking-edition')));
    assert.equal(await page.locator('#inquiry-title').count(), 0, 'actual picker not yet mounted');
    const requested = page.waitForRequest(/\/BookingSection-[^/]+\.js$/);
    await page.locator('.main-header .header-cta').click();
    await requested;
    await page.locator('.main-header a[href="/#menu"]').click();
    release();
    await page.locator('#inquiry-title').waitFor({ state: 'attached' });
    await page.waitForFunction(() => {
      const top = document.querySelector('#menu h2').getBoundingClientRect().top;
      return top >= document.querySelector('.main-header').getBoundingClientRect().bottom - 2 && top < innerHeight;
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.notEqual(await page.evaluate(() => document.activeElement?.id), 'inquiry-title', 'cancelled arrival cannot steal focus after lazy load');
    await page.locator('.main-header .header-cta').click();
    await page.waitForFunction(() => document.activeElement?.id === 'inquiry-title');
    fs.mkdirSync('docs/seo/runtime/performance', { recursive: true });
    fs.writeFileSync('docs/seo/runtime/performance/booking-intent.json', JSON.stringify({ status: 'passed', base, checkedAt: new Date().toISOString(), actualPickerLazyRequest: true, earlyCtaLoadsPicker: true, replacementNavigationCancelsFocus: true, subsequentCtaFocusesActualHeading: true, limits: 'Real compiled retained main picker, held local JS request, external traffic blocked; no customer mutation.' }, null, 2));
    console.log('Passed early booking CTA, actual lazy picker load, cancellation without focus theft and subsequent CTA focus.');
    await context.close();
  } finally { release(); await browser.close(); }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
