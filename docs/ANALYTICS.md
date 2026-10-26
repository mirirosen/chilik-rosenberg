# Analytics (GA4) on the booking site

Status: **built in, off by default.** Nothing loads until both of these are true:

1. The build has a GA4 measurement ID: `VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX` in
   `.env.booking.local` (copied from `deploy/booking-hosting.env`, where it is empty).
2. The visitor clicks **אישור / Accept** on the consent banner.

With the ID empty (the shipped default) the site is fully inert: no banner, no
`googletagmanager.com` script, no cookies, no requests, and every tracking call is a no-op.
Preprod/demo builds never load analytics, and `/manage-bookings` never loads it.

## What happens after consent

- `apps/protected-booking/src/utils/analytics.js` loads `gtag.js` once, with
  `analytics_storage` granted and all advertising storage/signals denied.
- The choice is stored in `localStorage` (`chilik-analytics-consent` = `granted` / `denied`).
  "No thanks" is remembered and the banner is not shown again.
- Consent banner: `src/components/ConsentBanner.jsx` (Hebrew + English, links to `/privacy`).

## Events

| Event | When | Parameters |
|---|---|---|
| `begin_checkout` | The booking form received a Tranzila checkout URL, right before the redirect | `currency: ILS`, `value`, `items` (participants × ₪250) |
| `purchase` | The **server** status for the booking is `status=confirmed` and `paymentStatus=paid` (never from the Tranzila return URL alone). Sent once per booking per browser | `transaction_id` = booking number, `currency: ILS`, `value`, `items` |
| `click_whatsapp` | Any click on a `wa.me` / `api.whatsapp.com` link | `link_url` (without the message text) |
| `click_phone` | Any click on a `tel:` link | `link_url: tel` (the number is not sent) |

No name, phone, email or notes are ever sent to GA4.

## Content-Security-Policy

`firebase.hosting.booking.json` allows `https://www.googletagmanager.com` in `script-src`,
and Google Analytics endpoints in `connect-src` / `img-src`, on `/`, `/en`, `/index.html`,
`/booking`, `/confirmation`, `/terms` and `/תקנון`. The guides (no JavaScript) and
`/manage-bookings` keep their stricter policies. The inquiry hosting config is unchanged
(the inquiry build does not include analytics).

## Required GA4 setting: exclude Tranzila as a referrer

After paying, the customer returns from Tranzila's hosted page to
`/booking?payment=...`. Without an exclusion GA4 would credit those sessions to
`tranzila.com` instead of the real source (Google, Instagram, ...).

In GA4: **Admin → Data streams → (web stream) → Configure tag settings → Show all →
List unwanted referrals** and add:

- `tranzila.com`
- `directng.tranzila.com`

(Matching type "Referral domain contains" `tranzila.com` covers both.)

## Before turning it on

- The privacy policy (`public/privacy.html` and the terms) must mention Google Analytics and the
  consent choice. That text needs the owner's approval and is **not** changed by this work.
- Create the GA4 property, mark `purchase` as a key event, then set the ID and rebuild.
