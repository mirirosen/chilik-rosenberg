const test = require('node:test'); const assert = require('node:assert');
const { ownerEmail, unpaidEmail, isPaid, isClosed } = require('../src/render');
const b = { name: 'בדיקה', phone: '0500000000', email: 'a@b.c', tourDate: '2026-11-05', participants: 2, notes: 'x', language: 'en', status: 'pending', paymentStatus: 'pending' };
const at = ms => ({ toMillis: () => ms });
test('owner', () => { const m = ownerEmail('BK-1', b); for (const v of ['BK-1', 'בדיקה', '0500000000', 'a@b.c', '2026-11-05', 'pending', 'en']) assert.ok(m.text.includes(v)); });
test('owner html escapes user input', () => { const m = ownerEmail('BK-1', { ...b, notes: '<script>"x"\'' }); assert.ok(!m.html.includes('<script>')); assert.ok(m.html.includes('&lt;script&gt;&quot;x&quot;&#39;')); });
test('unpaid he+en', () => { const m = unpaidEmail('BK-1', b); assert.ok(m.text.includes('אינה בתוקף')); assert.ok(m.text.includes('לא נשמר עבורך מקום')); assert.ok(m.text.includes('not valid')); assert.ok(m.text.includes('no seat is held')); });
test('unpaid he only when language is he or missing', () => {
  for (const language of ['he', undefined, 'fr']) { const m = unpaidEmail('BK-1', { ...b, language }); assert.ok(!m.text.includes('not valid')); assert.ok(!m.subject.includes('Payment required')); }
});
test('unpaid link only while the payment hold is open', () => {
  const live = { ...b, language: 'he', paymentStatus: 'awaiting_payment', paymentUrl: 'https://pay', holdExpiresAt: at(2000) };
  assert.ok(unpaidEmail('BK-1', live, 1000).text.includes('https://pay'));
  const stale = unpaidEmail('BK-1', live, 3000).text;
  assert.ok(!stale.includes('https://pay')); assert.ok(stale.includes('050-6724312'));
  assert.ok(!unpaidEmail('BK-1', { ...b, paymentUrl: 'https://pay' }, 1000).text.includes('https://pay'));
});
test('paid matches live booking fields', () => {
  assert.ok(isPaid({ paymentStatus: 'paid', status: 'confirmed' }));
  assert.ok(isPaid({ paymentStatus: 'pending', status: 'confirmed' }));
  assert.ok(!isPaid(b)); assert.ok(!isPaid({ status: 'payment_pending', paymentStatus: 'awaiting_payment' }));
});
test('closed bookings', () => {
  for (const x of [{ status: 'cancelled', paymentStatus: 'cancelled' }, { status: 'cancelled', paymentStatus: 'expired' }, { status: 'cancelled', paymentStatus: 'failed' }, { status: 'payment_review', paymentStatus: 'pending_review' }]) assert.ok(isClosed(x));
  assert.ok(!isClosed(b)); assert.ok(!isClosed({ status: 'payment_pending', paymentStatus: 'awaiting_payment' }));
});
