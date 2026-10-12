> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Hostile source review: SEO / AEO local candidate (read only)

Reviewer: Sonnet 5.5 (High), local Claude Code Desktop session. Date: 2026-10-10. This is the second review round (plan review, then this source review); the skill's three-round cap leaves one.
Reviewed: `docs/seo/review-package.md`, the current source named in it, the candidate evidence files (`candidate-browser.json`, `verified-booking.json`, `verified-inquiry.json`, both Lighthouse JSON files, the three screenshots, `audit-log.md`, `skills-discovery.md`) and the personal skill `C:/Users/User/.codex/skills/organic-growth-audit` (`SKILL.md`, `references/scoring-and-measurement.md`, `agents/openai.yaml`).
Nothing was edited, built, deployed or sent anywhere. No network or provider call was made, and I ran no test runner (Vitest writes a temp config into the repo). The only file written is this one. Earlier plan-review findings are cited as "plan F#" (see `sonnet-plan-review.md`).

Evidence labels: **observed** (I read or ran it), **documented**, **hypothesis**, **unknown**.

## Verdicts

| Question | Verdict |
|---|---|
| Local code | **HOLD.** Seven P1 findings remain (below). The base structure is sound and several earlier findings are fixed. |
| Deployment | **Not assessed and not authorized.** Nothing here deploys anything. Do not publish until the P1 items close and the evidence is rebuilt (P1-6). |
| Indexing | **Unknown.** Nothing is submitted or crawled. Whether Google indexes the Hebrew or the English render of `/` is unresolved (P1-1). |
| Real ranking and traffic | **No data, no claim.** No Search Console, no queries, no impressions. The scores below are controllable readiness only. |

## What changed since the plan review

Fixed in the candidate, and credited:

- **Preproduction metadata (plan F15):** `routeMetadata.js:14` now derives `isPreprod` from `import.meta.env.MODE`; tested at `tests/ui/organic-seo.test.js:49-55`.
- **Direct `.html` shells (plan F9):** `firebase.hosting.booking.json` now 301-redirects `/terms.html`, `/booking.html`, `/confirmation.html` and `/manage-bookings.html` to the clean routes, and `/guides/**` carries a CSP (`script-src 'none'`, `connect-src 'none'`, `form-action 'none'`). The inquiry config redirects three of the four (P2-5). Redirect-before-static-file priority is **documented** in Firebase's hosting priority order (from memory; not re-fetched, no network), and **unverified** under real Hosting because the candidate check used a "local Hosting approximation" (`candidate-browser.json:154`).
- **Build paths:** `organic-html.mjs:6,11,13` now uses `fileURLToPath` and `path.join` (the Vitest path problem recorded at `audit-log.md:11`).
- **Contrast:** `organic-seo.css:9` scopes dark text and brown links to `.target-site`. Source only; not yet reflected in any evidence (P1-6).
- **Scope hygiene:** private shells carry no schema or canonical (`build-organic-pages.mjs:54,58`), the demo build is untouched (`organic-seo.test.js:50`), and hostile FAQ text is serialized safely (`:56-64`).

Not fixed, unchanged since the plan review: plan F1, F2, F3, F4, F5, F6, F7, F8, F10, F11, F12, F13, F14, F16. Details follow, re-verified against the current files.

## P1: must fix before local GO

### P1-1. Hebrew home can render as English on the canonical URL (plan F1, unchanged)

- **Where:** `src/inquiry-i18n.js:47-49` (language is `he` only if `navigator.language` starts with `he`, otherwise `en`; `localStorage` overrides). `src/utils/routeMetadata.js:29,36,42` follow that language. `src/booking-main.jsx:10` uses `createRoot`, so the static Hebrew root is discarded.
- **Evidence (observed, just re-run on current `dist-booking` and `dist-inquiry`, local server, external network blocked):**

| State | Title | `html lang` | H1 |
|---|---|---|---|
| JS disabled | סיור קולינרי בבני ברק עם חיליק רוזנברג | he | same as title |
| `he-IL` | חיליק רוזנברג \| סיורים קולינריים בבני ברק | he | לחוות את החרדים כפי שלא הכרתם |
| `en-US`, no stored language | Chilik Rosenberg \| Culinary Tours in Bnei Brak | en | Experience the Haredi world as you never have before |

All three share canonical `https://www.chilik-tours.com/`. The candidate's own check recorded the `en` row only after setting a language (`candidate-browser.json:97-103`), so it did not exercise the default.
- **Unknown:** Googlebot's actual locale. This is a hypothesis until a Search Console live URL Inspection shows the rendered HTML.
- **Skill link:** `SKILL.md:23` says a language toggle at one URL is not a second indexable translation, and `organicContent.js:36` still declares `WebSite.inLanguage: ['he','en']` for it (P2-4).
- **Minimal fix:** make the root URL Hebrew regardless of `navigator.language` (language only by explicit user choice), and add a test that renders `/` under `en-US` and `he-IL`.

### P1-2. Raw and rendered head and H1 disagree, and the check marks it "passed" (plan F2, unchanged)

- **Where:** raw values `organicContent.js:8-9`; rendered values from `src/locales/he.json:584-587` through `routeMetadata.js:17-19`; robots at `routeMetadata.js:25`; the keyword H1 survives only as an H2 (`TourOverview.jsx:8`).
- **Evidence (observed):**
  - Title and description differ between raw and rendered Hebrew (table above; description "…פרטי הסיור, מחיר ושאלות נפוצות" vs "…ובחירת תאריך").
  - Robots: raw `index, follow, max-image-preview:large`, rendered `index, follow`; the large-preview directive is dropped.
  - `candidate-browser.json:84` and `:92` record the two different Hebrew titles inside a result file whose status is `"passed"`; the check asserts FAQ parity and no overflow only.
- **Minimal fix:** one source for home title and description used by both the build plugin and `applyRouteMetadata`; keep the complete robots value; add a raw-versus-rendered head assertion to the browser check and to `organic-seo.test.js`.

### P1-3. The page contradicts itself about when the meeting point is given (plan F3, unchanged)

- **Where:** `organicContent.js:12,23` and `build-organic-pages.mjs:15,21,30` say "after booking confirmation"; `bookingFaqCopy.js:6` (from `apps/protected-booking/src/locales/he.json:481-483`) says "after registration closes".
- **Evidence (observed):** the built `dist-booking/index.html` contains both sentences. This directly contradicts the package invariant "initial raw content equals visible product facts" (`review-package.md:18`).
- **Minimal fix:** confirm the rule with Chilik; read the facts list, guides and FAQ from one string.

### P1-4. A credential is stronger than its source, and it feeds the schema (plan F7, unchanged)

- **Where:** `organicContent.js:10` ("בוגר ישיבת פוניבז׳", graduate) and `:34` (Person description); the source says he studied there (`src/locales/he.json:303,307`; English "studied at Ponevezh"). The yeshiva is spelled two ways in those lines.
- **Policy:** `SKILL.md:21` forbids inventing credentials; `plan.md:5` promises no invented details.
- **Minimal fix:** use the source wording and one spelling.

### P1-5. Guides and the inquiry edition's copy assume date selection exists (plan F4, unchanged)

- **Where:** `package.json:12` builds the same guides into `dist-inquiry`; the copy and CTA do not branch on mode (`build-organic-pages.mjs:16,22,29,45`; `organicContent.js:16,27`).
- **Evidence (observed):** each of the three `dist-inquiry/guides/*.html` contains a `/#date-selection` link. The inquiry edition's rendered meta description also says "ובחירת תאריך" / "upcoming dates" (`src/locales/he.json:586`).
- **Severity:** P1 while `build:inquiry` remains a release target; P2 if it is retired. The package does not say which.
- **Minimal fix:** per-edition guide copy and CTA, or build guides only for the booking edition.

### P1-6. The candidate evidence is older than the source it vouches for

- **Evidence (observed, file times 2026-10-10):** `dist-booking/index.html` 20:39, `dist-inquiry/index.html` 20:40, screenshots 20:42, `lighthouse-local-after.json` 20:44. Source edits after those: `organic-html.mjs` and both hosting configs 20:43, `organic-seo.css` 20:45 (the contrast repair), `audit-log.md` 20:45.
- **Consequences:**
  - `lighthouse-local-after.json` still shows `color-contrast` failing on 15 nodes, the first being `#tour-overview-title`, which the 20:45 CSS change was meant to fix.
  - `candidate-mobile-he.png` shows pale text on ivory (unreadable) from the same stale state.
  - `audit-log.md:16` itself says "Verify final build after visual contrast repair", still undone.
  - The 182 root tests recorded at `audit-log.md:15` conflict with your message that the root rerun is pending, so I treat them as **unverified**.
  - No checkout flow was exercised (`candidate-browser.json:154`); "date to booking to payment behavior preserved" is a **hypothesis** backed only by the 108 unit tests you report.
- **Minimal fix:** rebuild both editions, rerun all checks, and record the results with their times after the last source edit.

### P1-7. The English guide asserts a tour offer the owner has not confirmed (plan F8, unchanged)

- **Where:** `build-organic-pages.mjs:21`; target in `plan.md:16`.
- **Searched:** "english" and "אנגלית" in `src/locales/he.json` and `en.json`: nothing says the tour runs in English.
- **Minimal fix:** owner decision on the tour's languages before publishing the English guide.

### P1-8. Duplicated copy on every guide (plan F5, unchanged)

- **Where:** `build-organic-pages.mjs:45` writes `copy.intro`, then `overviewHtml()` (`organic-html.mjs:19`) writes it again; `:32` and `:34` reuse the home meta description.
- **Evidence (observed in build):** intro paragraph twice on each of the three guides; food guide and home page share one meta description string; each guide links to itself.
- **Minimal fix:** drop the repeated intro, give each guide its own description, and shrink the shared block to a link strip.

## P2: should fix

1. **Thin guides (plan F6).** The Hebrew food guide has four sections of 49, 48, 55 and 45 words, about 200 unique words (observed). `SKILL.md:20` warns against thin pages.
2. **Replacement flash and layout shift (plan F17, now observed).** `lighthouse-local-after.json` attributes a layout shift of 0.0467 to `body.booking-edition > div#root` (live baseline CLS 0). The no-JS screenshot is dark while the rendered page is ivory, so a theme flash is likely. Local versus live is not like-for-like (HTTP localhost versus HTTPS CDN), and the measurement is stale (P1-6). Candidate lab figures: performance 63, LCP 6.5 s, accessibility 95; live baseline 78, 2.8 s, 98.
3. **Hydration absent.** `booking-main.jsx:10` renders over the static root instead of hydrating it; the static fallback is Hebrew only (`organic-html.mjs:22`).
4. **Structured data (plan F11).** `organicContent.js:36` uses a descriptive page title as `WebSite.name` and declares two languages; `build-organic-pages.mjs:41` references `/#tour`, which resolves only in the home graph; no dates on guide schemas (`:40-43`).
5. **Hosting residue.** `dist-inquiry` ships `manage-bookings.html` (noindex meta present) with no redirect, rewrite or header rule in `firebase.hosting.inquiry.json`, and `verify-organic-release.mjs:11` skips it for inquiry. `privacy.html` has no canonical or robots tag and is served at both `/privacy` and `/privacy.html` (`public/privacy.html:3`). `/guides/**` has a CSP but no `Referrer-Policy`.
6. **Sitemap (plan F10).** No `lastmod`; `public/sitemap.xml` (9 lines) is still the stale two-URL source that the build overwrites (`build-organic-pages.mjs:63-64`); the raw `/terms` shell is about 40 words yet indexable.
7. **Verifier gaps.** `verify-organic-release.mjs:29-31` checks link targets but not hash anchors, redirects or headers; the Vitest file has no locale test and no raw-versus-rendered or facts-versus-FAQ assertion, which is why P1-1 to P1-3 pass. The three guides are verified only by the build script, not by the Vitest suite.
8. **Contact exposure (plan F12) and static CTA (plan F16).** The Gmail address is now in raw HTML and schema (`organic-html.mjs:24`, `organicContent.js:35`); the static CTA points to the noindex `/booking` stub (`organic-html.mjs:24`).
9. **Price repeated in four places.** `organicContent.js:12,23`, `build-organic-pages.mjs:16,22,28`, `bookingFaqCopy.js:5`, locales. One change would leave others stale.
10. **Baseline and plan gaps (plan F13, F14).** `baseline-browser.json` records no locale; `baseline-http.json` omits `/privacy`, `/manage-bookings`, `/admin` and apex or http redirects; no rubric existed before the changes (see scoring below).
11. **No `x-default` hreflang**, and the home page has no hreflang at all (acceptable while it is single-URL).

## Individual verdicts for the scoped changes in `review-package.md`

| Item | Verdict | Reason |
|---|---|---|
| `organicContent.js`, `bookingFaqCopy.js` | **HOLD** | P1-3, P1-4, P1-7; price duplicated (P2-9). |
| `TourOverview.jsx`, `organic-seo.css`, `InquiryApp.jsx` include | **GO, pending re-measure** | Content is accurate to its source; contrast fix exists but is not evidenced (P1-6); H1 downgrade (P1-2). |
| `routeMetadata.js` | **HOLD** | P1-1, P1-2; preprod fix and staging tests are good. |
| `booking-i18n.js` | **GO** | The shared FAQ source works as stated and the copy is unchanged (`:19`). |
| `scripts/organic-html.mjs` | **GO with P2** | Escaping and schema serialization are correct, noscript is simplified, the demo is untouched; static fallback is Hebrew only and not hydrated (P2-2, P2-3, P2-8). |
| `scripts/build-organic-pages.mjs` | **HOLD** | P1-5, P1-7, P1-8; thin copy (P2-1). |
| Hosting booking and inquiry configs | **GO with P2** | Redirect and guide-CSP fixes are real; residue in P2-5; behavior under real Hosting unverified. |
| `vite.config.js`, `package.json` | **GO** | Plugin and scripts wire correctly; the demo and default builds are unaffected. |
| `tests/ui/organic-seo.test.js`, `scripts/verify-organic-release.mjs` | **GO as far as they go, HOLD on coverage** | They assert real relationships (FAQ to schema, hreflang reciprocity, sitemap) but miss the locale, head-parity and facts consistency checks (P2-7). |
| Personal skill `organic-growth-audit` | **GO as a checklist, with additions below** | |

## Review of the personal skill

Strengths: it separates raw HTML from rendered DOM (`SKILL.md:13`), forbids inventing credentials, reviews, offers and volumes (`:21,25`), requires real language URLs before hreflang (`:23`), treats a missing check as not passed (`:33`), and its permission rules (no outreach or listings without authorization, `:39`) match `plan.md:22` and your local-review policy (`:31`). Its frontmatter is valid and `openai.yaml` makes no claims beyond that.

Gaps this review exposed (suggested text; I did not edit the skill):

1. **Locale matrix.** Add: "Render the page under a non-default `navigator.language` with no stored preference and compare title, H1, `lang`, description, robots and schema against the raw HTML." The candidate passed the skill's checks while P1-1 and P1-2 stood.
2. **Evidence freshness.** Add: "Every evidence artifact must be newer than the last edit to the code it covers; otherwise label it stale." (P1-6.)
3. **Like-for-like lab comparison.** Add: "Compare Lighthouse runs only with the same protocol, host class and server settings; otherwise record them as not comparable." (P2-2.)
4. **Round tracking.** Record the round number in the audit log; this is round two.
5. **Documentation checks need a channel.** `SKILL.md:16` requires verifying against primary documentation, which cannot be done under a no-network instruction; the skill should say to record the claim as documented-unverified.

## Readiness scores (skill rubric, reviewer judgment)

Rubric: the default weights in `references/scoring-and-measurement.md`, unchanged between the two columns. These measure controllable readiness. They are **not** a Google, Lighthouse or AI-platform score and say nothing about rank. No rubric or score was recorded before the changes (`audit-log.md` has none), so the baseline column is reconstructed from `baseline-*.json` and the live Lighthouse file.

| SEO category | Max | Baseline (live, pre-change) | Candidate (current source, builds 20:39 to 20:40) | Basis for candidate |
|---|---:|---:|---:|---|
| Discovery and indexability | 25 | 11 | 19 | Five sitemap URLs, linked guides, distinct terms canonical, private shells noindex, real 404; real-Hosting behavior and locale rendering unverified. |
| Page metadata and semantics | 20 | 7 | 12 | Per-route raw metadata, share tags, schema; raw and rendered differ and language flips. |
| Content and internal navigation | 25 | 10 | 15 | Static content and guides; thin, duplicated, one contradicted fact, unconfirmed English offer. |
| Technical experience | 15 | 9 | 8 | No-JS content now exists; lab figures are stale and not like-for-like. |
| Authority and measurement | 15 | 2 | 4 | Entity schema only; no Search Console, no external corroboration. |
| **SEO total** | **100** | **39** | **58** | |

| AEO category | Max | Baseline | Candidate | Basis for candidate |
|---|---:|---:|---:|---|
| Service and entity clarity | 20 | 8 | 14 | Provider, place and service in raw HTML and schema; credential overreach. |
| Accurate answers | 20 | 12 | 11 | Price, duration, timing present, but the meeting-point contradiction costs a point versus baseline. |
| Extractable and discoverable text | 25 | 5 | 15 | Raw text and linked guides; duplication and thinness. |
| Structured relationships | 15 | 0 | 9 | Parseable, FAQ identical to visible text, stable `@id`s; site-name and language issues. |
| Trust and external corroboration | 10 | 2 | 2 | Unchanged; nothing invented. |
| Observed AI visibility | 10 | 0 | 0 | No query set run; no credit. |
| **AEO total** | **100** | **27** | **51** | |

Reported separately, as the skill requires:

- **Live-site score:** the baseline column (the live site was not changed by this work).
- **Local-candidate score:** the candidate column; provisional, because the evidence is stale (P1-6).
- **Publication status:** not published, no publication decision requested.
- **Actual ranking and traffic:** none measured, none claimed. Lighthouse SEO is 100 on both live and local and gives no signal here (`audit-log.md:17` already says so).

## Minimal order of work

1. P1-1 and P1-2 (language default, one source for head values, parity tests), because they decide what Google can index.
2. P1-3, P1-4, P1-7: three questions for Chilik (meeting-point rule, "studied" versus "graduate", tour languages).
3. P1-5 and P1-8 (edition-aware guides, remove duplicated copy).
4. Rebuild, rerun the browser, Lighthouse and root tests, and record dated results (P1-6).
5. The P2 list.
