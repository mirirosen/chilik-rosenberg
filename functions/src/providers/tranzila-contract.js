'use strict';
const HANDSHAKE_URL = 'https://api.tranzila.com/v2/handshake/create';
// Verified facts are evidence, never switches that enable payments.
const VERIFIED_TERMINAL_METADATA = Object.freeze({ terminal: 'fxpmyry', orderParameter: 'chilik_order_id', reportField: 'user_defined_10', fieldMetadataVerified: true, handshakeVerified: true, transactionEchoVerified: false, captureContractVerified: false, cancellationContractVerified: false, returnsAndNotifyVerified: false });
function validHandshakeResponse(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && value.error_code === 0 && typeof value.thtk === 'string' && /^[a-zA-Z0-9_-]{16,256}$/.test(value.thtk);
}
module.exports = { HANDSHAKE_URL, VERIFIED_TERMINAL_METADATA, validHandshakeResponse };
