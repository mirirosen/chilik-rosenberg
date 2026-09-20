'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const crypto = require('crypto');
const c = require('../src/payment-core');
test('valid input uses server-owned price', () => assert.deepEqual(c.validateBookingInput({name:'A',phone:'0501234567',email:'a@b.co',tourDate:'2026-10-01',participants:2}), {participants:2,amount:500}));
test('rejects bad participant bounds', () => assert.throws(() => c.validateBookingInput({name:'A',phone:'0501234567',email:'a@b.co',tourDate:'2026-10-01',participants:21}), /invalid-participants/));
test('signature verifies exact raw bytes only', () => { const b=Buffer.from('{"a":1}'),s=crypto.createHmac('sha256','k').update(b).digest('hex'); assert.equal(c.verifyWebhookSignature(b,s,'k'),true); assert.equal(c.verifyWebhookSignature(Buffer.from('{"a": 1}'),s,'k'),false); });
test('timestamp replay window enforced', () => { assert.equal(c.isFreshTimestamp(new Date().toISOString()),true); assert.equal(c.isFreshTimestamp('2020-01-01T00:00:00Z'),false); });
test('webhook extracts transaction facts', () => assert.deepEqual(c.webhookFacts({custom:'BK-x',total:500,transactions:[{id:'tx',currency:'ILS',total:500}]}),{bookingId:'BK-x',amount:500,currency:'ILS',transactionId:'tx'}));
test('payment form has trusted amount and callback binding', () => { const p=c.paymentPayload({bookingId:'BK-x',totalPrice:500,name:'N',email:'a@b.co',phone:'0501234567',participants:2,tourDate:'2026-10-01'},{success:'https://x/s',failure:'https://x/f',notify:'https://x/n'}); assert.equal(p.amount,500); assert.equal(p.custom,'BK-x'); assert.equal(p.group,100); });
test('rejects malformed signature without throwing', () => assert.equal(c.verifyWebhookSignature(Buffer.from('{}'),'nope','k'),false));
test('hold expires fifteen minutes later', () => assert.equal(c.holdExpiresAt(0).toISOString(),'1970-01-01T00:15:00.000Z'));

test('webhook can recover booking id from signed description', () => assert.equal(c.webhookFacts({description:'Chilik tour booking BK-0123456789abcdefabcd',total:250,transactions:[{id:'t',currency:'ILS'}]}).bookingId,'BK-0123456789abcdefabcd'));
