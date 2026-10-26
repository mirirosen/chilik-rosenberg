# Declined-card retry (same booking)

`createPayment` with `{ retryBookingId }` lets the booking owner open a fresh Tranzila checkout
for the same open booking after a declined card (`functions/src/payment-flow.js`, `retry`).

## When a retry is allowed

1. The caller owns the booking, the booking is `payment_pending` / `awaiting_payment` and its
   checkout window is still open.
2. Fewer than 5 retries were made for this booking (`payment-retry-limit` otherwise).
3. Fewer than 10 order lookups were made for this booking. Each retry request that reaches the
   lookup counts (`paymentLookups`), including refused ones, so a looping client cannot drive
   unbounded Tranzila report calls (`payment-retry-limit` otherwise).
4. The verified Tranzila order lookup can run: the booking has a bound `paymentTerminal`, the
   provider exposes `findTransactionIndexes`, and `assertLookupReady()` passes
   (`TRANZILA_ORDER_LOOKUP_VERIFIED=true` and a valid lookup mode). Otherwise the retry is
   refused with `payment-verification-pending` (HTTP 503).
5. The lookup completes and returns **at least one row**, and every row it returns for the
   order is either
   - a verified capture: it is applied (booking becomes paid/confirmed), no new checkout is
     opened, and the response carries `applied: true`; or
   - a positively identified decline: a successful report for that exact row, terminal and
     order with a non-`000` `processor_response_code`.

   A new checkout opens only when every row is a positively identified decline. Any other
   result (empty lookup, lookup error, transport timeout, non-OK response, report
   `error_code`, unmatched row, unverifiable row) refuses the retry with
   `payment-verification-pending`; the UI shows the "verification pending" message and the
   customer can try again a few seconds later.

A successful retry returns `{ bookingId, paymentUrl, retried: true }`, extends the checkout
window by 15 minutes, and holds no seat.

## Report lag (closed for an empty report)

Tranzila's report may not yet list a capture made seconds before the retry. An empty report is
now refused with `payment-verification-pending`, so it no longer opens a second checkout. If a
second capture ever does happen (e.g. the old checkout page is also paid), it is routed to
`additionalPaymentReview` by the booking service, recorded and never lost, and the owner
refunds it by hand. `reconcilePayments` also picks up late captures.

**To confirm before relying on the retry:** this rule depends on Tranzila's report listing the
declined transaction as a row. Make one real declined attempt on the live terminal and check
that the order lookup returns that row with a non-`000` `processor_response_code`. If the
report omits declined rows, every retry will be refused with `payment-verification-pending`
(fail-safe: the customer waits for the 15-minute window instead of being double-charged).
