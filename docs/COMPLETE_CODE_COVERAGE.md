# Complete reviewed code handoff

The booking/backend and remaining contact/admin/rules code are integrated as Git code only. Existing inquiry UI, nine-video gallery, public assets, legacy admin, root package/lock, default Hosting configuration and project alias are preserved. No deployed security policy, persistent claim, IAM binding, database record, provider configuration or charge is changed by this handoff.

| Prepared work | Integrated location and disposition |
| --- | --- |
| Booking/payment lifecycle, server authorization and reconciliation | `functions/src/`, including independent OFF transport/scheduler gates from PR 7 |
| Verified Tranzila field mapping/Handshake/language and guarded cancellation preparation | Existing provider modules and cancellation libraries from PR 7; financial execution stays OFF |
| Calendar weekly capacity, import/count sync, sanitized availability and adapter | Existing Calendar runtime/adapters/tests in `functions/`; matching frontend availability module/hook and booking controls in `apps/protected-booking/` |
| Meta/Twilio WhatsApp adapter, delivery receipts, uncertain-send quarantine, duplicate prevention | Existing backend modules plus contact CTA contract in `whatsapp-twilio.js`; default sending stays OFF |
| Protected booking contact card | `functions/src/booking-contact-card.js`, guarded API export, server tests; `AdminContactCard`/downloader and login-continuation tests in the isolated app |
| Firebase email/password administrator and booking dashboard | `apps/protected-booking/src/components/Admin.jsx`, `AdminBookings.jsx`, `utils/adminService.js`; explicit opt-in bundle, real claim checks, no copied legacy gate |
| Complete booking UI | Isolated date/count selection, validated form, idempotent customer/session recovery, payment result, confirmation, demo controls and terms; stale marketing-page copies are omitted |
| Firestore rules and indexes | `security/booking/firestore.rules` and `firestore.indexes.json`, separate `firebase.booking.review.json`, demo-only emulator tests; not activated by the default Firebase config |
| PR 1 phone/contact corrections | Current inquiry already uses the corrected public number; isolated booking/terms/contact policy includes matching corrections and locale checks |
| PR 2 redesign/admin recovery | Published inquiry redesign is retained; the newer Firebase admin/booking source is staged in the isolated app rather than reverting the current gallery/site to this old branch |
| PR 3 full booking/early payment backend and indexes | Latest backend/booking implementation and guarded rules/index assets supersede the early Morning implementation; no obsolete provider or stale public UI is restored |
| PR 4 older Tranzila branch targeting PR 3 | Latest tested Tranzila backend and full isolated booking UI cover the relevant intent; stale branch commits are not merged blindly |

The eleven-file contact patch was verified byte-for-byte against its manifest and all five original-file baseline hashes before integration. It was adapted to preserve PR 7's private/OFF guards and to locate the UI and security configuration separately; it did not overwrite the complete canonical source. Customer, credential and diagnostic artifacts, proof archives, dependency directories and obsolete duplicate marketing UI are not application code and are excluded.

## Release gates remain closed

Code availability is not live activation. The preserved legacy admin targets `hilik-rosenberg-ddb9b`; the prepared backend and new admin target `hilik-site`. The separately reviewed legacy rules deny Chilik paths, an availability risk without proven data exposure. Rules and auth/project compatibility must be reviewed for the intended deployment target; no live rule publication or admin grant is implied.

Tranzila transaction echo, exact Reports lookup, capture/cancel identity/states/entitlement/fees/timeouts and real returns/notify behavior remain unverified. WhatsApp requires an actual approved CTA Content SID and verified fragment preservation/login/download on a handset; Calendar needs approved capacity alignment and operational credentials. Runtime, schedulers, financial and messaging flags remain OFF, and every declared HTTP endpoint remains private.

## Verification of the integrated code

Node 22 verification passed 246 offline backend tests with network blocked, 104 isolated booking/admin UI tests and all 40 existing inquiry/gallery UI tests. Both the default-OFF app build and explicit network-isolated preprod build compiled; the inquiry publication build retained all 15 preserved legacy files byte-for-byte. Syntax checks passed for all 31 server source files. Discovery using the installed Firebase SDK confirmed eight private HTTP endpoints and no scheduler exports; the contact function binds no secrets. The UI verification uses the existing installed dependency tree; the isolated app also includes its own pinned installation lock.

The inherited demo concurrency fixture was corrected to allow either request to finish first while still requiring exactly one creation, one reused result, one capacity reservation and sequential recovery. No booking behavior was weakened. Imported trailing whitespace was cleaned without changing the Hebrew policy text; its source fixture reflects that formatting cleanup.

The seven demo-only Firestore rule tests are included but were not executed: Java is unavailable on this machine's PATH. No emulator pass, live-rule verification or deployment-readiness claim is made. Emulator security verification and project/client compatibility review remain mandatory before any deployment of these proposed rules. This does not activate or hold back the Git-only, default-OFF source handoff.
