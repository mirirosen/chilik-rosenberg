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
   - `CHILIK_INTEGRATION_SCHEDULER_ENABLED: "true"` (since 2026-10-26, round 4; was `"false"`)
   - `CHILIK_INTEGRATION_CUTOFF_ISO: "SET_TO_DEPLOY_TIME_UTC"` (placeholder, see below)
4. `functions/src/index.js` passes `schedulesEnabled: process.env.CHILIK_BOOKING_SCHEDULERS_ENABLED === 'true'`
   to `createBookingApi`.
5. `functions/src/api.js` registers the scheduled functions only when
   `enabled === true && schedulesEnabled === true`:
   - `reconcilePayments`: every 1 minute. Looks up Tranzila reports for open card checkouts and
     applies verified captures (this is what moves a "pending" return to "paid" if the webhook
     is late or lost).
   - `expirePaymentHolds`: every 5 minutes. Closes card checkouts whose 15-minute window has passed.
   - `processIntegrationJobs`: every 1 minute, registered because
     `CHILIK_INTEGRATION_SCHEDULER_ENABLED === 'true'`. Runs as
     `chilik-integration-runtime@hilik-site.iam.gserviceaccount.com`.

## What this means

- If the booking functions were last deployed from this code, without an overriding env var on
  the service, the payment reconciler and the hold-expiry jobs exist in production.
  The registration happens at deploy time, so only the deployed function list is authoritative.
- `reconcilePayments` also needs `loadPaymentConfiguration(...).reconciliationIssues` to be empty.
  With the shipped settings this holds (capture contract verified, lookup verified, bounded
  date scan) once the two Tranzila secrets are bound.
- Email, calendar and WhatsApp integration jobs are queued in Firestore (`integrationJobs`) and
  processed by `processIntegrationJobs` through `createJobRunner(..., loadIntegrationGates(env))`
  (`functions/src/integration-jobs.js`).

## Integration job safety gates (all fail closed)

| Gate | Setting | Behavior |
| --- | --- | --- |
| Cutoff | `CHILIK_INTEGRATION_CUTOFF_ISO` (UTC ISO, e.g. `2026-10-27T08:00:00Z`) | Jobs whose `createdAt` is before it become `skipped` (`before-integration-cutoff`), never sent and not retryable. While it is missing or not a valid ISO time (the shipped placeholder `SET_TO_DEPLOY_TIME_UTC`), the runner claims nothing: jobs stay `pending`, nothing is sent. |
| Idempotency | built in | A lease claims each job once; `sent` and `skipped` are terminal. Email uses `deliveryReceipts` plus the provider idempotency key; WhatsApp uses its receipt state machine; calendar uses one deterministic event per tour date. |
| Customer messages | `NOTIFY_CUSTOMER_EMAILS` (this codebase's own setting, not set) | Customer email jobs are `blocked` (`customer-messages-disabled`) unless exactly `"true"`. The email adapter also has no provider configured in `index.js`, so it stays blocked either way. Owner WhatsApp still needs `CHILIK_WHATSAPP_ENABLED` and its verification flags (all `"false"`). |
| Test mode | `CHILIK_TEST_MODE=true`, or any project other than `hilik-site` | Emails go to `hr20192022@gmail.com` only; WhatsApp is `blocked` (`test-mode-whatsapp-disabled`). The notifications codebase has the same guard (`functions-notifications/src/test-mode.js`): all mail to `hr20192022@gmail.com` with a `[TEST]` subject, no WhatsApp. |

With the shipped flags, enabling the scheduler sends nothing new: email and WhatsApp adapters
are disabled, and calendar writes need `calendarRuntime.writesEnabled`. Jobs from before the
cutoff are closed as `skipped` instead of waiting forever.

### Setting the cutoff at deploy

Right before deploying the booking functions, replace the placeholder in
`functions/booking-deployment-settings.json` with the current UTC time, for example the output
of `date -u +%Y-%m-%dT%H:%M:%SZ`. Do not commit a past date by accident: every job created after
the cutoff becomes eligible.

### Verify after deploy (read-only)

```sh
firebase functions:list --project hilik-site | grep processIntegrationJobs
gcloud scheduler jobs list --project hilik-site --location us-central1   # firebase-schedule-processIntegrationJobs-us-central1
firebase functions:log --project hilik-site --only processIntegrationJobs  # no integration-job-processing-failed
```

In the Firestore console, `integrationJobs`:
- jobs created before the cutoff: `status: skipped`, `lastError: before-integration-cutoff`;
- new jobs: `blocked` with `email-not-configured`, `customer-messages-disabled`,
  `calendar-not-configured` or `whatsapp-not-configured` (expected while those are off), or `sent`;
- no job is picked up twice (`attempts` stays 1 for `sent`/`blocked`).

To test a send end-to-end, use a non-production project or set `CHILIK_TEST_MODE=true`:
every email then goes only to `hr20192022@gmail.com`.

## Read-only checks for the owner (not run here)

```sh
firebase functions:list --project hilik-site          # expect reconcilePayments, expirePaymentHolds
gcloud scheduler jobs list --project hilik-site --location us-central1
```

Nothing in production was changed by this work.
