const test = require('node:test'); const assert = require('node:assert');
const { ownerEmail, unpaidEmail, isPaid } = require('../src/render');
const b = { name: 'בדיקה', phone: '0500000000', email: 'a@b.c', tourDate: '2026-11-05', participants: 2, notes: 'x', language: 'en', status: 'pending', paymentStatus: 'pending' };
test('owner', () => { const m = ownerEmail('BK-1', b); for (const v of ['BK-1', 'בדיקה', '0500000000', 'a@b.c', '2026-11-05', 'pending', 'en']) assert.ok(m.text.includes(v)); });
test('unpaid he+en', () => { const m = unpaidEmail('BK-1', b); assert.ok(m.text.includes('אינה בתוקף')); assert.ok(m.text.includes('not valid')); });
test('unpaid he only + link', () => { const m = unpaidEmail('BK-1', { ...b, language: 'he', paymentUrl: 'https://pay' }); assert.ok(!m.text.includes('not valid')); assert.ok(m.text.includes('https://pay')); });
test('paid', () => { assert.ok(isPaid({ paymentStatus: 'paid' })); assert.ok(!isPaid(b)); });
