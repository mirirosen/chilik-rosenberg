"use strict";
const { SENDER, RECIPIENT, WABA } = require('./whatsapp-adapter');
const { createTwilioWhatsAppAdapter, configurationValid, SENDER_SID } = require('./whatsapp-twilio');
const SECRET_NAMES = { 'api-key':'CHILIK_TWILIO_API_KEY_SECRET', 'auth-token':'CHILIK_TWILIO_AUTH_TOKEN' };
function createWhatsAppRuntime({ db,Timestamp,env=process.env,secretFactory,fetchImpl,now }) {
  const config = {
    enabled:env.CHILIK_WHATSAPP_ENABLED === 'true', provider:env.CHILIK_WHATSAPP_PROVIDER,
    projectId:env.GCLOUD_PROJECT || env.GCP_PROJECT, configurationVerified:env.CHILIK_WHATSAPP_CONFIGURATION_VERIFIED === 'true', recipientOptInVerified:env.CHILIK_WHATSAPP_RECIPIENT_OPT_IN_VERIFIED === 'true',
    accountSid:env.CHILIK_TWILIO_ACCOUNT_SID, senderSid:env.CHILIK_TWILIO_SENDER_SID || SENDER_SID,
    contentSid:env.CHILIK_TWILIO_CONTENT_SID, templateName:env.CHILIK_TWILIO_TEMPLATE_NAME, templateLanguage:env.CHILIK_WHATSAPP_TEMPLATE_LANGUAGE,
    authMode:env.CHILIK_TWILIO_AUTH_MODE, apiKeySid:env.CHILIK_TWILIO_API_KEY_SID,
    sender:SENDER,recipient:RECIPIENT,wabaId:WABA,
  };
  // Only Twilio is wired; old Meta flags/token cannot select a live sender.
  // Incomplete/disabled config never binds/reads a secret at discovery.
  const enabled = configurationValid(config), secretName = enabled ? SECRET_NAMES[config.authMode] : null;
  const secret = enabled ? secretFactory(secretName) : null;
  return { enabled,config,secretBindings:secret ? [secret] : [],adapter:createTwilioWhatsAppAdapter({db,Timestamp,config,fetchImpl,now,readSecret:()=>secret?.value()}) };
}
module.exports = { createWhatsAppRuntime, SECRET_NAMES };
