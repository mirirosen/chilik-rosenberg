> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](../promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Locale-closure review (continuation after round 3 NO-GO)

Reviewer: local Claude Code Desktop conversation (Sonnet 5.5 High). No Anthropic API, SDK or CLI fallback was used.
Mode: read-only. I edited no product source, did not deploy, and wrote no customer data. My only writes were scratch scripts outside the repo and this report.
Evidence labels: **observed** = I ran it on the frozen bytes or the real preview, **reported** = read from the package's logs or JSON.

## 1. Verdict

**No open P0. No open P1. GO for publishing the frozen build to production (hosting only), subject to the preconditions in section 9.**

- The saved-English CLS P1 from round 3 is **closed**. I reproduced the original conditions under real throttling and every run is at or below 0.1.
- One P2 residual remains: an intermittent shift of `#root` in the Hebrew page (up to 0.087), not a locale defect (section 4). Google's own PageSpeed lab report attributes it to the same element.
- This is not a 100 and not a rank, field or citation claim. See sections 5 to 7 for what the numbers support.

## 2. State binding (observed)

| Item | Result |
|---|---|
| `source-hashes.json` (219 files, incl. skill files) | 219/219 recomputed, 0 mismatch, 0 missing. sha256 `fc6b08e320958ffc772574c65aba0ec3a2aff0d7d2c53e251e16d6d01afb1c55` |
| `build-manifest.json` (94 files) | 94/94 match hash and byte length in `dist-booking/`. **No extra file in the directory** (no `.vite/`). sha256 `50432fd09354300b9db76f7a5fc560c082eb729b6fc98a30c438cdcea26ee12e` |
| Preview `8339f8bf319bc237` (released 2026-10-11T03:38:24.935Z) | 89 of 94 manifest files served byte-identical over HTTP. The other 5 are the `.html` aliases (`booking`, `confirmation`, `manage-bookings`, `terms` → 301; `legacy-admin` → 302) |
| `/.vite/manifest.json` and `/public-style-loader.js` on the preview | both 404 (round 3's P2-1 closed) |
| File count 96 | `frozen-binding.json` lists 96 paths = the 94 manifest paths + `/__/firebase/init.js` + `/__/firebase/init.json`; no manifest path missing from it. I could confirm `init.json` serves 200; the Hosting file list itself is reported. The deploy log says "found 94 files" |
| `measurement-binding.json` | all 16 listed artifact hashes recomputed and equal |
| `inquiry-delivery-manifest.json` (82 files) | 82/82 match `dist-inquiry/` |
| Production | unchanged: `www.chilik-tours.com` still serves `booking-index-Df7a72dH.js`, no `data-public-styles`, GSC file 404. `production-rollback.json` records live release `8e3909dab4d8fe4f` |

Source delta since round 3 (reviewed): `src/inquiry-i18n.js`, `src/utils/mountPublicSite.jsx`, new `tests/ui/public-language-mount.test.jsx`, `src/site-design.css`, `scripts/{build-organic-pages,inline-public-styles,package-booking-release,package-inquiry-release,verify-home-critical-css,verify-organic-release,verify-public-build-boundaries}`, and the skill reference file. All 52 media files are byte-identical to round 3.

## 3. Original P1 (saved-English layout shift): independent reproduction

**Method (observed).** Chrome 154 (Playwright 1.63) against a local server of the frozen `dist-booking/`, Brotli on, CDP `Network.emulateNetworkConditions` at 1.6 Mbps / 150 ms and `Emulation.setCPUThrottlingRate` 4. External origins blocked. 5 runs each for HE and saved-EN at 390 and 1440 px (20 runs). Each run waits 9 s and sums all unexpected layout shifts (a conservative upper bound).

| Saved language / width | Round 3 (same harness) | This build, my 5 runs |
|---|---|---|
| EN 390 | 0.136 × 5 | **0, 0, 0, 0, 0** |
| EN 1440 | 0.139–0.189 | **0.05, 0, 0, 0, 0** |
| HE 390 | 0.085, 0, 0, 0, 0 | 0, 0, 0, 0, 0 |
| HE 1440 | 0, 0, 0.05, 0.05, 0 | 0.05, 0, 0, 0, 0 |

The package's `delivery-cls.json` (reported, 20 real-throttled runs on the actual Hosting preview) has maximum 0.08 (EN 390, one run) and 0.05 (HE 1440, one run), all other runs 0. In every run `lang`/`dir` end as `en`/`ltr` for saved English. **Every saved-English run in both data sets is at or below 0.1.**

**Why it works (code, observed).**
- `src/inquiry-i18n.js` applies `lang`/`dir` at import time only when `#root[data-prerender]` is absent or equals the saved language. For a saved language that differs from the Hebrew prerender it waits.
- `src/utils/mountPublicSite.jsx` then sets `lang` and `dir` and calls `client.render` inside one `flushSync`, so the old Hebrew nodes are replaced in the same task as the direction change. Matching Hebrew still goes through `hydrateRoot` (528/528 nodes reused, reported and consistent with `hydration-delivery.json`).
- `tests/ui/public-language-mount.test.jsx` asserts that, inside the English layout effect, the Hebrew DOM is already gone and `dir` is `ltr`. It checks the commit order, not paint, so the real-throttling runs above are the actual acceptance evidence.
- I found no flip of `dir` before the English commit left in the booking or inquiry public path. `flushSync` runs from module top level (not inside a React lifecycle), which is the supported case.

**Remaining UX note (P3).** A saved-English visitor still sees the Hebrew prerender for the interval before the module runs, then the English page; it no longer mirrors or shifts.

## 4. Residual Hebrew shift (P2-1)

- Frequency: package 1 of 20 real-throttled runs (0.05, HE 1440, at about 1.6 s); mine 1 of 20 (0.05 at 0.9 s) plus 1 of 8 in a dedicated HE-desktop attribution run; Google PSI run 1 CLS 0 and run 2 **0.087**.
- Where: both my attribution and PageSpeed's "Layout shift culprits" name `div#root` (`body.booking-edition > div#root`). The shift is `#root` moving down 72 px at about first paint. At that moment `document.readyState` was still `loading` and no web font had loaded, so it is not the hydration or class-toggle path; `booking-edition` is added later in `src/BookingSiteApp.jsx:65`.
- I could not find a CSS rule that explains a 72 px offset (no body, `#root`, `noscript` or `.booking-edition` rule in the inline CSS). Cause **unattributed**.
- Severity: P2. Each observed value is below 0.1, but 0.087 is close to the bound. It cannot be called "CLS 0"; use "0 in most runs, up to 0.087 in a real lab run".
- Suggested next step (non-blocking): record a trace with Chrome's layout-shift root-cause attribution on the Hebrew home, or hold the first paint until `#root` is stable.

## 5. Other review dimensions

**Complete-CSS gate (code and evidence).** `verify-home-critical-css.cjs` now checks, per language and width: inline bytes equal the bundled CSS, zero initial public-CSS requests, geometry and style parity against a loaded external reference, and a missing-CSS negative control that must change the sampled geometry. Round 3's vacuous test is replaced. `styles-delivery.json` (reported): 12 of 12 cases pass. In addition (observed): my request census shows 0 stylesheet requests on `/` (HE and EN, 390 and 1440); aborting every `*.css` request gives 0 geometry or style differences against a plain load across 77 sampled elements (noise floor 0, motion reduced). I did not rerun the package's negative control itself.

**Content-visibility change.** `src/site-design.css` keeps `content-visibility:auto` for two rules but no longer for the tour-video grid. English accessibility is 100 in all 5 local runs and in both Google runs. The prior contrast failure (2.53) is gone without a colour workaround; native lazy video is unchanged.

**CTA and cancellation (observed, local server).** Same 12-case matrix as round 3 (pre-hydration click, 13 s held picker chunk, wheel cancel; HE/EN × 390/1440): all pass, no page errors. A click before hydration scrolls natively; after 10 s the fallback sets `#date-selection`; wheel input prevents any later forced scroll or focus. The package's `cta-slow-delivery.json` (reported, real preview, 8 of 8) is consistent. Known P3: the section lands 24–110 px lower after the picker mounts when the CTA was clicked before hydration.

**Hydration and console.** No console error or page error in any HE/EN × mobile/desktop load of the frozen build (observed). Saved English deliberately client-renders and is the path that was repaired.

**Private shells and gates (observed, my read-only re-implementation).**
- Seven shells (booking mode: `terms`, `booking`, `confirmation`, `manage-bookings`; inquiry mode: `terms`, `booking`, `confirmation`): no inline public styles, `media=all` stylesheet link, no async module, no `fetchpriority=low`, no `data-prerender`, **0 image preloads**.
- `assertPublicInquiryHtml` accepts `dist-inquiry/index.html` and rejects the real demo, the demo with isolation metas stripped, the demo with only the banner removed, and the booking home used as an inquiry page.
- `build-booking-delivery-fixed.log` and `build-inquiry-delivery-fixed.log` are the accepted builds; I did not use the earlier failed booking build.

**Hero hints.** Exactly two `rel=preload as=image` hints on the booking and inquiry homes, with mutually exclusive media queries `(max-width:767px)` (phone poster) and `(min-width:768px)` (desktop poster). They match the `<picture>` sources. This is consistency with the existing hints; I attribute no speed gain to it.

**Canonical, robots, schema (observed).** Home: one canonical `https://www.chilik-tours.com/`, `robots: index, follow, max-image-preview:large`, one JSON-LD graph (Person, Organization, WebSite, WebPage, Service, FAQPage) with 12 FAQ questions, matching the 12 answers visible without JavaScript. No hreflang on the home (unchanged, accepted in earlier rounds). The preview `X-Robots-Tag: noindex` comes from the channel; `firebase.hosting.booking.json` sets that header only on the private routes (admin, booking, confirmation, manage-bookings), so it will not follow the files to production.

**Repeat view (reported).** HTML 24,596 bytes encoded on every visit (153,705 bytes decoded, `no-store` by design); the three scripts transfer 0 bytes on the second visit.

**Deployment scope.** `firebase.hosting.booking.json` is an untracked file in the working tree (`git status` shows `??`). Its `ignore` list already has `**/.*`; the deployable directory now has no dotfiles anyway.

## 6. Measurements (separated, nothing suppressed)

**Local Lighthouse 13.5.0**, preview `8339f8bf319bc237`, Chrome 154, simulated Slow 4G / 4x CPU, 5 HE + 5 saved-EN alternating, 03:40–03:44Z (reported file; recomputed by me):

| Run | Perf | LCP ms | FCP ms | TBT ms | CLS | A11y | Benchmark |
|---|---|---|---|---|---|---|---|
| he1 | 70 | 2739 | 1083 | 1397 | 0 | 100 | 1790 |
| en1 | 81 | 2848 | 1117 | 552 | 0 | 100 | 1367 |
| he2 | 93 | 2375 | 1225 | 254 | 0 | 100 | 1163 |
| en2 | 80 | 2458 | 1328 | 693 | 0 | 100 | 1104 |
| he3 | 93 | 2482 | 1384 | 231 | 0 | 100 | 1330 |
| en3 | 63 | 2961 | 1656 | 2408 | 0 | 100 | 1321 |
| he4 | 91 | 2454 | 1308 | 275 | 0 | 100 | 1404 |
| en4 | 85 | 2792 | 1054 | 425 | 0 | 100 | 1231 |
| he5 | 64 | 2596 | 1314 | 3155 | 0 | 100 | 1346 |
| en5 | 85 | 2528 | 1078 | 472 | 0 | 100 | 1241 |

- HE median **91** (range 64–93), TBT median 275 ms, LCP median 2482 ms. EN median **81** (range 63–85), TBT median 552 ms, LCP median 2792 ms.
- The two worst runs (he5 TBT 3155 ms, en3 TBT 2408 ms) are large main-thread outliers on a host the package says was running concurrent QA. They are retained, and the spread (64–93) shows that single lab runs of this page are not reliable.
- EN LCP is above 2.5 s in 4 of 5 runs, so the English median is in the "needs improvement" band.
- SEO 69 is the deliberate preview `noindex`.

**Google PageSpeed (cloud), same preview, mobile** (two runs; reported): 94 / 100 / 100 / 69 (LCP 3029 ms, FCP 1013 ms, TBT 3 ms, CLS 0; 06:39:58 local) and 93 / 100 / 100 / 69 (LCP 3001 ms, FCP 923 ms, TBT 0, CLS **0.087**; 06:42:13). The intermediate version `71e2a2e1d750ff40` scored 99 earlier; per `continuation-audit.md` that is not this candidate and I give it no weight. The two final cloud runs have LCP about 3.0 s, above the 2.5 s "good" bound.

**Not claimed.** 100 performance; field CWV; ranking, traffic, leads or AI citations; production SEO (not measured on an indexable build).

## 7. Rubric re-grade (readiness, not rank)

| Area | Round 3 | Now | Reason |
|---|---|---|---|
| Broad SEO | 75 | **76** | +1 for the technical sub-score: P1 closed with real-throttling evidence, build contents reconciled (94 + 2 managed), English accessibility 100, gates now meaningful. Content, entity and authority sub-scores unchanged; the residual `#root` shift and LCP above 2.5 s in lab keep the performance part from rising further |
| AEO | 71 | **71** | nothing in this round touched answer content, FAQ/schema parity or press evidence |

## 8. Open items

**P0:** none. **P1:** none.

**P2**
- **P2-1.** Intermittent `#root` shift in the Hebrew page (0.05–0.087, Google run 2 = 0.087), cause unattributed (section 4).
- **P2-2.** Lab LCP above 2.5 s in Google cloud runs (about 3.0 s) and in 4 of 5 local English runs; local variance 63–93 on a contended host. A post-publication measurement on the real hostname is needed before any performance claim.
- **P2-3.** Not covered by evidence: production-hostname behaviour (indexable build, real CDN caching of the `no-store` HTML) cannot be measured on a `noindex` preview.

**P3:** scroll drift of 24–110 px after hydration when the CTA is clicked before hydration; saved-English visitors briefly see the Hebrew prerender before English; repeat views pay about 24.6 KB of HTML (accepted); `build-boundaries`-style gates remain manual npm scripts rather than CI.

## 9. GO preconditions (hosting-only publication)

1. Immediately before publishing, recompute `source-hashes.json` and `build-manifest.json` and confirm `dist-booking/` still contains exactly the 94 listed files (the current state, as of this review).
2. Publish only `hosting:hilik-site` from `dist-booking/` with `firebase.hosting.booking.json`; no functions, rules or other deploys. Keep `production-rollback.json` (live release `8e3909dab4d8fe4f`) as the rollback target.
3. After publication, on the production hostname: `/` returns 200 without `X-Robots-Tag: noindex`; the GSC verification file returns 200; `/admin`, `/booking`, `/confirmation`, `/manage-bookings` keep their noindex headers; run one saved-English CLS pass under real throttling and one Hebrew pass, and record the result without a 100 claim.
4. The owner has authorized publication; this review does not replace their decision on the P2 items above.

## 10. Exact bindings

- Preview version `projects/hilik-site/sites/hilik-site/versions/8339f8bf319bc237`, released 2026-10-11T03:38:24.935Z, `https://hilik-site--seo-aeo-oct10-t8bg3pcs.web.app`
- `source-hashes.json` `fc6b08e3…efc1b55`, `build-manifest.json` `50432fd0…ee12e`, `frozen-binding.json` `464cc9b1…74d7e`, `lighthouse-delivery-series.json` `4fe2cf95…7efc5`, `delivery-cls.json` `cd33aa37…f2e04` (full values in `measurement-binding.json` and recomputed above)
- `dist-booking/index.html` sha256 `ab0e5b999f6a07f8e5fa673c5efee36382671928464a400ed8cfb57e7a6835f9`; entry `assets/booking-index-sh8y-g7o.js` sha256 `f064d2dcecab2de6473f74050afe18b722699bdf0ec079304157cbddc2d80cc9`; stylesheet (private shells only) `assets/booking-index-DkCxker0.css` sha256 `8e0e121320bf67c9f43d5df403c2070c7aeec6746b23bf6ddd5546b2cac39ef8`
- Tools: Lighthouse 13.5.0 / Chrome 154 (package); Playwright 1.63.0 with installed Chrome 154 (mine)
- My harnesses (scratch, not retained as evidence): hash recompute, preview byte check, request census and CSS-abort comparison, CDP-throttled CLS runs, HE-desktop attribution, CTA matrix, shell and gate re-implementation
