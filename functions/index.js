/**
 * Grow (Meshulam) payment integration — Firebase Cloud Functions (2nd gen).
 *
 * READY FOR SANDBOX TESTING. Requires env vars (see .env.example).
 * No secrets are committed — fill them from the Secure Vault at deploy time
 * with `firebase functions:config` / .env. Never commit functions/.env.
 *
 * Functions:
 * - createGrowPayment (callable): creates a Grow hosted payment page for a
 *   pending booking and returns its URL. The frontend redirects the browser
 *   there (full-page redirect; the URL is valid ~10 minutes).
 * - growWebhook (HTTPS): server-to-server callback from Grow. This is the
 *   AUTHORITATIVE source of truth for "paid" — the successUrl browser
 *   redirect is NOT. Verifies processToken + sum + statusCode, then calls
 *   Grow's mandatory approveTransaction to close the loop.
 *
 * Grow Light API (community-verified, 2026-07):
 *   POST {base}/api/light/server/1.0/createPaymentProcess  (multipart FormData)
 *   POST {base}/api/light/server/1.0/approveTransaction
 *   statusCode == 2 means paid. No card data ever touches our servers.
 *
 * No part of this code runs until deployed with real credentials — with
 * placeholder env vars it fails closed (invalid-argument / internal).
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const GROW_API_BASE = process.env.GROW_API_BASE; // sandbox: https://sandbox.meshulam.co.il
const GROW_USER_ID = process.env.GROW_USER_ID; // from Grow (sandbox creds)
const GROW_PAGE_CODE = process.env.GROW_PAGE_CODE; // redirect pageCode from Grow
const GROW_NOTIFY_URL = process.env.GROW_NOTIFY_URL; // deployed growWebhook HTTPS URL
const SITE_ORIGIN = process.env.SITE_ORIGIN; // https://… (must be HTTPS, no localhost)

const PAID_STATUS_CODE = 2; // Grow: 2 = paid
const MAX_TXN_SUM = 20000; // Grow limit: 20,000₪ max per transaction, ILS only

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireGrowConfig() {
  if (!GROW_API_BASE || !GROW_USER_ID || !GROW_PAGE_CODE || !GROW_NOTIFY_URL || !SITE_ORIGIN) {
    throw new HttpsError("failed-precondition", "payment provider not configured");
  }
}

/**
 * Callable: createGrowPayment({ bookingId })
 * bookingId = Firestore document id of bookings/{id} (NOT the BK… field).
 */
exports.createGrowPayment = onCall(async (request) => {
  requireGrowConfig();

  const { bookingId } = request.data || {};
  if (!bookingId || typeof bookingId !== "string") {
    throw new HttpsError("invalid-argument", "bookingId required");
  }

  const ref = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "booking not found");
  const booking = snap.data();

  if (booking.paymentStatus === "completed") {
    throw new HttpsError("already-exists", "booking already paid");
  }
  if (booking.status === "cancelled") {
    throw new HttpsError("failed-precondition", "booking cancelled");
  }
  const total = Number(booking.totalPrice);
  if (!Number.isFinite(total) || total <= 0 || total > MAX_TXN_SUM) {
    throw new HttpsError("invalid-argument", "invalid totalPrice");
  }

  // Grow requires: fullName (2+ words), valid Israeli mobile, syntactically
  // valid email (without one Grow answers HTTP 427). The booking form already
  // requires + validates email; re-check here so we fail closed server-side.
  const fullName = String(booking.name || "").trim();
  const phone = String(booking.phone || "").replace(/[^\d]/g, "");
  const email = String(booking.email || "").trim();
  if (fullName.split(/\s+/).length < 2) {
    throw new HttpsError("invalid-argument", "full name (2+ words) required");
  }
  if (!/^05\d{8}$/.test(phone)) {
    throw new HttpsError("invalid-argument", "valid Israeli mobile required");
  }
  if (!EMAIL_RE.test(email)) {
    throw new HttpsError("invalid-argument", "valid email required for card payment");
  }

  const form = new FormData();
  form.set("pageCode", GROW_PAGE_CODE);
  form.set("userId", GROW_USER_ID);
  form.set("sum", total.toFixed(2)); // ILS, decimal — NOT agorot
  form.set(
    "description",
    `סיור קולינרי — ${booking.tourDate} (${booking.participants} משתתפים)`
  );
  form.set("successUrl", `${SITE_ORIGIN}/payment/success?bookingId=${bookingId}`);
  form.set("cancelUrl", `${SITE_ORIGIN}/booking?payment=cancelled&bookingId=${bookingId}`);
  form.set("pageField[fullName]", fullName);
  form.set("pageField[phone]", phone);
  form.set("pageField[email]", email);
  form.set("chargeType", "1"); // regular charge
  form.set("notifyUrl", GROW_NOTIFY_URL); // server-to-server callback
  form.set("cField1", bookingId); // echoed back in the callback

  let json;
  try {
    const res = await fetch(`${GROW_API_BASE}/api/light/server/1.0/createPaymentProcess`, {
      method: "POST",
      body: form,
    });
    json = await res.json();
  } catch (err) {
    console.error("createGrowPayment: Grow request failed", { bookingId, err: String(err) });
    throw new HttpsError("internal", "payment provider error");
  }
  if (json.status !== 1 || !json.data?.url) {
    console.error("createGrowPayment: createPaymentProcess failed", {
      bookingId,
      err: json.err,
      status: json.status,
    });
    throw new HttpsError("internal", "payment provider error");
  }

  await ref.update({
    growProcessId: json.data.processId,
    growProcessToken: json.data.processToken,
    paymentUrl: json.data.url,
    paymentUrlCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    paymentStatus: "redirected",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { url: json.data.url };
});

/**
 * HTTPS: growWebhook — Grow's server-to-server payment callback.
 * Verification is tri-state: paid / not-paid / unknown.
 *   - paid      → approveTransaction → paymentStatus 'completed'
 *   - not-paid  → paymentStatus 'failed'
 *   - unknown   → paymentStatus 'pending_review' (manual check in Grow dashboard)
 * NEVER marks a booking completed without a verified, approved callback.
 */
exports.growWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("method not allowed");
  if (!GROW_API_BASE || !GROW_PAGE_CODE) {
    console.error("growWebhook: provider not configured");
    return res.status(503).send("provider not configured");
  }

  const b = req.body || {};
  const bookingId = b.cField1;
  const transactionId = b.transactionId || b.processId;
  const statusCode = Number(b.statusCode);
  const paidSum = Number(b.sum);

  if (!bookingId || !transactionId) {
    console.error("growWebhook: missing fields", Object.keys(b));
    return res.status(400).send("missing fields");
  }

  const ref = db.collection("bookings").doc(String(bookingId));
  const snap = await ref.get();
  if (!snap.exists) {
    console.error("growWebhook: unknown booking", bookingId);
    return res.status(404).send("unknown booking");
  }
  const booking = snap.data();

  // Idempotency: already completed → just acknowledge.
  if (booking.paymentStatus === "completed") return res.status(200).send("ok");

  const tokenOk =
    b.processToken && booking.growProcessToken && b.processToken === booking.growProcessToken;
  const sumOk =
    Number.isFinite(paidSum) && paidSum.toFixed(2) === Number(booking.totalPrice).toFixed(2);
  const paidOk = statusCode === PAID_STATUS_CODE;

  // Not a paid callback (declined / cancelled / error) → failed.
  if (!paidOk) {
    console.warn("growWebhook: not-paid callback", { bookingId, statusCode });
    await ref.update({
      paymentStatus: "failed",
      paymentFailureReason: `grow statusCode ${statusCode}`,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).send("ok");
  }

  // Paid callback but identity/amount don't match ours → manual review, not auto-fail.
  if (!tokenOk || !sumOk) {
    console.error("growWebhook: verification failed", { bookingId, tokenOk, sumOk });
    await ref.update({
      paymentStatus: "pending_review",
      paymentFailureReason: "webhook verification failed (token/sum mismatch)",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(422).send("verification failed");
  }

  // MANDATORY: approve the transaction with Grow (closes the loop; does not alter the payment).
  const form = new FormData();
  form.set("pageCode", GROW_PAGE_CODE);
  form.set("transactionId", String(transactionId));
  let approveJson;
  try {
    const approveRes = await fetch(`${GROW_API_BASE}/api/light/server/1.0/approveTransaction`, {
      method: "POST",
      body: form,
    });
    approveJson = await approveRes.json();
  } catch (err) {
    console.error("growWebhook: approveTransaction request failed", {
      bookingId,
      err: String(err),
    });
    await ref.update({
      paymentStatus: "pending_review",
      paymentFailureReason: "approveTransaction request failed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(502).send("approve failed");
  }
  if (approveJson.status !== 1) {
    console.error("growWebhook: approveTransaction rejected", { bookingId, err: approveJson.err });
    await ref.update({
      paymentStatus: "pending_review",
      paymentFailureReason: "approveTransaction rejected",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(502).send("approve failed");
  }

  await ref.update({
    paymentStatus: "completed",
    growTransactionId: String(transactionId),
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return res.status(200).send("ok");
});
