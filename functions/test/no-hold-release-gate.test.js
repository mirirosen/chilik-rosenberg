'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..','..');
const gatePath=path.join(root,'scripts','assert-no-hold-release-gate.cjs');
const {checkGate,ACK_VAR,ACK_VALUE}=require(gatePath);
// The live admin UI only confirms capacityReserved bookings, so a functions-only deploy must be refused.
test('booking functions deploy config runs the no-hold release gate before deploy',()=>{
 const config=JSON.parse(fs.readFileSync(path.join(root,'firebase.booking.functions.json'),'utf8'));
 assert.deepEqual(config.functions.predeploy,['node scripts/assert-no-hold-release-gate.cjs']);
});
test('release gate blocks without the explicit functions+hosting acknowledgement',()=>{
 assert.equal(checkGate({}).ok,false);
 assert.equal(checkGate({[ACK_VAR]:'1'}).ok,false);
 assert.match(checkGate({}).message,/must not be deployed alone/);
 assert.deepEqual(checkGate({[ACK_VAR]:ACK_VALUE}),{ok:true});
});
test('release gate script exits non-zero unless acknowledged',()=>{
 const env={...process.env};delete env[ACK_VAR];
 assert.equal(spawnSync(process.execPath,[gatePath],{cwd:root,env}).status,1);
 assert.equal(spawnSync(process.execPath,[gatePath],{cwd:root,env:{...env,[ACK_VAR]:ACK_VALUE}}).status,0);
});
