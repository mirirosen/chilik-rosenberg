# Conversion measurement and private tour intent implementation plan

> For agentic workers: execute this scoped plan task by task. One separate Codex reviewer gates publication; implementation stays with root.

**Goal:** Implement the20November recommendations: observe early booking attrition, strengthen private-group intent, show approved original imagery beside booking, diagnose the challah watch-page index status.

**Architecture:** Add fail-safe, whitelisted analytics helpers to existing controls. Preserve every booking/payment handler and server invariant. Update the existing private guide, using owner facts confirmed17November; reuse the existing original-video poster and watch URL.

**Tech stack:** React18, Vite5, Tailwind, Vitest/JSDOM, Firebase Hosting, GA4, Search Console.

**Spec:** User20November: implement all recommendations from the immediately preceding audit. GSC28-day clicks732/260; visible non-brand filter100/22; private guide impressions1333 with982 on the exact brand query; GA417–19November57users,2details users,0checkout/purchase,0verified provider captures.

## Global constraints
- No real Auth/order/charge/purchase, backend deployment, personal form data in analytics, consent change, fabricated testimonial/rating/case, private price/duration promise, or new duplicate landing page.
- Keep250ILS open price,30public/20checkout limits, private overlap enforcement and2027/28 horizon. One fresh Codex review before authorized Hosting publication.
- No new owner reply, testimonial or publication permission was found on20November. Existing owner-provided video/poster may be reused; new customer endorsements remain pending the already-sent owner request.

## Review focus
- Analytics failures must never prevent selection, focus, validation, retry or redirect; test throwing gtag and opt-outs.
- Passive mounting/scroll-near is not calendar visibility; test observer boundaries and duplicate callbacks.
- Error payloads use only fixed stage/code values, never input, URL selections, dates or raw server messages.
- Private FAQ visible answers/schema must not inherit open-tour price/duration/cancellation wording.
- Original video imagery must remain a previous-visit example with descriptive HE/EN link, measured dimensions and no additional autoplay or tracking.

## Tasks
- [x]1. Add failing analytics/integration tests. Implement view_booking_calendar on actual calendar visibility, select_tour_date on an available user selection, and booking_error with fixed booking_stage/booking_error_code values. Preserve existing begin_booking→begin_checkout→purchase.
- [x]2. Add an original-video image/link beside the picker and private-group planning sections/FAQ using verified facts. Verify schema/visible parity and mobile layout. New editorial date applies only to the changed private guide.
- [ ]3. Inspect the watch URL in Search Console, run live inspection and diagnose concrete crawl/index issues. Request indexing once only if eligible; accepted request is not indexed status. No speculative watch-page rewrites.
- [ ]4. Run both UI suites, three builds, boundary check and isolated compiled registration/payment QA. Freeze exact SHA, one independent Codex review, then PR/merge/Hosting only. Register fixed GA4 stage/error dimensions after review without marking diagnostic events as purchases/key events.
- [ ]5. Verify live artifacts, actual availability and intercepted26November/10December payment handoffs; preserve local/live evidence separately. Save checkpoint with owner and engine-processing dependencies.
