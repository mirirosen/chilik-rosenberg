# Declined-card retry (same booking)

`createPayment` with `{ retryBookingId }` lets the booking owner open a fresh Tranzila checkout
for the same open booking after a declined card (`functions/src/payment-flow.js`, `retry`).

## When a retry is allowed

1. The caller owns the booking, the booking is `payment_pending` / `awaiting_payment` and its
   checkout window is still open.
2. Fewer than 5 retries were made for this booking (`payment-retry-limit` otherwise).
3. The verified Tranzila order lookup can run: the booking has a bound `paymentTerminal`, the
   provider exposes `findTransactionIndexes`, and `assertLookupReady()` passes
   (`TRANZILA_ORDER_LOOKUP_VERIFIED=true` and a valid lookup mode). Otherwise the retry is
   refused with `payment-verification-pending` (HTTP 503).
4. The lookup completes, and every row it returns for the order is either
   - a verified capture: it is applied (booking becomes paid/confirmed), no new checkout is
     opened, and the response carries `applied: true`; or
   - a positively identified decline: a successful report for that exact row, terminal and
     order with a non-`000` `processor_response_code`.

   Any other result (lookup error, transport timeout, non-OK response, report `error_code`,
   unmatched row, unverifiable row) refuses the retry with `payment-verification-pending`.

A successful retry returns `{ bookingId, paymentUrl, retried: true }`, extends the checkout
window by 15 minutes, and holds no seat.

## Residual gap: report lag

Tranzila's report may not yet list a capture made seconds before the retry. In that case the
retry can open a second checkout. If the customer pays both, the second verified capture is
routed to `additionalPaymentReview` by the booking service, so it is recorded and never lost,
but the owner must refund it by hand. `reconcilePayments` also picks up late captures.
