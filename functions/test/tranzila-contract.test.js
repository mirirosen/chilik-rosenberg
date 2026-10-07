'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {HANDSHAKE_URL,VERIFIED_TERMINAL_METADATA,validHandshakeResponse}=require('../src/providers/tranzila-contract');
const {createTranzilaAdapter}=require('../src/providers/tranzila');
const {paymentConfigurationIssues}=require('../src/configuration-readiness');
const config={enabled:true,merchantConfigurationVerified:true,reportContractVerified:true,terminal:'test-terminal',checkoutUrl:'https://directng.tranzila.com/test-terminal/',appKey:'test-key',secret:'test-secret',orderParameter:'order_id',orderReportField:'user_defined_3',checkoutTranmode:'FIXTURE_MODE',capturePairs:[{txnType:'FIXTURE_CAPTURE',tranmode:'FIXTURE_MODE',transtatus:1}]};
const booking={bookingId:'BK-'+'a'.repeat(24),totalPrice:500,language:'he',paymentTerminal:'test-terminal'};
const urls={success:'https://example.com/success',failure:'https://example.com/failure',notify:'https://example.com/notify'};
test('verified field mapping and Handshake facts cannot satisfy remaining financial release gates',()=>{
 assert.ok(Object.isFrozen(VERIFIED_TERMINAL_METADATA));
 assert.equal(VERIFIED_TERMINAL_METADATA.reportField,'user_defined_10');
 const issues=paymentConfigurationIssues({...VERIFIED_TERMINAL_METADATA,enabled:false,merchantConfigurationVerified:false,reportContractVerified:false});
 assert.ok(issues.includes('payment-runtime-disabled'));assert.ok(issues.includes('merchant-configuration-unverified'));assert.ok(issues.includes('report-capture-and-cancellation-contract-unverified'));
});
test('Handshake response contract returns only a boolean for valid bounded token shapes',()=>{
 const token='FIXTURE_PRIVATE_TOKEN_0123456789';assert.equal(validHandshakeResponse({error_code:0,thtk:token}),true);
 for(const body of [null,[],{error_code:'0',thtk:token},{error_code:7,thtk:token},{error_code:0,thtk:'short'},{error_code:0,thtk:'x'.repeat(257)},{error_code:0,thtk:'bad whitespace value!!!!!!'}])assert.equal(validHandshakeResponse(body),false);
});
test('checkout translates Hebrew to il and retains en while using the tested fixed Handshake endpoint',async()=>{
 for(const [language,expected] of [['he','il'],['en','en'],[undefined,'il']]) {
 let request;const adapter=createTranzilaAdapter({config,fetchImpl:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({error_code:0,thtk:'fixture-handshake-token'})};}});
 const out=await adapter.createCheckout({booking:{...booking,language},urls});const parsed=new URL(out.paymentUrl);
 assert.equal(request.url,HANDSHAKE_URL);assert.equal(parsed.searchParams.get('lang'),expected);assert.equal(JSON.parse(request.options.body).sum,500);
 }
});
test('invalid successful-looking Handshake responses cannot create a checkout URL',async()=>{
 for(const body of [null,[],{error_code:0},{error_code:'0',thtk:'fixture-handshake-token'},{error_code:0,thtk:'x'.repeat(257)}]) {
 const adapter=createTranzilaAdapter({config,fetchImpl:async()=>({ok:true,json:async()=>body})});await assert.rejects(adapter.createCheckout({booking,urls}),error=>error.code==='payment-provider-unavailable'); }
});
