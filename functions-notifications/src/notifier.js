'use strict';
// Notification flows, independent of the Functions runtime so they can be tested
// with a fake Firestore and a mocked mail transport.
const { ownerEmail, unpaidEmail, isPaid, isClosed } = require('./render');
const { customerReceivedEmail, customerConfirmedEmail, viaProvider } = require('./customer-render');

const UNPAID_DELAY_MIN = 30; // give the payer time to finish checkout before warning
const UNPAID_LOOKBACK_DAYS = 2; // bounds the sweep query; older bookings were already handled
const UNPAID_MAX_ATTEMPTS = 3; // a permanently bad address must not be retried forever
const CUSTOMER_MAX_ATTEMPTS = 3; // same bound for the customer received/confirmed emails

// Only viaProvider() bookings can reach paymentStatus 'paid', and only through
// BookingService.change(event 'paid') with an independently verified Tranzila
// receipt (tranzilaWebhook / reconcilePayments).
const verifiedPaid = b => !!b && viaProvider(b) && b.paymentStatus === 'paid' && b.status === 'confirmed';
// The confirmed email goes out on the first write that makes a booking verified-paid
// and confirmed. Manual admin confirmations of bit/bank requests keep paymentStatus
// 'pending' and never qualify; late captures stay 'payment_review' until confirmed.
const becameVerifiedPaid = (before, after) => verifiedPaid(after) && !verifiedPaid(before);

function createNotifier({ db, send, ownerTo, cutoffMs, serverTimestamp, increment, fromMillis, now = () => Date.now(), customer = {} }) {
  // Customer mail is opt-in: flag on AND a valid cutoff, otherwise nothing is sent.
  const customerOn = customer.enabled === true && Number.isFinite(customer.cutoffMs);
  // Claim a flag in a transaction so retries/overlaps never send twice.
  async function claim(ref, flag, eligible = () => true, extra = {}) {
    return db.runTransaction(async tx => {
      const s = await tx.get(ref);
      if (!s.exists || s.get(flag)) return null;
      const data = s.data();
      if (!eligible(data)) return null;
      tx.update(ref, { [flag]: serverTimestamp(), ...extra });
      return data;
    });
  }
  const afterCutoff = snap => snap.createTime.toMillis() >= cutoffMs;

  async function onBookingCreated(snap) {
    if (!snap || !afterCutoff(snap)) return false;
    const b = await claim(snap.ref, 'ownerNoticeSentAt');
    if (!b) return false;
    try {
      await send({ to: ownerTo, key: `owner-${snap.id}`, replyTo: b.email || undefined, ...ownerEmail(snap.id, b) });
      return true;
    } catch (e) {
      await snap.ref.update({ ownerNoticeSentAt: null, ownerNoticeError: String(e.message).slice(0, 300) });
      throw e;
    }
  }

  // A registrant who already got the "booking received" email (which says the same
  // thing) is not mailed again by the sweep. A failed received-email releases its
  // claim, so the sweep still acts as the fallback.
  const needsUnpaidNotice = b => !b.unpaidNoticeSentAt && !b.customerReceivedSentAt && !isPaid(b) && !isClosed(b) && !!b.email
    && (b.unpaidNoticeAttempts || 0) < UNPAID_MAX_ATTEMPTS;

  async function sweepUnpaid() {
    const nowMs = now();
    const from = Math.max(cutoffMs, nowMs - UNPAID_LOOKBACK_DAYS * 86400000), latest = nowMs - UNPAID_DELAY_MIN * 60000;
    if (from > latest) return { sent: 0, failed: 0 };
    const qs = await db.collection('bookings')
      .where('createdAt', '>=', fromMillis(from))
      .where('createdAt', '<=', fromMillis(latest)).get();
    let sent = 0, failed = 0;
    for (const d of qs.docs) {
      if (!needsUnpaidNotice(d.data())) continue;
      const b = await claim(d.ref, 'unpaidNoticeSentAt', needsUnpaidNotice, { unpaidNoticeAttempts: increment(1) });
      if (!b) continue;
      try { await send({ to: b.email, key: `unpaid-${d.id}`, ...unpaidEmail(d.id, b, nowMs) }); sent++; }
      catch (e) {
        failed++;
        await d.ref.update({ unpaidNoticeSentAt: null, unpaidNoticeError: String(e.message).slice(0, 300) });
        console.error(d.id, e.message);
      }
    }
    return { sent, failed };
  }

  const createdMs = (snap, b) => {
    const t = b?.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt : snap.createTime;
    return t && typeof t.toMillis === 'function' ? t.toMillis() : NaN;
  };
  const customerEligible = (snap, b) => customerOn && !!b && createdMs(snap, b) >= customer.cutoffMs;

  // Claims flag + attempt counter, sends, and on failure releases the claim and
  // rethrows so the (retry: true) trigger redelivers, at most CUSTOMER_MAX_ATTEMPTS times.
  async function sendCustomer(snap, flag, attemptsField, eligible, render, key) {
    const ok = b => !b[flag] && !!b.email && (b[attemptsField] || 0) < CUSTOMER_MAX_ATTEMPTS && eligible(b);
    const b = await claim(snap.ref, flag, ok, { [attemptsField]: increment(1) });
    if (!b) return false;
    try {
      await send({ to: b.email, key, ...render(b) });
      return true;
    } catch (e) {
      await snap.ref.update({ [flag]: null, [flag.replace(/SentAt$/, 'Error')]: String(e.message).slice(0, 300) });
      throw e;
    }
  }

  // (a) "booking received": on creation, before any payment.
  async function onCustomerBookingCreated(snap) {
    if (!snap || !customerEligible(snap, snap.data())) return false;
    return sendCustomer(snap, 'customerReceivedSentAt', 'customerReceivedAttempts', b => !isPaid(b) && !isClosed(b),
      b => customerReceivedEmail(snap.id, b, now()), `customer-received-${snap.id}`);
  }

  // (b) "booking confirmed": only on the transition into a verified Tranzila payment.
  async function onCustomerBookingUpdated(change) {
    const before = change?.before?.exists === false ? null : change?.before?.data();
    const after = change?.after?.exists === false ? null : change?.after?.data();
    if (!after || !customerEligible(change.after, after) || !becameVerifiedPaid(before, after)) return false;
    return sendCustomer(change.after, 'customerConfirmedSentAt', 'customerConfirmedAttempts', verifiedPaid,
      b => customerConfirmedEmail(change.after.id, b), `customer-confirmed-${change.after.id}`);
  }

  return { onBookingCreated, sweepUnpaid, claim, onCustomerBookingCreated, onCustomerBookingUpdated };
}
module.exports = { createNotifier, UNPAID_DELAY_MIN, UNPAID_LOOKBACK_DAYS, UNPAID_MAX_ATTEMPTS, CUSTOMER_MAX_ATTEMPTS, verifiedPaid, becameVerifiedPaid };
