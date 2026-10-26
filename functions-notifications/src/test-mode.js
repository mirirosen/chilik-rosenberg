'use strict';
// Test/staging guard. Outside the production project, or with CHILIK_TEST_MODE=true,
// every email goes to TEST_RECIPIENT only and no WhatsApp message is sent, so a test
// deploy can never reach a customer (or a phone).
const TEST_RECIPIENT = 'hr20192022@gmail.com';
const PRODUCTION_PROJECT = 'hilik-site';
function runtimeProject(env) {
  if (env.GCLOUD_PROJECT || env.GCP_PROJECT) return env.GCLOUD_PROJECT || env.GCP_PROJECT;
  try { return JSON.parse(env.FIREBASE_CONFIG || '{}').projectId || ''; } catch { return ''; }
}
const isTestMode = (env = process.env) => env.CHILIK_TEST_MODE === 'true' || runtimeProject(env) !== PRODUCTION_PROJECT;
function guardEmailSend(send, testMode) {
  if (!testMode) return send;
  return message => send({ ...message, to: TEST_RECIPIENT, replyTo: undefined, subject: `[TEST] ${message.subject || ''}` });
}
function guardWhatsAppSend(send, testMode) {
  if (!testMode) return send;
  return async () => { throw new Error('test-mode-whatsapp-disabled'); };
}
module.exports = { TEST_RECIPIENT, isTestMode, guardEmailSend, guardWhatsAppSend };
