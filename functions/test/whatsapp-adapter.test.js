'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { fakeDb, Timestamp } = require('./helpers/fake-db');
const { createBookingService } = require('../src/booking-service');
const { createJobRunner } = require('../src/integration-jobs');
const { createWhatsAppAdapter, snapshot, SENDER, RECIPIENT, WABA, TEMPLATE_BODY } = require('../src/whatsapp-adapter');
const { createWhatsAppRuntime } = require('../src/whatsapp-runtime');
const NOW = Date.parse('2026-10-06T05:00:00Z');
const INPUT = { name: 'ישראל ישראלי', phone: '0501234567', email: 'private@example.test', tourDate: '2026-10-08', participants: 2, paymentMethod: 'bit', dateOfBirth: '1990-01-01', notes: 'Private notes', agreeToTerms: true };
// All Meta IDs, version and tokens below are offline fixtures, not credentials.
const CONFIG = { enabled: true, projectId: 'hilik-site', configurationVerified: true, recipientOptInVerified: true, sender: SENDER, recipient: RECIPIENT, wabaId: WABA, phoneNumberId: '123456789012345', graphVersion: 'v23.0', templateName: 'chilik_booking_confirmed', templateLanguage: 'he' };
const reply = (status,data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
const accepted = () => reply(200,{ messaging_product: 'whatsapp', contacts: [{ wa_id: RECIPIENT }], messages: [{ id: 'wamid.fixture-acceptance' }] });
const template = extra => ({ name: CONFIG.templateName, language: 'he', status: 'APPROVED', parameter_format: 'POSITIONAL', components: [{ type: 'BODY', text: TEMPLATE_BODY }], ...extra });
async function setup({ config = CONFIG, send = accepted, phoneRows, templateRows } = {}) {
  let clock = NOW;
  const db = fakeDb(), bookings = createBookingService(db,Timestamp), requests = [];
  const b = await bookings.create('owner','a'.repeat(32),INPUT,NOW);
  await bookings.change(b.bookingId,'confirm','fixture-admin',null,NOW);
  const ref = db.doc(`integrationJobs/${b.bookingId}-2-whatsapp`);
  const fetchImpl = async (url,options) => {
    const u = new URL(url); assert.equal(u.origin,'https://graph.facebook.com'); assert.equal(options.redirect,'error');
    assert.equal(options.headers.Authorization,'Bearer fixture-token');
    requests.push({ url, method: options.method, ...(options.body ? { body: JSON.parse(options.body) } : {}) });
    if (options.method === 'POST') { assert.equal(u.pathname,`/${config.graphVersion}/${config.phoneNumberId}/messages`); return send(url,options); }
    assert.ok(u.pathname.startsWith(`/${config.graphVersion}/${WABA}/`));
    if (u.pathname.endsWith('/phone_numbers')) return reply(200,{ data: phoneRows || [{ id: CONFIG.phoneNumberId, display_phone_number: '+1 (443) 241-3703' }] });
    assert.ok(u.pathname.endsWith('/message_templates')); return reply(200,{ data: templateRows || [template()] });
  };
  const adapter = createWhatsAppAdapter({ db, Timestamp, config, getAccessToken: async () => 'fixture-token', fetchImpl, now: () => clock });
  const jobs = createJobRunner(db,Timestamp,{ whatsapp: adapter });
  return { db,bookings,b,ref,adapter,jobs,requests,clock: ms => { clock = ms; }, job: () => db.data.get(ref.path), posts: () => requests.filter(r => r.method === 'POST'), receipt: () => [...db.data.values()].find(d => d.kind === 'whatsapp' && d.payloadHash) };
}
test('confirmed notifications use only sender 3703, Hilik recipient and three immutable fields', async () => {
  const f = await setup();
  await Promise.all([f.jobs.run(f.ref,NOW),f.jobs.run(f.ref,NOW)]);
  assert.equal(f.posts().length,1); assert.equal(f.job().status,'sent'); assert.equal(f.receipt().state,'accepted');
  const body = f.posts()[0].body;
  assert.equal(body.to,RECIPIENT); assert.equal(body.type,'template');
  assert.deepEqual(body.template.components[0].parameters.map(p => p.text),['ישראל ישראלי','08/10/2026','2']);
  for (const pii of [INPUT.phone,INPUT.email,INPUT.notes,INPUT.dateOfBirth,'4209']) assert.ok(!JSON.stringify([body,f.job(),f.receipt()]).includes(pii));
  assert.ok(!JSON.stringify([...f.db.data.values()]).includes('fixture-token'));
  await f.adapter({ ...f.job(), idempotencyKey: f.ref.id }); assert.equal(f.posts().length,1);
});
test('disabled, incomplete and wrong project runtime never reads or binds secrets or contacts Meta', async () => {
  for (const extra of [{},{ CHILIK_WHATSAPP_ENABLED:'true' },{ GCLOUD_PROJECT:'hilik-rosenberg-ddb9b' }]) {
    let reads = 0;
    const runtime = createWhatsAppRuntime({ db:fakeDb(),Timestamp, env:extra, secretFactory:()=> { reads++; throw Error('forbidden'); }, fetchImpl:()=> { throw Error('network forbidden'); } });
    assert.equal(runtime.enabled,false); assert.deepEqual(runtime.secretBindings,[]);
    await assert.rejects(runtime.adapter({}),/whatsapp-not-configured/); assert.equal(reads,0);
  }
});
test('historical Meta config cannot bind a secret or activate the Twilio-only runtime', async () => {
  let reads=0;
  const runtime = createWhatsAppRuntime({ db:fakeDb(),Timestamp,env:{ GCLOUD_PROJECT:'hilik-site', CHILIK_WHATSAPP_ENABLED:'true', CHILIK_WHATSAPP_CONFIGURATION_VERIFIED:'true', CHILIK_WHATSAPP_RECIPIENT_OPT_IN_VERIFIED:'true', CHILIK_WHATSAPP_PHONE_NUMBER_ID:CONFIG.phoneNumberId, CHILIK_WHATSAPP_GRAPH_VERSION:CONFIG.graphVersion, CHILIK_WHATSAPP_TEMPLATE_NAME:CONFIG.templateName, CHILIK_WHATSAPP_TEMPLATE_LANGUAGE:'he' },secretFactory:()=>{ reads++; throw Error('forbidden'); } });
  assert.equal(runtime.enabled,false);assert.equal(reads,0);assert.deepEqual(runtime.secretBindings,[]);
  await assert.rejects(runtime.adapter({}),/whatsapp-not-configured/);
});
test('a phone ID mapped to B Notes 4209 is rejected before any send or intent receipt', async () => {
  const f=await setup({phoneRows:[{id:CONFIG.phoneNumberId,display_phone_number:'+14432414209'}]});
  await f.jobs.run(f.ref,NOW); assert.equal(f.posts().length,0); assert.equal(f.job().lastError,'whatsapp-sender-unverified'); assert.equal(f.receipt(),undefined);
});
test('missing sender, paused/unapproved or modified template cannot send', async () => {
  for (const options of [{phoneRows:[]},{templateRows:[template({status:'PENDING'})]},{templateRows:[template({components:[{type:'BODY',text:'changed {{1}}'}]})]},{templateRows:[template({language:'en_US'})]},{templateRows:[template({parameter_format:'NAMED'})]}]) {
    const f=await setup(options); await f.jobs.run(f.ref,NOW); assert.equal(f.posts().length,0); assert.equal(f.job().status,'blocked'); assert.equal(f.receipt(),undefined);
  }
});
test('cross-WABA, arbitrary destination, sender, template language or malformed config fail closed', async () => {
  for (const patch of [{ wabaId:'other' },{ sender:'14432414209' },{ recipient:INPUT.phone },{ graphVersion:'latest' },{ templateLanguage:'en' },{ phoneNumberId:'../messages' },{ recipientOptInVerified:false },{ configurationVerified:false }]) {
    const f=await setup({config:{...CONFIG,...patch}}); await f.jobs.run(f.ref,NOW); assert.equal(f.requests.length,0); assert.equal(f.job().lastError,'whatsapp-not-configured');
  }
});
test('cancelled or changed booking is blocked at transactional send-intent claim', async () => {
  for (const change of [{status:'cancelled',capacityReserved:false},{name:'Changed name'},{participants:3}]) {
    const f=await setup(); const p=`bookings/${f.b.bookingId}`; f.db.data.set(p,{...f.db.data.get(p),...change});
    await f.jobs.run(f.ref,NOW); assert.equal(f.posts().length,0); assert.equal(f.job().status,'blocked'); assert.equal(f.receipt(),undefined);
  }
});
test('timeouts and response loss block forever, including an admin retry after lease expiry', async () => {
  const f=await setup({send:async()=>{ throw Error('upstream body or token MUST NOT leak'); }});
  await f.jobs.run(f.ref,NOW); assert.equal(f.job().status,'blocked'); assert.equal(f.job().lastError,'whatsapp-delivery-uncertain');
  assert.equal(f.receipt().state,'uncertain');
  await f.jobs.retry(f.ref,NOW+180000); await f.jobs.run(f.ref,NOW+180000); assert.equal(f.posts().length,1); assert.equal(f.job().status,'blocked');
  assert.ok(!JSON.stringify([...f.db.data]).includes('MUST NOT leak'));
});
test('5xx, malformed JSON, incomplete acceptance and contradictory responses are never resent', async () => {
  for (const send of [()=>reply(500,{error:{code:131000}}),()=>({status:200,ok:true,json:async()=>{throw Error('parse');}}),()=>reply(200,null),()=>reply(200,{}),()=>reply(429,{error:{code:130429},messages:[{id:'wamid.fixture'}]}),()=>reply(200,{messaging_product:'whatsapp',contacts:[{wa_id:'wrong'}],messages:[{id:'wamid.fixture'}]})]) {
    const f=await setup({send}); await f.jobs.run(f.ref,NOW); await f.jobs.retry(f.ref,NOW+180000); await f.jobs.run(f.ref,NOW+180000);
    assert.equal(f.posts().length,1); assert.equal(f.receipt().state,'uncertain'); assert.equal(f.job().status,'blocked');
  }
});
test('explicit rate-limit rejection uses bounded backoff; manual retries cannot reset receipt budget', async () => {
  const f=await setup({send:()=>reply(429,{error:{code:130429,message:'PRIVATE RESPONSE'}})});
  let time=NOW;
  for (let i=0;i<9;i++) { f.clock(time); await f.jobs.run(f.ref,time); const row=f.job(); if(i<7) { assert.equal(row.status,'retry'); assert.ok(row.nextAttemptAt.toMillis()>time); } time+=3600001; }
  assert.equal(f.posts().length,8); assert.equal(f.job().status,'failed'); assert.equal(f.receipt().attempts,8);
  await f.jobs.retry(f.ref,time); await f.jobs.run(f.ref,time); assert.equal(f.posts().length,8); assert.equal(f.job().lastError,'whatsapp-retry-budget-exhausted');
  assert.ok(!JSON.stringify([...f.db.data]).includes('PRIVATE RESPONSE'));
});
test('explicit auth/template rejection blocks automated retry but permits safe repair within budget', async () => {
  let reject=true; const f=await setup({send:()=>reject ? reply(401,{error:{code:190,message:'TOKEN DETAIL'}}):accepted()});
  await f.jobs.run(f.ref,NOW); assert.equal(f.job().status,'blocked'); assert.equal(f.receipt().state,'rejected');
  reject=false; await f.jobs.retry(f.ref,NOW+180000); await f.jobs.run(f.ref,NOW+180000);
  assert.equal(f.posts().length,2); assert.equal(f.job().status,'sent');
});
test('expired worker lease cannot create a second Meta POST while first response is pending', async () => {
  let release,started; const pending=new Promise(resolve=>{release=resolve;}), began=new Promise(resolve=>{started=resolve;});
  const f=await setup({send:async()=>{started();return pending;}}); const first=f.jobs.run(f.ref,NOW); await began;
  await f.jobs.run(f.ref,NOW+120001); assert.equal(f.job().status,'blocked'); assert.equal(f.posts().length,1);
  release(accepted()); await first; assert.equal(f.receipt().state,'accepted');
  await f.jobs.retry(f.ref,NOW+240001); await f.jobs.run(f.ref,NOW+240001); assert.equal(f.job().status,'sent'); assert.equal(f.posts().length,1);
});
test('crash after persisted intent before POST and crash saving acknowledgement both prevent a duplicate', async () => {
  const f=await setup(); const original=f.db.runTransaction; let crashed=false;
  f.db.runTransaction=async fn=>{
    const result=await original(fn);
    if(!crashed && f.receipt()?.state==='sending'){crashed=true;throw Error('process died before POST');}
    return result;
  };
  await f.jobs.run(f.ref,NOW); assert.equal(f.posts().length,0); assert.equal(f.receipt().state,'sending');
  f.db.runTransaction=original; await f.jobs.run(f.ref,NOW+3600001); assert.equal(f.posts().length,0); assert.equal(f.job().status,'blocked');
  const g=await setup(); const base=g.db.runTransaction;
  g.db.runTransaction=fn=>base(tx=>fn({...tx,update(ref,value){if(ref.path.startsWith('deliveryReceipts/') && value.state==='accepted') throw Error('database unavailable after POST');tx.update(ref,value);}}));
  await g.jobs.run(g.ref,NOW); assert.equal(g.posts().length,1); assert.equal(g.receipt().state,'sending');
  g.db.runTransaction=base; await g.jobs.run(g.ref,NOW+3600001); assert.equal(g.posts().length,1); assert.equal(g.job().status,'blocked');
});
test('changed payload or sender binding cannot reuse a receipt for a second message', async () => {
  const f=await setup(); await f.jobs.run(f.ref,NOW); const job={...f.job(),idempotencyKey:f.ref.id,whatsappSnapshot:{...f.job().whatsappSnapshot,name:'Changed'}};
  await assert.rejects(f.adapter(job),/whatsapp-payload-changed/); assert.equal(f.posts().length,1);
});
test('name whitespace normalizes and real Gregorian date/count validation rejects invalid snapshots',()=>{
  assert.deepEqual(snapshot({...INPUT,name:' ישראל\n  ישראלי '}),{name:'ישראל ישראלי',tourDate:'2026-10-08',participants:2});
  for(const patch of [{name:'x\u0000y'},{tourDate:'2026-02-30'},{participants:0},{participants:21},{participants:'2'}]) assert.throws(()=>snapshot({...INPUT,...patch}),/whatsapp-snapshot-invalid/);
});
