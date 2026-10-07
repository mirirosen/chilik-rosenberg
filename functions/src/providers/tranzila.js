'use strict';
const { authHeaders } = require('./tranzila-auth');
const { HANDSHAKE_URL, validHandshakeResponse } = require('./tranzila-contract');
const { paymentConfigurationIssues } = require('../configuration-readiness');
// Official protocol sources: docs/PAYMENT_RUNTIME.md. Credentials only supplied by the
// server caller, never persisted or returned. No network request unless enabled
// and merchant-specific binding/capture semantics have been explicitly verified.
const fail = code => Object.assign(new Error(code), { code, status: 503 });
function money(value) {
  const raw = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw fail('provider-invalid-amount');
  const [whole, fraction = ''] = raw.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0) throw fail('provider-invalid-amount');
  return result;
}
function authorizationNumber(value) {
  // Local safety bounds, not a claim about cancellation API parameter syntax.
  // Preserve leading zeroes in string reports; reject lossy numeric values.
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) throw fail('provider-verification-pending');
  if (!['number', 'string'].includes(typeof value) || !/^\d{1,32}$/.test(String(value)) || /^0+$/.test(String(value))) throw fail('provider-verification-pending');
  return String(value);
}
function orderMatches(row, config, bookingId) {
  return Object.hasOwn(row, config.orderReportField) && row[config.orderReportField] === bookingId;
}
function createTranzilaAdapter({ config = {}, fetchImpl = global.fetch, clock = Date.now } = {}) {
  function assertReady() {
    if (paymentConfigurationIssues(config).length) throw fail('payment-verification-not-configured');
  }
  async function post(url, body) {
    try {
      const response = await fetchImpl(url, { method: 'POST', headers: authHeaders(config.appKey, config.secret, clock()), body: JSON.stringify(body), signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (!response.ok) throw fail('payment-provider-unavailable');
      return await response.json();
    } catch { throw fail('payment-provider-unavailable'); }
  }
  async function createCheckout({ booking, urls }) {
    assertReady();
    if (!/^BK-[a-f0-9]{24}$/.test(booking.bookingId || '')) throw fail('invalid-booking-reference');
    money(booking.totalPrice);
    for (const key of ['success', 'failure', 'notify']) {
      let parsed; try { parsed = new URL(urls[key]); } catch { throw fail('invalid-return-url'); }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw fail('invalid-return-url');
    }
    const response = await post(HANDSHAKE_URL, { terminal_name: config.terminal, sum: booking.totalPrice, request_params: { [config.orderParameter]: booking.bookingId } });
    if (!validHandshakeResponse(response)) throw fail('payment-provider-unavailable');
    const url = new URL(config.checkoutUrl);
    // Only short-lived handshake token + public parameters reach the browser.
    // No terminal password, API key, secret, customer email, phone or DOB.
    const params = { sum: (money(booking.totalPrice) / 100).toFixed(2), currency: '1', cred_type: '1', tranmode: config.checkoutTranmode, thtk: response.thtk, [config.orderParameter]: booking.bookingId, success_url_address: urls.success, fail_url_address: urls.failure, notify_url_address: urls.notify, lang: booking.language === 'en' ? 'en' : 'il' };
    if (!config.capturePairs.some(p => p.tranmode === config.checkoutTranmode)) throw fail('payment-verification-not-configured');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return { paymentUrl: url.toString(), paymentTerminal: config.terminal };
  }
  function assertLookupReady() {
    assertReady();
    if (config.orderLookupVerified !== true || !/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(config.orderFilterParameter || '')) throw fail('payment-order-lookup-not-configured');
  }
  async function findTransactionIndexes({ booking, nowMs = clock() }) {
    assertLookupReady();
    if (!/^BK-[a-f0-9]{24}$/.test(booking.bookingId || '') || booking.paymentTerminal !== config.terminal) throw fail('invalid-booking-reference');
    const createdMs = booking.createdAt?.toMillis();
    if (!Number.isFinite(createdMs) || !Number.isFinite(nowMs) || createdMs > nowMs || nowMs - createdMs > 48 * 3600000) throw fail('provider-lookup-window-invalid');
    // Inclusive date ranges, padded by one day at both ends, avoid assuming the
    // merchant's report timezone. Only the exact configured order filter is used.
    const date = ms => new Date(ms).toISOString().slice(0, 10);
    const base = { terminal_name: config.terminal, transaction_start_date: date(createdMs - 86400000), transaction_end_date: date(nowMs + 86400000), detailed: 'N', page_results: 10, order_direction: 'asc', ufields: [{ name: config.orderFilterParameter, operator: 'equals', value: booking.bookingId }] };
    const indexes = new Set(); let expectedTotal = null;
    for (let page = 1; page <= 3; page++) {
      const report = await post('https://report.tranzila.com/v1/transaction', { ...base, page });
      if (!report || !Array.isArray(report.transactions) || report.transactions.length > 10 || !/^(0|[1-9]\d*)$/.test(String(report.total)) || !Number.isSafeInteger(Number(report.total)) || Number(report.total) > 20 || Number(report.rows) !== report.transactions.length || (Object.hasOwn(report, 'error_code') && report.error_code !== 0)) throw fail('provider-lookup-incomplete');
      if (expectedTotal === null) expectedTotal = Number(report.total);
      if (expectedTotal !== Number(report.total)) throw fail('provider-lookup-incomplete');
      for (const row of report.transactions) {
        const index = Number(row?.index);
        if (!/^\d{1,12}$/.test(String(row?.index)) || !Number.isSafeInteger(index) || index < 1 || row.child_terminal !== config.terminal || !orderMatches(row, config, booking.bookingId) || indexes.has(index)) throw fail('provider-lookup-incomplete');
        indexes.add(index);
      }
      if (indexes.size === expectedTotal) return { complete: true, transactionIndexes: [...indexes].sort((a, b) => a - b) };
      if (!report.transactions.length || indexes.size > expectedTotal) throw fail('provider-lookup-incomplete');
    }
    throw fail('provider-lookup-incomplete');
  }
  async function verifyTransaction({ booking, transactionIndex }) {
    assertReady();
    // A terminal change must never reinterpret an older checkout under the new
    // terminal, even when its report happens to echo the same public order id.
    if (!/^BK-[a-f0-9]{24}$/.test(booking.bookingId || '') || booking.paymentTerminal !== config.terminal) throw fail('invalid-booking-reference');
    const index = Number(transactionIndex);
    if (!/^\d{1,12}$/.test(String(transactionIndex)) || !Number.isSafeInteger(index) || index < 1) throw fail('invalid-provider-reference');
    const report = await post('https://report.tranzila.com/v1/transaction', { terminal_name: config.terminal, transaction_index: index });
    if (!report || !Array.isArray(report.transactions) || report.transactions.length !== 1 || (Object.hasOwn(report, 'error_code') && report.error_code !== 0)) throw fail('provider-verification-pending');
    const row = report.transactions[0];
    if (!row || typeof row !== 'object') throw fail('provider-verification-pending');
    if (Number(row.index) !== index || row.child_terminal !== config.terminal || !orderMatches(row, config, booking.bookingId) || money(row.amount) !== money(booking.totalPrice) || String(row.currency) !== '1' || row.txn_payment_method !== 'CC' || !config.capturePairs.some(p => p.txnType === row.txn_type && p.tranmode === row.tranmode && p.transtatus === row.transtatus) || !Object.hasOwn(row, 'cancelfdid') || !Object.hasOwn(row, 'cancelfdnumber') || row.cancelfdid != null || row.cancelfdnumber != null || row.processor_response_code !== '000' || !Object.hasOwn(row, 'authorization_number')) throw fail('provider-verification-pending');
    // Unknown/declined reports are NOT accepted as authenticated declines. They
    // remain pending until expiry or manual review; callback fields are ignored.
    return { verified: true, bookingId: booking.bookingId, transactionKey: `${config.terminal}:${index}`, amount: booking.totalPrice, currency: 'ILS', event: 'paid', providerTransaction: { provider: 'tranzila', terminal: config.terminal, transactionIndex: String(index), authorizationNumber: authorizationNumber(row.authorization_number) } };
  }
  return { assertReady, assertLookupReady, createCheckout, findTransactionIndexes, verifyTransaction };
}
module.exports = { authHeaders, createTranzilaAdapter, money };
