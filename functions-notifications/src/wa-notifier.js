'use strict';
// WhatsApp flows. Dedupe = transactional claim flag on the booking. A send
// failure is recorded and NOT retried (a timeout may still have delivered).
const T = require('./whatsapp');
const CUSTOMER_MAX_PER_HOUR = 20;

function createWaNotifier({ db, send, ownerTo = T.OWNER_DEFAULT, cutoffMs, customerEnabled = false, serverTimestamp, now = () => Date.now() }) {
  if (!Number.isFinite(cutoffMs)) throw new Error('invalid-whatsapp-cutoff');
  const afterCutoff = snap => !!snap?.createTime && snap.createTime.toMillis() >= cutoffMs;
  async function claim(ref, flag) {
    return db.runTransaction(async tx => {
      const s = await tx.get(ref);
      if (!s.exists || s.get(flag)) return null;
      tx.update(ref, { [flag]: serverTimestamp() });
      return s.data();
    });
  }
  async function deliver(ref, flag, to, text) {
    try { const id = await send(to, text); await ref.update({ [`${flag}Id`]: id }); return true; }
    catch (e) { await ref.update({ [`${flag}Error`]: String(e.message).slice(0, 200) }); console.error(ref.id, flag, e.message); return false; }
  }
  async function customerSlot() {
    const hour = new Date(now()).toISOString().slice(0, 13);
    const ref = db.doc(`whatsappRate/customer-${hour}`);
    return db.runTransaction(async tx => {
      const s = await tx.get(ref), n = s.exists ? s.get('count') || 0 : 0;
      if (n >= CUSTOMER_MAX_PER_HOUR) return false;
      tx.set(ref, { count: n + 1 }, { merge: true });
      return true;
    });
  }
  async function toCustomer(snap, b, flag, render) {
    if (customerEnabled !== true) return false;          // flag OFF: never send
    const to = T.toIntl(b.phone);
    if (!to || !(await customerSlot())) return false;
    if (!(await claim(snap.ref, flag))) return false;
    return deliver(snap.ref, flag, to, render(snap.id, b));
  }

  async function onCreated(snap) {
    if (!afterCutoff(snap)) return { skipped: 'cutoff' };
    const b = await claim(snap.ref, 'waOwnerNewSentAt');
    const r = { owner: b ? await deliver(snap.ref, 'waOwnerNewSentAt', ownerTo, T.ownerNewBookingText(snap.id, b)) : false };
    if (b) r.customer = await toCustomer(snap, b, 'waCustomerReceivedSentAt', T.customerReceivedText);
    return r;
  }
  // Paid = transition into paymentStatus 'paid', which only the verified
  // Tranzila callback sets (functions/src/booking-core.js).
  async function onUpdated(before, after) {
    if (!afterCutoff(after)) return { skipped: 'cutoff' };
    const a = after.data(), p = before.data() || {};
    if (a.paymentStatus !== 'paid' || p.paymentStatus === 'paid') return { skipped: 'not-paid-transition' };
    const b = await claim(after.ref, 'waOwnerPaidSentAt');
    const r = { owner: b ? await deliver(after.ref, 'waOwnerPaidSentAt', ownerTo, T.ownerPaidText(after.id, b)) : false };
    r.customer = await toCustomer(after, a, 'waCustomerPaidSentAt', T.customerPaidText);
    return r;
  }
  return { onCreated, onUpdated };
}
module.exports = { createWaNotifier, CUSTOMER_MAX_PER_HOUR };
