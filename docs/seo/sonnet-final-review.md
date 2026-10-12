> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Final review (round 3): SEO / AEO local candidate, frozen source

Reviewer: Sonnet 5.5 (High), the existing local Claude Code Desktop conversation. Date: 2026-10-10. This is the last review round; I am not opening another.
Read: `final-review-package.md`, `review-triage.md`, `scoring.md`, `source-hashes.json`, `audit-log.md`, `candidate-browser.json`, `verified-booking.json`, `verified-inquiry.json`, `verified-demo.json`, both final Lighthouse files plus the two earlier ones, `root-tests-final.log`, `booking-tests-final.log`, and the current source and skill files named below.
Not done: no source edit, no build, no deploy, no test run, no network or provider call, no API, SDK or CLI reviewer. I rendered the existing builds locally from a scratch folder with every non-local request blocked, and parsed them. The only file written is this one.

Evidence labels: **observed** (I read or ran it), **reported** (stated in the package, not reproduced by me), **unknown**, **hypothesis**.

## Verdicts

| Question | Verdict |
|---|---|
| **Local code** | **GO**, with the conditions listed under "Conditions attached to the GO". All eight prior P1 items are closed. I found no new P1. |
| **Publication** | **Not assessed and not authorized.** Real Hosting behavior, a same-environment performance comparison, owner confirmations and account setup are all still open (see "Limits"). |
| **Indexing** | **Unknown.** Nothing is submitted or crawled. |
| **Real ranking, traffic, AI citations** | **No data, no claim.** The scores below are controllable readiness only. |

## Source integrity (observed)

I recomputed SHA-256 for all 22 files in `source-hashes.json` (frozen 2026-10-10T17:57:55Z, i.e. 20:57:55 local): **22 of 22 match**, and none has a modification time after the freeze. The 22 include the three skill files.

Coverage limits of the hash set: it does **not** cover `src/locales/*.json` or `apps/protected-booking/src/locales/*.json` (read by `faqsFor` and by the tests), `functions/src/booking-core.js` (the price the verifier compares against; the working tree shows it modified), `firebase.hosting.booking-demo.json`, the `dist-*` outputs, or the evidence JSON files. Those are bound to the frozen source only by file times. Timeline (observed): last source edit 20:54:05, builds 20:54:24 to 20:54:36, browser and Lighthouse evidence 20:56, test logs 21:02, all after the last source edit.

## Disposition of each P1

All dispositions below were checked against the current files and the final builds, not the 20:39 and 20:40 snapshots.

| P1 | Disposition | Evidence |
|---|---|---|
| **P1-1** Language default depended on `navigator.language` | **Closed.** | `src/inquiry-i18n.js:6` is `let initial = 'he'`; only a stored explicit choice overrides it (`:7`). I re-rendered both final builds with fresh storage: `en-US`, `he-IL` and JS-off all give `lang=he`, the same title and the same H1 (observed). `candidate-browser.json` records the same for `en-US` and `he-IL`. Side effect, see N-3. |
| **P1-2** Raw and rendered head and H1 differed | **Closed.** | `routeMetadata.js:17-19` takes the home title and description from `organicCopy`; `:26` keeps `max-image-preview:large`. My render of both final builds: title, description, robots, canonical and H1 are identical across the three states (observed). `organic-seo.test.js:49-58` asserts the same for Hebrew. The H1 is the hero slogan in both states; the keyworded service title is the `<title>` and an H2 (design decision, see N-8). |
| **P1-3** Meeting-point timing contradicted itself | **Closed by removal.** | `organicContent.js:12` and `:23` and the guide copy (`build-organic-pages.mjs:15,21`) now say to ask Chilik; none promises a hand-over time. Built home: no "נמסרת לאחר אישור"; the booking FAQ still says "לאחר סגירת ההרשמה" (existing rule, unchanged), the inquiry FAQ has its own wording. Each edition is now internally consistent. The real rule is still not stated by the owner (see conditions). |
| **P1-4** "Graduate" stronger than "studied" | **Closed.** | `organicContent.js:10` "שלמד בישיבת פוניבז׳"; English line `:21` "studied at". No "בוגר" or "graduate" in any built HTML (observed). |
| **P1-5** Guides assumed date selection in the contact-only edition | **Closed.** | Guide sections now say to check which dates are available and how the booking is confirmed (`build-organic-pages.mjs:16,22,29`); the CTA label follows the build mode (booking "בחירת תאריך לסיור", inquiry "לבירור עם חיליק"; observed in both `dist-*`). The link target `/#date-selection` exists in both editions (`InquirySection.jsx:8` for inquiry). Inquiry metadata no longer says "date selection". |
| **P1-6** Evidence older than the source | **Closed.** | Builds, browser evidence and Lighthouse are newer than the last source edit (timeline above). Test logs show **183 of 183** root and **108 of 108** protected-booking tests, started 21:02, after the freeze (`root-tests-final.log`, `booking-tests-final.log`; **reported**, I did not run them, but the logs are consistent with the source: 8 cases in `organic-seo.test.js`, matching the file I read). Contrast now passes in both final Lighthouse runs (observed). |
| **P1-7** English guide implied an unconfirmed English tour | **Closed as a non-claim.** | `build-organic-pages.mjs:21`: "This guide is written in English; it does not confirm that tours are delivered in English. Contact Chilik before booking if you need an English-speaking tour." Meta description (`:34`) says to check language with Chilik. Whether English tours exist remains **unknown** and is an owner question (conditions). |
| **P1-8** Duplicated copy on every guide | **Closed.** | Observed in both builds: the intro appears once per guide, each guide has its own meta description (none equals the home description), no self-link, no repeated overview block, hreflang reciprocal between the two food-tour guides, one H1 each. |

## New findings

None reach P1. Severity is my judgment: P2 should be fixed or consciously accepted, P3 is polish.

### N-1 [P2] The demo build still contains a live phone link; the evidence says it has none

- **Where:** `dist-booking-demo/index.html` `<noscript>` holds `<a href="tel:0506724312">`. It comes from the template at `booking-index.html:17`, which the demo build does not rewrite.
- **Evidence (observed):** `verified-demo.json` records `"externalContactLinks": 0`, and `final-review-package.md:16` says the demo was confirmed to have "no contact links". The raw demo HTML has one. The runtime `disablePreviewContacts` does not apply when JavaScript is off.
- **What does hold (observed):** `robots` is `noindex, nofollow`; no canonical, no `og:url`, no JSON-LD, no organic fallback text.
- **Impact:** low (the number is the business's public one, the page is noindex, the line pre-dates the SEO work). The claim in the evidence is wrong as written.
- **Minimal fix:** correct the claim to "no contact links after JavaScript runs", or strip the noscript link from the demo build.

### N-2 [P2] Lab performance is unresolved; one Lighthouse explanation is incomplete

- **Observed numbers (all mobile, simulated throttling):**

| Run | Performance | LCP | CLS | TBT | SEO |
|---|---:|---:|---:|---:|---:|
| Live baseline, HTTPS CDN (17:44Z) | 78 | 2.8 s | 0 | 340 ms | 100 |
| Local home, uncompressed (17:50Z) | 49 | 7.2 s | 0 | 630 ms | 100 |
| Local home, compressed, final (17:55Z) | 53 | 4.8 s | 0 | 740 ms | 92 |
| Local guide, compressed, final (17:56Z) | 100 | 0.8 s | 0 | 10 ms | 92 |

- **Reading:** CLS and contrast are fixed (earlier 0.047 and 15 failures). The compressed local home is still well below the live baseline on performance, LCP and TBT. The package correctly says these are not comparable (local HTTP versus CDN) and claims no gain. I cannot call it a regression either: the cause is **unknown** (server, machine load or the added inline CSS and fallback markup are all possible).
- **Lighthouse SEO 92:** `robots-txt` failed in both final local runs, but for different reasons (observed in the JSON): the home run says "Timed out fetching resource" (fits the package's "transient timeout"); the guide run says "Network.loadNetworkResource … **CSP violation**", which is deterministic under the guides' `connect-src 'none'`. Neither is a crawler problem (direct HTTP returns a valid `robots.txt`; the live run passed), but "transient timeout" only describes the home run.
- **Minimal fix:** before publication run the candidate and live under the same conditions (for example a Hosting preview channel against the live URL). Record the CSP cause for guides.

### N-3 [P2] Hebrew-by-default changes the first visit for English-language visitors

- **Where:** `inquiry-i18n.js:6-15`: no locale detection, and `applyLanguage(initial)` stores `he` on first load. The English guide's CTA goes to `/#date-selection`, the Hebrew-default home.
- **Impact (hypothesis, not measured):** an English reader arriving from the English guide lands on a Hebrew page and must find the language toggle. This is the price of the P1-1 fix, probably acceptable, but it is a product trade-off the owner should know about.
- **Minimal fix (owner choice):** leave as is, or add an explicit way for the English guide to open the English home.

### N-4 [P2] Real Hosting behavior and the inquiry edition are not browser-tested

- **Observed:** the browser audit (`candidate-browser.json`) ran against the booking edition only (it requests `/manage-bookings`, which exists only there), on `serve-organic-audit.mjs`, whose own header says it is "not evidence of deployed Hosting behavior". The inquiry edition has the static verifier (7 documents) and my render check, but no alias, header or interaction run. That server applies rewrites before static files, which may not match Firebase's priority order (**unverified**).
- **Observed in source, in the candidate's favor:** payment return URLs are built as clean `/booking?payment=…&id=…` (`functions/src/payment-runtime.js:29-31`), and nothing under `functions/src`, `src` or `apps/protected-booking/src` links to a `.html` shell, so the new 301 redirects from `.html` aliases do not touch the payment or confirmation flow in code.
- **Minimal fix:** exercise both configs once in the Firebase Hosting emulator or a preview channel (redirect plus rewrite on `/booking` and `/confirmation`, headers on guides) before any publication.

### N-5 [P2] Test and verifier coverage gaps

- The Hebrew-default behavior has browser evidence but no Vitest case (a `navigator.language = 'en-US'` plus empty-storage test on `inquiry-i18n` would be cheap).
- `scripts/verify-organic-release.mjs:11,27-28` compares every quoted price to `functions/src/booking-core.js` (value 250, observed), a file outside the hashed set and modified in the working tree; it reads only the `main` text.
- The guides are verified by the build script and the verifier, not by Vitest.

### N-6 [P2] Guide depth is a known limit, not solved

- **Observed:** unique section text is 196, 235 and 259 words (food guide, private guide, English guide); whole pages 302, 347 and 373 words. They answer practical questions but add no first-hand station, menu or conversation material. `review-triage.md` (F6) says this honestly and defers it to the 30/60/90 plan. I accept the deferral; it is why the content score below is modest.

### N-7 [P3] Polish

- `build-organic-pages.mjs:16`: "איזה מועדים" should be "אילו מועדים".
- The yeshiva is still spelled two ways in the site's own locale text (`src/locales/he.json:303` versus `:307`); the new copy uses the second.
- `/privacy` and `/privacy.html` both serve (canonical now added, `public/privacy.html`); `/privacy` has no header rule.
- `WebSite.inLanguage` still lists both languages (`organicContent.js:36`) for one Hebrew-default URL; guide schemas reference `/#tour` from another document and carry no dates.
- The two food-tour guides are hreflang partners although the English one adds the language note; acceptable, but not a literal translation.

### N-8 [P3] The H1 is a slogan (accepted decision)

`review-triage.md` F2 records the decision to keep the original hero slogan as the H1 in both states. Parity is achieved and tested; the target phrase sits in the title and H2. Whether a keyworded H1 would do better is an experiment for Search Console data, not something I can assert.

## Conditions attached to the GO

The GO means the local code and its local evidence are coherent and safe to carry forward. It is conditional on:

1. The reported 183 and 108 test passes being reproducible from the frozen hashes (the logs exist and are consistent; I did not run them).
2. N-1: correct the demo-isolation claim, or remove the noscript link.
3. Not treating any of the local lab numbers as evidence of a performance gain.

Owner questions that do not block local code but should be answered before the guides go public: the real meeting-point rule, whether tours run in English, and acceptance of N-3.

## Limits that stay open (publication and ranking, separate from the code verdict)

- No publication decision is requested or implied; nothing was deployed.
- Real Hosting behavior (redirects, rewrites, headers, query handling) is unverified (N-4).
- Checkout was not exercised end to end; the evidence blocks external requests and records "no checkout transaction" (`candidate-browser.json`).
- No Search Console, Bing, Google Business Profile or index inspection, no field Core Web Vitals, no fixed AI-query observations. Those start after any publication, per `plan.md`.
- Search position, traffic and citations are unknowable from this review. A higher readiness score does not predict them.

## Readiness scores (reviewer judgment, skill rubric)

Same rubric and weights as `scoring.md` (the skill's defaults); both columns use the same evidence rules. These are not Google, Lighthouse or AI-platform scores and not a ranking forecast.

| SEO category | Max | Baseline: mine | Baseline: `scoring.md` | Candidate: mine | Candidate: `scoring.md` |
|---|---:|---:|---:|---:|---:|
| Discovery and indexability | 25 | 14 | 16 | 21 | 23 |
| Page metadata and semantics | 20 | 8 | 10 | 17 | 19 |
| Content and internal navigation | 25 | 13 | 15 | 17 | 22 |
| Technical experience | 15 | 9 | 9 | 8 | 9 |
| Authority and measurement | 15 | 5 | 5 | 5 | 5 |
| **SEO total** | **100** | **49** | **55** | **68** | **78** |

| AEO category | Max | Baseline: mine | Baseline: `scoring.md` | Candidate: mine | Candidate: `scoring.md` |
|---|---:|---:|---:|---:|---:|
| Service and entity clarity | 20 | 11 | 14 | 17 | 19 |
| Accurate answers | 20 | 13 | 14 | 17 | 18 |
| Extractable and discoverable text | 25 | 6 | 7 | 18 | 22 |
| Structured relationships | 15 | 0 | 0 | 11 | 13 |
| Trust and external corroboration | 10 | 3 | 4 | 3 | 4 |
| Observed AI visibility | 10 | 0 | 0 | 0 | 0 |
| **AEO total** | **100** | **33** | **39** | **66** | **76** |

Where and why I differ from `scoring.md`:

- **Baseline, lower by 2 to 3 points in several lines.** The live raw HTML had an empty root, a generic title and description identical across four routes, no schema and no share image (`baseline-http.json`, `baseline-home.html`); I credit the rendered FAQ and links but not as fully as `scoring.md` does. This lowers my baseline SEO total by 6 and AEO by 6.
- **Content and navigation (candidate 17 versus 22).** `scoring.md` itself notes there is no new original material; with 196 to 259 unique words per guide and no first-hand detail, 22 of 25 is generous.
- **Discovery (21 versus 23) and metadata (17 versus 19).** Real Hosting is unverified, indexing is unknown, the home stays a single URL, and the metadata keeps a both-language `inLanguage` and a keyword-light H1.
- **Technical (8 versus 9).** CLS and contrast are fixed and guides score 100 locally, but the home's compressed local lab result (performance 53, LCP 4.8 s) sits below the live baseline and is unexplained (N-2).
- **Extractable text (18 versus 22), structured data (11 versus 13), clarity (17 versus 19), accurate answers (17 versus 18).** Answers live in the FAQ rather than concise per-topic blocks; guide schemas are minimal; the Organization name is not independently confirmed here.
- **Same as `scoring.md`:** authority (5), AI visibility (0), and technical at baseline (9).

Net change: mine **+19 (SEO) and +33 (AEO)**; `scoring.md` **+23 and +37**. The direction agrees; the size is smaller in my scoring. Reported separately, as the skill requires: **live-site score** is the baseline columns (the live site is unchanged by this work); **local-candidate score** is the candidate columns; **publication status** is not published; **actual ranking and traffic** are not measured.

## Personal skill `organic-growth-audit` (final check)

`SKILL.md:31` now requires the fresh-storage locale matrix with raw-versus-rendered comparison, rebuild and regenerate after the final edit, labelling older evidence stale, recording the round number and source hashes, comparing Lighthouse only under equivalent conditions, and marking documentation claims unverified when access is prohibited. These cover the gaps I raised in round 2 and match how this candidate was finally verified. The permission rules (no outreach, listings or publication without authorization) are consistent with `plan.md:22` and your local-review policy. I found no claim in the skill that this candidate contradicts.
