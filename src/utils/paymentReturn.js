// DirectNG appends card tokens and identity fields to GET returns. Keep only
// the public routing reference; payment success still requires server Reports.
export function stripPaymentReturnDetails(browser = window) {
  const url = new URL(browser.location.href);
  if (!['/booking', '/confirmation'].includes(url.pathname)) return false;
  if (![...url.searchParams.keys()].some(key => ['payment', 'Response', 'thtk'].includes(key))) return false;
  const clean = new URLSearchParams();
  const payment = url.searchParams.get('payment');
  const id = url.searchParams.get('id');
  const test = url.searchParams.get('test');
  if (['success', 'failed', 'failure', 'pending'].includes(payment)) clean.set('payment', payment);
  if (/^BK-[a-f0-9]{20,24}$/.test(id || '')) clean.set('id', id);
  if (/^CHECK-\d{8}-[a-f0-9]{12}$/.test(test || '')) clean.set('test', test);
  const query = clean.toString();
  const path = url.pathname + (query ? '?' + query : '');
  if (path === url.pathname + url.search + url.hash) return false;
  browser.history.replaceState(browser.history.state, '', path);
  return true;
}
