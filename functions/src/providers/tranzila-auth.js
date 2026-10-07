'use strict';
const crypto = require('crypto');
const fail = () => Object.assign(new Error('payment-verification-not-configured'), { code: 'payment-verification-not-configured', status: 503 });
function authHeaders(appKey, secret, nowMs = Date.now(), nonce = crypto.randomBytes(40).toString('hex')) {
  if ([appKey, secret].some(value => typeof value !== 'string' || !value || /[\r\n]/.test(value)) || !Number.isSafeInteger(nowMs) || nowMs < 0 || typeof nonce !== 'string' || !/^[a-f0-9]{80}$/.test(nonce)) throw fail();
  const timestamp = String(Math.floor(nowMs / 1000));
  return { 'Content-Type': 'application/json', 'X-tranzila-api-app-key': appKey, 'X-tranzila-api-request-time': timestamp, 'X-tranzila-api-nonce': nonce, 'X-tranzila-api-access-token': crypto.createHmac('sha256', secret + timestamp + nonce).update(appKey).digest('hex') };
}
module.exports = { authHeaders };
