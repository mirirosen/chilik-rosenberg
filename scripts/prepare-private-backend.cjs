'use strict';
// Local staging only: no installs, authentication, deployment, provider requests or IAM changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function prepare(root=path.resolve(__dirname,'..')) {
 const target=path.join(root,'.backend-private-deploy'),dest=path.join(target,'functions');
 if(fs.existsSync(target))throw Error('Preserve existing private deployment candidate');
 fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(target,'.gitignore'),'*\n');
 fs.cpSync(path.join(root,'functions/src'),path.join(dest,'src'),{recursive:true});
 for(const name of ['package.json','package-lock.json'])fs.copyFileSync(path.join(root,'functions',name),path.join(dest,name));
 const flags=['CHILIK_BOOKING_RUNTIME_ENABLED','CHILIK_BOOKING_SCHEDULERS_ENABLED','TRANZILA_ENABLED','TRANZILA_MERCHANT_CONFIGURATION_VERIFIED','TRANZILA_REPORT_CONTRACT_VERIFIED','TRANZILA_ORDER_LOOKUP_VERIFIED','PAYMENT_RECONCILIATION_ENABLED','CHILIK_WHATSAPP_ENABLED','CHILIK_WHATSAPP_CONFIGURATION_VERIFIED','CHILIK_WHATSAPP_RECIPIENT_OPT_IN_VERIFIED'];
 fs.writeFileSync(path.join(dest,'.env.hilik-site'),['# Private OFF candidate; no credentials.',...flags.map(name=>name+'=false'),'TRANZILA_TERMINAL=fxpmyry','TRANZILA_ORDER_PARAMETER=chilik_order_id','TRANZILA_ORDER_REPORT_FIELD=user_defined_10',''].join('\n'));
 const files={};function visit(dir){for(const row of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,row.name);if(row.isDirectory())visit(file);else files[path.relative(dest,file).replaceAll('\\','/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}visit(dest);
 fs.writeFileSync(path.join(target,'STAGING_MANIFEST.json'),JSON.stringify({project:'hilik-site',private:true,allRuntimeAndFinancialFlagsFalse:true,schedulerExports:0,newIamGrants:[],newApiActivations:[],providerCalls:0,productionDataWrites:0,files},null,2)+'\n');
 return {source:dest,project:'hilik-site',private:true,off:true};
}
if(require.main===module){if(process.argv.length!==2)throw Error('No arguments accepted');console.log(JSON.stringify(prepare()));}
module.exports={prepare};
