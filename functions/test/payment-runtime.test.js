'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { readFileSync } = require('node:fs'), vm = require('node:vm'), { createRequire } = require('node:module');
const { loadPaymentConfiguration, returnUrlIssues, createReturnUrls, createRuntimePaymentFlow } = require('../src/payment-runtime');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createBookingService } = require('../src/booking-service');
const { INPUT, NOW } = require('./helpers/offline-system');
const ENV = { TRANZILA_ENABLED:'true', TRANZILA_MERCHANT_CONFIGURATION_VERIFIED:'true', TRANZILA_REPORT_CONTRACT_VERIFIED:'true', TRANZILA_TERMINAL:'fixture-terminal', TRANZILA_CHECKOUT_URL:'https://directng.tranzila.com/fixture-terminal/', TRANZILA_ORDER_PARAMETER:'order_ref', TRANZILA_ORDER_REPORT_FIELD:'user_defined_20', TRANZILA_CHECKOUT_TRANMODE:'FIXTURE_MODE', TRANZILA_CAPTURE_PAIRS_JSON:JSON.stringify([{txnType:'FIXTURE_CAPTURE',tranmode:'FIXTURE_MODE',transtatus:1}]), PAYMENT_SITE_ORIGIN:'https://www.chilik-tours.com', PAYMENT_API_BASE:'https://us-central1-hilik-site.cloudfunctions.net', GCLOUD_PROJECT:'hilik-site' };
const secrets = name => name === 'TRANZILA_API_APP_KEY' ? 'fixture-app-key' : 'fixture-secret';
test('default and malformed configurations fail closed without reading secrets', () => {
  for (const env of [{}, {...ENV,TRANZILA_ENABLED:'TRUE'}, {...ENV,TRANZILA_MERCHANT_CONFIGURATION_VERIFIED:'false'}, {...ENV,TRANZILA_REPORT_CONTRACT_VERIFIED:'false'}, {...ENV,TRANZILA_CAPTURE_PAIRS_JSON:'['}, {...ENV,TRANZILA_CAPTURE_PAIRS_JSON:'{}'}, {...ENV,TRANZILA_ORDER_REPORT_FIELD:''}, {...ENV,PAYMENT_SITE_ORIGIN:'https://evil.test'}]) {
    let reads=0; const result=loadPaymentConfiguration({env,readSecret:()=>{reads++;throw new Error('private-secret-detail');}});
    assert.ok(result.paymentIssues.length); assert.equal(reads,0); assert.equal(result.reconciliationEnabled,false);
    assert.ok(!JSON.stringify(result.paymentIssues).includes('private-secret-detail'));
  }
});
test('explicit configuration maps names, validates secrets privately and independently gates lookup', () => {
  const names=[]; const result=loadPaymentConfiguration({env:ENV,readSecret:name=>{names.push(name);return secrets(name);}});
  assert.deepEqual(result.paymentIssues,[]); assert.deepEqual(names,['TRANZILA_API_APP_KEY','TRANZILA_API_SECRET']);
  assert.ok(result.reconciliationIssues.includes('payment-reconciliation-disabled'));
  assert.ok(result.reconciliationIssues.includes('order-lookup-contract-unverified'));
  const ready=loadPaymentConfiguration({env:{...ENV,PAYMENT_RECONCILIATION_ENABLED:'true',TRANZILA_ORDER_LOOKUP_VERIFIED:'true',TRANZILA_ORDER_FILTER_PARAMETER:'order_ref'},readSecret:secrets});
  assert.deepEqual(ready.reconciliationIssues,[]);
  const broken=loadPaymentConfiguration({env:ENV,readSecret:()=>{throw new Error('private-key');}});
  assert.ok(broken.paymentIssues.includes('payment-secrets-unavailable')); assert.ok(!JSON.stringify(broken.paymentIssues).includes('private-key'));
});
test('return URL configuration rejects redirects, injected ids, wrong project and noncanonical roots', () => {
  const valid={siteOrigin:ENV.PAYMENT_SITE_ORIGIN,apiBase:ENV.PAYMENT_API_BASE,projectId:ENV.GCLOUD_PROJECT};
  assert.deepEqual(returnUrlIssues(valid),[]);
  for (const patch of [{siteOrigin:'http://www.chilik-tours.com'},{siteOrigin:'https://www.chilik-tours.com.evil.test'},{siteOrigin:'https://user@www.chilik-tours.com'},{siteOrigin:'https://www.chilik-tours.com/booking'},{siteOrigin:'https://www.chilik-tours.com?next=evil'},{siteOrigin:'https://www.chilik-tours.com/#x'},{siteOrigin:'https://www.chilik-\ntours.com'},{apiBase:'https://us-central1-other-project.cloudfunctions.net'},{apiBase:'https://us-central1-hilik-site.cloudfunctions.net:444'},{projectId:''},{projectId:'wrong-project',apiBase:'https://us-central1-wrong-project.cloudfunctions.net'},{apiBase:'https://europe-west1-hilik-site.cloudfunctions.net'}]) assert.ok(returnUrlIssues({...valid,...patch}).length);
  const urlsFor=createReturnUrls(valid), id='BK-'+'b'.repeat(24), urls=urlsFor(id);
  assert.equal(new URL(urls.success).searchParams.get('id'),id);
  assert.equal(new URL(urls.notify).pathname,'/tranzilaWebhook');
  assert.throws(()=>urlsFor(id+'&secret=x'),/invalid-booking-reference/);
});
test('runtime readiness including URLs is checked before any booking or capacity write', async () => {
  const db=fakeDb(), bookings=createBookingService(db,Timestamp); let providerCalls=0;
  const flow=createRuntimePaymentFlow({db,bookings,Timestamp,clock:()=>NOW,readConfiguration:()=>loadPaymentConfiguration({env:{...ENV,PAYMENT_API_BASE:''},readSecret:secrets}),providerFactory:()=>{providerCalls++;throw new Error();}});
  await assert.rejects(flow.create('owner','a'.repeat(32),INPUT),/not-configured/);
  assert.equal(db.data.size,0); assert.equal(providerCalls,0);
});
test('Firebase export discovery binds payment secrets only where needed and reads none while disabled', async () => {
  const filename=require.resolve('../src/index'), actualRequire=createRequire(filename), db=fakeDb(), exports={};
  const requestOptions=[], scheduleOptions=[]; let secretReads=0, identityChecks=0;
  const firestore=()=>db; firestore.Timestamp=Timestamp;
  const req=(options,fn)=>{requestOptions.push(options); fn.runtimeOptions=options; return fn;};
  const schedule=(options,fn)=>{scheduleOptions.push(options); fn.runtimeOptions=options; return fn;};
  const stubs={ 'firebase-functions/v2/https':{onRequest:req}, 'firebase-functions/v2/scheduler':{onSchedule:schedule}, 'firebase-functions/params':{defineSecret:name=>({name,value:()=>{secretReads++;return '';}})}, 'firebase-admin':{initializeApp(){},firestore,auth:()=>({verifyIdToken:async(_token,revoked)=>{identityChecks++;assert.equal(revoked,true);return {uid:'owner'};}})} };
  vm.runInNewContext(readFileSync(filename,'utf8'),{require:name=>stubs[name]||actualRequire(name),exports,module:{exports},process:{env:{}},console:{error(){}}},{filename});
  assert.equal(secretReads,0);
  const bookingIdentity='chilik-booking-runtime@hilik-site.iam.gserviceaccount.com';
  const integrationIdentity='chilik-integration-runtime@hilik-site.iam.gserviceaccount.com';
  for (const [name,handler] of Object.entries(exports)) {
    assert.equal(handler.runtimeOptions.region,'us-central1',name);
    assert.equal(handler.runtimeOptions.serviceAccount,['processIntegrationJobs','calendarAvailability'].includes(name)?integrationIdentity:bookingIdentity,name);
  }
  for (const name of ['createBooking','createPayment','tranzilaWebhook']) assert.equal(exports[name].runtimeOptions.secrets.length,2);
  for (const name of ['paymentStatus','updateBookingStatus','retryIntegrationJob','calendarAvailability']) assert.equal(exports[name].runtimeOptions.secrets,undefined);
  assert.equal(exports.refreshCalendarAvailability,undefined);
  for (const name of ['reconcilePayments','expirePaymentHolds','processIntegrationJobs']) assert.equal(exports[name],undefined);
  assert.equal(scheduleOptions.length,0);
  for (const options of requestOptions) assert.equal(options.invoker,'private');
  const res={statusCode:0,status(n){this.statusCode=n;return this;},set(){return this;},json(body){this.body=body;return this;}};
  await exports.createPayment({method:'POST',body:INPUT,get:name=>name==='authorization'?'Bearer fixture-token':name==='x-idempotency-key'?'a'.repeat(32):undefined},res);
  assert.equal(res.statusCode,503); assert.equal(identityChecks,0); assert.equal(secretReads,0); assert.equal(db.data.size,0);
});
module.exports={ENV,secrets};
