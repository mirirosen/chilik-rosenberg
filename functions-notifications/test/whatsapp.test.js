const test = require('node:test'); const assert = require('node:assert');
const T = require('../src/whatsapp');
const { createWaNotifier, CUSTOMER_MAX_PER_HOUR } = require('../src/wa-notifier');
const ts = ms => ({ toMillis: () => ms });
const CUT = Date.parse('2026-10-26T06:55:00Z');
function fakeDb(docs) {
  const store = new Map(Object.entries(docs));
  const ref = id => ({ id, update: async p => store.set(id, { ...store.get(id), ...p }) });
  const snap = (id, ms = CUT + 1000) => ({ id, ref: ref(id), exists: store.has(id), data: () => store.get(id), get: f => store.get(id)?.[f], createTime: ts(ms) });
  return { store, snap, doc: p => ref(p),
    runTransaction: async fn => { const w = []; const r = await fn({ get: async rf => snap(rf.id), update: (rf, p) => w.push([rf.id, p]), set: (rf, p) => w.push([rf.id, p]) }); w.forEach(([id, p]) => store.set(id, { ...store.get(id), ...p })); return r; } };
}
const b = { name: 'טל כהן', phone: '050-1234567', tourDate: '2026-11-05', participants: 7, totalPrice: 1750, paymentMethod: 'credit', status: 'payment_pending', paymentStatus: 'awaiting_payment' };
const mk = (db, extra = {}) => { const sent = []; const n = createWaNotifier({ db, send: async (to, text) => { sent.push({ to, text }); return 'id1'; }, cutoffMs: CUT, serverTimestamp: () => 'TS', ...extra }); return { n, sent }; };

test('new booking after cutoff -> one owner message with all fields', async () => {
  const db = fakeDb({ 'BK-1': { ...b } }); const { n, sent } = mk(db);
  await n.onCreated(db.snap('BK-1')); await n.onCreated(db.snap('BK-1'));
  assert.equal(sent.length, 1); assert.equal(sent[0].to, '972506724312');
  for (const v of ['טל כהן', '050-1234567', '05.11', '7', 'לא שולם', 'BK-1', '1750']) assert.ok(sent[0].text.includes(v), v);
});
test('old booking before cutoff -> nothing', async () => {
  const db = fakeDb({ 'BK-1': { ...b } }); const { n, sent } = mk(db);
  assert.deepEqual(await n.onCreated(db.snap('BK-1', CUT - 1)), { skipped: 'cutoff' }); assert.equal(sent.length, 0);
});
test('paid transition -> one owner paid message; non-transition ignored; old ignored', async () => {
  const db = fakeDb({ 'BK-1': { ...b, paymentStatus: 'paid', status: 'confirmed' } }); const { n, sent } = mk(db);
  const before = { data: () => b }, after = db.snap('BK-1');
  await n.onUpdated(before, after); await n.onUpdated(before, after);
  await n.onUpdated({ data: () => ({ ...b, paymentStatus: 'paid' }) }, after);
  assert.equal(sent.length, 1); assert.ok(sent[0].text.includes('התקבל תשלום'));
  assert.deepEqual(await n.onUpdated(before, db.snap('BK-1', CUT - 1)), { skipped: 'cutoff' });
});
test('customer flag OFF never messages customers', async () => {
  const db = fakeDb({ 'BK-1': { ...b, paymentStatus: 'paid' } }); const { n, sent } = mk(db);
  await n.onCreated(db.snap('BK-1')); await n.onUpdated({ data: () => b }, db.snap('BK-1'));
  assert.ok(sent.every(s => s.to === '972506724312'));
});
test('customer flag ON: received + paid, rate limited', async () => {
  const db = fakeDb({ 'BK-1': { ...b } }); const { n, sent } = mk(db, { customerEnabled: true });
  await n.onCreated(db.snap('BK-1'));
  assert.deepEqual(sent.map(s => s.to), ['972506724312', '972501234567']);
  db.store.set(`whatsappRate/customer-${new Date().toISOString().slice(0, 13)}`, { count: CUSTOMER_MAX_PER_HOUR });
  db.store.set('BK-2', { ...b }); await n.onCreated(db.snap('BK-2'));
  assert.equal(sent.filter(s => s.to !== '972506724312').length, 1);
});
test('send failure recorded, not retried', async () => {
  const db = fakeDb({ 'BK-1': { ...b } });
  let calls = 0; const n = createWaNotifier({ db, send: async () => { calls++; throw new Error('waha-send-failed-500'); }, cutoffMs: CUT, serverTimestamp: () => 'TS' });
  await n.onCreated(db.snap('BK-1')); await n.onCreated(db.snap('BK-1'));
  assert.equal(calls, 1); assert.equal(db.store.get('BK-1').waOwnerNewSentAtError, 'waha-send-failed-500');
});
test('sender: health must be WORKING with the expected number', async () => {
  const calls = []; const f = async (url, o) => { calls.push(url); return url.endsWith('/sendText') ? { ok: true, json: async () => ({ id: 'true_x@c.us_ABC' }) } : { ok: true, json: async () => ({ status: 'WORKING', me: { id: '972553094372@c.us' } }) }; };
  const s = T.createWahaSender({ origin: 'https://waha.example', apiKey: 'k', fetchImpl: f });
  assert.equal(await s('972506724312', 'hi'), 'true_x@c.us_ABC');
  const bad = T.createWahaSender({ origin: 'https://waha.example', apiKey: 'k', fetchImpl: async () => ({ ok: true, json: async () => ({ status: 'WORKING', me: { id: '972500000000@c.us' } }) }) });
  await assert.rejects(bad('972506724312', 'hi'), /session-unavailable/);
  await assert.rejects(s('123', 'hi'), /invalid-recipient/);
  assert.throws(() => T.createWahaSender({ origin: 'http://x', apiKey: 'k' }), /not-configured/);
});
test('toIntl', () => { assert.equal(T.toIntl('0501234567'), '972501234567'); assert.equal(T.toIntl('abc'), ''); });
