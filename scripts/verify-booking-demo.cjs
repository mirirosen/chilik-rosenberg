// Exercise the built demo through its real handlers; external traffic is blocked.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const root = path.resolve('dist-booking-demo');
const copy = JSON.parse(fs.readFileSync('apps/protected-booking/src/locales/en.json', 'utf8'));
const server = http.createServer((req, res) => {
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, (['/', '/booking', '/confirmation', '/manage-bookings'].includes(pathname) ? '/index.html' : pathname).slice(1));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const external = [], errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('language', 'en'));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== base) { external.push(url.origin + url.pathname); return route.abort(); }
      return route.continue();
    });
    const assertIsolated = async () => {
      await page.locator('.booking-demo-banner').waitFor({ state: 'visible' });
      await page.waitForFunction(() => [...document.querySelectorAll('a[href]')].every(link => !/^(tel:|mailto:|whatsapp:)|https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/.test(link.getAttribute('href'))));
      assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    };
    await page.goto(base, { waitUntil: 'networkidle' });
    await assertIsolated();
    const date = new Date(); date.setUTCDate(date.getUTCDate() + 21);
    while (date.getUTCDay() !== 4) date.setUTCDate(date.getUTCDate() + 1);
    await page.goto(`${base}/booking?date=${date.toISOString().slice(0, 10)}&participants=2`, { waitUntil: 'networkidle' });
    await assertIsolated();
    await page.getByRole('button', { name: copy.demo.fill, exact: true }).click();
    assert.equal(await page.locator('#dateOfBirth').inputValue(), '1990-01-01');
    await page.locator('input[name="paymentMethod"][value="credit"]').check();
    await page.locator('#agreeToTerms').check();
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/demoCheckout=BK-/);
    await assertIsolated();
    await page.locator('[data-testid="demo-outcome-success"]').click();
    await page.waitForURL(/\/(confirmation|booking)\?.*id=BK-/);
    await page.waitForFunction(() => {
      const store = JSON.parse(sessionStorage.getItem('chilik-design-demo-v1') || '{}');
      return Object.values(store.bookings || {}).some(booking => booking.paymentStatus === 'paid');
    });
    await assertIsolated();
    await page.goto(base + '/manage-bookings', { waitUntil: 'networkidle' });
    await assertIsolated();
    assert.deepEqual(external, [], 'no live network handler attempts');
    assert.deepEqual(errors, [], 'no runtime errors');
    fs.mkdirSync('docs/seo/runtime', { recursive: true });
    fs.writeFileSync('docs/seo/runtime/booking-demo.json', JSON.stringify({ status: 'passed', checkedAt: new Date().toISOString(), homeAndBookingContactsRemoved: true, mainBirthDateContract: true, simulatedCreditCheckoutAndPaidOutcome: true, managementIsolated: true, external, errors, limits: 'Actual compiled demo on a local static SPA server; only synthetic demo customer and sessionStorage. No Hosting or production writes.' }, null, 2));
    console.log('Passed built demo home/form/management isolation, removed contacts and simulated credit checkout/paid outcome with zero external handler attempts.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { server.close(); server.closeAllConnections(); });
