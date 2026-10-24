# Booking notifications (codebase `notifications`)

Separate Firebase Functions codebase. It never deploys or deletes the live `booking` codebase.

- `notifyOwnerOnBooking`: Firestore `bookings/{id}` created → email to `hr20192022@gmail.com` (claim flag `ownerNoticeSentAt`).
- `notifyUnpaidBookings`: every 10 minutes → one email to a registrant whose booking is still unpaid 30 minutes after creation
  (claim flag `unpaidNoticeSentAt`, at most 3 attempts in `unpaidNoticeAttempts`). Paid (`paymentStatus: 'paid'` or `status: 'confirmed'`),
  cancelled/expired/failed and payment-review bookings are skipped. Hebrew text, plus English when `language === 'en'`.
- Only bookings created after `NOTIFY_CUTOFF_ISO` (default `2026-10-24T17:30:00Z`) are eligible.

Provider: Gmail SMTP (`smtp.gmail.com:465`, TLS) via nodemailer, user and sender `hr20192022@gmail.com`.
Secret: `GMAIL_APP_PASSWORD` (a Google App Password of that account; requires 2-Step Verification).

```
firebase functions:secrets:set GMAIL_APP_PASSWORD --project hilik-site
firebase deploy --only functions:notifications --project hilik-site --config firebase.notifications.json
```

Tests (`npm test`) use a mocked transport and an in-memory Firestore; no network.
