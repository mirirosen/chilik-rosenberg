'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createJobRunner } = require('../src/integration-jobs');
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

test('retry budget stops at eight attempts and non-Error provider failures are sanitized', async () => {
  const { db, ref } = setup(); let calls = 0;
  const jobs = createJobRunner(db, Timestamp, { email: async () => { calls++; throw null; } });
  for (let i = 0; i < 9; i++) await jobs.run(ref, i * 3600001);
  assert.equal(calls, 8); assert.equal(db.data.get(ref.path).status, 'failed');
  assert.equal(db.data.get(ref.path).lastError, 'provider-delivery-failed');
  await jobs.retry(ref, 40000000); assert.equal(db.data.get(ref.path).lease, null); assert.equal(db.data.get(ref.path).attempts, 0);
});
