'use strict';
const test = require('node:test');
const assert = require('node:assert');
const r = require('../src/customer-render');
const fns = Object.keys(r).filter(k => /Email$/.test(k) && typeof r[k] === 'function');

test('customer emails isolate the name in greetings (FSI/PDI) so the comma stays after it', () => {
  assert.ok(fns.length >= 2, 'expected received + confirmed renderers');
  const b = { name: 'ישראל <b>ישראלי</b>', email: 'x@example.com', tourDate: '2026-11-05', participants: 2, totalPrice: 360,
    paymentMethod: 'credit', paymentProvider: 'tranzila', paymentStatus: 'paid', status: 'confirmed' };
  for (const k of fns) {
    const m = r[k]('BK-1', b, Date.now());
    assert.ok(m.text.includes('Hello \u2068ישראל <b>ישראלי</b>\u2069,'), k + ' text en');
    assert.ok(m.text.includes('שלום \u2068ישראל <b>ישראלי</b>\u2069,'), k + ' text he');
    assert.ok(m.html.includes('Hello \u2068ישראל &lt;b&gt;ישראלי&lt;/b&gt;\u2069,'), k + ' html en escaped+isolated');
    assert.ok(!m.html.includes('<b>ישראלי</b>'), k + ' no raw html');
  }
});
