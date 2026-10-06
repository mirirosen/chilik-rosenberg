# Published contact-only website

This review branch records the public website already published on 6 October 2026 at https://www.chilik-tours.com/ (Firebase Hosting version `61f29d16c280c86a`, site `hilik-site`). It does not publish another release.

The dedicated `inquiry-index.html` / `src/inquiry-main.jsx` entry displays the approved Hebrew and English design, real portrait, illustrative food images, accessible mobile navigation and bounded GSAP animations with reduced-motion support. Availability and booking are arranged personally with Chilik. WhatsApp opens an editable, unsent draft; telephone and email links use the approved public contact details. There are no automated dates, seat reservations, payments, confirmation claims, geolocation requests or booking/customer API calls in this entry.

Old booking and confirmation URLs display honest enquiry/status guidance. Incoming payment flags are never interpreted as payment or booking success. Query-string customer information is neither displayed nor stored. The legal terms remain available with personal payment-arrangement guidance.

## Build and review

Use Node 22, then:

```sh
npm ci
npm run test:inquiry
npm run build:inquiry
npm run verify:inquiry
```

`build:inquiry` prepares an ignored local cache, builds `dist-inquiry`, and checks the public runtime and the dedicated Hosting configuration. Preparation only reads the 15 previously published legacy static files over HTTPS from `hilik-site.web.app`, without authentication. Every file is checked against `docs/inquiry-legacy-manifest.json`; changed or missing files fail the build. Captured JavaScript, source maps, original HTML and SDK configuration are not added to Git. Reserved `/__/firebase/init.*` paths remain managed by Hosting.

The published `/admin` continues to use the original HTML and byte-identical legacy assets. The new entry does not import admin or Firebase. Existing default application entry points, Firebase configuration, backend and legacy data identity are retained in the repository. Only `firebase.hosting.inquiry.json` describes this release; `firebase.json` is not replaced. No deployment, server, payment, calendar or message operation runs as part of these commands.

`tailwind.inquiry.config.js` scans only the public entry's components and a list of public CSS class names preserved from the published stylesheet. This reproduces the released styles without importing unrelated booking/admin code. The existing default Tailwind build remains available.

## Validation

- Clean dependency installation and 26 tests across five files: manual enquiry boundary, HE/EN, query privacy, legal terms, Hosting/admin routing, mobile menu, real/illustrative imagery and reduced-motion/animation cleanup.
- All 36 rebuilt public files and the dedicated Hosting configuration match the published release byte for byte. `verify:inquiry` checks the committed public hashes; it performs no HTTP requests or deployment.
- Published browser review covered desktop 1440 and mobile 320/390/430, Hebrew/English, reduced motion, unsent contact links, legacy admin entry and reload/back navigation. No booking, payment, email, calendar or WhatsApp message was sent.
- This repository has no GitHub Actions workflow on its current default `main` branch; local validation is recorded here rather than presented as a hosted CI pass.

The preserved admin is the previously published admin; new contact-card editing and backend repairs are not part of this PR. Keep the release as a draft for review. Merging and deployment require a separate decision.
