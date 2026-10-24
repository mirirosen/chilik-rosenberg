'use strict';
// Notification flows, independent of the Functions runtime so they can be tested
// with a fake Firestore and a mocked mail transport.
const { ownerEmail, unpaidEmail, isPaid, isClosed } = require('./render');

const UNPAID_DELAY_MIN = 30; // give the payer time to finish checkout before warning
const UNPAID_LOOKBACK_DAYS = 2; // bounds the sweep query; older bookings were already handled
const UNPAID_MAX_ATTEMPTS = 3; // a permanently bad address must not be retried forever

function createNotifier({ db, send, ownerTo, cutoffMs, serverTimestamp, increment, fromMillis, now = () => Date.now() }) {
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

  const needsUnpaidNotice = b => !b.unpaidNoticeSentAt && !isPaid(b) && !isClosed(b) && !!b.email
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

  return { onBookingCreated, sweepUnpaid, claim };
}
module.exports = { createNotifier, UNPAID_DELAY_MIN, UNPAID_LOOKBACK_DAYS, UNPAID_MAX_ATTEMPTS };
