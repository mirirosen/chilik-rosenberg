# Booking through 2028 and requested content changes

**Goal:** Open Thursday registration through 31 December 2028, initialize audited missing capacity safely, replace the Vizhnitz station wording, and remove the analytics approval banner while retaining measurement.

**Spec:** User instructions in this chat on 16 November 2026: open all 2027 and 2028 after checking existing bookings; retain participant limits and exact private-tour overlaps; station name “החלות המפורסמות והידועות של מאפיית ויזניץ”; no cookie approval prompt, with Google Analytics retained. SEO/AEO is a separate read-only research assignment.

**Architecture:** Share an explicit final booking date between client and server. Extend the calendar import and public projection to that date, batch Firestore reads, and retain existing freshness, reconciliation and private-window checks. Use one explicit, atomic, empty-capacity initializer that rechecks all in-scope bookings, existing counters and calendar snapshots before creating missing zero counters; never overwrite existing counters.

**Tech stack:** Node 22, Firebase Functions/Firestore, Google Calendar, React/Vite, Node tests and Vitest.

## Constraints

- Public tours remain Thursdays at 20:00–23:00; maximum 20 people/order and the existing global/date capacity remain enforced.
- No customer/payment/provider/identity/credential changes, invented paid states, calendar edits, or counter resets.
- Initialization is limited to Thursday dates in 2027–2028. Missing data never means available until the explicit audited initialization succeeds.
- Existing manual blocks, sold-out flags, custom limits and explicit analytics opt-outs remain effective.
- Parent alone writes code. Organic-growth researcher is read-only. One separate reviewer checks the candidate before publication and initialization.

## Audit evidence (read-only)

Complete current-project booking query for 2027-01-01 through 2028-12-31 found zero bookings. The legacy public booking path also returned zero. No future tour settings, weekly counters or calendar count bindings existed. Complete Calendar search returned three non-private, non-count events and no pagination token. Recheck live data atomically at initialization; these observations are not permission to skip the recheck.

## Files and checks

- Add `functions/src/booking-horizon.json`; update server date validation/import range and client date validation/list/response sanitizer.
- Batch public availability document reads in `functions/src/calendar-api.js`; preserve the response whitelist.
- Add a non-exported capacity initialization library and dry-run/apply entry point, with transactional guards and tests for changed bookings and existing data.
- Update both Hebrew/English station content sources without promising bakery entry.
- Default analytics to measurement without the approval dialog; keep stored opt-outs and make withdrawal persistent. Update matching visible privacy text.
- Backend tests cover all 104 future Thursday dates, last allowed date, 2029 refusal, full capacity, private overlaps, import completeness and initialization rollback/idempotency.
- UI tests cover all-year picker/response handling, native input bounds, automatic analytics, retained opt-out and withdrawal.
- Run complete backend/UI suites, lint, production booking build and focused live verification after publication.

## Execution

- [x] Audit existing bookings, counters and calendar records.
- [x] Write regressions and observe failures before implementation.
- [x] Implement, test and build the bounded candidate (331 backend, 152 booking UI, 255 public UI tests; lint and production build passed).
- [ ] Obtain independent review; resolve findings.
- [ ] Publish compatible client/importer first, verify complete future snapshots, then initialize audited missing capacity and publish booking/public API consumers.
- [ ] Verify all 104 2027/2028 Thursday dates, representative registration flows, correct copy, no banner, and preserved limits/private blocking. No real charges.
