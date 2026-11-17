# Analytics (GA4) on the booking site

- Measurement ID **G-CXTM7ZJZYX**: GA4 property 541673749, web stream 16052109569.
- It is the built-in default in `apps/protected-booking/src/utils/analytics.js`.
- `VITE_GA4_MEASUREMENT_ID` in `.env.booking.local` overrides it with another `G-...` ID,
  or `off` removes analytics completely (no banner, no script).
- Preprod/demo builds and `/manage-bookings` never load analytics.

Per the owner's November 16, 2026 instruction, measurement starts automatically after
mount, without an approval banner. Earlier visitors' explicit "No thanks" choice
(`localStorage` `chilik-analytics-consent` = `denied`) remains effective: no analytics
script, cookies or measurement requests are started for them.

The footer's **כיבוי המדידה (Google Analytics) / Turn off analytics (Google Analytics)**
stores that same persistent opt-out, disables measurement, clears accessible GA cookies
and reloads. If localStorage cannot be written, a one-year `chilik-analytics-opt-out`
preference cookie preserves the choice instead. If both storage methods are blocked,
measurement stops for this visit and no automatic reload occurs. Deleted historical
choices cannot be reconstructed. The prerendered HTML never contains gtag; it loads only after mount.

When measurement is enabled, `gtag.js` loads once with `analytics_storage` granted and advertising storage,
ad user data, ad personalization and Google signals denied.

## Events

| Event | When | Parameters |
|---|---|---|
| `begin_booking` | The booking details form opens for a chosen date and party size | `currency: ILS`, `value`, `items` |
| `begin_checkout` | The form received the Tranzila checkout URL, right before the redirect (GA4 standard funnel step) | `currency: ILS`, `value`, `items` |
| `purchase` | **Only** when the server status for the booking is `status=confirmed` and `paymentStatus=paid`, which comes only from a verified Tranzila capture. Never from the `?payment=success` return URL alone | `transaction_id` = booking number (`BK-...`), `value` in ILS, `currency: ILS`, `items` |
| `whatsapp_click` | Any click on a `wa.me` / `api.whatsapp.com` link | `link_url` (message text stripped) |
| `phone_click` | Any click on a `tel:` link | `link_url: tel` (the number is not sent) |

`purchase` is sent once per booking per browser. The key `chilik-analytics-purchase:<booking
number>` in `localStorage` is set when it is sent, so reloading the confirmation page does not
send it again. If storage reads or writes fail, measurement must not interrupt the paid
confirmation. An in-memory marker still suppresses repeated status checks on that page;
cross-reload suppression cannot be guaranteed when the browser cannot persist or read the
marker. The transaction ID remains the same. No name, phone, email or notes are ever sent to GA4.

## Content-Security-Policy

`firebase.hosting.booking.json` allows, on `/`, `/en`, `/index.html`, `/booking`,
`/confirmation`, `/terms` and `/תקנון`:

- `https://www.googletagmanager.com` in `script-src`
- `https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com` in `connect-src`
- `https://www.google-analytics.com https://www.googletagmanager.com` in `img-src`

Static guides and the video watch page load a small entry that reuses the same analytics
module and opt-out behavior. Their CSP permits only the local entry and Google measurement,
without Firebase, payment API connections or form submission. `/manage-bookings` keeps its
stricter policy. The inquiry hosting config is unchanged; its build has no analytics.

## Tranzila referral exclusion: set in GA4 admin, not in code

After paying, the customer returns from Tranzila's hosted page to `/booking?payment=...`.
Without an exclusion GA4 would credit those sessions to `tranzila.com`. This is configured in
Google Analytics only, and nothing in the site code fakes or replaces it:

**Admin → Data streams → web stream 16052109569 → Configure tag settings → Show all →
List unwanted referrals**, add a rule with match type "Referral domain contains" and value
`tranzila.com`. It covers `directng.tranzila.com`.

## Owner checklist

- Privacy policy (`public/privacy.html`) and the terms describe automatic Google Analytics
  measurement and the persistent footer opt-out.
- In GA4, mark `purchase` as a key event and add the unwanted-referral rule above.
