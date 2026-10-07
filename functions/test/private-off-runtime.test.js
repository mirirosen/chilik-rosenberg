'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createBookingApi}=require('../src/api');
const {createCalendarApi}=require('../src/calendar-api');
const forbidden=()=>{throw Error('Forbidden external/runtime operation');};
const res=()=>({statusCode:0,body:null,status(n){this.statusCode=n;return this;},set(){return this;},json(v){this.body=v;return this;},end(){return this;}});
test('default and malformed runtime gates block every booking/payment/admin handler before any external operation',async()=>{
 for(const enabled of [undefined,false,'false','true',1,{},null]) {
  const options=[];
  const api=createBookingApi({onRequest:(o,h)=>{options.push(o);return h;},onSchedule:forbidden,db:new Proxy({},{get:forbidden}),bookings:new Proxy({},{get:forbidden}),jobs:new Proxy({},{get:forbidden}),paymentFlow:new Proxy({},{get:forbidden}),paymentReconciler:{runDue:forbidden},verifyIdToken:forbidden,enabled,schedulesEnabled:true,logger:{error:forbidden}});
  assert.deepEqual(Object.keys(api).sort(),['createBooking','createPayment','paymentStatus','retryIntegrationJob','tranzilaWebhook','updateBookingStatus'].sort());
  for(const handler of Object.values(api))for(const method of ['POST','GET','OPTIONS']) {
   const reply=res();await handler({method,body:{bookingId:'untrusted',index:'untrusted'},get:forbidden},reply);
   assert.equal(reply.statusCode,503);assert.deepEqual(reply.body,{error:'booking-runtime-disabled'});
  }
  for(const o of options){assert.equal(o.invoker,'private');assert.equal(o.minInstances,0);assert.equal(o.maxInstances,1);assert.equal(o.concurrency,1);assert.equal(o.cpu,1);assert.equal(o.memory,'256MiB');assert.equal(o.timeoutSeconds,60);}
 }
});
test('enabled handler transport alone cannot register jobs when scheduler gate is absent or malformed',()=>{
 for(const schedulesEnabled of [undefined,false,'true',1]) {
  const api=createBookingApi({onRequest:(_o,h)=>h,onSchedule:forbidden,enabled:true,schedulesEnabled,paymentReconciler:{runDue:forbidden}});
  for(const name of ['reconcilePayments','expirePaymentHolds','processIntegrationJobs'])assert.equal(api[name],undefined);
 }
});
test('disabled calendar transport stays private and does not read Firestore or register a scheduler',async()=>{
 let options;const api=createCalendarApi({db:new Proxy({},{get:forbidden}),onRequest:(o,h)=>{options=o;return h;},onSchedule:forbidden,runtime:{publicEnabled:false,readsEnabled:false}});
 assert.deepEqual(Object.keys(api),['calendarAvailability']);assert.equal(options.invoker,'private');assert.equal(options.secrets,undefined);
 const reply=res();await api.calendarAvailability({method:'GET',get:()=>undefined},reply);assert.equal(reply.statusCode,503);assert.deepEqual(reply.body,{error:'availability-unavailable'});
});
