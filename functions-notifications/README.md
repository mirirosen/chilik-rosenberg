# Booking notifications (codebase `notifications`)

Separate Firebase Functions codebase. It never deploys or deletes the live `booking` codebase.

- `notifyOwnerOnBooking`: Firestore `bookings/{id}` created → email to `hr20192022@gmail.com` (claim flag `ownerNoticeSentAt`).
- `notifyUnpaidBookings`: every 10 minutes → one email to a registrant whose booking is still unpaid 30 minutes after creation
  (claim flag `unpaidNoticeSentAt`, at most 3 attempts in `unpaidNoticeAttempts`). Paid (`paymentStatus: 'paid'` or `status: 'confirmed'`),
  cancelled/expired/failed and payment-review bookings are skipped. Hebrew text, plus English when `language === 'en'`.
- Only bookings created after `NOTIFY_CUTOFF_ISO` (default `2026-10-24T17:30:00Z`) are eligible.

## Customer emails (OFF by default)

Always bilingual, regardless of `booking.language`: a Hebrew RTL section first, a subtle divider, then an English section in an
LTR container (`dir="ltr" lang="en"`) with the same design, fields and payment wording. Table layout, inline CSS, max 600px,
no images, plus a plain-text alternative (Hebrew block, `----` separator line, English block). Subjects are "Hebrew | English".
Rendered by `src/customer-render.js`.

- `notifyCustomerOnBooking` (`bookings/{id}` created, `retry: true`) → "booking received" to the registrant. States that the
  registration is NOT confirmed and no seat is held until payment is completed; payment button only while the hold is open
  (same `liveLink()` rule as the unpaid notice). At creation, card / Bit-via-Tranzila bookings are still `paymentStatus:
  'creating'` with no `paymentUrl` (createPayment writes it later), so for those the email tells the customer to finish
  payment on the checkout page they are on; only manual requests are told to contact Hilik to pay. Claim flag `customerReceivedSentAt`, counter `customerReceivedAttempts`.
- `notifyCustomerOnPaid` (`bookings/{id}` updated, `retry: true`) → "booking confirmed". Sent only on the write where the booking
  becomes verified-paid: `paymentStatus === 'paid' && status === 'confirmed'` and `paymentMethod === 'credit'` (or `'bit'` with
  `paymentProvider === 'tranzila'`), and it was not both before. The live booking service writes `paymentStatus: 'paid'` only from
  `BookingService.change(id, 'paid', 'provider:tranzila', receipt)` with a verified Tranzila receipt (tranzilaWebhook / reconcilePayments).
  Manual admin confirmations of bit/bank requests keep `paymentStatus: 'pending'` and never trigger it.
  Claim flag `customerConfirmedSentAt`, counter `customerConfirmedAttempts`.
- Each send claims its flag in a transaction; on SMTP failure the flag is released, `customer*Error` is recorded and the trigger retries,
  at most 3 attempts. Message-IDs are stable: `<customer-received-<id>@notifications.chilik-tours.com>` / `<customer-confirmed-<id>@…>`.
- The unpaid sweep skips bookings that already got the "booking received" email (`customerReceivedSentAt` set), so the customer is not
  told the same thing twice. While the flag is off, the unpaid notice behaves exactly as before.
- Meeting point / time rows appear only when the booking document has `meetingPoint` / `tourTime` (the live booking has neither today).

Params (both required to send anything):

| Param | Default | Meaning |
| --- | --- | --- |
| `NOTIFY_CUSTOMER_EMAILS` | `false` | Master switch for customer mail. |
| `NOTIFY_CUSTOMER_CUTOFF_ISO` | empty | Only bookings created at/after this ISO time. Empty/invalid ⇒ nothing is sent. |

Preview: `npm run preview -- <out-dir>` writes 6 sample emails (received at creation with/without meeting point, with live link,
manual request; confirmed with/without meeting point) as `.html` + `.txt`.

Provider: Gmail SMTP (`smtp.gmail.com:465`, TLS) via nodemailer, user and sender `hr20192022@gmail.com`.
Secret: `GMAIL_APP_PASSWORD` (a Google App Password of that account; requires 2-Step Verification).

```
firebase functions:secrets:set GMAIL_APP_PASSWORD --project hilik-site
firebase deploy --only functions:notifications --project hilik-site --config firebase.notifications.json
```

Tests (`npm test`) use a mocked transport and an in-memory Firestore; no network.

## WhatsApp (WAHA, phase 1)
- `whatsappOwnerOnBooking`: new booking -> WhatsApp to Hilik (972506724312) from the Newreel WAHA bot 055-309-4372: name, phone, date, participants, amount, paid/unpaid, booking id. Claim flag `waOwnerNewSentAt`.
- `whatsappOnBookingPaid`: transition to `paymentStatus: 'paid'` (verified Tranzila only) -> one "payment received" message. Claim flag `waOwnerPaidSentAt`.
- Only bookings created after `CHILIK_WHATSAPP_CUTOFF_ISO` (default `2026-10-26T06:55:00Z`). No backfill. Failures are recorded (`...Error`) and not retried.
- Customer messages (received / paid) exist behind `CHILIK_WHATSAPP_CUSTOMER_ENABLED` (default `false` = never), max 20/hour.
- Send-only: a read-only session health check (must be WORKING as 972553094372) then `POST /api/sendText`. No webhook/session changes.
- Secrets: `WAHA_API_ORIGIN`, `WAHA_API_KEY` (copied from hilik-rosenberg-ddb9b `STUDIO_WHATSAPP_WAHA_*`). Param `WAHA_SESSION` (default `default`).
