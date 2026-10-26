'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createJobRunner, loadIntegrationGates, TEST_RECIPIENT } = require('../src/integration-jobs');
function setup() { const db = fakeDb(), ref = db.doc('integrationJobs/test'); db.data.set(ref.path, { kind: 'email', status: 'pending', attempts: 0, nextAttemptAt: Timestamp.fromMillis(0) }); return { db, ref }; }
test('disabled provider is visible as blocked, never sent; manual retry queues it', async () => {
  const { db, ref } = setup(), jobs = createJobRunner(db, Timestamp);
  await jobs.run(ref, 1000); assert.equal(db.data.get(ref.path).status, 'blocked');
  await jobs.retry(ref, 2000); assert.equal(db.data.get(ref.path).status, 'pending');
});
test('concurrent workers claim a job once and pass stable idempotency key', async () => {
  const { db, ref } = setup(); let calls = 0;
  const jobs = createJobRunner(db, Timestamp, { email: async job => { calls++; assert.equal(job.idempotencyKey, 'test'); return { providerId: 'ack' }; } });
  await Promise.all([jobs.run(ref, 1000), jobs.run(ref, 1000)]);
  assert.equal(calls, 1); assert.equal(db.data.get(ref.path).status, 'sent');
  await assert.rejects(jobs.retry(ref), /job-not-retryable/);
});
test('transient failure persists retry and backoff; safe errors contain no secret body', async () => {
  const { db, ref } = setup(); const jobs = createJobRunner(db, Timestamp, { email: async () => { throw new Error('secret upstream data'); } });
  await jobs.run(ref, 1000); assert.equal(db.data.get(ref.path).status, 'retry'); assert.equal(db.data.get(ref.path).lastError, 'provider-delivery-failed');
  assert.ok(db.data.get(ref.path).nextAttemptAt.toMillis() > 1000);
});

test('expired lease can be reclaimed and an older acknowledgement cannot replace the newer result', async () => {
  const { db, ref } = setup(); let release, calls = 0;
  const firstResult = new Promise(resolve => { release = resolve; });
  const jobs = createJobRunner(db, Timestamp, { email: async () => ++calls === 1 ? firstResult : { providerId: 'new-ack' } });
  const first = jobs.run(ref, 1000);
  while (calls === 0) await new Promise(resolve => setImmediate(resolve));
  await jobs.run(ref, 121001); assert.equal(db.data.get(ref.path).providerId, 'new-ack');
  release({ providerId: 'old-ack' }); await first;
  assert.equal(db.data.get(ref.path).providerId, 'new-ack'); assert.equal(db.data.get(ref.path).status, 'sent');
});

const CUTOFF = Date.parse('2026-10-27T08:00:00Z');
const PROD = { GCLOUD_PROJECT: 'hilik-site', CHILIK_INTEGRATION_CUTOFF_ISO: '2026-10-27T08:00:00Z', NOTIFY_CUSTOMER_EMAILS: 'true' };
function gatedJob(db, id, kind, createdMs, extra = {}) {
  const ref = db.doc(`integrationJobs/${id}`);
  db.data.set(ref.path, { kind, status: 'pending', attempts: 0, nextAttemptAt: Timestamp.fromMillis(0), createdAt: Timestamp.fromMillis(createdMs), ...extra });
  return ref;
}
const recorder = () => { const calls = []; const ok = kind => async job => { calls.push([kind, job]); return { providerId: `${kind}-ack` }; }; return { calls, adapters: { email: ok('email'), calendar: ok('calendar'), whatsapp: ok('whatsapp') } }; };

test('deployed gates fail closed: missing/invalid cutoff, customer flag off, any non-production project is test mode', () => {
  assert.equal(loadIntegrationGates({}).cutoffMs, null);
  assert.equal(loadIntegrationGates({ CHILIK_INTEGRATION_CUTOFF_ISO: 'SET_TO_DEPLOY_TIME_UTC' }).cutoffMs, null);
  assert.equal(loadIntegrationGates({ CHILIK_INTEGRATION_CUTOFF_ISO: '1700000000000' }).cutoffMs, null);
  assert.equal(loadIntegrationGates(PROD).cutoffMs, CUTOFF);
  assert.equal(loadIntegrationGates({ ...PROD, NOTIFY_CUSTOMER_EMAILS: undefined }).customerMessagesEnabled, false);
  assert.equal(loadIntegrationGates(PROD).testMode, false);
  assert.equal(loadIntegrationGates({ ...PROD, CHILIK_TEST_MODE: 'true' }).testMode, true);
  assert.equal(loadIntegrationGates({ ...PROD, GCLOUD_PROJECT: 'hilik-staging' }).testMode, true);
  assert.equal(loadIntegrationGates({ ...PROD, GCLOUD_PROJECT: undefined }).testMode, true);
  assert.equal(loadIntegrationGates({ ...PROD, GCLOUD_PROJECT: undefined, FIREBASE_CONFIG: '{"projectId":"hilik-site"}' }).testMode, false);
});

test('without a valid cutoff nothing is claimed or sent; jobs stay pending', async () => {
  const db = fakeDb(), { calls, adapters } = recorder();
  const ref = gatedJob(db, 'a', 'calendar', CUTOFF + 1);
  await createJobRunner(db, Timestamp, adapters, loadIntegrationGates({ GCLOUD_PROJECT: 'hilik-site' })).run(ref, CUTOFF + 2);
  assert.equal(calls.length, 0); assert.equal(db.data.get(ref.path).status, 'pending'); assert.equal(db.data.get(ref.path).attempts, 0);
});

test('jobs created before the cutoff are skipped forever and cannot be retried into sending', async () => {
  const db = fakeDb(), { calls, adapters } = recorder(), jobs = createJobRunner(db, Timestamp, adapters, loadIntegrationGates(PROD));
  const old = gatedJob(db, 'old', 'whatsapp', CUTOFF - 1), missing = gatedJob(db, 'missing', 'calendar', 0, { createdAt: undefined });
  await jobs.run(old, CUTOFF + 10); await jobs.run(missing, CUTOFF + 10);
  assert.equal(calls.length, 0);
  for (const ref of [old, missing]) {
    assert.equal(db.data.get(ref.path).status, 'skipped'); assert.equal(db.data.get(ref.path).lastError, 'before-integration-cutoff');
    await assert.rejects(jobs.retry(ref), /job-not-retryable/);
  }
  // A pre-cutoff job an admin had re-queued from 'blocked' is skipped again, not sent.
  const blockedOld = gatedJob(db, 'blocked-old', 'whatsapp', CUTOFF - 1, { status: 'blocked' });
  await jobs.retry(blockedOld, CUTOFF + 20); await jobs.run(blockedOld, CUTOFF + 20);
  assert.equal(calls.length, 0); assert.equal(db.data.get(blockedOld.path).status, 'skipped');
});

test('after the cutoff each job is delivered once; a sent job is never re-sent', async () => {
  const db = fakeDb(), { calls, adapters } = recorder(), jobs = createJobRunner(db, Timestamp, adapters, loadIntegrationGates(PROD));
  const ref = gatedJob(db, 'new', 'whatsapp', CUTOFF + 1);
  await Promise.all([jobs.run(ref, CUTOFF + 5), jobs.run(ref, CUTOFF + 5)]);
  await jobs.run(ref, CUTOFF + 3600000);
  assert.equal(calls.length, 1); assert.equal(db.data.get(ref.path).status, 'sent');
});

test('customer emails stay behind the customer flag', async () => {
  const db = fakeDb(), { calls, adapters } = recorder();
  const ref = gatedJob(db, 'mail', 'email', CUTOFF + 1, { emailSnapshot: { email: 'customer@example.com' } });
  await createJobRunner(db, Timestamp, adapters, loadIntegrationGates({ ...PROD, NOTIFY_CUSTOMER_EMAILS: 'false' })).run(ref, CUTOFF + 5);
  assert.equal(calls.length, 0); assert.equal(db.data.get(ref.path).status, 'blocked'); assert.equal(db.data.get(ref.path).lastError, 'customer-messages-disabled');
});

test('test mode: emails go only to the test address, WhatsApp is blocked, production keeps the customer address', async () => {
  for (const env of [{ ...PROD, CHILIK_TEST_MODE: 'true' }, { ...PROD, GCLOUD_PROJECT: 'hilik-staging' }]) {
    const db = fakeDb(), { calls, adapters } = recorder(), jobs = createJobRunner(db, Timestamp, adapters, loadIntegrationGates(env));
    const mail = gatedJob(db, 'mail', 'email', CUTOFF + 1, { emailSnapshot: { email: 'customer@example.com', bookingId: 'BK-1' } });
    const wa = gatedJob(db, 'wa', 'whatsapp', CUTOFF + 1);
    await jobs.run(mail, CUTOFF + 5); await jobs.run(wa, CUTOFF + 5);
    assert.deepEqual(calls.map(([kind, job]) => [kind, job.emailSnapshot.email]), [['email', TEST_RECIPIENT]]);
    assert.equal(TEST_RECIPIENT, 'hr20192022@gmail.com');
    assert.equal(db.data.get(wa.path).status, 'blocked'); assert.equal(db.data.get(wa.path).lastError, 'test-mode-whatsapp-disabled');
    assert.equal(db.data.get(mail.path).emailSnapshot.email, 'customer@example.com'); // stored job unchanged
  }
  const db = fakeDb(), { calls, adapters } = recorder();
  const mail = gatedJob(db, 'mail', 'email', CUTOFF + 1, { emailSnapshot: { email: 'customer@example.com' } });
  await createJobRunner(db, Timestamp, adapters, loadIntegrationGates(PROD)).run(mail, CUTOFF + 5);
  assert.equal(calls[0][1].emailSnapshot.email, 'customer@example.com');
});

test('shipped deploy settings enable the integration scheduler only with the cutoff placeholder and customer email off', () => {
  const settings = require('../booking-deployment-settings.json');
  assert.equal(settings.CHILIK_INTEGRATION_SCHEDULER_ENABLED, 'true');
  assert.equal(settings.NOTIFY_CUSTOMER_EMAILS, undefined);
  assert.equal(settings.CHILIK_TEST_MODE, undefined);
  // The placeholder is replaced with the deploy time (UTC ISO) at deploy; until then nothing is claimed.
  if (settings.CHILIK_INTEGRATION_CUTOFF_ISO === 'SET_TO_DEPLOY_TIME_UTC') assert.equal(loadIntegrationGates({ ...settings, GCLOUD_PROJECT: 'hilik-site' }).cutoffMs, null);
  else assert.match(settings.CHILIK_INTEGRATION_CUTOFF_ISO, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});

test('retry budget stops at eight attempts and non-Error provider failures are sanitized', async () => {
  const { db, ref } = setup(); let calls = 0;
  const jobs = createJobRunner(db, Timestamp, { email: async () => { calls++; throw null; } });
  for (let i = 0; i < 9; i++) await jobs.run(ref, i * 3600001);
  assert.equal(calls, 8); assert.equal(db.data.get(ref.path).status, 'failed');
  assert.equal(db.data.get(ref.path).lastError, 'provider-delivery-failed');
  await jobs.retry(ref, 40000000); assert.equal(db.data.get(ref.path).lease, null); assert.equal(db.data.get(ref.path).attempts, 0);
});
