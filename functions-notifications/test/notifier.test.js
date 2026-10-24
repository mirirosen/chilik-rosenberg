const test = require('node:test'); const assert = require('node:assert');
const { createNotifier, UNPAID_MAX_ATTEMPTS } = require('../src/notifier');
const { createGmailSender } = require('../src/mailer');

// Minimal in-memory Firestore: docs hold plain values; Timestamps are { ms }.
const ts = ms => ({ ms, toMillis: () => ms });
const SERVER_TS = { serverTimestamp: true };
function fakeDb(docs) {
  const store = new Map(Object.entries(docs));
  const apply = (id, patch) => {
    const cur = { ...store.get(id) };
    for (const [k, v] of Object.entries(patch)) cur[k] = v && v.increment ? (cur[k] || 0) + v.increment : v;
    store.set(id, cur);
  };
  const ref = id => ({ id, update: async patch => apply(id, patch) });
  const snap = id => ({ id, ref: ref(id), exists: store.has(id), data: () => store.get(id), get: f => store.get(id)?.[f], createTime: ts(store.get(id)?.createdAt?.ms ?? 0) });
  return {
    store, snap,
    runTransaction: async fn => { const writes = []; const r = await fn({ get: async rf => snap(rf.id), update: (rf, p) => writes.push([rf.id, p]) }); writes.forEach(([id, p]) => apply(id, p)); return r; },
    collection: () => {
      const filters = [];
      const q = { where: (f, op, v) => { filters.push([f, op, v]); return q; },
        get: async () => ({ docs: [...store.keys()].filter(id => filters.every(([f, op, v]) => { const x = store.get(id)[f]?.ms; return op === '>=' ? x >= v.ms : x <= v.ms; })).map(snap) }) };
      return q;
    },
  };
}

const CUTOFF = Date.parse('2026-10-24T17:30:00Z'), NOW = CUTOFF + 3 * 3600000;
const base = { name: 'בדיקה', phone: '0500000000', email: 'a@b.c', tourDate: '2026-11-05', participants: 2, language: 'he', paymentMethod: 'bank_transfer', status: 'pending', paymentStatus: 'pending', createdAt: ts(NOW - 60 * 60000) };
function setup(docs, send) {
  const db = fakeDb(docs), sent = [];
  const n = createNotifier({ db, send: send || (async m => { sent.push(m); }), ownerTo: 'hr20192022@gmail.com', cutoffMs: CUTOFF, now: () => NOW,
    serverTimestamp: () => SERVER_TS, increment: n => ({ increment: n }), fromMillis: ts });
  return { db, n, sent };
}

test('owner notice: sent once to the owner, idempotent on redelivery', async () => {
  const { db, n, sent } = setup({ 'BK-1': base });
  assert.strictEqual(await n.onBookingCreated(db.snap('BK-1')), true);
  assert.strictEqual(await n.onBookingCreated(db.snap('BK-1')), false);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].to, 'hr20192022@gmail.com');
  assert.strictEqual(sent[0].replyTo, 'a@b.c');
  assert.strictEqual(sent[0].key, 'owner-BK-1');
  assert.match(sent[0].subject, /הרשמה חדשה לסיור/);
  assert.deepStrictEqual(db.store.get('BK-1').ownerNoticeSentAt, SERVER_TS);
});

test('owner notice: bookings created before the cutoff are ignored', async () => {
  const { db, n, sent } = setup({ 'BK-old': { ...base, createdAt: ts(CUTOFF - 1) } });
  assert.strictEqual(await n.onBookingCreated(db.snap('BK-old')), false);
  assert.strictEqual(sent.length, 0);
});

test('owner notice: failure releases the claim and records the error', async () => {
  const { db, n } = setup({ 'BK-1': base }, async () => { throw new Error('smtp-down'); });
  await assert.rejects(n.onBookingCreated(db.snap('BK-1')), /smtp-down/);
  assert.strictEqual(db.store.get('BK-1').ownerNoticeSentAt, null);
  assert.strictEqual(db.store.get('BK-1').ownerNoticeError, 'smtp-down');
});

test('unpaid sweep: notifies only unpaid, open bookings with an email, once', async () => {
  const { n, sent, db } = setup({
    'BK-unpaid': base,
    'BK-paid-credit': { ...base, paymentMethod: 'credit', status: 'confirmed', paymentStatus: 'paid' },
    'BK-confirmed-transfer': { ...base, status: 'confirmed', paymentStatus: 'pending' },
    'BK-cancelled': { ...base, status: 'cancelled', paymentStatus: 'cancelled' },
    'BK-expired': { ...base, paymentMethod: 'credit', status: 'cancelled', paymentStatus: 'expired' },
    'BK-review': { ...base, paymentMethod: 'credit', status: 'payment_review', paymentStatus: 'pending_review' },
    'BK-no-email': { ...base, email: '' },
    'BK-too-new': { ...base, createdAt: ts(NOW - 5 * 60000) },
    'BK-before-cutoff': { ...base, createdAt: ts(CUTOFF - 60000) },
  });
  assert.deepStrictEqual(await n.sweepUnpaid(), { sent: 1, failed: 0 });
  assert.deepStrictEqual(sent.map(m => m.key), ['unpaid-BK-unpaid']);
  assert.strictEqual(sent[0].to, 'a@b.c');
  assert.match(sent[0].text, /ההרשמה אינה בתוקף, ולא נשמר עבורך מקום בסיור, עד להשלמת התשלום/);
  assert.ok(!sent[0].text.includes('not valid'));
  assert.strictEqual(db.store.get('BK-unpaid').unpaidNoticeAttempts, 1);
  assert.deepStrictEqual(await n.sweepUnpaid(), { sent: 0, failed: 0 });
  assert.strictEqual(sent.length, 1);
});

test('unpaid sweep: English registrants get Hebrew + English', async () => {
  const { n, sent } = setup({ 'BK-en': { ...base, language: 'en' } });
  await n.sweepUnpaid();
  assert.match(sent[0].text, /אינה בתוקף/);
  assert.match(sent[0].text, /not valid, and no seat is held for you, until payment is completed/);
  assert.match(sent[0].subject, /Payment required/);
});

test('unpaid sweep: failures are retried, but at most UNPAID_MAX_ATTEMPTS times', async () => {
  let calls = 0;
  const { n, db } = setup({ 'BK-1': base }, async () => { calls++; throw new Error('550 no such user'); });
  for (let i = 0; i < UNPAID_MAX_ATTEMPTS + 2; i++) await n.sweepUnpaid();
  assert.strictEqual(calls, UNPAID_MAX_ATTEMPTS);
  assert.strictEqual(db.store.get('BK-1').unpaidNoticeSentAt, null);
  assert.match(db.store.get('BK-1').unpaidNoticeError, /550/);
});

test('gmail sender: smtp.gmail.com:465 secure as hr20192022@gmail.com, no network', async () => {
  const created = [], mails = [];
  const nodemailer = { createTransport: cfg => { created.push(cfg); return { sendMail: async m => { mails.push(m); return { messageId: m.messageId }; } }; } };
  const send = createGmailSender('app-pass', { nodemailer });
  await send({ to: 'x@y.z', subject: 's', text: 't', html: '<p>t</p>', key: 'unpaid-BK-1' });
  await send({ to: 'o@y.z', subject: 's2', text: 't2', html: '', key: 'owner-BK-1', replyTo: 'c@d.e' });
  assert.deepStrictEqual(created, [{ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: 'hr20192022@gmail.com', pass: 'app-pass' } }]);
  assert.strictEqual(mails[0].from.address, 'hr20192022@gmail.com');
  assert.strictEqual(mails[0].to, 'x@y.z');
  assert.strictEqual(mails[0].messageId, '<unpaid-BK-1@notifications.chilik-tours.com>');
  assert.ok(!('replyTo' in mails[0]));
  assert.strictEqual(mails[1].replyTo, 'c@d.e');
});

test('gmail sender: refuses to send without the app password', async () => {
  const nodemailer = { createTransport: () => assert.fail('must not connect') };
  await assert.rejects(createGmailSender('', { nodemailer })({ to: 'x@y.z', key: 'k' }), /gmail-app-password-missing/);
});

test('gmail sender: real nodemailer transport builds the message without network (jsonTransport)', async () => {
  const real = require('nodemailer');
  const out = [];
  const nodemailer = { createTransport: cfg => { assert.strictEqual(cfg.host, 'smtp.gmail.com'); const t = real.createTransport({ jsonTransport: true }); return { sendMail: async m => { out.push(JSON.parse((await t.sendMail(m)).message)); } }; } };
  await createGmailSender('p', { nodemailer })({ to: 'x@y.z', subject: 'ההרשמה טרם הושלמה', text: 'שלום', html: '<p>שלום</p>', key: 'unpaid-BK-9' });
  assert.strictEqual(out[0].from.address, 'hr20192022@gmail.com');
  assert.strictEqual(out[0].subject, 'ההרשמה טרם הושלמה');
  assert.strictEqual(out[0].messageId, '<unpaid-BK-9@notifications.chilik-tours.com>');
});
