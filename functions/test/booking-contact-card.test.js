'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { renderContactCard, contactLink, contactSuffix, CONTACT_BUTTON_URL } = require('../src/booking-contact-card');
const { createBookingApi } = require('../src/api');
const ID = 'BK-000000000000000000000001';
const BOOKING = { bookingId: ID, schemaVersion: 2, status: 'confirmed', capacityReserved: true, ownerUid: 'fixture-owner', name: 'ישראל ישראל', phone: '0500000001', tourDate: '2026-10-08', participants: 2, email: 'excluded@example.test', dateOfBirth: '1990-01-01', notes: 'EXCLUDED_PRIVATE_NOTES', paymentStatus: 'paid' };
const unfold = text => text.replace(/\r\n /g, '');
function setup({ booking = BOOKING, readError } = {}) {
  let reads = 0, verifies = 0;
  const api = createBookingApi({ enabled: true, onRequest: (_options, handler) => handler, onSchedule: (_options, handler) => handler,
    bookings: { bookingRef: id => { assert.equal(id, ID); return { get: async () => { reads++; if (readError) throw new Error(readError); return { exists: !!booking, data: () => booking }; } }; } },
    verifyIdToken: async (token, revoked) => {
      verifies++; assert.equal(revoked, true);
      if (token === 'revoked' || token === 'invalid') throw new Error('PRIVATE_TOKEN_CONTENT');
      return { uid: token, admin: ['admin','anonymous-admin','missing-provider'].includes(token), firebase: { sign_in_provider: token === 'anonymous-admin' ? 'anonymous' : token === 'missing-provider' ? undefined : 'password' } };
    }, logger: { error: () => { throw new Error('contact endpoint must not log'); } },
  });
  async function call({ token = 'admin', method = 'GET', query = { id: ID }, origin } = {}) {
    const headers = { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(origin ? { origin } : {}) };
    const req = { method, query, get: name => headers[name.toLowerCase()] };
    const res = { headers: {}, status(n) { this.statusCode = n; return this; }, set(k, v) { this.headers[k] = v; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; }, end() { return this; } };
    await api.adminBookingContactCard(req, res);
    assert.equal(res.headers['Cache-Control'], 'private, no-store, max-age=0');
    assert.equal(res.headers['Referrer-Policy'], 'no-referrer'); assert.equal(res.headers['X-Robots-Tag'], 'noindex, nofollow, noarchive');
    assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
    assert.ok(!JSON.stringify(res.headers).includes(BOOKING.name));
    return res;
  }
  return { call, reads: () => reads, verifies: () => verifies };
}
test('synthetic Hebrew card has only FN and registrant TEL, UTF8 CRLF and requested display format', () => {
  const bytes = renderContactCard(BOOKING), text = unfold(bytes.toString('utf8'));
  assert.equal(text, 'BEGIN:VCARD\r\nVERSION:4.0\r\nFN;LANGUAGE=he:ישראל ישראל ב־08.10 2 אנשים\r\nTEL;VALUE=uri;TYPE=cell:tel:+972500000001\r\nEND:VCARD\r\n');
  assert.deepEqual(Buffer.from(bytes.toString('utf8'), 'utf8'), bytes);
  for (const excluded of [BOOKING.email, BOOKING.dateOfBirth, BOOKING.notes, ID, 'ownerUid', 'payment']) assert.ok(!text.includes(excluded));
});
test('backslash, comma and semicolon are escaped; long UTF8 lines fold at 75 octets without corrupting codepoints', () => {
  const text = renderContactCard({ ...BOOKING, name: 'א\\ב,ג;ד🙂'.repeat(10) }).toString('utf8');
  assert.ok(unfold(text).includes('א\\\\ב\\,ג\\;ד🙂')); assert.ok(text.includes('\r\n '));
  for (const line of text.trimEnd().split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  assert.ok(!text.includes('\ufffd'));
});
test('CRLF/property injection, controls, bidi overrides, malformed phone/date/count are rejected', () => {
  for (const name of ['bad\r\nTEL:secret','bad\nEND:VCARD','bad\rNOTE:x','bad\u0000name','bad\u202ename','bad\u2028name','\ud800']) assert.throws(() => renderContactCard({ ...BOOKING, name }), /invalid-contact-data/);
  for (const phone of ['0500000001\r\nEMAIL:leak','0500000001;ext=1','https://example.test','+972500000001\u0000']) assert.throws(() => renderContactCard({ ...BOOKING, phone }), /invalid-contact-data/);
  for (const patch of [{ tourDate:'2026-02-30' },{tourDate:'08.10.2026'},{participants:0},{participants:21},{participants:'2'}]) assert.throws(() => renderContactCard({ ...BOOKING, ...patch }), /invalid-contact-data/);
  assert.ok(renderContactCard({ ...BOOKING, phone: '+972500000001' }).equals(renderContactCard(BOOKING)));
});
test('alert locator contains no PII/token, and CTA suffix resolves to the same exact fragment route', () => {
  assert.equal(contactLink(ID), 'https://www.chilik-tours.com/admin#contact=BK-000000000000000000000001');
  assert.equal(CONTACT_BUTTON_URL.replace('{{4}}', contactSuffix(ID)), contactLink(ID));
  const url = new URL(contactLink(ID)); assert.equal(url.pathname, '/admin'); assert.equal(url.search, '');
  for (const id of ['../secret', ID+'\r\n', ['BK-other'], 'BK-'+'f'.repeat(20), ID+'?name=x']) assert.throws(() => contactLink(id));
});
test('actual API export authenticates revoked-token-checking admin before reading and generates attachment on request', async () => {
  const f = setup(), res = await f.call({ origin:'https://www.chilik-tours.com' });
  assert.equal(res.statusCode, 200); assert.equal(f.reads(), 1); assert.equal(f.verifies(), 1);
  assert.ok(Buffer.isBuffer(res.body)); assert.equal(res.headers['Content-Type'], 'text/vcard; charset=utf-8');
  assert.equal(res.headers['Content-Disposition'], 'attachment; filename="booking-contact.vcf"');
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://www.chilik-tours.com');
});
test('missing/revoked tokens, customer owner/other, anonymous-admin and missing identity-provider fail before any booking read', async () => {
  for (const token of [null,'revoked','invalid','fixture-owner','other','anonymous-admin','missing-provider']) {
    const f = setup(), res = await f.call({ token });
    assert.ok([401,403].includes(res.statusCode)); assert.equal(f.reads(), 0); assert.ok(!JSON.stringify(res.body).includes('PRIVATE_TOKEN_CONTENT'));
  }
});
test('malformed IDs, query arrays, extra PII query keys, wrong method and disallowed origins cannot access arbitrary booking data', async () => {
  for (const query of [{},{id:[ID]},{id:'../secret'},{id:ID,name:'leak'},{id:ID+'?phone=x'}]) {
    const f = setup(), res = await f.call({ query }); assert.equal(res.statusCode,400); assert.equal(f.reads(),0);
  }
  for (const options of [{method:'POST'},{method:'HEAD'},{origin:'https://evil.example.test'}]) {
    const f = setup(), res = await f.call(options); assert.ok([403,405].includes(res.statusCode)); assert.equal(f.reads(),0);
  }
  const f=setup(), preflight=await f.call({method:'OPTIONS',token:null,origin:'https://www.chilik-tours.com'});
  assert.equal(preflight.statusCode,204); assert.equal(f.reads(),0); assert.equal(f.verifies(),0); assert.equal(preflight.body,undefined);
});
test('missing, legacy, cancelled, pending or mismatched bookings fail closed and errors never disclose data', async () => {
  for (const booking of [null,{...BOOKING,schemaVersion:1},{...BOOKING,status:'cancelled'},{...BOOKING,status:'pending'},{...BOOKING,capacityReserved:false},{...BOOKING,bookingId:'BK-other'}]) {
    const res=await setup({booking}).call(); assert.equal(res.statusCode,404); assert.deepEqual(res.body,{error:'not-found'});
  }
  const res=await setup({readError:'EXCLUDED_PRIVATE_NOTES SECRET DATABASE PATH'}).call(); assert.equal(res.statusCode,503); assert.deepEqual(res.body,{error:'contact-unavailable'});
  const invalid=await setup({booking:{...BOOKING,name:'evil\r\nEND:VCARD'}}).call(); assert.equal(invalid.statusCode,409); assert.deepEqual(invalid.body,{error:'invalid-contact-data'});
});
test('admin landing response policy blocks indexing, caching and referrer propagation', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname,'../../firebase.booking.review.json'),'utf8').replace(/^\ufeff/,''));
  const headers = Object.fromEntries(config.hosting.headers.find(h=>h.source==='/admin').headers.map(h=>[h.key,h.value]));
  assert.match(headers['X-Robots-Tag'],/noindex/); assert.equal(headers['Referrer-Policy'],'no-referrer'); assert.match(headers['Cache-Control'],/no-store/);
});
