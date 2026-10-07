'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,INPUT,NOW,CONFIG}=require('./helpers/offline-system');
const {Timestamp}=require('./helpers/fake-db');
const {createTranzilaAdapter}=require('../src/providers/tranzila');
const {createPaymentReconciler,createRuntimeReconciler}=require('../src/payment-reconciliation');
async function setup() {
  const f=fixture(), created=await f.call('createPayment',{body:INPUT}),id=created.body.bookingId;
  assert.equal(created.statusCode,201);
  const ref=f.db.doc(`paymentReconciliation/${id}`), reports=new Map(), calls=[];
  let now=NOW,outage=false;
  const provider=createTranzilaAdapter({config:{...CONFIG,orderLookupVerified:true,orderFilterParameter:'order_id'},clock:()=>now,fetchImpl:async(_url,options)=>{
    const body=JSON.parse(options.body); calls.push(body.transaction_index||'lookup');
    if(outage) throw new Error('private-upstream-detail');
    const rows=body.transaction_index?[reports.get(body.transaction_index)].filter(Boolean):[...reports.values()];
    return {ok:true,json:async()=>({transactions:rows,total:String(rows.length),rows:rows.length})};
  }});
  const runner=createPaymentReconciler({db:f.db,bookings:f.bookings,Timestamp,provider,isEnabled:()=>true,clock:()=>now});
  const record=(index=42,patch={})=>{
    const row={index,authorization_number:147934,amount:500,currency:'1',processor_response_code:'000',child_terminal:CONFIG.terminal,user_defined_3:id,txn_type:'FIXTURE_CAPTURE',tranmode:'FIXTURE_MODE',transtatus:1,txn_payment_method:'CC',cancelfdid:null,cancelfdnumber:null,credit_card_token:'private-card-token',...patch};
    reports.set(index,row); f.record(id,index,patch);
  };
  return {...f,id,ref,runner,provider,calls,record,job:()=>f.db.data.get(ref.path),now:()=>now,advance:ms=>{now+=ms;f.advance(ms);},outage:value=>{outage=value;}};
}
test('disabled default and runtime worker perform no DB, secret or provider access',async()=>{
  const forbidden=()=>{throw new Error('must-not-access');};
  const worker=createPaymentReconciler({db:{collection:forbidden},provider:{assertLookupReady:forbidden},Timestamp});
  assert.equal((await worker.runDue()).disabled,true); assert.equal((await worker.run({id:'anything'})).disabled,true);
  const runtime=createRuntimeReconciler({db:{collection:forbidden},envFor:()=>({}),readSecret:forbidden,providerFactory:forbidden});
  assert.equal((await runtime.runDue()).disabled,true);
  const invalid=createRuntimeReconciler({db:{collection:forbidden},envFor:()=>({PAYMENT_RECONCILIATION_ENABLED:'true'}),readSecret:forbidden,providerFactory:forbidden});
  assert.equal((await invalid.runDue()).blocked,true);
});
test('lost callback is recovered only by discovery plus independently verified capture; repeat preserves seats/jobs/revision',async()=>{
  const f=await setup(); f.record();
  assert.equal(f.booking(f.id).paymentStatus,'awaiting_payment');
  await f.runner.runDue();
  assert.equal(f.booking(f.id).paymentStatus,'paid'); assert.equal(f.seats(),2); assert.equal(f.jobsCount(),4);
  assert.deepEqual(f.calls,['lookup',42]); assert.equal(f.job().status,'retry');
  const revision=f.booking(f.id).revision; f.advance(3*60000); await f.runner.run(f.ref);
  assert.equal(f.booking(f.id).revision,revision); assert.equal(f.seats(),2); assert.equal(f.jobsCount(),4);
  const stored=JSON.stringify(f.job());
  for(const privateValue of ['private-card-token',INPUT.email,INPUT.phone,CONFIG.appKey,CONFIG.secret]) assert.ok(!stored.includes(privateValue));
});
test('empty report and wrong capture cannot confirm from browser success or discovery alone',async()=>{
  const f=await setup(); await f.runner.run(f.ref);
  assert.equal(f.booking(f.id).paymentStatus,'awaiting_payment');
  assert.equal((await f.call('paymentStatus',{method:'GET',query:{id:f.id,payment:'success'}})).body.paymentStatus,'awaiting_payment');
  f.advance(3*60000); f.record(42,{amount:1}); await f.runner.run(f.ref);
  assert.equal(f.booking(f.id).paymentStatus,'awaiting_payment'); assert.equal(f.seats(),2); assert.equal(f.job().lastErrorCode,'provider-verification-pending');
});
test('transient report outage retries without exposing upstream details or modifying payment',async()=>{
  const f=await setup(); f.outage(true); await f.runner.run(f.ref);
  assert.equal(f.job().status,'retry'); assert.equal(f.job().lastErrorCode,'payment-provider-unavailable');
  assert.ok(!JSON.stringify(f.job()).includes('private-upstream-detail')); assert.equal(f.booking(f.id).paymentStatus,'awaiting_payment');
  f.outage(false); f.advance(3*60000); f.record(); await f.runner.run(f.ref); assert.equal(f.booking(f.id).paymentStatus,'paid');
});
test('concurrent worker leases allow one discovery and one atomic capture transition',async()=>{
  const f=await setup(); f.record();
  await Promise.all([f.runner.run(f.ref),f.runner.run(f.ref)]);
  assert.deepEqual(f.calls,['lookup',42]); assert.equal(f.booking(f.id).revision,2); assert.equal(f.seats(),2); assert.equal(f.jobsCount(),4);
  assert.equal([...f.db.data.keys()].filter(path=>path.startsWith('paymentReconciliation/')).length,1);
});
test('a replaced worker lease cannot apply its delayed result or overwrite its successor',async()=>{
  const f=await setup(); f.record(); let resume,started;
  const waiting=new Promise(resolve=>{started=resolve;});
  const provider={...f.provider,async findTransactionIndexes(){started();await new Promise(resolve=>{resume=resolve;});return {complete:true,transactionIndexes:[42]};}};
  const worker=createPaymentReconciler({db:f.db,bookings:f.bookings,Timestamp,provider,isEnabled:()=>true,clock:f.now});
  const run=worker.run(f.ref); await waiting;
  await f.db.runTransaction(async tx=>{await tx.get(f.ref);tx.update(f.ref,{lease:'successor-lease'});});
  resume(); assert.equal((await run).stale,true); assert.equal(f.job().lease,'successor-lease'); assert.equal(f.booking(f.id).paymentStatus,'awaiting_payment');
});
test('late discovered capture stays review-only and cannot restore released seats',async()=>{
  const f=await setup(); f.advance(16*60000); await f.api.expirePaymentHolds(); assert.equal(f.seats(),0);
  f.record(); await f.runner.run(f.ref);
  assert.equal(f.booking(f.id).paymentStatus,'pending_review'); assert.equal(f.booking(f.id).status,'payment_review'); assert.equal(f.seats(),0);
});
test('multiple independent captures are reviewed; cancellation retains manual refund review and zero seats',async()=>{
  const f=await setup(); f.record();
  await f.call('tranzilaWebhook',{query:{id:f.id},body:{index:42}});
  await f.call('updateBookingStatus',{token:'admin',body:{bookingId:f.id,status:'cancelled'}});
  f.record(43); await f.runner.run(f.ref);
  const b=f.booking(f.id); assert.equal(b.status,'cancelled'); assert.equal(b.paymentStatus,'paid'); assert.equal(b.refundStatus,'manual_review_required'); assert.equal(b.additionalPaymentReview,true); assert.equal(f.seats(),0);
});
test('incomplete discovery never starts verification or creates a receipt',async()=>{
  const f=await setup(); let verifications=0;
  const provider={...f.provider,async findTransactionIndexes(){return {complete:false,transactionIndexes:[42]};},async verifyTransaction(){verifications++;throw new Error();}};
  const worker=createPaymentReconciler({db:f.db,bookings:f.bookings,Timestamp,provider,isEnabled:()=>true,clock:f.now});
  await worker.run(f.ref); assert.equal(verifications,0); assert.equal(f.booking(f.id).paymentStatus,'awaiting_payment'); assert.equal(f.job().lastErrorCode,'provider-lookup-incomplete');
});
test('monitoring is bounded and failures become manual review without guessed financial status',async()=>{
  const f=await setup(); f.advance(24*3600000); f.outage(true); await f.runner.run(f.ref);
  assert.equal(f.job().status,'manual_review'); assert.equal(f.booking(f.id).paymentStatus,'awaiting_payment');
  const g=await setup(); g.advance(24*3600000); await g.runner.run(g.ref);
  assert.equal(g.job().status,'complete'); assert.equal(g.booking(g.id).paymentStatus,'awaiting_payment');
  const h=await setup(); h.advance(25*3600000); await h.runner.run(h.ref);
  assert.equal(h.job().status,'manual_review'); assert.equal(h.calls.length,0);
});
test('malformed private job cannot select another booking or access provider',async()=>{
  const f=await setup(); f.db.data.set(f.ref.path,{...f.job(),bookingId:'BK-'+'e'.repeat(24)});
  await f.runner.run(f.ref); assert.equal(f.job().status,'manual_review'); assert.equal(f.calls.length,0); assert.equal(f.booking(f.id).paymentStatus,'awaiting_payment');
});
