'use strict';
// Server-side request preparation only. No transport and no outcome interpreter.
const { authHeaders } = require('./tranzila');
const { fingerprint } = require('../booking-core');
const CANCELLATION_URL = 'https://api.tranzila.com/v1/transaction/credit_card/create';
const CONTRACT_GAPS = Object.freeze([
  'terminal-cancellation-entitlement',
  'cancel-specific-required-fields',
  'reports-index-to-api-transaction-id',
  'cancel-final-response-and-report-states',
  'cancel-eligibility-and-settlement-window',
  'cancel-fees',
  'cancel-idempotency-and-timeout-reconciliation',
]);
const fault = code => Object.assign(new Error(code), { code, status: 409 });
function assertPrivateCharge(charge) {
  if (!charge || charge.provider !== 'tranzila' || !/^BK-[a-f0-9]{24}$/.test(charge.bookingId || '') || !/^[a-zA-Z0-9_-]{1,64}$/.test(charge.terminal || '') || typeof charge.transactionIndex !== 'string' || !/^[1-9]\d{0,11}$/.test(charge.transactionIndex) || typeof charge.authorizationNumber !== 'string' || !/^\d{1,32}$/.test(charge.authorizationNumber) || /^0+$/.test(charge.authorizationNumber) || charge.sourceLedgerId !== fingerprint(`${charge.terminal}:${charge.transactionIndex}`)) throw fault('unverified-original-charge');
}
function buildCancellationRequestDraft({ charge, resolution } = {}) {
  assertPrivateCharge(charge);
  // The Reports index is retained, never silently used as the API transaction id.
  // Resolution must come from a future independently verified server-side source.
  if (!resolution || resolution.verified !== true || resolution.terminal !== charge.terminal || resolution.reportIndex !== charge.transactionIndex || !Number.isSafeInteger(resolution.apiTransactionId) || resolution.apiTransactionId < 1 || typeof resolution.evidenceId !== 'string' || !resolution.evidenceId || resolution.evidenceId.length > 160) throw fault('cancellation-reference-mapping-unverified');
  return Object.freeze({ terminal_name: charge.terminal, txn_type: 'cancel', reference_txn_id: resolution.apiTransactionId, authorization_number: charge.authorizationNumber });
}
function signCancellationRequestDraft({ charge, resolution, appKey, secret, nowMs = Date.now(), nonce } = {}) {
  const body = buildCancellationRequestDraft({ charge, resolution });
  if ([appKey, secret].some(value => typeof value !== 'string' || !value || /[\r\n]/.test(value)) || !Number.isSafeInteger(nowMs) || nowMs < 0 || (nonce !== undefined && !/^[a-f0-9]{80}$/.test(nonce))) throw fault('cancellation-signing-input-invalid');
  // Return only to trusted server-side callers; never log or persist headers.
  return Object.freeze({ url: CANCELLATION_URL, method: 'POST', redirect: 'error', headers: Object.freeze(authHeaders(appKey, secret, nowMs, nonce)), body: JSON.stringify(body), executable: false });
}
function cancellationReadinessIssues() {
  // Immutable gaps: environment flags cannot turn this draft into an adapter.
  return ['cancellation-execution-unsupported', ...CONTRACT_GAPS];
}
module.exports = { CONTRACT_GAPS, CANCELLATION_URL, assertPrivateCharge, buildCancellationRequestDraft, signCancellationRequestDraft, cancellationReadinessIssues };
