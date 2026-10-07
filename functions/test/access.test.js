'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { authenticate, canReadStatus } = require('../src/access');
const req = token => ({ get: () => token });
test('missing/invalid/revoked token rejected, verifier checks revocation', async () => {
  await assert.rejects(authenticate(req(''), async () => ({ uid: 'x' })), { status: 401 });
  await assert.rejects(authenticate(req('Bearer revoked'), async (token, revoked) => { assert.equal(revoked, true); throw new Error('revoked'); }), { status: 401 });
});
test('customer, anonymous, and string-valued claims cannot invoke admin API', async () => {
  for (const user of [{ uid: 'u' }, { uid: 'u', admin: 'true' }, { uid: 'u', admin: true, firebase: { sign_in_provider: 'anonymous' } }]) await assert.rejects(authenticate(req('Bearer t'), async () => user, true), { status: 403 });
  assert.equal((await authenticate(req('Bearer t'), async () => ({ uid: 'admin', admin: true, firebase: { sign_in_provider: 'password' } }), true)).uid, 'admin');
});
test('status read is owner-only or authorized admin, legacy ownerless data hidden', () => {
  assert.equal(canReadStatus({ ownerUid: 'one' }, { uid: 'two' }), false);
  assert.equal(canReadStatus({ ownerUid: 'one' }, { uid: 'one' }), true);
  assert.equal(canReadStatus({}, { uid: 'one' }), false);
  assert.equal(canReadStatus({}, { uid: 'admin', admin: true }), true);
});
