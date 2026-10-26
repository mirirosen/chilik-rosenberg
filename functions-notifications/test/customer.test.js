const test = require('node:test'); const assert = require('node:assert');
const { createNotifier, CUSTOMER_MAX_ATTEMPTS, becameVerifiedPaid } = require('../src/notifier');
const { customerReceivedEmail, customerConfirmedEmail, formatDate, formatDateEn, TEXT_SEPARATOR } = require('../src/customer-render');

// In-memory Firestore (same shape as notifier.test.js); Timestamps are { ms }.
const ts = ms => ({ ms, toMillis: () => ms });
const SERVER_TS = { serverTimestamp: true };
function fakeDb(docs) {
  const store = new Map(Object.entries(docs));
  const apply = (id, patch) => {
    const cur = { ...store.get(id) };
    for (const [k, v] of Object.entries(patch)) cur[k] = v && v.increment ? (cur[k] || 0) + v.increment : v;
    store.set(id, cur);
  };
  const ref = id => ({ id, update: async patch => apply(id, patch) });
  const snap = (id, data = store.get(id)) => ({ id, ref: ref(id), exists: data !== undefined, data: () => data, get: f => data?.[f], createTime: ts(data?.createdAt?.ms ?? 0) });
  return {
    store, snap,
    runTransaction: async fn => { const writes = []; const r = await fn({ get: async rf => snap(rf.id), update: (rf, p) => writes.push([rf.id, p]) }); writes.forEach(([id, p]) => apply(id, p)); return r; },
    collection: () => {
      const filters = [];
      const q = { where: (f, op, v) => { filters.push([f, op, v]); return q; },
        get: async () => ({ docs: [...store.keys()].filter(id => filters.every(([f, op, v]) => { const x = store.get(id)[f]?.ms; return op === '>=' ? x >= v.ms : x <= v.ms; })).map(id => snap(id)) }) };
      return q;
    },
  };
}

const CUTOFF = Date.parse('2026-10-24T17:30:00Z'), CUSTOMER_CUTOFF = Date.parse('2026-11-01T00:00:00Z'), NOW = CUSTOMER_CUTOFF + 3 * 3600000;
const created = { name: 'בדיקה', phone: '0500000000', email: 'a@b.c', tourDate: '2026-11-05', participants: 2, totalPrice: 360, language: 'he',
  paymentMethod: 'credit', status: 'payment_pending', paymentStatus: 'creating', holdExpiresAt: ts(NOW + 15 * 60000), createdAt: ts(NOW - 60 * 60000) };
const paid = { ...created, status: 'confirmed', paymentStatus: 'paid' };
function setup(docs, opts = {}) {
  const { send, enabled = true } = opts, cutoffMs = 'cutoffMs' in opts ? opts.cutoffMs : CUSTOMER_CUTOFF;
  const db = fakeDb(docs), sent = [];
  const n = createNotifier({ db, send: send || (async m => { sent.push(m); }), ownerTo: 'hr20192022@gmail.com', cutoffMs: CUTOFF, now: () => NOW,
    serverTimestamp: () => SERVER_TS, increment: k => ({ increment: k }), fromMillis: ts, customer: { enabled, cutoffMs } });
  // Simulates the server write that a booking trigger observes as before/after.
  const update = (id, patch) => { const before = db.snap(id, db.store.get(id)); db.store.set(id, { ...db.store.get(id), ...patch }); return { before, after: db.snap(id) }; };
  return { db, n, sent, update };
}

test('flag off: nothing is sent to customers (received or confirmed)', async () => {
  const { db, n, sent, update } = setup({ 'BK-1': created }, { enabled: false });
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-1')), false);
  assert.strictEqual(await n.onCustomerBookingUpdated(update('BK-1', { status: 'confirmed', paymentStatus: 'paid' })), false);
  assert.strictEqual(sent.length, 0);
  assert.strictEqual(db.store.get('BK-1').customerReceivedSentAt, undefined);
});

test('missing or invalid customer cutoff: nothing is sent', async () => {
  for (const cutoffMs of [null, undefined, NaN, Date.parse('not-a-date')]) {
    const { db, n, sent, update } = setup({ 'BK-1': created }, { cutoffMs });
    assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-1')), false);
    assert.strictEqual(await n.onCustomerBookingUpdated(update('BK-1', { status: 'confirmed', paymentStatus: 'paid' })), false);
    assert.strictEqual(sent.length, 0);
  }
});

test('cutoff: only bookings created at/after NOTIFY_CUSTOMER_CUTOFF_ISO', async () => {
  const { db, n, sent, update } = setup({ 'BK-old': { ...created, createdAt: ts(CUSTOMER_CUTOFF - 1) }, 'BK-edge': { ...created, createdAt: ts(CUSTOMER_CUTOFF) } });
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-old')), false);
  assert.strictEqual(await n.onCustomerBookingUpdated(update('BK-old', { status: 'confirmed', paymentStatus: 'paid' })), false);
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-edge')), true);
  assert.deepStrictEqual(sent.map(m => m.key), ['customer-received-BK-edge']);
});

test('received: sent once to the customer with a stable key; redelivery is a no-op', async () => {
  const { db, n, sent } = setup({ 'BK-1': created });
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-1')), true);
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-1')), false);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].to, 'a@b.c');
  assert.strictEqual(sent[0].key, 'customer-received-BK-1');
  assert.deepStrictEqual(db.store.get('BK-1').customerReceivedSentAt, SERVER_TS);
  assert.strictEqual(db.store.get('BK-1').customerReceivedAttempts, 1);
});

test('received: no email address or an already closed booking is skipped', async () => {
  const { db, n, sent } = setup({ 'BK-none': { ...created, email: '' }, 'BK-closed': { ...created, status: 'cancelled', paymentStatus: 'expired' } });
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-none')), false);
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-closed')), false);
  assert.strictEqual(sent.length, 0);
});

test('received: failures release the claim and stop after CUSTOMER_MAX_ATTEMPTS', async () => {
  let calls = 0;
  const { db, n } = setup({ 'BK-1': created }, { send: async () => { calls++; throw new Error('smtp-down'); } });
  for (let i = 0; i < CUSTOMER_MAX_ATTEMPTS; i++) await assert.rejects(n.onCustomerBookingCreated(db.snap('BK-1')), /smtp-down/);
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-1')), false);
  assert.strictEqual(calls, CUSTOMER_MAX_ATTEMPTS);
  assert.strictEqual(db.store.get('BK-1').customerReceivedSentAt, null);
  assert.strictEqual(db.store.get('BK-1').customerReceivedError, 'smtp-down');
});

test('confirmed: sent only on the verified Tranzila paid transition, once', async () => {
  const { db, n, sent, update } = setup({ 'BK-1': { ...created, paymentStatus: 'awaiting_payment', paymentUrl: 'https://pay' } });
  assert.strictEqual(await n.onCustomerBookingUpdated(update('BK-1', { updatedAt: 1 })), false);
  const change = update('BK-1', { status: 'confirmed', paymentStatus: 'paid' });
  assert.strictEqual(await n.onCustomerBookingUpdated(change), true);
  assert.strictEqual(await n.onCustomerBookingUpdated(change), false); // redelivered event
  // Later writes (our own claim, admin edits) are not transitions.
  assert.strictEqual(await n.onCustomerBookingUpdated(update('BK-1', { notes: 'x' })), false);
  assert.deepStrictEqual(sent.map(m => [m.key, m.to]), [['customer-confirmed-BK-1', 'a@b.c']]);
  assert.match(sent[0].subject, /ההזמנה אושרה/);
  assert.deepStrictEqual(db.store.get('BK-1').customerConfirmedSentAt, SERVER_TS);
});

test('confirmed: never for manual confirmations, reviews or unverified states', async () => {
  const cases = [
    [{ ...created, paymentMethod: 'bank_transfer', status: 'pending', paymentStatus: 'pending' }, { status: 'confirmed' }], // admin confirm
    [{ ...created, paymentMethod: 'bit', status: 'pending', paymentStatus: 'pending' }, { status: 'confirmed' }], // manual bit
    [{ ...created, paymentMethod: 'bit', status: 'pending', paymentStatus: 'pending' }, { status: 'confirmed', paymentStatus: 'paid' }], // bit without Tranzila
    [{ ...created, paymentStatus: 'awaiting_payment' }, { status: 'payment_review', paymentStatus: 'pending_review' }], // late capture
    [{ ...created, paymentStatus: 'awaiting_payment' }, { status: 'cancelled', paymentStatus: 'expired' }],
    [paid, { additionalPaymentReview: true }], // already paid before this write
  ];
  for (const [before, patch] of cases) {
    const { n, sent, update } = setup({ 'BK-1': before });
    assert.strictEqual(await n.onCustomerBookingUpdated(update('BK-1', patch)), false, JSON.stringify(patch));
    assert.strictEqual(sent.length, 0);
  }
});

test('confirmed: Bit via Tranzila and admin confirmation of a verified overbooked payment qualify', () => {
  assert.ok(becameVerifiedPaid({ ...created, paymentMethod: 'bit', paymentProvider: 'tranzila', paymentStatus: 'awaiting_payment' },
    { ...paid, paymentMethod: 'bit', paymentProvider: 'tranzila' }));
  assert.ok(becameVerifiedPaid({ ...paid, status: 'payment_review', paymentReviewReason: 'overbooked-at-payment' }, paid));
  assert.ok(!becameVerifiedPaid(paid, paid));
});

test('confirmed: failures are retried at most CUSTOMER_MAX_ATTEMPTS times', async () => {
  let calls = 0;
  const { db, n, update } = setup({ 'BK-1': { ...created, paymentStatus: 'awaiting_payment' } }, { send: async () => { calls++; throw new Error('421 try later'); } });
  const change = update('BK-1', { status: 'confirmed', paymentStatus: 'paid' });
  for (let i = 0; i < CUSTOMER_MAX_ATTEMPTS; i++) await assert.rejects(n.onCustomerBookingUpdated(change), /421/);
  assert.strictEqual(await n.onCustomerBookingUpdated(change), false);
  assert.strictEqual(calls, CUSTOMER_MAX_ATTEMPTS);
  assert.match(db.store.get('BK-1').customerConfirmedError, /421/);
});

test('unpaid sweep skips registrants who already got the received email', async () => {
  const pendingTransfer = { ...created, paymentMethod: 'bank_transfer', status: 'pending', paymentStatus: 'pending' };
  const { db, n, sent } = setup({ 'BK-got-received': pendingTransfer, 'BK-flag-was-off': pendingTransfer });
  await n.onCustomerBookingCreated(db.snap('BK-got-received'));
  assert.deepStrictEqual(await n.sweepUnpaid(), { sent: 1, failed: 0 });
  assert.deepStrictEqual(sent.map(m => m.key), ['customer-received-BK-got-received', 'unpaid-BK-flag-was-off']);
});

test('owner notice is unchanged by the customer flag', async () => {
  const { db, n, sent } = setup({ 'BK-1': created });
  assert.strictEqual(await n.onBookingCreated(db.snap('BK-1')), true);
  assert.deepStrictEqual(sent.map(m => [m.key, m.to]), [['owner-BK-1', 'hr20192022@gmail.com']]);
});

// ---- rendering ----
const NOW_R = 1000;
const live = { ...created, paymentStatus: 'awaiting_payment', paymentUrl: 'https://directng.tranzila.com/x/iframenew.php?a=1', holdExpiresAt: ts(2000) };

test('received wording: clearly not confirmed and no seat held until payment', () => {
  const m = customerReceivedEmail('BK-1', created, NOW_R);
  for (const s of [m.text, m.html]) {
    assert.ok(s.includes('ההרשמה אינה מאושרת ולא נשמר עבורך מקום בסיור עד להשלמת התשלום'));
    assert.ok(s.includes('טרם אושרה'));
  }
  assert.match(m.subject, /טרם אושרה, נדרש תשלום/);
  assert.ok(!m.text.includes('ההזמנה אושרה'));
  assert.ok(m.text.includes('ממתין לתשלום'));
});

test('received: payment link only while the hold is open (same rule as liveLink)', () => {
  assert.ok(customerReceivedEmail('BK-1', live, NOW_R).html.includes('href="https://directng.tranzila.com/x/iframenew.php?a=1"'));
  const stale = customerReceivedEmail('BK-1', live, 3000);
  assert.ok(!stale.text.includes('tranzila')); assert.ok(!stale.html.includes('tranzila'));
  assert.ok(!customerReceivedEmail('BK-1', { ...live, paymentUrl: 'javascript:alert(1)' }, NOW_R).html.includes('javascript:'));
});

test('received at the real creation state (card/Bit-Tranzila, creating, no paymentUrl): points to the checkout page, not to Hilik', () => {
  const card = { ...created, paymentUrl: undefined }; // the create trigger runs before createPayment writes paymentUrl
  const bitTranzila = { ...card, paymentMethod: 'bit', paymentProvider: 'tranzila' };
  for (const b of [card, bitTranzila]) {
    const m = customerReceivedEmail('BK-1', b, NOW_R);
    for (const s of [m.text, m.html]) {
      assert.ok(s.includes('בעמוד התשלום המאובטח'));
      assert.ok(s.includes('אימייל אישור יישלח אליך בנפרד'));
      assert.ok(!s.includes('להשלמת התשלום אפשר לפנות לחיליק'));
      assert.ok(s.includes('ההרשמה אינה מאושרת ולא נשמר עבורך מקום בסיור עד להשלמת התשלום'));
    }
    assert.ok(!m.html.includes('<a href="https://directng'));
  }
});

test('received end-to-end from the create trigger with the real creation doc', async () => {
  const { db, n, sent } = setup({ 'BK-1': created });
  assert.strictEqual(await n.onCustomerBookingCreated(db.snap('BK-1')), true);
  assert.ok(sent[0].text.includes('בעמוד התשלום המאובטח'));
});

test('received for manual requests (bit/bank without provider) keeps "contact Hilik"', () => {
  for (const paymentMethod of ['bit', 'bank_transfer']) {
    const m = customerReceivedEmail('BK-1', { ...created, paymentMethod, status: 'pending', paymentStatus: 'pending' }, NOW_R);
    assert.ok(m.text.includes('להשלמת התשלום אפשר לפנות לחיליק'));
    assert.ok(!m.text.includes('בעמוד התשלום המאובטח'));
  }
});

test('content: booking number, tour, date, participants, amount, status, contact details', () => {
  const r = customerReceivedEmail('BK-77', created, NOW_R), c = customerConfirmedEmail('BK-77', paid);
  for (const m of [r, c]) for (const s of [m.text, m.html]) {
    for (const v of ['BK-77', 'סיור קולינרי בבני ברק', 'יום חמישי, 05.11.2026', '360 ₪', '050-6724312', 'hr20192022@gmail.com', 'chilik-tours.com']) assert.ok(s.includes(v), v);
  }
  assert.ok(c.text.includes('סטטוס תשלום: שולם'));
  assert.ok(r.text.includes('משתתפים: 2'));
});

test('meeting point and time appear only when the booking has them', () => {
  for (const m of [customerReceivedEmail('BK-1', created, NOW_R), customerConfirmedEmail('BK-1', paid)]) {
    assert.ok(!m.text.includes('נקודת מפגש:')); assert.ok(!m.html.includes('>נקודת מפגש<'));
    assert.ok(!m.text.includes('שעה:'));
  }
  const m = customerConfirmedEmail('BK-1', { ...paid, meetingPoint: 'רחוב הדוגמה 1', tourTime: '11:00' });
  assert.ok(m.text.includes('נקודת מפגש: רחוב הדוגמה 1')); assert.ok(m.text.includes('שעה: 11:00'));
  assert.ok(!customerConfirmedEmail('BK-1', { ...paid, meetingPoint: '   ' }).text.includes('נקודת מפגש:'));
});

test('html escapes all user data', () => {
  const evil = '<script>alert("x")</script>\'&';
  for (const m of [customerReceivedEmail(evil, { ...created, name: evil, meetingPoint: evil, tourName: evil }, NOW_R), customerConfirmedEmail(evil, { ...paid, name: evil, meetingPoint: evil })]) {
    assert.ok(!m.html.includes('<script>'));
    assert.ok(m.html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#39;&amp;'));
  }
});

test('email structure: RTL, Hebrew, table layout, inline CSS only, max 600px, plain-text alternative', () => {
  for (const m of [customerReceivedEmail('BK-1', live, NOW_R), customerConfirmedEmail('BK-1', paid)]) {
    assert.match(m.html, /<html dir="rtl" lang="he">/);
    assert.match(m.html, /role="presentation"/);
    assert.match(m.html, /max-width:600px/);
    assert.ok(!/<style|<link|<script|class="/i.test(m.html));
    assert.ok(!/<img/i.test(m.html));
    assert.ok(m.text.length > 100 && !/<[a-z]/i.test(m.text));
  }
});

test('formatDate: Hebrew weekday + dd.mm.yyyy, passthrough when not ISO', () => {
  assert.strictEqual(formatDate('2026-11-05'), 'יום חמישי, 05.11.2026');
  assert.strictEqual(formatDate('2026-11-07'), 'יום שבת, 07.11.2026');
  assert.strictEqual(formatDate('soon'), 'soon');
});

// ---- bilingual (Hebrew first, then English, always) ----
// The English section container (the header also carries a small lang="en" line).
const enPart = s => s.slice(s.indexOf('<td dir="ltr" lang="en"'));
const enText = t => t.split(TEXT_SEPARATOR)[1] || '';

test('bilingual: both emails carry Hebrew then English regardless of booking.language', () => {
  for (const language of ['he', 'en', undefined]) {
    for (const m of [customerReceivedEmail('BK-1', { ...created, language }, NOW_R), customerConfirmedEmail('BK-1', { ...paid, language })]) {
      assert.ok(m.html.indexOf('lang="he"') < m.html.indexOf('<td dir="ltr" lang="en"'));
      assert.ok(m.html.indexOf('שלום') < m.html.indexOf('Hello'));
      const [he, en] = m.text.split(TEXT_SEPARATOR);
      assert.ok(he.includes('שלום') && !he.includes('Hello'));
      assert.ok(en.includes('Hello') && !/[֐-׿]/.test(en.replace(/בדיקה/g, '')));
      assert.match(m.subject, /^[^|]*[֐-׿][^|]* \| [A-Z][^֐-׿]*$/);
    }
  }
});

test('bilingual: English section is an LTR container with the same fields', () => {
  const r = customerReceivedEmail('BK-77', created, NOW_R), c = customerConfirmedEmail('BK-77', paid);
  for (const m of [r, c]) {
    assert.match(m.html, /<td dir="ltr" lang="en" align="left"[^>]*>\s*<table role="presentation" width="100%"[^>]*dir="ltr" lang="en">/);
    const en = enPart(m.html);
    for (const s of [en, enText(m.text)]) {
      for (const v of ['Booking number', 'BK-77', 'Culinary tour of Bnei Brak', 'Thursday, 5 November 2026', 'Participants', '₪360 (ILS)', 'Payment status', '050-6724312', 'hr20192022@gmail.com', 'chilik-tours.com']) assert.ok(s.includes(v), v);
    }
  }
  assert.ok(enPart(r.html).includes('border-left:4px solid') && !enPart(r.html).includes('border-right:4px'));
  assert.ok(enText(r.text).includes('Payment status: Awaiting payment'));
  assert.ok(enText(c.text).includes('Payment status: Paid'));
  assert.ok(enText(c.text).includes('Your payment was received and your seat on the tour is reserved'));
  assert.match(c.subject, /\| Booking confirmed – Culinary tour of Bnei Brak, Thursday, 5 November 2026 \(BK-77\)$/);
});

test('bilingual: English received wording says NOT confirmed, no seat held, in all three payment branches', () => {
  const card = customerReceivedEmail('BK-1', created, NOW_R);
  const withLink = customerReceivedEmail('BK-1', live, NOW_R);
  const manual = customerReceivedEmail('BK-1', { ...created, paymentMethod: 'bit', status: 'pending', paymentStatus: 'pending' }, NOW_R);
  for (const m of [card, withLink, manual]) {
    for (const s of [enText(m.text), enPart(m.html)]) {
      assert.ok(s.includes('Your registration is NOT confirmed and no seat is held for you on the tour until payment is completed.'));
      assert.ok(s.includes('not confirmed yet'));
      assert.ok(!s.includes('Booking confirmed'));
    }
    assert.match(m.subject, /\| Registration received – not confirmed, payment required \(BK-1\)$/);
  }
  assert.ok(enText(card.text).includes('on the secure payment page') && !enText(card.text).includes('To complete payment, please contact Hilik'));
  assert.ok(enPart(withLink.html).includes('href="https://directng.tranzila.com/x/iframenew.php?a=1"') && enPart(withLink.html).includes('Complete payment'));
  assert.ok(enText(withLink.text).includes('Complete payment: https://directng.tranzila.com/x/iframenew.php?a=1'));
  assert.ok(enText(manual.text).includes('To complete payment, please contact Hilik by phone or email.'));
  assert.ok(!enText(manual.text).includes('secure payment page'));
  assert.ok(!enPart(customerReceivedEmail('BK-1', live, 3000).html).includes('tranzila'));
});

test('bilingual: no meeting point or time in either language when absent; shown in both when present', () => {
  for (const m of [customerReceivedEmail('BK-1', created, NOW_R), customerConfirmedEmail('BK-1', paid)]) {
    assert.ok(!m.text.includes('Meeting point:') && !m.html.includes('>Meeting point<'));
    assert.ok(!m.text.includes('נקודת מפגש:') && !m.html.includes('>נקודת מפגש<'));
    assert.ok(!m.text.includes('Time:') && !m.html.includes('>Time<'));
  }
  const m = customerConfirmedEmail('BK-1', { ...paid, meetingPoint: 'רחוב הדוגמה 1', tourTime: '11:00' });
  assert.ok(enText(m.text).includes('Meeting point: רחוב הדוגמה 1') && enText(m.text).includes('Time: 11:00'));
  assert.ok(enPart(m.html).includes('>Meeting point<'));
  assert.ok(enText(m.text).includes('Please arrive at the meeting point'));
  assert.ok(enText(customerConfirmedEmail('BK-1', paid).text).includes('For details about the meeting point and arrival time, please contact Hilik.'));
});

test('bilingual: English part escapes user data too', () => {
  const evil = '<script>alert("x")</script>\'&';
  for (const m of [customerReceivedEmail(evil, { ...created, name: evil, meetingPoint: evil, tourName: evil }, NOW_R), customerConfirmedEmail(evil, { ...paid, name: evil, meetingPoint: evil, tourName: evil })]) {
    const en = enPart(m.html);
    assert.ok(!en.includes('<script>'));
    assert.ok(en.includes('Hello \u2068&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#39;&amp;\u2069,'));
    assert.ok(en.includes('>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#39;&amp;<'));
  }
});

test('bilingual plain text: Hebrew block, separator line, English block', () => {
  for (const m of [customerReceivedEmail('BK-1', created, NOW_R), customerConfirmedEmail('BK-1', paid)]) {
    const parts = m.text.split(`\n\n${TEXT_SEPARATOR}\n\n`);
    assert.strictEqual(parts.length, 2);
    assert.ok(parts[0].startsWith('שלום'));
    assert.ok(parts[0].includes('תודה, חיליק רוזנברג'));
    assert.ok(parts[1].startsWith('Hello'));
    assert.ok(parts[1].endsWith('Thank you, Hilik Rosenberg – Culinary Tours'));
  }
});

test('formatDateEn: English weekday + day month year, passthrough when not ISO', () => {
  assert.strictEqual(formatDateEn('2026-11-05'), 'Thursday, 5 November 2026');
  assert.strictEqual(formatDateEn('2026-11-07'), 'Saturday, 7 November 2026');
  assert.strictEqual(formatDateEn('soon'), 'soon');
});
