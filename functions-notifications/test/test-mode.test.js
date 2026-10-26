'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { TEST_RECIPIENT, isTestMode, guardEmailSend, guardWhatsAppSend } = require('../src/test-mode');

test('test mode: flag set, another project or an unknown project', () => {
  assert.equal(isTestMode({ GCLOUD_PROJECT: 'hilik-site' }), false);
  assert.equal(isTestMode({ FIREBASE_CONFIG: '{"projectId":"hilik-site"}' }), false);
  assert.equal(isTestMode({ GCLOUD_PROJECT: 'hilik-site', CHILIK_TEST_MODE: 'true' }), true);
  assert.equal(isTestMode({ GCLOUD_PROJECT: 'hilik-staging' }), true);
  assert.equal(isTestMode({}), true);
  assert.equal(isTestMode({ FIREBASE_CONFIG: 'not json' }), true);
});

test('in test mode every email goes to the test address only; production is untouched', async () => {
  const sent = []; const send = async m => { sent.push(m); };
  await guardEmailSend(send, true)({ to: 'customer@example.com', replyTo: 'customer@example.com', subject: 'Booking', text: 't', key: 'k' });
  assert.equal(TEST_RECIPIENT, 'hr20192022@gmail.com');
  assert.deepEqual([sent[0].to, sent[0].replyTo, sent[0].subject], [TEST_RECIPIENT, undefined, '[TEST] Booking']);
  assert.equal(guardEmailSend(send, false), send);
});

test('in test mode no WhatsApp message is sent', async () => {
  let calls = 0; const send = async () => { calls++; return 'id'; };
  await assert.rejects(guardWhatsAppSend(send, true)('972501234567', 'hi'), /test-mode-whatsapp-disabled/);
  assert.equal(calls, 0);
  assert.equal(guardWhatsAppSend(send, false), send);
});

test('both deployed senders are wrapped by the test-mode guard', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8');
  assert.match(source, /send: guardEmailSend\(createGmailSender\(/);
  assert.match(source, /send: guardWhatsAppSend\(createWahaSender\(/);
});
