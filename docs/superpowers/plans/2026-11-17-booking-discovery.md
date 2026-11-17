# Booking discovery and conversion implementation plan

**Goal:** Implement the six owner-independent improvements requested on 17 November: live nearby dates, open/private choice, mobile continuation, pre-payment information, useful guide links, and read-only purchase measurement follow-up.
**Architecture:** Booking-edition-only discovery slot after Hero. A small public availability projection supplies suggestions; selecting one opens the existing picker, which keeps its fresh-capacity checks. One mobile bar delegates to the existing picker or form action. No payment, backend, privacy, price or capacity changes.
**Tech stack:** React 18, Vite, Vitest, Firebase Hosting. Native implementation in the existing dedicated checkout, followed by one fresh independent Codex review; the user's execution/publication instruction is already explicit.

## Constraints and review focus
- Preserve 250 ILS, 30 public places, 20 per checkout, dates through 2028, overlapping-private-tour blocks and provider idempotency. No real order/Auth/charge, analytics replay or new outreach.
- Never advertise stale, closed, missing, past or over-horizon dates; failed discovery leaves the regular picker link.
- Mobile action delegates to real validation and capacity recheck. Hide it for focused editable controls and when the primary action is visible; no desktop overlay, no bar in payment status/admin routes.
- SSR/hydration, HE/EN, inquiry/demo boundaries, reduced-motion and guide links must remain correct.
- New media, reviews, phone/hours/address/private prices and GA4 business size stay dependent on owner facts. Do not guess or claim measured conversion uplift.

## Tasks
- [x] Add behavioral tests for valid suggestions, expiry/outage/abort and mobile visibility/delegation; observe red assertions.
- [x] Implement BookingDiscovery, MobileBookingBar and BookingReassurance, shared bilingual copy and scoped CSS. Wire discovery into the public booking shell and existing selection/form handlers. Preserve draft round trips.
- [x] Add reciprocal open/private guide choices with verified facts and actual language URLs. No duplicate landing pages or schema tricks.
- [x] Run both UI suites and three production builds; exercise Nov26/Dec10 HE/EN plus closed Dec3, expiry and mobile keyboard through compiled frontend with all external writes intercepted.
- [x] Read GA4 naturally collected purchase/events and compare the same reporting window if available. Report unobserved purchases as unverified, never manufacture an event.
- [ ] Freeze exact commit/build. One independent Codex reviewer must give GO before merge/publication. Publish Hosting only; verify live hashes, availability, registration and intercepted payment handoff, preserve rollback and checkpoint.
