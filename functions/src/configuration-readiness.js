'use strict';
// Pure preflight: never reads credentials from disk, changes settings or makes
// network requests. Output contains only issue codes, never values/secrets.
function paymentConfigurationIssues(config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return ['invalid-configuration-shape'];
  const issues = [];
  if (config.enabled !== true) issues.push('payment-runtime-disabled');
  if (config.merchantConfigurationVerified !== true) issues.push('merchant-configuration-unverified');
  if (config.reportContractVerified !== true) issues.push('report-capture-and-cancellation-contract-unverified');
  if (!/^[a-zA-Z0-9_-]+$/.test(config.terminal || '')) issues.push('terminal-missing-or-invalid');
  for (const key of ['appKey', 'secret']) if (typeof config[key] !== 'string' || !config[key] || /[\r\n]/.test(config[key])) issues.push(`${key}-missing-or-invalid`);
  let url; try { url = new URL(config.checkoutUrl); } catch { /* reported below */ }
  if (!url || url.protocol !== 'https:' || url.hostname !== 'directng.tranzila.com' || (url.port && url.port !== '443') || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(`/${config.terminal}/`)) issues.push('checkout-url-unverified');
  const reserved = new Set(['sum', 'currency', 'thtk', 'tranmode', 'supplier', 'cred_type', 'lang', 'success_url_address', 'fail_url_address', 'notify_url_address', 'TranzilaPW', '__proto__', 'constructor', 'prototype', 'index', 'authorization_number', 'child_terminal', 'amount', 'txn_type', 'transtatus', 'txn_payment_method', 'processor_response_code', 'cancelfdid', 'cancelfdnumber']);
  const validOrderParameter = typeof config.orderParameter === 'string' && /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(config.orderParameter) && !reserved.has(config.orderParameter);
  if (!validOrderParameter) issues.push('order-parameter-invalid');
  // Support the supplier-confirmed same-name echo only when explicitly chosen.
  // Reports docs still show user_defined_N; never guess a slot or fall back
  // between representations when authenticating an order.
  if (!/^user_defined_([1-9]|1\d|2[0-5])$/.test(config.orderReportField || '') && !(validOrderParameter && config.orderReportField === config.orderParameter)) issues.push('order-report-binding-missing');
  if (!Array.isArray(config.capturePairs) || !config.capturePairs.length || !config.capturePairs.every(p => p && typeof p === 'object' && typeof p.txnType === 'string' && p.txnType && typeof p.tranmode === 'string' && p.tranmode && Number.isInteger(p.transtatus)) || !config.capturePairs.some(p => p.tranmode === config.checkoutTranmode)) issues.push('capture-semantics-unverified');
  return issues;
}
module.exports = { paymentConfigurationIssues };
