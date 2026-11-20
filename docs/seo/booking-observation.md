# Booking observation contract —20November2026

The diagnostic layer answers where customers stop before the existing begin_booking→begin_checkout→purchase funnel. It does not create leads or purchases and does not change validation, capacity, retry/idempotency, consent, payment or notifications.

- view_booking_calendar: the date-choice container intersects the viewport, once per mounted picker. Scroll-near/lazy mounting alone is not a view. In browsers without IntersectionObserver, mounting is the disclosed fallback.
- select_tour_date: a fresh available suggested date or a changed available calendar choice was deliberately selected. Restored/prefilled selection, passive rendering and participant changes do not emit this event. No chosen date/count is sent.
- booking_error: fixed booking_stage and booking_error_code categories. Native browser validation reports the first known invalid control in the current validation task, without cancelling default validation; JavaScript validation reports its first invalid field. Fresh availability and payment-service failures use coarse safe categories, never server text.

Allowed stages/codes:
- date_selection: date_unavailable, availability_unavailable.
- details: validation_name, validation_phone, validation_email, validation_date, validation_participants, validation_payment_method, validation_terms.
- payment: checkout_unavailable, date_unavailable, session_unavailable, request_closed.

All three events inherit the existing page_language whitelist. They accept no input, customer reference, URL, date selection, raw error, text field or arbitrary parameter. Opt-outs, disabled/demo builds and management exclusions remain effective. Diagnostic tracking catches failures and must not interrupt booking. Error events are observations, not unique customer counts or proof of payment failure. Unknown/closed availability is not relabelled sold out.

GA4 metadata to register after independent review in property541673749: event-scoped **Booking stage→booking_stage**, **Booking error code→booking_error_code**. Leave all diagnostic events unmarked as key events. Keep purchase and the existing closed funnel unchanged. Custom definitions/reporting may require processing; an isolated test dataLayer is not proof of GA4 ingestion. Do not send QA or replay purchases.

Private guide: existing URL targets team days, families and friends using owner facts confirmed17November. Price, duration and payment/cancellation terms remain individually coordinated. Private FAQ and JSON-LD share private answers rather than public ticket/duration/cancellation answers. Site-editor byline20November is an editorial update, not a new owner confirmation.

Trust image beside the calendar: existing /media/posters/vizhnitz-bakery.webp from owner-provided video documented in public/media/tour/README.md and src/data/organicVideo.js. It links to the existing captioned original clip. Previous-visit wording stays visible; it promises no bakery stop or entry. No stars, review text, customer case or customer image was invented. New testimonials remain dependent on approved text/source/permission; the owner question was already sent17November and no newer reply was found20November.

Search Console diagnosis20November: the watch URL is listed Crawled-currently-not-indexed, last crawl17November. Raw HTTP200, self canonical, index/follow, matching VideoObject and accessible source/thumbnail were inspected. Initial URL Inspection returned Google's Something went wrong/try again in a few hours. Eligibility/live-request/indexed are separate states; do not claim a fix or indexed status from submitting a request. No speculative watch-page/crawler-policy change is included.

Release gate: both UI suites, all three editions and boundary verification; compiled HE/EN mobile/desktop validation/retry/payment handoff with every external call intercepted; one separate Codex GO for frozen SHA; Hosting-only publication; live artifact/availability/isolated-flow verification. No real account/order/charge/purchase.
