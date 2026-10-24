'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const root=path.join(__dirname,'..','..');
const {checkBuild,readEnv}=require(path.join(root,'scripts','assert-booking-hosting-build.cjs'));
const env=readEnv(path.join(root,'deploy','booking-hosting.env'));
// A build without the live Firebase/API config compiles booking out; hosting deploy must refuse it.
function dist(js,html='<html></html>'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'booking-dist-'));
 fs.mkdirSync(path.join(dir,'assets'));fs.writeFileSync(path.join(dir,'assets','app-a1b2c3d4.js'),js);fs.writeFileSync(path.join(dir,'index.html'),html);
 return dir;
}
const live=`const f={projectId:"${env.VITE_BOOKING_FIREBASE_PROJECT_ID}",apiKey:"${env.VITE_BOOKING_FIREBASE_API_KEY}",authDomain:"${env.VITE_BOOKING_FIREBASE_AUTH_DOMAIN}",appId:"${env.VITE_BOOKING_FIREBASE_APP_ID}"},U="${env.VITE_PAYMENT_API_BASE}";`;
test('booking hosting deploy config runs the build check before deploy',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.hosting.booking.json'),'utf8'));
 assert.deepEqual(config.hosting.predeploy,['node scripts/assert-booking-hosting-build.cjs']);
});
test('the committed live build config holds the public hilik-site web client values',()=>{
 assert.equal(env.VITE_BOOKING_FIREBASE_PROJECT_ID,'hilik-site');
 assert.equal(env.VITE_PAYMENT_API_BASE,'https://us-central1-hilik-site.cloudfunctions.net');
 assert.equal(env.VITE_CALENDAR_AVAILABILITY_ENABLED,'true');
 assert.equal(env.VITE_FIREBASE_EMULATORS,'false');
});
test('a build carrying the live config passes; one without it, or a preprod build, is blocked',()=>{
 assert.deepEqual(checkBuild(dist(live),path.join(root,'deploy','booking-hosting.env')),{ok:true,problems:[]});
 const bare=checkBuild(dist('const f={projectId:void 0};'),path.join(root,'deploy','booking-hosting.env'));
 assert.equal(bare.ok,false);assert.ok(bare.problems.includes('missing Firebase project id'));
 const preprod=checkBuild(dist(live,`<meta http-equiv="Content-Security-Policy" content="connect-src 'none'">`),path.join(root,'deploy','booking-hosting.env'));
 assert.deepEqual(preprod.problems,['index.html is a preprod/demo build']);
 assert.equal(checkBuild(path.join(os.tmpdir(),'no-such-dist-booking')).ok,false);
});
