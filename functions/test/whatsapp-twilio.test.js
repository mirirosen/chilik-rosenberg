'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {fakeDb,Timestamp}=require('./helpers/fake-db');
const {createBookingService}=require('../src/booking-service');
const {createJobRunner}=require('../src/integration-jobs');
const {createTwilioWhatsAppAdapter,configurationValid,SENDER_SID,FROM,TO}=require('../src/whatsapp-twilio');
const {SENDER,RECIPIENT,WABA}=require('../src/whatsapp-adapter');
const {CONTACT_TEMPLATE_BODY:TEMPLATE_BODY,CONTACT_BUTTON_TITLE,CONTACT_BUTTON_URL,contactSuffix}=require('../src/booking-contact-card');
const {createWhatsAppRuntime,SECRET_NAMES}=require('../src/whatsapp-runtime');
const {fixture,INPUT:HTTP_INPUT,NOW:HTTP_NOW}=require('./helpers/offline-system');
const NOW=Date.parse('2026-10-06T05:00:00Z');
const INPUT={name:'ישראל ישראלי',phone:'0501234567',email:'private@example.test',tourDate:'2026-10-08',participants:2,paymentMethod:'bit',dateOfBirth:'1990-01-01',agreeToTerms:true,notes:'Private notes'};
// Synthetic AC/SK/HX/SM values and secret; none are real account credentials.
const CONFIG={enabled:true,provider:'twilio',projectId:'hilik-site',configurationVerified:true,recipientOptInVerified:true,sender:SENDER,recipient:RECIPIENT,wabaId:WABA,senderSid:SENDER_SID,accountSid:'AC'+'a'.repeat(32),authMode:'api-key',apiKeySid:'SK'+'b'.repeat(32),contentSid:'HX'+'c'.repeat(32),templateName:'chilik_booking_confirmed',templateLanguage:'he'};
const SECRET='fixture-secret-not-real';
const MSG='SM'+'d'.repeat(32);
const reply=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data});
const sender=()=>({sid:SENDER_SID,sender_id:FROM,status:'ONLINE',configuration:{waba_id:WABA}});
const content=()=>({sid:CONFIG.contentSid,account_sid:CONFIG.accountSid,language:'he',types:{'twilio/call-to-action':{body:TEMPLATE_BODY,actions:[{type:'URL',title:CONTACT_BUTTON_TITLE,url:CONTACT_BUTTON_URL}]}},variables:{'1':'Synthetic name','2':'08/10/2026','3':'2','4':contactSuffix('BK-000000000000000000000001')}});
const approval=()=>({sid:CONFIG.contentSid,account_sid:CONFIG.accountSid,whatsapp:{type:'whatsapp',name:CONFIG.templateName,status:'approved',content_type:'twilio/call-to-action'}});
const accepted=(patch={})=>reply(201,{sid:MSG,account_sid:CONFIG.accountSid,from:FROM,to:TO,direction:'outbound-api',status:'queued',...patch});
const envFor=(c=CONFIG)=>({GCLOUD_PROJECT:c.projectId,CHILIK_WHATSAPP_ENABLED:'true',CHILIK_WHATSAPP_PROVIDER:c.provider,CHILIK_WHATSAPP_CONFIGURATION_VERIFIED:'true',CHILIK_WHATSAPP_RECIPIENT_OPT_IN_VERIFIED:'true',CHILIK_TWILIO_ACCOUNT_SID:c.accountSid,CHILIK_TWILIO_SENDER_SID:c.senderSid,CHILIK_TWILIO_AUTH_MODE:c.authMode,CHILIK_TWILIO_API_KEY_SID:c.apiKeySid,CHILIK_TWILIO_CONTENT_SID:c.contentSid,CHILIK_TWILIO_TEMPLATE_NAME:c.templateName,CHILIK_WHATSAPP_TEMPLATE_LANGUAGE:'he'});
async function setup({config=CONFIG,send=accepted,senderData,contentData,approvalData,secret=SECRET,readFailure}={}){
 let clock=NOW;const db=fakeDb(),bookings=createBookingService(db,Timestamp),requests=[];let secretReads=0;
 const b=await bookings.create('owner','a'.repeat(32),INPUT,NOW);await bookings.change(b.bookingId,'confirm','fixture-admin',null,NOW);
 const ref=db.doc(`integrationJobs/${b.bookingId}-2-whatsapp`);
 const fetchImpl=async(url,o)=>{
  const u=new URL(url);assert.ok(['api.twilio.com','content.twilio.com','messaging.twilio.com'].includes(u.hostname));assert.equal(o.redirect,'error');
  const username=config.authMode==='api-key'?config.apiKeySid:config.accountSid;
  assert.equal(o.headers.Authorization,'Basic '+Buffer.from(username+':'+SECRET).toString('base64'));
  requests.push({url,method:o.method,...(o.body?{fields:Object.fromEntries(new URLSearchParams(o.body)),contentType:o.headers['Content-Type']}:{})});
  if(o.method==='POST'){assert.equal(url,`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`);return send(url,o);}
  if(readFailure)return readFailure(url,o);
  if(u.hostname==='messaging.twilio.com'){assert.equal(url,`https://messaging.twilio.com/v2/Channels/Senders/${SENDER_SID}`);return reply(200,senderData||sender());}
  assert.ok(url===`https://content.twilio.com/v1/Content/${config.contentSid}`||url===`https://content.twilio.com/v1/Content/${config.contentSid}/ApprovalRequests`);
  return reply(200,url.endsWith('/ApprovalRequests')?(approvalData||approval()):(contentData||content()));
 };
 const adapter=createTwilioWhatsAppAdapter({db,Timestamp,config,readSecret:async()=>{secretReads++;return secret;},fetchImpl,now:()=>clock});
 const jobs=createJobRunner(db,Timestamp,{whatsapp:adapter});
 return {db,bookings,b,ref,adapter,jobs,requests,fetchImpl,secretReads:()=>secretReads,advance:t=>{clock=t;},job:()=>db.data.get(ref.path),posts:()=>requests.filter(r=>r.method==='POST'),receipt:()=>[...db.data.values()].find(v=>v.kind==='whatsapp'&&v.payloadHash)};
}
test('Twilio Messages.json uses fixed From/To and ContentSid/JSON variables in form encoding only',async()=>{
 const f=await setup();await f.jobs.run(f.ref,NOW);assert.equal(f.posts().length,1);const post=f.posts()[0];
 assert.equal(post.contentType,'application/x-www-form-urlencoded');assert.deepEqual(Object.keys(post.fields).sort(),['ContentSid','ContentVariables','From','To']);
 assert.equal(post.fields.From,FROM);assert.equal(post.fields.To,TO);assert.equal(post.fields.ContentSid,CONFIG.contentSid);
 assert.deepEqual(JSON.parse(post.fields.ContentVariables),{'1':INPUT.name,'2':'08/10/2026','3':'2','4':contactSuffix(f.b.bookingId)});
 assert.equal(f.receipt().provider,'twilio');assert.equal(f.receipt().providerId,MSG);assert.equal(f.receipt().providerStatus,'queued');assert.equal(f.job().status,'sent');
 for(const privateValue of [INPUT.phone,INPUT.email,INPUT.dateOfBirth,INPUT.notes,SECRET,Buffer.from(CONFIG.apiKeySid+':'+SECRET).toString('base64'),'4209'])assert.ok(!JSON.stringify([f.requests,f.job(),f.receipt()]).includes(privateValue));
 assert.ok(!JSON.stringify([...f.db.data]).includes(SECRET));
 await f.adapter({...f.job(),idempotencyKey:f.ref.id});assert.equal(f.posts().length,1);
});
test('disabled, wrong provider/project and incomplete config cannot read secrets or contact either provider',async()=>{
 for(const patch of [{enabled:false},{provider:'meta'},{provider:''},{projectId:'hilik-rosenberg-ddb9b'},{accountSid:''},{contentSid:''},{authMode:''},{apiKeySid:''},{recipientOptInVerified:false}]){
  const f=await setup({config:{...CONFIG,...patch}});await f.jobs.run(f.ref,NOW);assert.equal(f.requests.length,0);assert.equal(f.secretReads(),0);assert.equal(f.job().lastError,'whatsapp-not-configured');
 }
});
test('sender XE ID, WABA and E164 cannot be changed by config or booking fields',async()=>{
 for(const patch of [{senderSid:'XE'+'e'.repeat(32)},{sender:'14432414209'},{recipient:'972501111111'},{wabaId:'other'},{accountSid:'../../Accounts/private'},{contentSid:'../Content'}]){
  const f=await setup({config:{...CONFIG,...patch}});assert.equal(configurationValid({...CONFIG,...patch}),false);await f.jobs.run(f.ref,NOW);assert.equal(f.requests.length,0);
 }
});
test('Twilio sender GET must bind exact XE SID, 3703, Online state and shared WABA',async()=>{
 for(const patch of [{sid:'XE'+'e'.repeat(32)},{sender_id:'whatsapp:+14432414209'},{status:'OFFLINE'},{configuration:{waba_id:'other'}}]){
  const f=await setup({senderData:{...sender(),...patch}});await f.jobs.run(f.ref,NOW);assert.equal(f.posts().length,0);assert.equal(f.job().lastError,'whatsapp-sender-unverified');assert.equal(f.receipt(),undefined);
 }
});
test('Content SID must match sender account, Hebrew, exact CTA body/button and approved four-variable contract',async()=>{
 for(const options of [{contentData:{...content(),account_sid:'AC'+'e'.repeat(32)}},{contentData:{...content(),sid:'HX'+'e'.repeat(32)}},{contentData:{...content(),language:'en'}},{contentData:{...content(),types:{'twilio/text':{body:'Changed {{1}}'}}}},{contentData:{...content(),variables:{'1':'Name'}}},{approvalData:{...approval(),whatsapp:{...approval().whatsapp,status:'pending'}}},{approvalData:{...approval(),account_sid:'AC'+'e'.repeat(32)}},{approvalData:{...approval(),whatsapp:{...approval().whatsapp,name:'b_notes'}}}]){
  const f=await setup(options);await f.jobs.run(f.ref,NOW);assert.equal(f.posts().length,0);assert.equal(f.job().lastError,'whatsapp-template-unverified');assert.equal(f.receipt(),undefined);
 }
});
test('wrong button origin/title/suffix, extra actions and old text templates are blocked before a message POST',async()=>{
 const good=content(),cta=good.types['twilio/call-to-action'];
 for(const actions of [[{...cta.actions[0],url:'https://evil.example.test/{{4}}'}],[{...cta.actions[0],url:'https://www.chilik-tours.com/admin?id={{4}}'}],[{...cta.actions[0],title:'Changed'}],[...cta.actions,cta.actions[0]],[{...cta.actions[0],type:'PHONE'}]]){
  const f=await setup({contentData:{...good,types:{'twilio/call-to-action':{...cta,actions}}}});await f.jobs.run(f.ref,NOW);assert.equal(f.posts().length,0);assert.equal(f.job().lastError,'whatsapp-template-unverified');
 }
 const old=await setup({contentData:{...good,types:{'twilio/text':{body:TEMPLATE_BODY}},variables:{'1':'name','2':'date','3':'2'}}});await old.jobs.run(old.ref,NOW);assert.equal(old.posts().length,0);assert.equal(old.job().lastError,'whatsapp-template-unverified');
});
test('Basic auth supports explicit approved API-key and account-token modes without fallback',async()=>{
 for(const authMode of ['api-key','auth-token']){const f=await setup({config:{...CONFIG,authMode}});await f.jobs.run(f.ref,NOW);assert.equal(f.posts().length,1);assert.equal(f.job().providerId,MSG);}
 const f=await setup({secret:''});await f.jobs.run(f.ref,NOW);assert.equal(f.requests.length,0);assert.equal(f.job().lastError,'provider-token-unavailable');
});
test('Twilio runtime lazily binds only the selected secret and never reads it at discovery',()=>{
 for(const authMode of ['api-key','auth-token']){
  const names=[];let reads=0;const runtime=createWhatsAppRuntime({db:fakeDb(),Timestamp,env:envFor({...CONFIG,authMode}),secretFactory:name=>{names.push(name);return {name,value(){reads++;throw Error('forbidden at discovery');}};}});
  assert.equal(runtime.enabled,true);assert.deepEqual(names,[SECRET_NAMES[authMode]]);assert.equal(reads,0);assert.equal(runtime.secretBindings.length,1);
 }
});
test('actual Firebase export discovery binds Twilio secret only to existing integration scheduler',()=>{
 const db=fakeDb(),defined=[];const firestore=()=>db;firestore.Timestamp=Timestamp;
 const modules={
  './deployment-config':require('../src/deployment-config'),
  'firebase-functions/v2/https':{onRequest:(options,handler)=>({options,handler})},'firebase-functions/v2/scheduler':{onSchedule:(options,handler)=>({options,handler})},
  'firebase-functions/params':{defineSecret:name=>{defined.push(name);return {name,value(){throw Error('secret access forbidden at discovery');}};}},'firebase-admin':{initializeApp(){},firestore,auth:()=>({verifyIdToken:()=>{throw Error('not called');}})},
  './booking-service':require('../src/booking-service'),'./integration-jobs':require('../src/integration-jobs'),'./api':require('../src/api'),
  './payment-runtime':{SECRET_NAMES:['TRANZILA_API_APP_KEY','TRANZILA_API_SECRET'],loadPaymentConfiguration:()=>({}),createRuntimePaymentFlow:()=>({})},'./payment-reconciliation':{createRuntimeReconciler:()=>({runDue:async()=>{}})},
  './integration-adapters':{createIntegrationAdapters:()=>({})},'./calendar-runtime':{createCalendarRuntime:()=>({policy:{enabled:false},writesEnabled:false,adapterConfig:{},getAccessToken:()=>{throw Error('not called');}})},'./calendar-api':{createCalendarApi:()=>({})},'./whatsapp-runtime':require('../src/whatsapp-runtime'),
 };const exports={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/index.js'),'utf8'),{exports,require:id=>{assert.ok(modules[id],id);return modules[id];},process:{env:{...envFor(),CHILIK_BOOKING_RUNTIME_ENABLED:'true',CHILIK_BOOKING_SCHEDULERS_ENABLED:'true'}},console:{error(){}}});
 assert.ok(defined.includes('CHILIK_TWILIO_API_KEY_SECRET'));assert.ok(!defined.includes('CHILIK_WHATSAPP_ACCESS_TOKEN'));
 assert.deepEqual(Array.from(exports.processIntegrationJobs.options.secrets,s=>s.name),['CHILIK_TWILIO_API_KEY_SECRET']);
 for(const name of ['adminBookingContactCard','createBooking','createPayment','paymentStatus','updateBookingStatus','retryIntegrationJob','tranzilaWebhook','expirePaymentHolds','reconcilePayments'])assert.ok(!(exports[name].options.secrets||[]).some(s=>s.name.startsWith('CHILIK_TWILIO')));
});
test('concurrent Twilio workers claim one notification and POST once',async()=>{
 const f=await setup();await Promise.all([f.jobs.run(f.ref,NOW),f.jobs.run(f.ref,NOW)]);assert.equal(f.posts().length,1);assert.equal(f.job().status,'sent');
});
test('expired outbox lease cannot create another Twilio message while first POST is pending',async()=>{
 let release,started;const pending=new Promise(r=>{release=r;}),began=new Promise(r=>{started=r;});
 const f=await setup({send:async()=>{started();return pending;}});const first=f.jobs.run(f.ref,NOW);await began;
 await f.jobs.run(f.ref,NOW+120001);assert.equal(f.posts().length,1);assert.equal(f.job().status,'blocked');release(accepted());await first;
 await f.jobs.retry(f.ref,NOW+240001);await f.jobs.run(f.ref,NOW+240001);assert.equal(f.posts().length,1);assert.equal(f.job().providerId,MSG);
});
test('POST network timeout is uncertain and ordinary admin retry cannot send again',async()=>{
 const f=await setup({send:async()=>{throw Error('SECRET PRIVATE UPSTREAM BODY');}});await f.jobs.run(f.ref,NOW);assert.equal(f.receipt().state,'uncertain');assert.equal(f.job().lastError,'whatsapp-delivery-uncertain');
 await f.jobs.retry(f.ref,NOW+180000);await f.jobs.run(f.ref,NOW+180000);assert.equal(f.posts().length,1);assert.ok(!JSON.stringify([...f.db.data]).includes('UPSTREAM BODY'));
});
test('5xx, malformed response and incorrect SID/account/sender/destination are quarantined without resending',async()=>{
 for(const send of [()=>reply(500,{code:20429,status:500}),()=>reply(201,null),()=>reply(201,{}),()=>accepted({account_sid:'AC'+'e'.repeat(32)}),()=>accepted({from:'whatsapp:+14432414209'}),()=>accepted({to:'whatsapp:+972501111111'}),()=>accepted({sid:'not-a-sid'}),()=>reply(429,{code:20429,status:429,sid:MSG}),()=>({ok:true,status:201,json:async()=>{throw Error('parse');}})]){
  const f=await setup({send});await f.jobs.run(f.ref,NOW);assert.equal(f.receipt().state,'uncertain');await f.jobs.retry(f.ref,NOW+180000);await f.jobs.run(f.ref,NOW+180000);assert.equal(f.posts().length,1);
 }
});
test('explicit Twilio 429/20429 retries with backoff at most eight POSTs despite admin reset',async()=>{
 const f=await setup({send:()=>reply(429,{code:20429,status:429,message:'PRIVATE BODY'})});let t=NOW;
 for(let i=0;i<9;i++){f.advance(t);await f.jobs.run(f.ref,t);if(i<7){assert.equal(f.job().status,'retry');assert.ok(f.job().nextAttemptAt.toMillis()>t);}t+=3600001;}
 assert.equal(f.posts().length,8);assert.equal(f.receipt().attempts,8);assert.equal(f.job().status,'failed');
 await f.jobs.retry(f.ref,t);await f.jobs.run(f.ref,t);assert.equal(f.posts().length,8);assert.equal(f.job().lastError,'whatsapp-retry-budget-exhausted');assert.ok(!JSON.stringify([...f.db.data]).includes('PRIVATE BODY'));
});
test('explicit 401 error blocks until credential repair and remains inside original POST budget',async()=>{
 let reject=true;const f=await setup({send:()=>reject?reply(401,{code:20003,status:401,message:'AUTH DETAIL'}):accepted()});await f.jobs.run(f.ref,NOW);assert.equal(f.receipt().state,'rejected');assert.equal(f.job().status,'blocked');
 reject=false;await f.jobs.retry(f.ref,NOW+180000);await f.jobs.run(f.ref,NOW+180000);assert.equal(f.posts().length,2);assert.equal(f.job().status,'sent');
});
test('metadata errors are retryable GETs and do not create send intent or leak details',async()=>{
 const f=await setup({readFailure:()=>reply(429,{code:20429,status:429,message:'PRIVATE METADATA'})});await f.jobs.run(f.ref,NOW);
 assert.equal(f.posts().length,0);assert.equal(f.receipt(),undefined);assert.equal(f.job().status,'retry');assert.equal(f.job().lastError,'whatsapp-metadata-unavailable');assert.ok(!JSON.stringify([...f.db.data]).includes('PRIVATE METADATA'));
});
test('cancelled, changed booking and malformed notification cannot submit a Twilio message',async()=>{
 for(const patch of [{status:'cancelled',capacityReserved:false},{name:'Changed'},{participants:3}]){const f=await setup();const p=`bookings/${f.b.bookingId}`;f.db.data.set(p,{...f.db.data.get(p),...patch});await f.jobs.run(f.ref,NOW);assert.equal(f.posts().length,0);assert.equal(f.job().status,'blocked');}
 const f=await setup();f.db.data.set(f.ref.path,{...f.job(),whatsappSnapshot:{...f.job().whatsappSnapshot,tourDate:'2026-02-30'}});await f.jobs.run(f.ref,NOW);assert.equal(f.requests.length,0);assert.equal(f.job().lastError,'whatsapp-snapshot-invalid');
});
test('accepted receipt survives outbox acknowledgement failure and recovers without another POST',async()=>{
 const f=await setup(),base=f.db.runTransaction;let failOnce=true;
 f.db.runTransaction=fn=>base(tx=>fn({...tx,update(ref,value){if(failOnce&&ref.path===f.ref.path&&value.status==='sent'){failOnce=false;throw Error('outbox acknowledgement lost');}tx.update(ref,value);}}));
 await assert.rejects(f.jobs.run(f.ref,NOW),/acknowledgement lost/);assert.equal(f.receipt().state,'accepted');assert.equal(f.job().status,'processing');
 f.db.runTransaction=base;await f.jobs.run(f.ref,NOW+120001);assert.equal(f.posts().length,1);assert.equal(f.job().status,'sent');
});
test('crash after intent before POST and saving Twilio acknowledgement cannot cause duplicate sending',async()=>{
 const f=await setup(),base=f.db.runTransaction;let crash=true;
 f.db.runTransaction=async fn=>{const v=await base(fn);if(crash&&f.receipt()?.state==='sending'){crash=false;throw Error('crash before POST');}return v;};
 await f.jobs.run(f.ref,NOW);assert.equal(f.posts().length,0);f.db.runTransaction=base;await f.jobs.run(f.ref,NOW+3600001);assert.equal(f.posts().length,0);assert.equal(f.job().status,'blocked');
 const g=await setup(),original=g.db.runTransaction;g.db.runTransaction=fn=>original(tx=>fn({...tx,update(ref,value){if(ref.path.startsWith('deliveryReceipts/')&&value.state==='accepted')throw Error('receipt acknowledgement lost');tx.update(ref,value);}}));
 await g.jobs.run(g.ref,NOW);assert.equal(g.posts().length,1);g.db.runTransaction=original;await g.jobs.run(g.ref,NOW+3600001);assert.equal(g.posts().length,1);assert.equal(g.job().status,'blocked');
});
test('historical Meta accepted or uncertain receipt blocks provider migration before credentials/network',async()=>{
 for(const state of ['accepted','uncertain','sending']){const f=await setup(),key=crypto.createHash('sha256').update(JSON.stringify(`whatsapp:${f.ref.id}`)).digest('hex');
  f.db.data.set(`deliveryReceipts/${key}`,{kind:'whatsapp',bookingId:f.b.bookingId,payloadHash:'historical-meta-hash',state,providerId:state==='accepted'?'wamid.old':null,attempts:1});
  await f.jobs.run(f.ref,NOW);assert.equal(f.requests.length,0);assert.equal(f.secretReads(),0);assert.equal(f.job().lastError,'whatsapp-payload-changed');assert.equal([...f.db.data.keys()].filter(p=>p.startsWith('deliveryReceipts/')).length,1);
 }
});
test('Twilio resource marked failed or undelivered is recorded and never automatically resent',async()=>{
 for(const status of ['failed','undelivered','canceled']){const f=await setup({send:()=>accepted({status})});await f.jobs.run(f.ref,NOW);assert.equal(f.receipt().providerId,MSG);assert.equal(f.receipt().providerStatus,status);assert.equal(f.job().lastError,'whatsapp-provider-message-failed');await f.jobs.retry(f.ref,NOW+180000);await f.jobs.run(f.ref,NOW+180000);assert.equal(f.posts().length,1);}
});
test('changing Content SID after a send cannot reuse a receipt to create a second message',async()=>{
 const f=await setup();await f.jobs.run(f.ref,NOW);const adapter=createTwilioWhatsAppAdapter({db:f.db,Timestamp,config:{...CONFIG,contentSid:'HX'+'e'.repeat(32)},readSecret:()=>{throw Error('must not read');},fetchImpl:()=>{throw Error('must not send');}});
 await assert.rejects(adapter({...f.job(),idempotencyKey:f.ref.id}),/whatsapp-payload-changed/);assert.equal(f.posts().length,1);
});
test('verified HTTP credit capture flows through actual Twilio runtime/worker once with Gregorian template variables',async()=>{
 const f=fixture(),r=await f.call('createPayment',{body:HTTP_INPUT}),id=r.body.bookingId;f.record(id);await f.call('tranzilaWebhook',{query:{id},body:{index:42}});
 const j=[...f.db.data.values()].find(v=>v.kind==='whatsapp'),ref=f.db.doc(`integrationJobs/${id}-${j.revision}-whatsapp`);let posts=0;
 const runtime=createWhatsAppRuntime({db:f.db,Timestamp,env:envFor(),secretFactory:name=>{assert.equal(name,'CHILIK_TWILIO_API_KEY_SECRET');return {value:()=>SECRET};},fetchImpl:async(url,o)=>{
  if(o.method==='POST'){posts++;const fields=Object.fromEntries(new URLSearchParams(o.body));assert.deepEqual(JSON.parse(fields.ContentVariables),{'1':HTTP_INPUT.name,'2':'08/10/2026','3':'2','4':contactSuffix(id)});return accepted();}
  return reply(200,url.includes('messaging.twilio.com')?sender():url.endsWith('/ApprovalRequests')?approval():content());
 },now:()=>HTTP_NOW});
 const jobs=createJobRunner(f.db,Timestamp,{whatsapp:runtime.adapter});await jobs.run(ref,HTTP_NOW);await jobs.run(ref,HTTP_NOW+3600001);assert.equal(posts,1);assert.equal(f.booking(id).status,'confirmed');assert.equal(f.booking(id).paymentStatus,'paid');assert.equal(f.seats(),2);
});
