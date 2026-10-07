'use strict';
// Historical direct-Meta adapter retained for regression coverage only.
// The approved Twilio sender does NOT authorize this route. index.js selects
// whatsapp-runtime.js, which exclusively wires whatsapp-twilio.js.
const crypto = require('node:crypto');
const SENDER = '14432413703', RECIPIENT = '972506724312', WABA = '1719441809155521';
const TEMPLATE_BODY = 'הזמנה מאושרת: {{1}}\nתאריך הסיור: {{2}}\nמספר משתתפים: {{3}}';
const MAX_ATTEMPTS = 8;
const fail = (code, blocked = true) => Object.assign(new Error(code), { blocked });
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function snapshot(booking) {
  const raw = booking?.name;
  if (typeof raw !== 'string') throw fail('whatsapp-snapshot-invalid');
  const name = raw.trim().replace(/\s+/g, ' '), date = booking.tourDate, participants = booking.participants;
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f-\u009f]/.test(name) || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date || !Number.isInteger(participants) || participants < 1 || participants > 20) throw fail('whatsapp-snapshot-invalid');
  return { name, tourDate: date, participants };
}
function configurationValid(c) {
  return c.enabled === true && c.projectId === 'hilik-site' && c.configurationVerified === true && c.recipientOptInVerified === true && c.wabaId === WABA && c.sender === SENDER && c.recipient === RECIPIENT && /^\d{5,30}$/.test(c.phoneNumberId || '') && /^v\d{2,3}\.0$/.test(c.graphVersion || '') && /^[a-z][a-z0-9_]{0,99}$/.test(c.templateName || '') && c.templateLanguage === 'he';
}
function render(job, c) {
  if (job?.kind !== 'whatsapp' || job.event !== 'confirmed' || !/^BK-[a-f0-9]{24}$/.test(job.bookingId || '') || !Number.isInteger(job.revision) || job.revision < 2 || job.idempotencyKey !== `${job.bookingId}-${job.revision}-whatsapp` || job.recipient !== RECIPIENT || job.sender !== SENDER) throw fail('whatsapp-job-invalid');
  const s = snapshot(job.whatsappSnapshot);
  if (job.tourDate !== s.tourDate) throw fail('whatsapp-snapshot-invalid');
  return { messaging_product: 'whatsapp', recipient_type: 'individual', to: RECIPIENT, type: 'template', template: { name: c.templateName, language: { code: 'he' }, components: [{ type: 'body', parameters: [s.name, `${s.tourDate.slice(8,10)}/${s.tourDate.slice(5,7)}/${s.tourDate.slice(0,4)}`, String(s.participants)].map(text => ({ type: 'text', text })) }] } };
}
/** Meta does not provide a verified send-idempotency contract here. Persist intent
 * before POST; an uncertain POST is never automatically or manually re-sent.
 * This favors duplicate prevention over delivery after a crash. Acknowledged is
 * API acceptance, not handset delivery. No provider body/token is persisted. */
function createWhatsAppAdapter({ db, Timestamp, config = {}, getAccessToken, fetchImpl = globalThis.fetch, now = Date.now }) {
  const c = config;
  async function read(endpoint, token) {
    let response, data;
    try {
      response = await fetchImpl(`https://graph.facebook.com/${c.graphVersion}/${endpoint}`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${token}` } });
      data = await response.json();
    } catch { throw fail('whatsapp-metadata-unavailable', false); }
    if (!response.ok || !data || typeof data !== 'object' || data.error) throw fail('whatsapp-metadata-unavailable', ![429,500,502,503,504].includes(response.status));
    return data;
  }
  async function verifySenderAndTemplate(token) {
    let after, found = false;
    for (let page = 0; page < 10; page++) {
      const data = await read(`${WABA}/phone_numbers?fields=id,display_phone_number&limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`, token);
      if (!Array.isArray(data.data)) throw fail('whatsapp-sender-unverified');
      const row = data.data.find(p => p.id === c.phoneNumberId);
      if (row) {
        if (String(row.display_phone_number || '').replace(/[^\d]/g,'') !== SENDER) throw fail('whatsapp-sender-unverified');
        found = true; break;
      }
      if (!data.paging?.next) break;
      after = data.paging?.cursors?.after;
      if (typeof after !== 'string' || !after || after.length > 2048) throw fail('whatsapp-sender-unverified');
    }
    if (!found) throw fail('whatsapp-sender-unverified');
    const data = await read(`${WABA}/message_templates?name=${encodeURIComponent(c.templateName)}&fields=name,status,language,parameter_format,components&limit=100`, token);
    const matches = (Array.isArray(data.data) ? data.data : []).filter(t => t.name === c.templateName && t.language === 'he');
    const t = matches[0];
    if (matches.length !== 1 || data.paging?.next || t.status !== 'APPROVED' || (t.parameter_format && t.parameter_format !== 'POSITIONAL') || t.components?.length !== 1 || t.components[0].type !== 'BODY' || t.components[0].text !== TEMPLATE_BODY) throw fail('whatsapp-template-unverified');
  }
  return async function whatsapp(job) {
    if (!configurationValid(c)) throw fail('whatsapp-not-configured');
    const body = render(job,c), payloadHash = digest({ phoneNumberId: c.phoneNumberId, wabaId: WABA, graphVersion: c.graphVersion, body });
    const ref = db.doc(`deliveryReceipts/${digest(`whatsapp:${job.idempotencyKey}`)}`);
    function inspect(saved) {
      if (!saved) return null;
      if (saved.payloadHash !== payloadHash) throw fail('whatsapp-payload-changed');
      if (saved.state === 'accepted' && typeof saved.providerId === 'string') return { providerId: saved.providerId };
      if (!['retry','rejected'].includes(saved.state)) throw fail('whatsapp-delivery-uncertain');
      if (!Number.isInteger(saved.attempts) || saved.attempts >= MAX_ATTEMPTS) throw fail('whatsapp-retry-budget-exhausted');
      return null;
    }
    const cached = await db.runTransaction(async tx => inspect((await tx.get(ref)).data()));
    if (cached) return cached;
    let token;
    try { token = typeof getAccessToken === 'function' ? await getAccessToken() : null; } catch { throw fail('provider-token-unavailable'); }
    if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) throw fail('provider-token-unavailable');
    await verifySenderAndTemplate(token);
    const claim = crypto.randomUUID();
    const reused = await db.runTransaction(async tx => {
      const [receipt, booking] = await Promise.all([tx.get(ref),tx.get(db.doc(`bookings/${job.bookingId}`))]);
      const saved = receipt.data(), result = inspect(saved);
      if (result) return result;
      const b = booking.data();
      if (b?.schemaVersion !== 2 || b.status !== 'confirmed' || b.capacityReserved !== true || b.revision < job.revision) throw fail('whatsapp-booking-not-confirmed');
      if (digest(snapshot(b)) !== digest(snapshot(job.whatsappSnapshot))) throw fail('whatsapp-booking-changed');
      const value = { kind: 'whatsapp', bookingId: job.bookingId, payloadHash, state: 'sending', claim, attempts: (saved?.attempts || 0) + 1, providerId: null, updatedAt: Timestamp.fromMillis(now()) };
      if (saved) tx.update(ref,value); else tx.create(ref,{ ...value, createdAt: value.updatedAt });
      return null;
    });
    if (reused) return reused;
    async function finish(state, providerId = null) {
      await db.runTransaction(async tx => {
        const saved = (await tx.get(ref)).data();
        if (saved?.claim !== claim || saved.state !== 'sending') throw fail('whatsapp-delivery-uncertain');
        tx.update(ref,{ state, providerId, updatedAt: Timestamp.fromMillis(now()) });
      });
    }
    let response, data;
    try {
      response = await fetchImpl(`https://graph.facebook.com/${c.graphVersion}/${c.phoneNumberId}/messages`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      data = await response.json();
    } catch { await finish('uncertain'); throw fail('whatsapp-delivery-uncertain'); }
    const id = data?.messages?.[0]?.id;
    if (response.ok && data && !data.error && data.messaging_product === 'whatsapp' && data.messages?.length === 1 && /^wamid\.[A-Za-z0-9+/=_-]{1,1024}$/.test(id || '') && data.contacts?.length === 1 && data.contacts[0].wa_id === RECIPIENT) {
      await finish('accepted',id); return { providerId: id };
    }
    // Only explicit 4xx rejections without message IDs can be retried safely.
    if (response.status >= 400 && response.status < 500 && Number.isInteger(data?.error?.code) && !data.messages?.length) {
      const transient = response.status === 429 || [130429,131056].includes(data.error.code);
      await finish(transient ? 'retry' : 'rejected');
      throw fail(transient ? 'whatsapp-rate-limited' : 'whatsapp-provider-rejected', !transient);
    }
    await finish('uncertain'); throw fail('whatsapp-delivery-uncertain');
  };
}
module.exports = { createWhatsAppAdapter, configurationValid, snapshot, render, SENDER, RECIPIENT, WABA, TEMPLATE_BODY, MAX_ATTEMPTS };
