# Booking schedulers: how CHILIK_BOOKING_SCHEDULERS_ENABLED is set

Finding from reading the code on 2026-10-26 (no production environment was read or changed).

## Where the value comes from

1. `functions/package.json` → `"main": "booking-entry.cjs"`.
2. `functions/booking-entry.cjs` copies every key of
   `functions/booking-deployment-settings.json` into `process.env` **only when that variable is
   not already set** (an env var set on the deployed service would win).
3. `booking-deployment-settings.json` ships with:
   - `CHILIK_BOOKING_RUNTIME_ENABLED: "true"`
   - `CHILIK_BOOKING_SCHEDULERS_ENABLED: "true"`
   - `PAYMENT_RECONCILIATION_ENABLED: "true"`, `TRANZILA_ORDER_LOOKUP_VERIFIED: "true"`,
     `TRANZILA_ORDER_LOOKUP_MODE: "bounded-date-scan"`
   - `CHILIK_INTEGRATION_SCHEDULER_ENABLED: "false"`
4. `functions/src/index.js` passes `schedulesEnabled: process.env.CHILIK_BOOKING_SCHEDULERS_ENABLED === 'true'`
   to `createBookingApi`.
5. `functions/src/api.js` registers the scheduled functions only when
   `enabled === true && schedulesEnabled === true`:
   - `reconcilePayments`: every 1 minute. Looks up Tranzila reports for open card checkouts and
     applies verified captures (this is what moves a "pending" return to "paid" if the webhook
     is late or lost).
   - `expirePaymentHolds`: every 5 minutes. Closes card checkouts whose 15-minute window has passed.
   - `processIntegrationJobs`: **not registered**, because it also needs
     `CHILIK_INTEGRATION_SCHEDULER_ENABLED === 'true'`, and that is `"false"`.

## What this means

- If the booking functions were last deployed from this code, without an overriding env var on
  the service, the payment reconciler and the hold-expiry jobs exist in production.
  The registration happens at deploy time, so only the deployed function list is authoritative.
- `reconcilePayments` also needs `loadPaymentConfiguration(...).reconciliationIssues` to be empty.
  With the shipped settings this holds (capture contract verified, lookup verified, bounded
  date scan) once the two Tranzila secrets are bound.
- Email, calendar and WhatsApp integration jobs are queued in Firestore but are **not**
  processed by a scheduler while `CHILIK_INTEGRATION_SCHEDULER_ENABLED` is `"false"`.

## Read-only checks for the owner (not run here)

```sh
firebase functions:list --project hilik-site          # expect reconcilePayments, expirePaymentHolds
gcloud scheduler jobs list --project hilik-site --location us-central1
```

Nothing in production was changed by this work.
