'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createCalendarApi}=require('../src/calendar-api');
// Calendar importing must use the integration identity when separately enabled,
// while the public aggregate endpoint never receives OAuth secret access.
test('enabled private Calendar import uses integration runtime without exposing secrets publicly',()=>{
 const options={};const onRequest=(o,fn)=>{options.public=o;return fn};const onSchedule=(o,fn)=>{options.import=o;return fn};
 const secretBindings=[{name:'fixture-calendar-secret'}];
 const api=createCalendarApi({db:{},onRequest,onSchedule,runtime:{publicEnabled:true,readsEnabled:true,secretBindings,policy:{},importUpcoming(){throw Error('Must not execute during discovery')}}});
 assert.equal(typeof api.refreshCalendarAvailability,'function');
 for(const o of Object.values(options)){assert.equal(o.region,'us-central1');assert.equal(o.serviceAccount,'chilik-integration-runtime@hilik-site.iam.gserviceaccount.com')}
 assert.equal(options.public.secrets,undefined);assert.deepEqual(options.import.secrets,secretBindings);
});
