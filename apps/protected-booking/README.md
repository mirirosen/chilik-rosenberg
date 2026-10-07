# Isolated booking and Firebase-admin application

This separate app includes the complete date selection, booking form, payment/status recovery, confirmation, localized terms, Calendar availability, Firebase email/password admin, booking operations and authenticated contact-card download. It does not replace the published inquiry site, its gallery or the preserved legacy admin.

The build flag `VITE_BOOKING_REVIEW_ENABLED` defaults to OFF. The default entry renders a disabled page and never loads the entry that initializes services. Firebase initialization also requires the explicit flag, a non-preprod build and an explicitly supplied `hilik-site` browser configuration, or the local demo emulators. No legacy client password, localStorage login gate or automatic account/claim grant is included. Admin data and operations require actual Firebase admin authorization; a client flag never grants that authorization.

The existing backend and all integration/financial gates stay OFF. `adminBookingContactCard` is an eighth private HTTP declaration, also OFF, with no secret bindings or automatic download. It verifies revoked tokens and a non-anonymous boolean admin claim before any booking read. The vCard is generated on explicit request from a confirmed schema-v2 booking, with no public card, database write or PII in its locator. Twilio's four-variable CTA template contract is staged; no template has been created or approved and no message has been sent.

## Local verification

With Node 22, install this app's pinned lock using `npm ci --ignore-scripts`, then run `npm run test:ui` and `npm run build`. The root inquiry build and tests remain separate. No installation or build script deploys anything.

For a local fixture demo, explicitly set `VITE_BOOKING_REVIEW_ENABLED=true` and run `npm run build:demo`. `--mode preprod` uses synthetic availability/payments, skips Firebase/Auth and live APIs, disables contact links and declares a no-network CSP. The admin is unavailable in this demo. This proves UI behavior, not live admin or handset interoperability. The app's development/preview ports are 18781/18782 with `strictPort`; existing processes are never displaced.

`npm run test:rules` uses only the demo project `demo-chilik-rules` and local Firestore port 18783. It requires Java and the Firebase emulator. It tests the proposed `security/booking/firestore.rules`, not currently deployed rules. There is no production fallback. Auth emulator configuration, when explicitly used, targets `demo-chilik-repair` on ports 18784/18783.

## Deliberate deployment boundary

`firebase.booking.review.json` is a separate reviewed configuration pointing to this app's generated output and proposed rules/indexes. It has no Functions definition or deployment hooks. The root `firebase.json`, inquiry Hosting package and `.firebaserc` are unchanged. Neither ordinary root builds nor default deployments pick up the new app or rules. No deployment script, workflow or permission bypass is added.

Any future activation requires an explicit project/Hosting migration plan and authorization to deploy; existing legacy clients target a different project. The new admin's actual account, boolean claim and revoked-session behavior must be verified without copying the old client gate. Runtime/public invoker changes, database migrations, Tranzila contracts, Calendar/WhatsApp capabilities and the Meta/Twilio CTA/fragment behavior remain independent activation gates.
