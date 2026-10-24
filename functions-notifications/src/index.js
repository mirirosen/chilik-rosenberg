'use strict';
// Booking notification emails for chilik-tours.com (separate codebase "notifications";
// does not touch the booking/payment functions). Provider: Resend (same provider the
// existing integration-adapters.js targets). Requires secret RESEND_API_KEY and param NOTIFY_FROM
// (an address on a domain verified in Resend).
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { ownerEmail, unpaidEmail, isPaid } = require('./render');

admin.initializeApp();
const db = admin.firestore();
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const NOTIFY_FROM = defineString('NOTIFY_FROM');
const OWNER_TO = defineString('NOTIFY_OWNER_TO', { default: 'hr20192022@gmail.com' });
const UNPAID_DELAY_MIN = 30; // give the payer time to finish checkout before warning
// Only bookings created after this moment are eligible (no retroactive mail).
const CUTOFF = defineString('NOTIFY_CUTOFF_ISO', { default: '2026-10-24T17:30:00Z' });

async function send({ to, subject, text, html, key }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY.value()}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ from: NOTIFY_FROM.value(), to: [to], subject, text, html }),
  });
  if (!r.ok) throw new Error(`resend-${r.status}: ${(await r.text()).slice(0, 300)}`);
}

// Claim a flag in a transaction so retries/overlaps never send twice.
async function claim(ref, flag) {
  return db.runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists || s.get(flag)) return null;
    tx.update(ref, { [flag]: admin.firestore.FieldValue.serverTimestamp() });
    return s.data();
  });
}
const afterCutoff = snap => snap.createTime.toMillis() >= Date.parse(CUTOFF.value());

exports.notifyOwnerOnBooking = onDocumentCreated({ document: 'bookings/{id}', secrets: [RESEND_API_KEY], retry: false }, async event => {
  const snap = event.data;
  if (!snap || !afterCutoff(snap)) return;
  const b = await claim(snap.ref, 'ownerNoticeSentAt');
  if (!b) return;
  try { await send({ to: OWNER_TO.value(), key: `owner-${snap.id}`, ...ownerEmail(snap.id, b) }); }
  catch (e) { await snap.ref.update({ ownerNoticeSentAt: null, ownerNoticeError: String(e.message).slice(0, 300) }); throw e; }
});

exports.notifyUnpaidBookings = onSchedule({ schedule: 'every 10 minutes', secrets: [RESEND_API_KEY] }, async () => {
  const cutoff = Date.parse(CUTOFF.value()), latest = Date.now() - UNPAID_DELAY_MIN * 60000;
  const qs = await db.collection('bookings')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(cutoff))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromMillis(latest)).get();
  for (const d of qs.docs) {
    const cur = d.data();
    if (cur.unpaidNoticeSentAt || isPaid(cur) || cur.status === 'cancelled' || !cur.email) continue;
    const b = await claim(d.ref, 'unpaidNoticeSentAt');
    if (!b || isPaid(b)) continue;
    try { await send({ to: b.email, key: `unpaid-${d.id}`, ...unpaidEmail(d.id, b) }); }
    catch (e) { await d.ref.update({ unpaidNoticeSentAt: null, unpaidNoticeError: String(e.message).slice(0, 300) }); console.error(d.id, e.message); }
  }
});
