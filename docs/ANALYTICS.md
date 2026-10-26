# Analytics (GA4) on the booking site

- Measurement ID **G-165V7SRZJK**: GA4 property 560779012, web stream 16203937010.
- It is the built-in default in `apps/protected-booking/src/utils/analytics.js`.
- `VITE_GA4_MEASUREMENT_ID` in `.env.booking.local` overrides it with another `G-...` ID,
  or `off` removes analytics completely (no banner, no script).
- Preprod/demo builds and `/manage-bookings` never load analytics.

**Nothing loads before explicit consent.** Until the visitor clicks **אישור / Accept** on
the consent banner (`src/components/ConsentBanner.jsx`, Hebrew + English, links to `/privacy`)
there is:

- no `googletagmanager.com` script
- no `dataLayer`
- no cookie and no request

"No thanks" is remembered (`localStorage` `chilik-analytics-consent` = `denied`), and the banner is
not shown again. The prerendered HTML never contains the banner or gtag; the banner is
rendered after mount.

After consent, `gtag.js` loads once with `analytics_storage` granted and advertising storage,
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
send it again. No name, phone, email or notes are ever sent to GA4.

## Content-Security-Policy

`firebase.hosting.booking.json` allows, on `/`, `/en`, `/index.html`, `/booking`,
`/confirmation`, `/terms` and `/תקנון`:

- `https://www.googletagmanager.com` in `script-src`
- `https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com` in `connect-src`
- `https://www.google-analytics.com https://www.googletagmanager.com` in `img-src`

The guides (no JavaScript) and `/manage-bookings` keep their stricter policies. The inquiry
hosting config is unchanged; the inquiry build has no analytics.

## Tranzila referral exclusion: set in GA4 admin, not in code

After paying, the customer returns from Tranzila's hosted page to `/booking?payment=...`.
Without an exclusion GA4 would credit those sessions to `tranzila.com`. This is configured in
Google Analytics only, and nothing in the site code fakes or replaces it:

**Admin → Data streams → web stream 16203937010 → Configure tag settings → Show all →
List unwanted referrals**, add a rule with match type "Referral domain contains" and value
`tranzila.com`. It covers `directng.tranzila.com`.

## Owner checklist

- Privacy policy (`public/privacy.html` and the terms) should mention Google Analytics and the
  consent choice. That wording is not changed in code.
- In GA4, mark `purchase` as a key event and add the unwanted-referral rule above.
