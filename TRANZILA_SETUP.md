# Tranzila setup

No values in this guide are production secrets. Do not commit credentials.

The site charges customers through Tranzila's hosted payment page. The browser
redirects (`success_url_address` / `fail_url_address`) are for UX only — a
booking is marked **paid** only when Tranzila's server-to-server `notify`
POST is verified (Response=`000` + exact sum match + per-booking nonce match).
A declined payment marks the booking `failed`; a paid-looking callback that
fails verification marks it `pending_review` for manual checking.

## 1. Collect from Tranzila (after the merchant account is approved)

- **Terminal name** (`supplier`) — the name Tranzila gives you, e.g. `chilik-tours`.
- **Whether the terminal requires `TranzilaPW`** in the payment request —
  decide in the terminal's settings.
- **Approved `tranmode`** — the default here is `AK` (per Tranzila's docs
  examples); confirm which mode is enabled on your terminal.
- The merchant account must be live and the terminal configured for ILS
  (`currency=1`) card charges before real money can move.

Never paste any of these into chat. Passwords and keys go only through
`credentials.request_login` (website login) or the Secure Vault.

## 2. Configure the Cloud Functions

Set (via `firebase functions:config` / parameter environment — never in Git):

- `TRANZILA_TERMINAL` — terminal name (non-secret, appears in the payment URL)
- `TRANZILA_REQUIRE_PW` — `true` only if the terminal requires the password
- `TRANZILA_TRANMODE` — default `AK`
- `PUBLIC_SITE_URL` — the public site, e.g. `https://www.chilik-tours.com`
- `VITE_PAYMENT_API_BASE` — set at frontend build time to the deployed
  functions base URL

Store in Secret Manager (never in files):

- `TRANZILA_PW` — only if `TRANZILA_REQUIRE_PW=true`. Note: the secret must
  exist in Secret Manager before deploying the functions (an empty placeholder
  is fine when the terminal does not require a password).

With the terminal unset the functions fail closed: `createPayment` returns
`503 payment-provider-not-configured` and no payment URL is ever issued.

## 3. Sandbox / test run (before any production deploy)

1. Deploy functions to a non-production Firebase project. Never deploy this
   branch directly to the live `hilik-site` project.
2. Set a test terminal with test card details provided by Tranzila / Interspace.
3. Run through: booking creation, redirect to Tranzila, successful payment,
   declined payment, cancelled payment, and the 15-minute hold expiry.
4. Check each callback in the functions logs: the notify POST must be parsed
   from the raw urlencoded body and verified before any status change.
5. Tamper tests: replay a notify, flip the `sum`, swap the nonce, and confirm
   that none of them can mark a booking `paid`.
6. Confirm booking status and tour capacity change atomically and only once
   (delivery dedup via `paymentWebhookDeliveries`).

## 4. Go-live checklist

- [ ] Real terminal name configured, test terminal removed
- [ ] `tranmode` matches the terminal's approved mode
- [ ] Notify URL reachable over HTTPS (deployed `tranzilaWebhook`)
- [ ] Booking + capacity updates verified on a real small charge
- [ ] Build, route, SEO and visual regression checks green

## Where the logic lives

- `functions/src/payment-core.js` — pure functions (URL builder, notify
  parser, verifier). Tested: `npm test` inside `functions/`.
- `functions/src/index.js` — `createPayment`, `tranzilaWebhook`,
  `paymentStatus`, `expirePaymentHolds`.
- `src/utils/paymentService.js` — frontend client (provider-agnostic).
- `src/components/BookingForm.jsx` — credit-card flow with full-page redirect
  and return-state polling.
