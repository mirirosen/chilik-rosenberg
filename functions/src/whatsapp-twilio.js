'use strict';
const crypto = require('node:crypto');
// Shared immutable contract; the historical direct-Meta factory is never called.
const { snapshot, SENDER, RECIPIENT, WABA, TEMPLATE_BODY, MAX_ATTEMPTS } = require('./whatsapp-adapter');
const SENDER_SID = 'XEf2b30f702857e60e8dab2bc74b3a53d4';
const META_PHONE_ID = '1377867008742755'; // Lineage only, never a send URL.
const FROM = `whatsapp:+${SENDER}`, TO = `whatsapp:+${RECIPIENT}`;
const fail = (code, blocked = true) => Object.assign(new Error(code), { blocked });
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sid = (prefix,value) => new RegExp(`^${prefix}[a-fA-F0-9]{32}$`).test(value || '');
function configurationValid(c) {
  return c.enabled === true && c.provider === 'twilio' && c.projectId === 'hilik-site' && c.configurationVerified === true && c.recipientOptInVerified === true && c.sender === SENDER && c.recipient === RECIPIENT && c.wabaId === WABA && c.senderSid === SENDER_SID && sid('AC',c.accountSid) && sid('HX',c.contentSid) && /^[a-z][a-z0-9_]{0,99}$/.test(c.templateName || '') && c.templateLanguage === 'he' && ['api-key','auth-token'].includes(c.authMode) && (c.authMode !== 'api-key' || sid('SK',c.apiKeySid));
}
function render(job,c) {
  if (job?.kind !== 'whatsapp' || job.event !== 'confirmed' || !/^BK-[a-f0-9]{24}$/.test(job.bookingId || '') || !Number.isInteger(job.revision) || job.revision < 2 || job.idempotencyKey !== `${job.bookingId}-${job.revision}-whatsapp` || job.recipient !== RECIPIENT || job.sender !== SENDER) throw fail('whatsapp-job-invalid');
  const s = snapshot(job.whatsappSnapshot);
  if (s.tourDate !== job.tourDate) throw fail('whatsapp-snapshot-invalid');
  return { From: FROM, To: TO, ContentSid: c.contentSid, ContentVariables: JSON.stringify({ '1': s.name, '2': `${s.tourDate.slice(8,10)}/${s.tourDate.slice(5,7)}/${s.tourDate.slice(0,4)}`, '3': String(s.participants) }) };
}
/** Raw REST avoids hidden SDK POST retries. Basic auth is explicit API-key or
 * account-token mode. No key creation/fallback. The receipt key is IDENTICAL
 * to historical Meta jobs, so switching provider cannot bypass a prior send. */
function createTwilioWhatsAppAdapter({ db, Timestamp, config = {}, readSecret, fetchImpl = globalThis.fetch, now = Date.now }) {
  const c = config;
  const senderUrl = `https://messaging.twilio.com/v2/Channels/Senders/${SENDER_SID}`;
  const contentUrl = `https://content.twilio.com/v1/Content/${c.contentSid}`;
  const approvalUrl = `${contentUrl}/ApprovalRequests`;
  const messageUrl = `https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}/Messages.json`;
  async function read(url,authorization) {
    let response,data;
    try { response = await fetchImpl(url,{ method:'GET', redirect:'error', signal:AbortSignal.timeout(20000), headers:{ Authorization:authorization } }); data = await response.json(); }
    catch { throw fail('whatsapp-metadata-unavailable',false); }
    if (!response.ok || !data || typeof data !== 'object' || Number.isInteger(data.code)) throw fail('whatsapp-metadata-unavailable',![429,500,502,503,504].includes(response.status));
    return data;
  }
  async function verifyContract(authorization) {
    const [sender,content,approval] = await Promise.all([read(senderUrl,authorization),read(contentUrl,authorization),read(approvalUrl,authorization)]);
    if (sender.sid !== SENDER_SID || sender.sender_id !== FROM || sender.status !== 'ONLINE' || sender.configuration?.waba_id !== WABA) throw fail('whatsapp-sender-unverified');
    const types = content.types && Object.keys(content.types), variables = content.variables && Object.keys(content.variables).sort();
    if (content.sid !== c.contentSid || content.account_sid !== c.accountSid || content.language !== 'he' || types?.length !== 1 || types[0] !== 'twilio/text' || content.types['twilio/text']?.body !== TEMPLATE_BODY || JSON.stringify(variables) !== JSON.stringify(['1','2','3']) || approval.sid !== c.contentSid || approval.account_sid !== c.accountSid || approval.whatsapp?.status !== 'approved' || approval.whatsapp?.type !== 'whatsapp' || approval.whatsapp?.content_type !== 'twilio/text' || approval.whatsapp?.name !== c.templateName) throw fail('whatsapp-template-unverified');
  }
  return async function whatsapp(job) {
    if (!configurationValid(c)) throw fail('whatsapp-not-configured');
    const fields = render(job,c), payloadHash = hash({ provider:'twilio', accountSid:c.accountSid, senderSid:SENDER_SID, wabaId:WABA, fields });
    const ref = db.doc(`deliveryReceipts/${hash(`whatsapp:${job.idempotencyKey}`)}`);
    function inspect(saved) {
      if (!saved) return null;
      if (saved.payloadHash !== payloadHash || saved.provider !== 'twilio') throw fail('whatsapp-payload-changed');
      if (saved.state === 'accepted' && /^(SM|MM)[a-fA-F0-9]{32}$/.test(saved.providerId || '')) {
        if (['failed','undelivered','canceled'].includes(saved.providerStatus)) throw fail('whatsapp-provider-message-failed');
        return { providerId:saved.providerId };
      }
      if (!['retry','rejected'].includes(saved.state)) throw fail('whatsapp-delivery-uncertain');
      if (!Number.isInteger(saved.attempts) || saved.attempts >= MAX_ATTEMPTS) throw fail('whatsapp-retry-budget-exhausted');
      return null;
    }
    const cached = await db.runTransaction(async tx => inspect((await tx.get(ref)).data()));
    if (cached) return cached;
    let secret;
    try { secret = typeof readSecret === 'function' ? await readSecret() : ''; } catch { throw fail('provider-token-unavailable'); }
    if (typeof secret !== 'string' || !/^[\x21-\x7e]{16,1024}$/.test(secret)) throw fail('provider-token-unavailable');
    const username = c.authMode === 'api-key' ? c.apiKeySid : c.accountSid;
    const authorization = `Basic ${Buffer.from(`${username}:${secret}`,'utf8').toString('base64')}`;
    await verifyContract(authorization);
    const claim = crypto.randomUUID();
    const reused = await db.runTransaction(async tx => {
      const [receipt,booking] = await Promise.all([tx.get(ref),tx.get(db.doc(`bookings/${job.bookingId}`))]);
      const saved = receipt.data(), result = inspect(saved);
      if (result) return result;
      const b = booking.data();
      if (b?.schemaVersion !== 2 || b.status !== 'confirmed' || b.capacityReserved !== true || b.revision < job.revision) throw fail('whatsapp-booking-not-confirmed');
      if (hash(snapshot(b)) !== hash(snapshot(job.whatsappSnapshot))) throw fail('whatsapp-booking-changed');
      const value = { kind:'whatsapp', provider:'twilio', bookingId:job.bookingId, payloadHash, state:'sending', claim, attempts:(saved?.attempts || 0)+1, providerId:null, providerStatus:null, updatedAt:Timestamp.fromMillis(now()) };
      if (saved) tx.update(ref,value); else tx.create(ref,{ ...value,createdAt:value.updatedAt });
      return null;
    });
    if (reused) return reused;
    async function finish(state,providerId=null,providerStatus=null) {
      await db.runTransaction(async tx => {
        const saved = (await tx.get(ref)).data();
        if (saved?.claim !== claim || saved.state !== 'sending') throw fail('whatsapp-delivery-uncertain');
        tx.update(ref,{ state,providerId,providerStatus,updatedAt:Timestamp.fromMillis(now()) });
      });
    }
    let response,data;
    try {
      response = await fetchImpl(messageUrl,{ method:'POST', redirect:'error', signal:AbortSignal.timeout(20000), headers:{ Authorization:authorization,'Content-Type':'application/x-www-form-urlencoded' },body:new URLSearchParams(fields).toString() });
      data = await response.json();
    } catch { await finish('uncertain'); throw fail('whatsapp-delivery-uncertain'); }
    const statuses = ['queued','sending','sent','delivered','read','failed','undelivered','canceled'];
    if (response.ok && /^(SM|MM)[a-fA-F0-9]{32}$/.test(data?.sid || '') && data.account_sid === c.accountSid && data.from === FROM && data.to === TO && data.direction === 'outbound-api' && statuses.includes(data.status)) {
      await finish('accepted',data.sid,data.status);
      if (['failed','undelivered','canceled'].includes(data.status)) throw fail('whatsapp-provider-message-failed');
      return { providerId:data.sid };
    }
    // Twilio documents 429/20429 as not processed and safe to retry with backoff.
    if (response.status >= 400 && response.status < 500 && Number.isInteger(data?.code) && data.status === response.status && !data.sid) {
      const transient = response.status === 429 && data.code === 20429;
      await finish(transient ? 'retry' : 'rejected');
      throw fail(transient ? 'whatsapp-rate-limited' : 'whatsapp-provider-rejected',!transient);
    }
    await finish('uncertain'); throw fail('whatsapp-delivery-uncertain');
  };
}
module.exports = { createTwilioWhatsAppAdapter, configurationValid, render, SENDER_SID, META_PHONE_ID, FROM, TO };
