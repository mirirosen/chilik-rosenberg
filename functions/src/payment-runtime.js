'use strict';
const { FIREBASE_PROJECT, FUNCTION_REGION } = require('./deployment-config');
const { paymentConfigurationIssues } = require('./configuration-readiness');
const { createTranzilaAdapter } = require('./providers/tranzila');
const { createPaymentFlow } = require('./payment-flow');
const SITE_ORIGINS = new Set(['https://livechilik-tours.com', 'https://www.chilik-tours.com', 'https://chilik-tours.com']);
const { SECRET_NAMES } = require('./tranzila-credentials');
const fail = () => Object.assign(new Error('payment-verification-not-configured'), { code: 'payment-verification-not-configured', status: 503 });
function flag(value) { return value === 'true'; }
function plainHttpsRoot(value) {
  if (typeof value !== 'string' || value !== value.trim()) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && !u.port && u.pathname === '/' && (value === u.origin || value === u.origin + '/') ? u : null;
  } catch { return null; }
}
function returnUrlIssues({ siteOrigin, apiBase, projectId } = {}) {
  const issues = [], site = plainHttpsRoot(siteOrigin), api = plainHttpsRoot(apiBase);
  if (!site || !SITE_ORIGINS.has(site.origin)) issues.push('payment-site-origin-unverified');
  if (projectId !== FIREBASE_PROJECT || !api || api.hostname !== `${FUNCTION_REGION}-${FIREBASE_PROJECT}.cloudfunctions.net`) issues.push('payment-api-base-unverified');
  return issues;
}
function createReturnUrls(config) {
  function assertReady() { if (returnUrlIssues(config).length) throw fail(); }
  const urlsFor = bookingId => {
    assertReady();
    if (!/^BK-[a-f0-9]{24}$/.test(bookingId || '')) throw Object.assign(new Error('invalid-booking-reference'), { code: 'invalid-booking-reference', status: 400 });
    const site = new URL(config.siteOrigin).origin, api = new URL(config.apiBase).origin;
    const success = new URL('/booking', site), failure = new URL('/booking', site), notify = new URL('/tranzilaWebhook', api);
    success.searchParams.set('payment', 'success'); failure.searchParams.set('payment', 'failed');
    for (const u of [success, failure, notify]) u.searchParams.set('id', bookingId);
    return { success: success.toString(), failure: failure.toString(), notify: notify.toString() };
  };
  urlsFor.assertReady = assertReady;
  return urlsFor;
}
function lookupConfigurationIssues(config = {}) {
  const issues = [];
  if (config.orderLookupVerified !== true) issues.push('order-lookup-contract-unverified');
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(config.orderFilterParameter || '')) issues.push('order-filter-parameter-missing');
  return issues;
}
function loadPaymentConfiguration({ env = {}, readSecret = () => '' } = {}) {
  const config = {
    enabled: flag(env.TRANZILA_ENABLED), merchantConfigurationVerified: flag(env.TRANZILA_MERCHANT_CONFIGURATION_VERIFIED),
    reportContractVerified: flag(env.TRANZILA_REPORT_CONTRACT_VERIFIED), terminal: env.TRANZILA_TERMINAL || '',
    checkoutUrl: env.TRANZILA_CHECKOUT_URL || '', orderParameter: env.TRANZILA_ORDER_PARAMETER || '',
    orderReportField: env.TRANZILA_ORDER_REPORT_FIELD || '', checkoutTranmode: env.TRANZILA_CHECKOUT_TRANMODE || '',
    orderLookupVerified: flag(env.TRANZILA_ORDER_LOOKUP_VERIFIED), orderFilterParameter: env.TRANZILA_ORDER_FILTER_PARAMETER || '',
    capturePairs: [], appKey: '', secret: '',
  };
  const issues = [];
  const encodedPairs = env.TRANZILA_CAPTURE_PAIRS_JSON || '';
  try {
    if (encodedPairs.length > 8192) throw new Error();
    const pairs = JSON.parse(encodedPairs);
    if (!Array.isArray(pairs) || pairs.length > 20) throw new Error();
    config.capturePairs = pairs;
  } catch { issues.push('capture-pairs-json-missing-or-invalid'); }
  const urls = { siteOrigin: env.PAYMENT_SITE_ORIGIN || '', apiBase: env.PAYMENT_API_BASE || '', projectId: env.GCLOUD_PROJECT || env.GCP_PROJECT || '' };
  issues.push(...returnUrlIssues(urls));
  // Disabled/unverified configuration does not even read bound secret values.
  const publicIssues = paymentConfigurationIssues(config).filter(code => !['appKey-missing-or-invalid', 'secret-missing-or-invalid'].includes(code));
  if (!issues.length && !publicIssues.length) {
    try { config.appKey = readSecret(SECRET_NAMES[0]); config.secret = readSecret(SECRET_NAMES[1]); }
    catch { issues.push('payment-secrets-unavailable'); }
  }
  issues.push(...paymentConfigurationIssues(config));
  const paymentIssues = [...new Set(issues)];
  const reconciliationEnabled = flag(env.PAYMENT_RECONCILIATION_ENABLED);
  const reconciliationIssues = [...paymentIssues, ...lookupConfigurationIssues(config)];
  if (!reconciliationEnabled) reconciliationIssues.unshift('payment-reconciliation-disabled');
  return { config, urls, paymentIssues, reconciliationEnabled, reconciliationIssues: [...new Set(reconciliationIssues)] };
}
function createRuntimePaymentFlow({ db, bookings, Timestamp, readConfiguration, clock = Date.now, providerFactory = createTranzilaAdapter }) {
  const current = () => {
    const runtime = readConfiguration();
    if (runtime.paymentIssues.length) throw fail();
    return createPaymentFlow({ db, bookings, Timestamp, provider: providerFactory({ config: runtime.config, clock }), urlsFor: createReturnUrls(runtime.urls), clock });
  };
  return { create: async (...args) => current().create(...args), notify: async (...args) => current().notify(...args) };
}
module.exports = { SECRET_NAMES, flag, returnUrlIssues, createReturnUrls, lookupConfigurationIssues, loadPaymentConfiguration, createRuntimePaymentFlow };
