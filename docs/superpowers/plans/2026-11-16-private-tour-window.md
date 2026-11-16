# Private tour time blocking implementation plan

**Goal:** Private tours block only overlapping public tour times. Registration for 26 November and 10 December 2026 must be available when capacity permits.

**Architecture:** Keep weekly capacity accounting. Store anonymized private-event time intervals in the existing server-only calendar snapshots. Both the public projection and booking transactions check the selected public tour's 20:00–23:00 Jerusalem interval. Preserve the legacy weekly flag for conservative behavior during mixed-version rollout.

**Tech stack:** Node 22, Firebase Functions, Firestore, Google Calendar, existing Node test runner.

**Spec:** User instruction of 16 November 2026 in this chat: block the private tour's date and hours, rather than its entire week; verify 26.11 and 10.12.

## Constraints

- No changes to capacity, payment providers, calendar events, credentials, or customer records.
- Public tours retain their current 20:00 start and maximum three-hour duration.
- All-day events use an exclusive end date in Asia/Jerusalem.
- A private event ending exactly at public-tour start, or starting at public-tour end, does not overlap.
- Old/incomplete snapshots fail closed until refreshed by the existing scheduler.
- Publication requires explicit authorization and the existing deployment gates.

## Review focus

- Public projection, checkout creation and confirmation must enforce the same interval.
- Wednesday/private morning events must leave Thursday evening available.
- Overnight, all-day and DST intervals must preserve exact overlap boundaries.
- Snapshot migration must not allow old consumers to ignore a conflict.
- Privacy, counter reconciliation and payment retries must remain intact.

## Task: Time-scoped private-tour blocking

Files: functions/src/weekly-availability.js, functions/src/calendar-api.js, functions/src/booking-service.js; regression tests in functions/test/private-tour-window.test.js and affected existing tests.

- [x] Verify a clean baseline: 290 backend tests pass.
- [x] Write regressions for both reported dates, disjoint/overlapping hours, all-day/overnight/DST, legacy snapshots and confirmation recheck.
- [x] Run regressions and confirm they fail for the weekly-blocking bug (13 failures before the fix).
- [x] Add private-event intervals and date-scoped overlap checks; pass tourDate through all consumers.
- [x] Run backend suite/lint, relevant frontend suite and booking build (314 backend tests on Node 22; 150 UI tests; build and lint pass).
- [ ] Obtain the required independent review in the existing local Claude review session.
- [ ] Prepare the exact deployment candidate and report any remaining publication gate.
- [ ] After authorized publication, verify both live dates can reach the registration form without creating a customer booking or charge.
