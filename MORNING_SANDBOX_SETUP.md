# Morning/Grow sandbox setup

No values in this guide are production secrets. Do not commit credentials.

1. Create sandbox OAuth credentials for the verified Yechiel business and store them in Firebase Secret Manager as `MORNING_SANDBOX_CLIENT_ID` and `MORNING_SANDBOX_CLIENT_SECRET`.
2. Create a dedicated random webhook secret and store it as `MORNING_SANDBOX_WEBHOOK_SECRET`.
3. In the Morning sandbox developer tools, configure the `payment/receive` webhook for the deployed `morningWebhook` HTTPS endpoint and set the same secret. Signature verification requires the exact raw body and `x-webhook-signature`.
4. Set the non-secret `PUBLIC_SITE_URL` function parameter and `VITE_PAYMENT_API_BASE` at build time. Do not use Vite variables for any secret.
5. Deploy indexes and functions to a non-production Firebase project first. Never deploy this branch directly to the live `hilik-site` project.
6. Test with Morning's sandbox only: initiation, success, invalid signature, duplicate delivery, wrong amount/currency, cancellation/failure and 15-minute hold expiry.
7. Confirm booking and tour capacity change atomically and only once. Then repeat build, route, SEO and visual regression checks before asking Miri about production.
