'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,INPUT,NOW}=require('./helpers/offline-system');
const {createWhatsAppAdapter,SENDER,RECIPIENT,WABA,TEMPLATE_BODY}=require('../src/whatsapp-adapter');
const {createJobRunner}=require('../src/integration-jobs');
const {Timestamp}=require('./helpers/fake-db');
const notifications=f=>[...f.db.data.values()].filter(j=>j.kind==='whatsapp' && !j.payloadHash);
test('pending requests, fake success, expiry and late capture never enqueue confirmed notifications',async()=>{
 const manual=fixture();const m=await manual.call('createBooking',{body:{...INPUT,paymentMethod:'bit'}});assert.equal(notifications(manual).length,0);
 await manual.call('updateBookingStatus',{token:'admin',body:{bookingId:m.body.bookingId,status:'cancelled'}});assert.equal(notifications(manual).length,0);
 const f=fixture(),created=await f.call('createPayment',{body:INPUT}),id=created.body.bookingId;
 assert.equal(notifications(f).length,0);await f.call('paymentStatus',{method:'GET',query:{id,payment:'success'}});assert.equal(notifications(f).length,0);
 f.advance(16*60000);await f.api.expirePaymentHolds();f.record(id);await f.call('tranzilaWebhook',{query:{id},body:{index:42}});
 assert.equal(f.booking(id).status,'payment_review');assert.equal(notifications(f).length,0);
});
test('verified payment and manual confirmation enqueue once; duplicate and distinct captures and cancellation do not duplicate',async()=>{
 for(const method of ['credit','bit','bank_transfer']) {
  const f=fixture(),created=await f.call('createBooking',{body:{...INPUT,paymentMethod:method}}),id=created.body.bookingId;
  if(method==='credit') {f.record(id);await f.call('tranzilaWebhook',{query:{id},body:{index:42}});await f.call('tranzilaWebhook',{query:{id},body:{index:42}});f.record(id,43);await f.call('tranzilaWebhook',{query:{id},body:{index:43}});}
  else {await f.call('updateBookingStatus',{token:'admin',body:{bookingId:id,status:'confirmed'}});await f.call('updateBookingStatus',{token:'admin',body:{bookingId:id,status:'confirmed'}});}
  assert.equal(notifications(f).length,1);assert.equal(notifications(f)[0].event,'confirmed');
  await f.call('updateBookingStatus',{token:'admin',body:{bookingId:id,status:'cancelled'}});assert.equal(notifications(f).length,1);
 }
});
test('HTTP verified capture to actual runner/WhatsApp adapter produces one offline template acknowledgement',async()=>{
 const f=fixture(),r=await f.call('createPayment',{body:INPUT}),id=r.body.bookingId;
 f.record(id);await f.call('tranzilaWebhook',{query:{id},body:{index:42}});
 const job=notifications(f)[0],ref=f.db.doc(`integrationJobs/${id}-${job.revision}-whatsapp`);let posts=0;
 const config={enabled:true,projectId:'hilik-site',configurationVerified:true,recipientOptInVerified:true,phoneNumberId:'123456789012345',graphVersion:'v23.0',templateName:'chilik_booking_confirmed',templateLanguage:'he',sender:SENDER,recipient:RECIPIENT,wabaId:WABA};
 const adapter=createWhatsAppAdapter({db:f.db,Timestamp,config,getAccessToken:()=> 'fixture-token',fetchImpl:async(url,o)=>{
  let data;if(o.method==='POST'){posts++;const b=JSON.parse(o.body);assert.deepEqual(b.template.components[0].parameters.map(p=>p.text),[INPUT.name,'08/10/2026','2']);data={messaging_product:'whatsapp',contacts:[{wa_id:RECIPIENT}],messages:[{id:'wamid.offline'}]};}
  else if(url.includes('/phone_numbers'))data={data:[{id:config.phoneNumberId,display_phone_number:SENDER}]};else data={data:[{name:config.templateName,status:'APPROVED',language:'he',components:[{type:'BODY',text:TEMPLATE_BODY}]}]};
  return {status:200,ok:true,json:async()=>data};
 },now:()=>NOW});
 const runner=createJobRunner(f.db,Timestamp,{whatsapp:adapter});await runner.run(ref,NOW);await runner.run(ref,NOW+3600001);
 assert.equal(posts,1);assert.equal(f.db.data.get(ref.path).status,'sent');assert.equal(f.booking(id).paymentStatus,'paid');assert.equal(f.seats(),2);
});
test('invalid WhatsApp-only payload does not roll back verified payment',async()=>{
 const f=fixture(),r=await f.call('createPayment',{body:{...INPUT,name:'x\u0000y'}}),id=r.body.bookingId;
 f.record(id);const result=await f.call('tranzilaWebhook',{query:{id},body:{index:42}});assert.equal(result.statusCode,200);assert.equal(f.booking(id).paymentStatus,'paid');assert.equal(notifications(f).length,1);
});
test('only authenticated admin can queue WhatsApp retry and disabled worker remains blocked',async()=>{
 const f=fixture(),r=await f.call('createBooking',{body:{...INPUT,paymentMethod:'bit'}}),id=r.body.bookingId;
 await f.call('updateBookingStatus',{token:'admin',body:{bookingId:id,status:'confirmed'}});
 const j=notifications(f)[0],jobId=`${id}-${j.revision}-whatsapp`,ref=f.db.doc(`integrationJobs/${jobId}`);
 await f.jobs.run(ref,NOW);assert.equal(f.db.data.get(ref.path).lastError,'whatsapp-not-configured');
 assert.equal((await f.call('retryIntegrationJob',{body:{jobId}})).statusCode,403);
 assert.equal((await f.call('retryIntegrationJob',{token:'admin',body:{jobId}})).statusCode,200);
 await f.jobs.run(ref,f.db.data.get(ref.path).nextAttemptAt.toMillis());assert.equal(f.db.data.get(ref.path).status,'blocked');
});
