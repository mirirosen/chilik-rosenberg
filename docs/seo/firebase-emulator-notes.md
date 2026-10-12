> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Additional Hosting validation — 2026-10-10

This check was added after the third Sonnet review. No frozen source, production configuration, installed CLI dependency, credentials or deployed site was changed.

## Stock Windows emulator: failed URL glob matching

The stock Firebase Hosting emulator was run with hosting-only copies of the actual booking/inquiry configurations and `demo-*` project IDs. An initial absolute Windows public path returned 404; resolving `public` relative to the fixture configuration restored file serving. Separate exact `firebase.json` fixtures under `brief/seo-hosting-booking` and `brief/seo-hosting-inquiry` eliminated the ambiguity of `--config` loading the working project's default config.

Observed in the isolated booking fixture: root, clean terms/booking and robots returned 200; unknown URL returned 404. Clean booking retained noindex, CSP and no-referrer. However, `/booking.html` (with/without query) returned 200 instead of 301, and guide URLs lacked their configured CSP/referrer headers. These stock-emulator results are **not a pass**.

A direct reproduction against the installed dependency showed the cause: `glob-slasher('/booking.html')` returns `\\booking.html` on Windows and `configMatcher` returns false. Guide globs fail similarly. `glob-slash/index.js` calls platform `path.normalize(path.join('/', value))`. Existing regex headers accept both separators, which explains why they worked. This finding is directly observed local tool behavior, not a claim about Firebase production.

## Adapted emulator: observed HTTP results

A test-only preload at `C:/projects/HILIK-SITE/brief/seo-hosting-url-normalization.cjs` replaces `glob-slash.normalize` with POSIX path normalization inside the disposable emulator process. It does not edit the installed dependency or the product. This is an adapted test harness, **not an unmodified emulator and not real Hosting**.

- Booking: aliases return 301 to clean routes, preserving query parameters; destination private headers remain correct; guide CSP/no-referrer apply; robots returns 200 and unknown paths 404. See `firebase-emulator-booking-adapted.json`.
- Inquiry: root/terms, terms canonical/301 alias, three guides with their configured headers, robots and 404 assertions pass. See `firebase-emulator-inquiry-adapted.json`.

The original browser matrix remains the local Hosting approximation recorded in `candidate-browser.json`; it has not been relabeled as emulator evidence. Source hashes still match the third review. This additional evidence narrows the Windows test-tool issue; a preview or deployed Hosting HTTP check remains required before a publication GO.
