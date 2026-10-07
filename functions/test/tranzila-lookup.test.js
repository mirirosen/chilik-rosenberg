'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createTranzilaAdapter}=require('../src/providers/tranzila');
const {loadPaymentConfiguration}=require('../src/payment-runtime');
const NOW=Date.parse('2026-10-05T13:30:00Z');
const config={enabled:true,merchantConfigurationVerified:true,reportContractVerified:true,terminal:'fixture-terminal',appKey:'fixture-key',secret:'fixture-secret',checkoutUrl:'https://directng.tranzila.com/fixture-terminal/',orderParameter:'order_ref',orderReportField:'user_defined_20',checkoutTranmode:'FIXTURE_MODE',capturePairs:[{txnType:'FIXTURE_CAPTURE',tranmode:'FIXTURE_MODE',transtatus:1}],orderLookupVerified:true,orderFilterParameter:'order_ref'};
const booking={bookingId:'BK-'+'c'.repeat(24),paymentTerminal:config.terminal,totalPrice:500,createdAt:{toMillis:()=>NOW-60000}};
const row=index=>({index,child_terminal:config.terminal,user_defined_20:booking.bookingId,credit_card_token:'fixture-private-card-token'});
const adapter=respond=>createTranzilaAdapter({config,clock:()=>NOW,fetchImpl:async(url,options)=>({ok:true,json:async()=>respond(url,JSON.parse(options.body))})});
test('lost callback lookup uses documented exact filter, inclusive dates and complete pagination; returns only indexes',async()=>{
  const requests=[];
  const p=adapter((url,body)=>{requests.push({url,body});return {total:'12',rows:body.page===1?10:2,transactions:Array.from({length:body.page===1?10:2},(_,i)=>row(body.page===1?i+1:i+11))};});
  const result=await p.findTransactionIndexes({booking});
  assert.equal(requests.length,2); assert.equal(requests[0].url,'https://report.tranzila.com/v1/transaction');
  assert.deepEqual(requests[0].body.ufields,[{name:'order_ref',operator:'equals',value:booking.bookingId}]);
  assert.equal(requests[0].body.transaction_start_date,'2026-10-04'); assert.equal(requests[0].body.transaction_end_date,'2026-10-06');
  assert.equal(requests[0].body.transaction_index,undefined); assert.equal(requests[1].body.page,2);
  assert.deepEqual(result,{complete:true,transactionIndexes:Array.from({length:12},(_,i)=>i+1)});
  assert.ok(!JSON.stringify(result).includes('card-token'));
});
test('empty complete report is distinct from malformed, partial, unstable and unrelated reports',async()=>{
  assert.deepEqual(await adapter(()=>({total:'0',rows:0,transactions:[]})).findTransactionIndexes({booking}),{complete:true,transactionIndexes:[]});
  for(const report of [{transactions:[]},{total:'2',rows:1,transactions:[row(1)]},{total:'1',rows:1,transactions:[{...row(1),child_terminal:'other'}]},{total:'1',rows:1,transactions:[{...row(1),user_defined_20:'other-order'}]},{total:'1',rows:2,transactions:[row(1)]},{total:'21',rows:0,transactions:[]},{total:'1',rows:1,transactions:[row(0)]},{total:'1',rows:1,transactions:[row(1)],error_code:7}]) await assert.rejects(adapter(()=>report).findTransactionIndexes({booking}),/lookup-incomplete/);
  await assert.rejects(adapter((_url,body)=>body.page===1?{total:11,rows:10,transactions:Array.from({length:10},(_,i)=>row(i+1))}:{total:12,rows:1,transactions:[row(11)]}).findTransactionIndexes({booking}),/lookup-incomplete/);
});
test('lookup remains blocked without merchant lookup contract, terminal binding or bounded creation time',async()=>{
  let calls=0;
  const disabled=createTranzilaAdapter({config:{...config,orderLookupVerified:false},fetchImpl:async()=>{calls++;}});
  await assert.rejects(disabled.findTransactionIndexes({booking}),/not-configured/); assert.equal(calls,0);
  const p=adapter(()=>{calls++;return {};});
  await assert.rejects(p.findTransactionIndexes({booking:{...booking,paymentTerminal:'other'}}),/invalid-booking-reference/);
  await assert.rejects(p.findTransactionIndexes({booking:{...booking,createdAt:{toMillis:()=>NOW-49*3600000}}}),/window-invalid/); assert.equal(calls,0);
});
test('single transaction report cannot authenticate an error payload with a matching-looking row',async()=>{
  await assert.rejects(adapter(()=>({error_code:9,transactions:[{...row(1),amount:500,currency:'1',processor_response_code:'000',txn_payment_method:'CC',txn_type:'FIXTURE_CAPTURE',tranmode:'FIXTURE_MODE',transtatus:1,cancelfdid:null,cancelfdnumber:null}]})).verifyTransaction({booking,transactionIndex:1}),/verification-pending/);
});
