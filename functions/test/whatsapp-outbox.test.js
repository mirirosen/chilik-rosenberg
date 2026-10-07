'use strict';
const {test}=require('node:test'); const assert=require('node:assert/strict');
const {fakeDb,Timestamp}=require('./helpers/fake-db');
const {createBookingService}=require('../src/booking-service');
const {formatNewBookingWhatsApp,createMockWhatsAppProcessor,enqueueNewBookingWhatsApp}=require('../src/whatsapp-outbox');
const NOW=Date.parse('2026-10-02T10:00:00Z');
const INPUT={name:'ישראל ישראלי',phone:'0501234567',email:'private@example.test',tourDate:'2026-10-08',participants:2,paymentMethod:'bit',dateOfBirth:'1990-01-01',agreeToTerms:true};
test('exact requested WhatsApp format contains name, DD/MM and quantity only',()=>{
 assert.equal(formatNewBookingWhatsApp({...INPUT,tourDate:'2025-02-20'}),'ישראל ישראלי 20/02 2 אנשים');
 assert.equal(formatNewBookingWhatsApp({...INPUT,name:' ישראל\n  ישראלי '}),'ישראל ישראלי 08/10 2 אנשים');
 assert.throws(()=>formatNewBookingWhatsApp({...INPUT,tourDate:'2026-02-30'}),/whatsapp-snapshot-invalid/);
});
test('first confirmation and integration outbox commit together; duplicate requests/status revisions create one notification',async()=>{
 const db=fakeDb(),service=createBookingService(db,Timestamp),key='a'.repeat(32);
 const [a,b]=await Promise.all([service.create('owner',key,INPUT,NOW),service.create('owner',key,INPUT,NOW)]); assert.equal(a.bookingId,b.bookingId);
 await service.change(a.bookingId,'confirm','fixture-admin',null,NOW);await service.change(a.bookingId,'cancel','fixture-admin',null,NOW);
 const entries=[...db.data.entries()].filter(([,job])=>job.kind==='whatsapp');assert.equal(entries.length,1);
 const job=entries[0][1];assert.equal(job.recipient,'972506724312');assert.equal(job.sender,'14432413703');assert.deepEqual(job.whatsappSnapshot,{name:INPUT.name,tourDate:INPUT.tourDate,participants:2});assert.equal(job.status,'pending');assert.equal([...db.data.keys()].filter(p=>p.startsWith('whatsappOutbox/')).length,0);
 for(const value of ['0501234567','private@example.test','1990-01-01'])assert.ok(!JSON.stringify(job).includes(value));
});
test('default mode never sends; concurrent mock acknowledgements are deduplicated',async()=>{
 const db=fakeDb(),service=createBookingService(db,Timestamp);const b=await service.create('owner','a'.repeat(32),INPUT,NOW);const ref=db.doc(`whatsappOutbox/${b.bookingId}-new-booking`);
 // Explicit legacy mock-only fixture; normal lifecycle no longer creates it.
 await db.runTransaction(async tx=>enqueueNewBookingWhatsApp(tx,db,b,Timestamp.fromMillis(NOW)));
 assert.deepEqual(await createMockWhatsAppProcessor(db,Timestamp).run(ref,NOW),{disabled:true});assert.equal(db.data.get(ref.path).status,'disabled');
 const processor=createMockWhatsAppProcessor(db,Timestamp,{mode:'mock'});const results=await Promise.all([processor.run(ref,NOW),processor.run(ref,NOW)]);
 assert.equal(results[0].providerId,results[1].providerId);assert.equal(results[1].reused,true);assert.equal(db.data.get(ref.path).status,'mock_sent');
 assert.deepEqual(await createMockWhatsAppProcessor(db,Timestamp,{mode:'real'}).run(ref,NOW),{disabled:true});
});
