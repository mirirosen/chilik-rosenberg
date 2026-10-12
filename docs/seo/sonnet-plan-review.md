> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Hostile review: SEO / AEO plan for chilik-tours.com (read only)

Reviewer: Sonnet 5.5 (High), local Claude Code session. Date: 2026-10-10.
Scope: `docs/seo/plan.md`, `audit-log.md`, `baseline-http.json`, `baseline-browser.json`, `baseline-home.html`, the source entries and metadata, `booking-i18n.js`, and the code that now implements the plan (`organicContent.js`, `organic-html.mjs`, `build-organic-pages.mjs`, `routeMetadata.js`, hosting configs).
Nothing in the source was edited, built, deployed or sent to any provider. The only file written is this one.

Evidence labels follow the repo rule: **observed** (I ran or read it), **documented** (source plus link), **hypothesis**, **unknown**.

## How this review was done, and what it cannot show

- **Observed (read):** every file listed above, with line numbers.
- **Observed (output):** the existing `dist-booking/` build (files dated 2026-10-10 20:39) was parsed for title, canonical, robots, hreflang, JSON-LD, FAQ text and word counts.
- **Observed (render):** I served `dist-booking/` from a scratch folder on 127.0.0.1 and loaded `/` in headless Chromium in three states: locale `en-US`, locale `he-IL`, and JavaScript disabled. Every non-local request was blocked, so no Firebase, Cloud Function or other third-party call was made. Lazy booking-calendar content therefore did not render, and word counts exclude it.
- **Not done:** no Googlebot or Search Console data, no Lighthouse, no live-site render, no `npm test`, no build. The source was still being edited while I reviewed (files stamped 20:36 to 20:39), so findings describe that snapshot. The final package may differ.
- **Unknown:** how Google's renderer actually behaves for this site. Findings F1 and F2 depend on it and say so.

## Two different things: readiness score and ranking

**Organic-readiness score** is my judgment of how technically and editorially ready the pages are to be crawled, understood and quoted. It is a review artifact, not a measurement of anything outside this repo. `plan.md:3` mentions "ציונים" but the plan defines no rubric, so I define one here (F14).

| Dimension (0 to 10) | Score | Basis |
|---|---|---|
| Crawlable initial content | 7 | Static home has an H1, about 440 words, 12 FAQs and links to the guides (observed). Parity with the rendered page is broken (F1, F2). |
| Metadata, canonical, robots integrity | 6 | Distinct static shells per route and noindex preserved on booking, confirmation and manage-bookings (observed). JavaScript then overrides title, description and the robots directive (F2). |
| Structured data consistency | 6 | FAQ schema equals the visible FAQ text, 12 of 12 identical with JavaScript off, and 12 equals 12 in the rendered DOM (observed). Credential overreach and site-name issues remain (F7, F11). |
| Guide quality (three focused guides) | 4 | Duplicated intro, identical meta description to home, about 200 unique words in the food guide, edition-agnostic copy, unconfirmed English offer (F4, F5, F6, F8). |
| Factual consistency | 5 | Meeting-point timing contradicts itself on one page (F3), and a credential is stronger than its source (F7). |
| Checkout, admin, credentials preserved | 5 | No credentials touched and noindex intact. New direct `.html` shells bypass the per-route security headers (F9). |
| Plan quality and verifiability | 5 | Honest about not promising rankings, but no parity tests, thresholds, rubric or mechanism (F13, F14). |
| **Overall readiness (unweighted mean)** | **5.4 / 10** | Not ready to publish until the MAJOR findings are fixed. |

**Actual search ranking** is not scored and not predicted. There is no Search Console data, no query volume (the plan itself says none is verified, `plan.md:11`), no competitor review and nothing published to measure. A high readiness score would still say nothing about position, and no number above should be quoted as a ranking forecast.

## What holds up (observed)

- Static home: `index.html` has one H1, one JSON-LD block (Person, Organization, WebSite, WebPage, Service, FAQPage), canonical to `/`, and 12 FAQ entries. The visible static FAQ text is identical to the schema text, question and answer, for all 12.
- Rendered DOM: 12 FAQ items in the page and 12 in the regenerated schema, in both he and en states.
- Guides: no JavaScript, one H1 each, self-referencing canonical, reciprocal hreflang between the Hebrew and English food-tour guides (self-reference included), listed in the sitemap, reachable from the home page.
- Private routes: `booking.html` has `noindex, nofollow` and no canonical. Unknown URL returns 404 with noindex (`baseline-http.json:66-75`). `robots.txt` allows crawling, which is correct because noindex must be readable.
- Nothing in the review touched or required credentials. `organic-html.mjs` reads only locale JSON.

## Findings

Severity follows the repo convention: BLOCKER, MAJOR, MINOR. Publication should wait for zero BLOCKER and zero MAJOR.

### F1. [MAJOR] The rendered page can replace the Hebrew static page with English on the same canonical URL

- **Where:** `src/inquiry-i18n.js:47-49` (UI language is `he` only if `navigator.language` starts with `he`, otherwise `en`, then `localStorage` overrides); `src/utils/routeMetadata.js:29,36,42` (title, description, og locale and schema all follow that language); `src/booking-main.jsx:10` (`createRoot`, so the static Hebrew `#root` is discarded, not hydrated); `src/InquiryApp.jsx:34` and `src/BookingSiteApp.jsx:73`.
- **Evidence (observed, local headless Chromium, no stored language):**
  - `en-US`: title "Chilik Rosenberg | Culinary Tours in Bnei Brak", `html lang="en"`, `dir="ltr"`, H1 "Experience the Haredi world as you never have before", English description, English schema, about 1262 words.
  - `he-IL`: Hebrew title, `lang="he"`, Hebrew H1.
  - JavaScript disabled: Hebrew static page.
  - All three share canonical `https://www.chilik-tours.com/` and the sitemap lists that URL once.
- **Why it matters:** the plan targets Hebrew intents first (`plan.md:13-15`). If the indexing renderer reports an English locale, the indexed version of `/` could be the English one, and the Hebrew static content the plan is built around is only what a no-JS fetch sees.
- **Unknown:** Googlebot's locale. This is a hypothesis until checked with a Search Console URL Inspection live test or equivalent.
- **Required change:** make the Hebrew home default independent of `navigator.language` for the root URL, or give English its own URL with hreflang. Add an acceptance test that renders `/` under `en-US` and `he-IL` and asserts the language, title and H1.

### F2. [MAJOR] Static and rendered metadata disagree even in Hebrew

- **Where:** static values come from `organicContent.js:8-9`; the runtime overwrites them from `src/locales/he.json:584-587` through `routeMetadata.js:17-19`; robots is set at `routeMetadata.js:25`; the static H1 is replaced by the Hero H1, and the keyworded title survives only as an H2 (`TourOverview.jsx:8`).
- **Evidence (observed):**
  - Title: static "סיור קולינרי בבני ברק עם חיליק רוזנברג", rendered "חיליק רוזנברג | סיורים קולינריים בבני ברק".
  - Description: static "סיור אוכל ותרבות…", rendered "סיור קולינרי ותרבותי… ובחירת תאריך", and `WebPage.description` in the schema differs between states.
  - H1: static keyworded, rendered "לחוות את החרדים כפי שלא הכרתם" (a slogan).
  - Robots: static `index, follow, max-image-preview:large`, rendered `index, follow`. The large-preview directive is lost.
- **Origin:** the baseline already showed it (`baseline-http.json:7` vs `baseline-browser.json:2`) but `plan.md` sets no parity requirement.
- **Required change:** one source for home title and description, used by both the build plugin and `applyRouteMetadata`. Preserve the full robots value. Decide deliberately which H1 is canonical. Add a test comparing static and rendered head values.

### F3. [MAJOR] One page contradicts itself about when the meeting point is given

- **Where:** `organicContent.js:12,23` and the guide copy (`build-organic-pages.mjs:15,21,30`) say the meeting point is given "after the booking is confirmed". The booking FAQ q8 (`bookingFaqCopy.js:6`, from `apps/protected-booking/src/locales/he.json:481-483`) says "after registration closes". The base FAQ in `src/locales/he.json` says "after the booking is confirmed personally".
- **Evidence (observed):** the built static `dist-booking/index.html` contains both statements, the facts list and the FAQ below it.
- **Why it matters:** this is the "consistent schema and visible FAQ" requirement in practice, and a visitor can see both claims. Registration closes at 20:00 on tour day (`src/locales/he.json:445`), which is not the same as booking confirmation.
- **Required change:** confirm the true rule with Chilik, then have the facts list, guides and FAQ all read from one string.

### F4. [MAJOR, becomes MINOR if `build:inquiry` is retired] The guides are not edition-aware

- **Where:** `package.json:12` runs `build-organic-pages.mjs inquiry` as well as `booking`. The script only switches the output folder and entry file (`build-organic-pages.mjs:7-10`); the guide text and CTA do not change (`:16`, `:22`, `:29-30`, `:45`, and `organicContent.js:16` "בחירת תאריך לסיור").
- **Why it matters:** in the contact-only edition there is no date selection. The guides there would say an open tour is booked "for a date shown on the website" and link to `/#date-selection`, which does not exist in that edition. `plan.md:3` says only that the live site is the booking edition; it does not say the contact-only build is retired.
- **Required change:** either generate per-edition guide copy and CTA, or build guides only for the booking edition and state that decision.

### F5. [MAJOR] Guides are duplicated and share one description with the home page

- **Where:** `build-organic-pages.mjs:45` writes `copy.intro` and then `overviewHtml()` (`organic-html.mjs:16`) writes the same intro again. `build-organic-pages.mjs:32` and `:34` reuse `organicCopy.*.description`, the same meta description as the home page.
- **Evidence (observed in the build):**
  - The intro paragraph appears twice on each guide.
  - The shared overview block (title as H2, facts, caution, guide nav) is repeated on all three guides and on the home page.
  - Food guide and home share one meta description string.
  - Each guide links to itself.
- **Required change:** remove the duplicated intro, write a distinct description per guide, and keep the shared block to a short link strip rather than repeating its body.

### F6. [MINOR] Guides are thin for "guides"

- **Evidence (observed):** the Hebrew food guide has 4 sections of 49, 48, 55 and 45 words, about 200 unique words; the whole page is about 414 words once the shared block is counted. The plan's intent map (`plan.md:13-16`) separates "before booking", "group" and "English" intents, but the private-tour guide and the food guide overlap heavily on food, kosher, accessibility and price.
- **Required change:** give each guide a distinct answer and enough substance for its intent. The plan itself warns against thin pages (`plan.md:24`), and these sit close to that line.

### F7. [MAJOR] A credential is stated more strongly than its source

- **Where:** `organicContent.js:10` says "בוגר ישיבת פוניבז׳" (graduate of Ponevezh Yeshiva) and feeds the Person description (`:34`). The site's own text says he "studied" there (`src/locales/he.json:303,307`; English `studied at Ponevezh`). The same file spells the yeshiva two ways (`פונוביז'` at `:303`, `פוניבז׳` at `:307`).
- **Why it matters:** `plan.md:5` promises no invented business details; a stronger personal credential in structured data counts.
- **Required change:** use the source wording ("למד בישיבת פוניבז׳") and settle one spelling.

### F8. [MAJOR, owner decision] English guide for a tour whose English delivery is unconfirmed

- **Where:** `build-organic-pages.mjs:21`, and `plan.md:16` as a target.
- **Evidence:** a search of `src/locales/he.json` and `en.json` for "english" and "אנגלית" found nothing saying tours run in English. The guide tells readers to arrange English guidance in advance, which neither confirms nor denies it.
- **Searched:** terms "english", "אנגלית", directories `src/locales`.
- **Required change:** confirm with Chilik which languages the tour is given in, and state it on the page, before publishing the English guide.

### F9. [MAJOR] New direct `.html` shells bypass the per-route security headers

- **Where:** `firebase.hosting.booking.json:25-32,41-44` rewrite clean paths to `booking.html`, `confirmation.html` and `manage-bookings.html`. The header rules at `:115-135`, `:136-156` and `:191-211` match only the clean paths (`^[\\/]booking$` etc.), and `build-organic-pages.mjs:51-61` writes those files into the public folder.
- **Evidence:** `dist-booking/` contains `booking.html`, `confirmation.html`, `manage-bookings.html` and `privacy.html`. A request to the `.html` path is not matched by the clean-path regexes, so CSP, `Referrer-Policy: no-referrer`, `no-store` and `X-Robots-Tag` would not apply. This is from reading the config; not run against a deployment (**unverified at runtime**).
- **Why it matters:** the brief says to preserve the active checkout and admin. The `no-referrer` policy matters because booking IDs and payment-return parameters appear in query strings. Meta noindex is present on these shells, but the header protections are not.
- **Required change:** add header rules for the `.html` paths, or stop serving them directly.

### F10. [MINOR] Sitemap and duplicate-URL hygiene

- **Where:** `public/sitemap.xml:1-9` is a stale two-URL file that the build overwrites (`build-organic-pages.mjs:63-64`). A plain `vite build` would ship the stale one. Neither version has `lastmod`. `public/privacy.html:3` has no canonical or robots tag and is reachable as both `/privacy` and `/privacy.html`.
- **Also:** `terms.html` is indexable and listed, but its raw HTML is about 40 words (observed); the full terms exist only after JavaScript.
- **Required change:** remove the stale source file, add `lastmod`, add a canonical to the privacy page, and decide whether the thin raw terms shell should be indexable.

### F11. [MINOR] Structured-data details

- **Where:** `organicContent.js:36` uses the long page title as `WebSite.name` instead of the brand; `build-organic-pages.mjs:41` has `about: {'@id': '/#tour'}`, which resolves only if the home graph is merged; the guide schemas have no `datePublished` or `dateModified` (`:40-43`).
- **Documented context:** Google restricts FAQ rich results to a small set of sites; the plan correctly makes no rich-result promise (`plan.md:5`, and `audit-log.md:9`). Treat FAQPage as an AEO and clarity aid, not an expected result type.

### F12. [MINOR] Contact details are now in raw HTML on every page

- **Where:** `organic-html.mjs:21` (email, phone) and `organicContent.js:35` (`telephone`, `email` in schema).
- **Why it matters:** the address `hr20192022@gmail.com` is already public on `privacy.html:6`, but putting it in every page and in schema increases scraping exposure. Confirm the owner is content with that.

### F13. [MINOR] Baseline gaps hid the biggest risk

- **Where:** `baseline-browser.json` records no locale, user agent or storage state, and shows only the Hebrew render (`:2-5`), so it could not reveal F1. `baseline-http.json` omits `/privacy`, `/manage-bookings`, `/admin` and `/legacy-admin.html`, apex-to-www and http-to-https, and does not say whether `robots` came from a header or a meta tag (`:6,27`). It records identical `bytes: 1582` for four HTML routes (`:11,22,33,44`) but nothing asserts they should differ. There are no performance numbers; `baseline-mobile.png` is a screenshot only.
- **Required change:** re-baseline with an explicit locale matrix, header-versus-meta separation, the missing routes, and CLS and LCP figures.

### F14. [MINOR] The plan names scores and tests but defines neither

- **Where:** `plan.md:3` ("ציונים") has no rubric; `plan.md:7` lists Lighthouse and JSON-LD checks with no thresholds and no validation method (the Rich Results Test is live-only, `plan.md:20`); there is no parity acceptance test (F1, F2), no check that checkout headers are unchanged (F9), and no statement of which build editions are release targets (F4).
- **Required change:** add the rubric, thresholds and these acceptance tests to the plan before the final review package.

### F15. [MINOR] Preproduction builds are treated as indexable by the metadata code

- **Where:** `routeMetadata.js:15` defaults `isPreprod` to false, and neither `InquiryApp.jsx:34` nor `BookingSiteApp.jsx:73` passes it. `BookingSiteApp.jsx:74` later forces robots to noindex, but the production canonical, `og:url` and schema stay in place on demo builds.
- **Not run:** by code reading only.
- **Required change:** pass the preprod flag through and skip canonical and schema on non-production builds.

### F16. [MINOR] Internal links lead to thin or self-referential pages

- **Where:** the static home CTA points at `/booking` (`organic-html.mjs:21`), a noindex shell whose raw HTML says only to enable JavaScript (`build-organic-pages.mjs:59`). Each guide links to itself (observed).
- **Required change:** point the static CTA at `/#date-selection` and drop the self-link.

### F17. [MINOR] Replacing, not hydrating, the static root may cost layout stability

- **Where:** `booking-main.jsx:10`, `organic-html.mjs:49-51`.
- **Hypothesis (unmeasured):** the static fallback paints, then React replaces the whole root, which can shift layout and change the LCP element. The plan lists Lighthouse (`plan.md:7`) but sets no CLS budget.

## Requested checks, in short

| Requirement | Result |
|---|---|
| Crawlable static initial content | Present and substantive in the raw HTML (observed), but it is not what the rendered page keeps (F1, F2, F17). |
| Schema consistent with visible FAQ | Holds within each state (observed). Breaks across states and on one fact, meeting-point timing (F2, F3, F7). |
| Three focused guides | Exist and are crawlable with correct hreflang, but duplicated, thin, edition-blind and with an unconfirmed English offer (F4 to F8). |
| Preserve checkout, admin, credentials | No credentials touched, noindex intact. New direct `.html` shells escape the header rules (F9). |
| Readiness versus ranking | Readiness 5.4 of 10 by the rubric above. No ranking is claimed or inferable. |

## Suggested order before the final package

1. F1 and F2 (rendering and parity), because they decide whether anything else is indexed as designed.
2. F3, F7 and F8, which need Chilik's confirmation.
3. F9, then F4 and F5.
4. The remaining MINOR items.
