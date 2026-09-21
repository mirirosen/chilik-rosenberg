# Grow payment functions — sandbox setup

Two Cloud Functions (2nd gen, Node 20):

| Function | Type | Purpose |
|---|---|---|
| `createGrowPayment` | callable | Creates a Grow hosted payment page for a pending booking; returns its URL (~10 min validity). |
| `growWebhook` | HTTPS | Grow's server-to-server callback — the **authoritative** source of "paid". Verifies processToken + sum + statusCode, then calls Grow's mandatory `approveTransaction`. |

## Sandbox deploy (test mode, no real charges)

1. Copy `.env.example` → `functions/.env` and fill from the Secure Vault:
   `GROW_USER_ID`, `GROW_PAGE_CODE` (from Grow support / Morning → תשלומים > סליקה).
2. `cd functions && npm install`
3. `firebase deploy --only functions` (project must be the `hilik-site` target — see main README).
4. Copy the deployed `growWebhook` URL into `GROW_NOTIFY_URL` in `functions/.env` and redeploy (Grow calls this URL after each payment).
5. Set `SITE_ORIGIN` to the Firebase Hosting preview/live domain (HTTPS).

## Test transaction

1. Open the site, book a tour, choose **אשראי**, submit.
2. Browser redirects to the Grow sandbox page → pay with a Grow test card.
3. Grow redirects to `/payment/success?bookingId=…` — the page waits for the webhook, then shows the confirmation.
4. Verify in Firestore `bookings/{id}`: `paymentStatus === 'completed'`, `growTransactionId` set.

## Notes

- The success-page redirect proves nothing — only the webhook marks `completed`.
- Grow refuses a payment page without a syntactically valid email (HTTP 427):
  the booking form already requires + validates email; the function re-validates
  server-side and fails closed.
- `paymentStatus` values: `pending` → `redirected` → `completed` / `failed` / `pending_review`
  (`pending_review` = approveTransaction failed or token/sum mismatch — check the Grow dashboard manually).
- Bit / bank-transfer flows are untouched (manual, as before).
- Phase 2 (optional): auto-issue a Morning receipt after `completed` (account: yechielrozenberg@gmail.com).
