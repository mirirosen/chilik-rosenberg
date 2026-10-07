# Guarded booking and payment backend

This backend is added separately from the published inquiry site. The UI, Hosting configuration, Firebase project aliases and legacy admin files are preserved. `firebase.backend.private.json` configures Functions only; it does not deploy Hosting, Firestore rules or indexes.

Every HTTP function declares private IAM, zero minimum instances, one maximum instance, concurrency 1, 256 MiB memory, CPU 1 and timeout 60 seconds. The booking runtime is disabled unless `CHILIK_BOOKING_RUNTIME_ENABLED=true` is explicitly supplied. Its disabled handlers return 503 before authentication, secret reads or database access. Booking schedules are absent unless the runtime and `CHILIK_BOOKING_SCHEDULERS_ENABLED` are both enabled. Calendar and WhatsApp remain disabled by their existing independent gates.

The separate private deployment candidate is:

| Function | Runtime identity | Bound existing secrets | Default behavior |
| --- | --- | --- | --- |
| createBooking | chilik-booking-runtime | TRANZILA_API_APP_KEY, TRANZILA_API_SECRET | disabled |
| createPayment | chilik-booking-runtime | TRANZILA_API_APP_KEY, TRANZILA_API_SECRET | disabled |
| paymentStatus | chilik-booking-runtime | none | disabled |
| updateBookingStatus | chilik-booking-runtime | none | disabled |
| retryIntegrationJob | chilik-booking-runtime | none | disabled |
| tranzilaWebhook | chilik-booking-runtime | TRANZILA_API_APP_KEY, TRANZILA_API_SECRET | disabled |
| calendarAvailability | chilik-integration-runtime | none | unavailable |

All identities are existing `@hilik-site.iam.gserviceaccount.com` accounts. The two payment secret bindings must resolve to existing version 1. Private rollout needs no new public invoker grants, schedulers, API activations, Firestore rules changes, admin claims, provider calls or production data mutations. Current authorization stops before cloud writes; the configuration is a reviewed candidate, not proof of deployment. Any deployment must explicitly target `hilik-site`, not the historical default project alias.

## Provider facts and remaining gates

Authenticated field metadata verified `chilik_order_id` at `user_defined_10` for `fxpmyry`. A separate one-shot diagnostic verified the Handshake endpoint and a valid token shape on 2026-10-06. Its function was deleted and its attempt latch retained; this repository contains no diagnostic endpoint, run receipt, token, secret value or retry mechanism for that probe.

The shared Handshake contract does not enable payments. Merchant verification, Reports capture/cancellation semantics, exact order lookup and reconciliation remain false. The Hebrew checkout language is `il`; English remains `en`, as documented by [Tranzila DirectNG](https://docs.tranzila.com/docs/payments-and-billing/iframe-integration-directng). The fixed token endpoint follows [CreateHandshakeV2](https://docs.tranzila.com/docs/payments-and-billing/handshake-v2/createhandshakev2).

Cancellation preparation is a server-only library with no exported function. It requires an authenticated operator and one independently verified original charge, produces an idempotent private preparation only, and always refuses cancellation execution. It neither guesses the API transaction reference from a Reports index nor sends requests or interprets financial success. No cancellation or refund was exercised.

## Approval scope before production writes

A bounded private OFF rollout would publish only the seven private HTTP functions above and use the existing identities and payment secret bindings, retaining all disabled gates. It must compare project/secret IAM and enabled APIs before and after deployment. The source default `firebase.json` remains Hosting-only; use the separate configuration for review.

Opening the browser/provider endpoints requires separate explicit `roles/run.invoker` grants to `allUsers` on the seven corresponding Cloud Run services, followed by application-authentication review. Enabling schedules adds `reconcilePayments`, `expirePaymentHolds` and `processIntegrationJobs`; their authenticated invoker bindings and Cloud Scheduler jobs must be enumerated from the installed CLI before any writes. Enabling booking or integrations permits database mutations and requires an approved capacity/calendar reconciliation and operational credentials. Existing admin permissions and claims must remain intact.

Firestore rules and index proposals are held outside this Git increment. Their client-deny policy can change legacy admin behavior, so integrating or publishing them requires a compatibility review of current live rules, an emulator security test and an explicit approved migration. No Firebase configuration in this increment publishes rules or indexes, and no client-deny claim is made about the live databases.

The preserved legacy admin uses anonymous Firebase authentication and a client-only login gate in project `hilik-rosenberg-ddb9b`. That gate is not server authorization. This backend targets `hilik-site` and its admin endpoints require verified server-side admin claims; no legacy credential or client gate is copied into those checks. A separate read-only review verified the legacy project's active rules pointer on 2026-10-07 at 04:57 UTC: the Chilik bookings, settings and tour-date paths fall under recursive deny, with no matching client allow. Legacy operations are therefore expected to fail; this is a configuration/availability risk, not evidence of exposed customer data, and no live operation was exercised. No authentication migration, new admin claim, project alias change or security-rule publication is included in this code merge.

The contact-card increment is excluded: a verified implementation is not present in this checkout and its required new admin authentication is incompatible with the preserved legacy path. It needs an isolated entrypoint, explicit project/authentication alignment and separate review before integration. The old redesign PRs and their legacy-admin/UI changes remain open; only their backend intent is superseded by this tested server implementation.

Public credit payments additionally require terminal-specific transaction echo and lookup, final capture states, cancellation entitlement/reference/result/fees/timeout handling, and actual success/failure/notify behavior. A successful Handshake does not establish these contracts. No card charge or new provider diagnostic is authorized by this change.

## Local validation

Run `node scripts/prepare-private-backend.cjs` once to create the isolated `.backend-private-deploy/functions` candidate. It copies server source and the pinned dependency lock, writes only explicit OFF flags and verified nonsecret field names, and refuses to overwrite an existing candidate. Generated staging files are ignored by Git. This command performs no deployment or network access.

Run `npm --prefix functions test` and `npm --prefix functions run lint` with Node 22. Unit tests inject synthetic data and provider responses. Run the separate emulator suite only with `FIRESTORE_EMULATOR_HOST` set; it refuses a production fallback. The SDK discovery proof must show precisely seven private HTTP exports and zero schedules with default environment values.
