> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](../promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Round 3 (final) performance follow-up: hostile review

Reviewer: local Claude Code Desktop conversation (Sonnet 5.5 High). No Anthropic API, SDK or CLI substitute was used.
Mode: read-only. I edited no product source and did not deploy or write customer data. My only writes were scratch scripts outside the repo and this report.
Evidence labels: **observed** = I ran it on the frozen bytes, **reported** = read from the package's logs without re-running, **unknown**.

## 1. Verdict: NO-GO for publication

There is no P0. **One P1 remains open** and the required evidence is incomplete.

- **P1-R3-A (open):** saved-English visitors still get a layout shift of 0.136 on mobile and 0.139–0.189 on desktop (10 of 10 runs under real Slow-4G/4x-CPU throttling). Every one of these exceeds the 0.1 "good" bound.
  - The cause is no longer CSS. It is the Hebrew-to-English language flip.
  - The round-2 P1 was a CLS regression for saved-English visitors. Its CSS cause is removed, but the user-visible symptom is not closed, at a lower magnitude than round 2's 0.244 / 0.123.
- **Evidence still missing:**
  - Repeated PageSpeed (PSI) bound to this version: the newest `pagespeed-*` files date from 22:58–23:29, before `f1cc1f08294cd7dd`'s release.
  - A round-3 `repeat-view.json`: the file on disk is the round-2 one, naming the deleted loader and version `7c5cbf302c1e2a9d`.
  - The throttled-CTA live proof: only the local-server `cta-slow-round3.json` exists.
  - `measurement-binding.json`: still the round-2 file.
  - Final GO is blocked on these regardless of P1-R3-A.

What improved: the CSS dependency, the loader single point of failure, and the stale-critical-CSS risk are all gone (observed, section 3). The measured gain is real but smaller than the round-2 critical-CSS candidate. No 100 is claimed (section 6).

## 2. State binding (observed)

| Item | Result |
|---|---|
| `source-hashes.json` (`frozenAt` 2026-10-10T20:52:29Z) | 218/218 files recomputed, 0 mismatches, 0 missing. Skill files included |
| `build-manifest.json` (`builtAt` 20:52:32Z) | 94/94 files match hash and byte length against `dist-booking/` |
| Round-2 → round-3 manifest delta | `public-style-loader.js` removed; 9 hashed JS chunks replaced; changed non-JS: `index.html`, `terms/booking/confirmation/manage-bookings.html`. **All 52 media files byte-identical** |
| Source delta vs round 2 | `package.json`, `package-lock.json`, `build-organic-pages.mjs`, `inline-public-styles.mjs`, `verify-home-critical-css.cjs`, `verify-public-build-boundaries.mjs`, `NavigationContext.jsx`, `bookingIntent.js`, `navigation-cancel.test.jsx`; `public-style-loader.js` removed |
| Preview `f1cc1f08294cd7dd`, released 20:59:54Z | 89/94 manifest files served byte-identical. The 5 non-matches are the HTML aliases (`booking/confirmation/manage-bookings/terms.html` 301, `legacy-admin.html` 302), as expected |
| `/public-style-loader.js` on preview | 404 |
| `critical` dependency | gone from `package.json` and the lock. The word survives only in the script name `verify-home-critical-css.cjs` |

**Findings on the binding:**

- **P2-1.** `GET /.vite/manifest.json` returns **200** with the Vite chunk map on the preview channel. It is not in `build-manifest.json`. `firebase.hosting.booking.json` lists `"ignore": ["**/.*"]`, yet the file was deployed (`dist-booking/` holds 95 files; the deploy log says "found 95 files").
  - The request says 97 files and `frozen-binding.json` says `"fileCount": "97"`, against 94 in the manifest and 95 on disk. I cannot reconcile the 2-file gap without Hosting's file list.
  - If publication reuses this directory, an unfrozen build-internal file ships to production.
  - Repair: exclude it from the deployable directory, or hash it into the manifest. Reconcile 94 / 95 / 97 explicitly.
- **P3.** `dist-inquiry/` is not in the freeze. I checked its shells and gate behaviour (section 5) but its bytes are unbound.

## 3. Round-2 P1 and P2 dispositions

| Round-2 item | Round-3 status | Basis |
|---|---|---|
| **P1-A**: English critical-CSS CLS (0.244 / 0.123) | **Cause removed; symptom NOT closed → P1-R3-A below** | 0 CSS requests on `/` in HE and EN at 390 and 1440 (observed). With every `*.css` request aborted, 77 sampled elements show 0 geometry or style differences (4 language × viewport cases, motion reduced, noise floor 0; observed). Saved-English still shifts 0.136–0.189 (section 4) |
| Loader single point of failure | **Closed** | `public-style-loader.js` deleted; no `data-public-deferred`, no `media=print`; the inline `<style data-public-styles>` is 89 KB in `<head>`. Shells use plain `<link rel=stylesheet media=all>` |
| English-mobile booking focus unreliable | **Closed in my runs** | Section 5 |
| Gains not tied to critical CSS | **Re-measured honestly** | Section 6 |
| Borderline LCP 2.93 s | **Improved in lab** | Median LCP 2.23 s (HE), 2.46 s (EN) |
| Unrelated reasons for the `critical` dependency | **Closed** | dependency removed |
| New verification scripts not in the build chain | **Partly closed** | `verify-organic-release` now runs inside `build:booking` and `build:inquiry`. The browser verifiers remain manual (`verify:organic:browser`) |

## 4. P1-R3-A: saved-English language flip shifts layout

- **Severity:** P1. This is the same user-visible regression class as round 2 (CLS above 0.1 for saved-English visitors), with a different cause.
- **What happens:** `/` is a Hebrew SSR/prerender (`<html lang="he" dir="rtl">`). A visitor whose `localStorage.language` is `en` gets `createRoot` (client render), and the Hebrew DOM stays painted until the module runs. When it runs, the retained Hebrew nodes move: the hero text from x=207 to x=4, the menu button from x=16 to x=268, the nav from width 238 to 342. This is a mirror of RTL to LTR. Nodes appear as `n: null` in the shift sources because they are removed in the same commit.
- **Evidence (observed, Chrome 154, local copy of the frozen `dist-booking/`, CDP Slow 4G 1.6 Mbps / 150 ms + 4x CPU, 5 alternating rounds, no artificial delay):

| Saved language / viewport | CLS per run | Shift time |
|---|---|---|
| EN 390 | 0.136, 0.136, 0.136, 0.136, 0.136 | 2.9–3.5 s |
| EN 1440 | 0.1888, 0.1388, 0.1388, 0.1888, 0.1888 | 3.0–3.7 s (plus a 0.05 shift at about 1.3 s in 3 runs) |
| HE 390 | 0.0853, 0, 0, 0, 0 | pre-hydration (see P2-2) |
| HE 1440 | 0, 0, 0.05, 0.05, 0 | pre-hydration |

  A deterministic 2.5 s hold on the entry module reproduces 0.136 / 0.139 as well. One un-throttled local EN-1440 run showed 0.139 with no artificial delay, so this is not only a throttling artefact.
- **Why Lighthouse does not see it:** the retained series reports `cls: 0` for all 5 EN runs. Lighthouse (simulated throttling) takes CLS from an un-throttled trace, where hydration follows first paint within a few hundred ms. Real slow devices have the Hebrew page painted for 1–3 s before the flip. Field CWV is unmeasured, so this is a lab-risk finding, not a field number.
- **Likely cause (inference from code):** `src/i18n.js:63,70` and `src/App.jsx:53` set `document.documentElement.dir`. `src/i18n.js:70` runs at module evaluation, before React renders, so the old Hebrew nodes repaint in LTR for at least one frame. `mountPublicSite.jsx` only hydrates when the prerender language equals the saved one; otherwise it takes the plain `createRoot` path. I did not instrument which of these lines flips direction.
- **Minimal repair (any one):**
  1. Do not flip `dir`/`lang` at import time when `#root[data-prerender]` differs from the saved language. Flip them in the same commit as the English render (a layout effect), so the old nodes and the direction change land together.
  2. Wrap the mismatch render in `flushSync` and set `dir` immediately before it, so no frame paints between.
  3. Hide the pre-hydration Hebrew content for saved-English visitors. The only CSS-only variants are fragile; avoid them.
- **Acceptance test:** the same harness. Saved-EN at 390 and 1440 under CDP Slow 4G + 4x CPU (CLS total 0.1 or less in 5 consecutive runs), plus the Lighthouse series, plus the existing hydration proof.
- **UX note (P3, same root):** a saved-English visitor sees a Hebrew page for 1–3 s before English appears.

## 5. Other review dimensions

**Booking intent (observed, local server, Chrome 154; HE and EN × 390 and 1440).** The intent CTA locators were the visible `#date-selection` anchors.

| Case | Result |
|---|---|
| A. Click before hydration (entry module held 5 s) | The anchor works natively: the section scrolls to top 0 at scrollY 1504–1769. After hydration and picker mount the position drifts 24–110 px lower (P3). No errors, no focus theft |
| B. After hydration, picker chunk held 13 s | At about 1.5 s the page is already scrolled to the section (visibility fallback). At 10 s the helper gives up and sets `#date-selection`. After release `#inquiry-title` renders, no exceptions |
| C. Wheel during the wait | Position stays where the visitor put it; the picker renders later; no forced focus (HE and EN, mobile and desktop) |

- The package's `cta-slow-round3.json` (8 of 8 passed, local server, `elapsedMs` 1.8–4.2 s, cancellation by Escape) is consistent with this.
- I found no console error or `pageerror` in any HE/EN × mobile/desktop load of the frozen build.
- The 10 s wait plus cancellation order are correct by reading `src/navigation/NavigationContext.jsx` and `bookingIntent.js`: cancel handlers are installed before the wait, and `keydown` for Enter or Space on the initiator is exempt.

**Hydration and cache safety.**
- The async entry sits after `#root`, at the end of `<body>`, in all `index.html` outputs (same position in `dist-inquiry`). `modulepreload` carries `fetchpriority=low` and `crossorigin`, matching the script. I found no way for the module to run before `#root` exists.
- Hydration reuse (528/528 nodes in Hebrew), no-JS FAQ (12 answers visible) and the saved-English client-render path are consistent with `hydration-round3.json` (reported).
- Without JS the CTAs are plain `<a href="#date-selection">` anchors, so no dead click exists.

**Gates (observed, my own read-only re-implementation against the built files).**
- The 7 private/legal shells (`terms`, `booking`, `confirmation`, `manage-bookings` in booking mode; `terms`, `booking`, `confirmation` in inquiry mode) have no inline public styles, a `media=all` stylesheet link, no `async` module, no `fetchpriority=low`, and no `data-prerender`.
- `assertPublicInquiryHtml` accepts `dist-inquiry/index.html`. It rejects the actual demo, the demo with its isolation metas stripped, the demo with only the banner removed, and `dist-booking/index.html` used as the inquiry page. The injected-banner control is covered by `build-boundaries.json`.
- **P3.** `build-boundaries.json` is stamped 20:51:41Z, about 50 s before `build-manifest.json` (20:52:32Z). It ran against the previous build output. My independent run above covers the frozen state.

**Media preservation.** 52 media files (`media`, `tour-videos`, `hero-images`, `images`) are byte-identical between the round-2 and round-3 manifests (observed). The live tour-video bytes are unchanged from my round-2 check. I did not re-fetch them.

**Live state (observed over HTTP).** `https://www.chilik-tours.com/` still serves the old entry (`booking-index-Df7a72dH.js`), has no `data-public-styles`, and `/google5a2dfa5975623177.html` returns 404 there. Version `8e3909dab4d8fe4f` is therefore presumably unchanged, but I cannot read the live version id over HTTP.

**Verification-script quality.**
- **P2-3.** The package's "HE/EN full-style parity at six widths" (`styles-round3.json`, `verify-home-critical-css.cjs`) holds only `/assets/(booking|inquiry)-index-*.css`, but `/` now requests no stylesheet. The test passes trivially and cannot show that CSS is complete.
  - The meaningful evidence is the zero-request census plus my abort-all-CSS comparison above.
  - Rename or replace the script.
- **P2-4 (accessibility).** English Lighthouse accessibility is 96 in all 5 runs (Hebrew 100). The failing node is `p.target-videos__duration > span` in the tour-moments grid, 13 px `#6c6255` on `#272622`, contrast 2.53 against the required 4.5:1 (`--target-muted` in `src/site-design.css:6`). It is a small label, but it is a WCAG AA failure that appears in the English render only.

**P2-2 (residual Hebrew CLS under real throttling).** Under the same CDP throttling the Hebrew home showed non-zero CLS in 4 of 10 runs: desktop 0.05 at about 1.3 s (3 of 5), mobile 0.0853 at about 2.1 s (1 of 5).
- On the desktop attribution the whole app wrapper moved 72 px down while its height shrank by the same amount, at about the first-paint time, before the module could run.
- It is below 0.1 individually, but it contradicts "CLS 0" as a general claim, and the mobile case sits close to 0.1. I could not attribute the root cause; the retained Lighthouse CLS 0 is un-throttled-trace CLS.

## 6. Measurements (retained Lighthouse series, reported and recomputed)

Preview `f1cc1f08294cd7dd`, Lighthouse 13.5.0, HeadlessChrome 154, simulated Slow 4G / 4x CPU, 5 HE + 5 saved-EN alternating, fetch times 21:02:45Z–21:06Z. All 10 reports retained. SEO 69 comes from the deliberate preview-wide `noindex` and is not a product score.

| Run | Perf | LCP ms | FCP ms | TBT ms | CLS | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| he1 | 76 | 2411 | 1406 | 880 | 0 | 100 | 100 | 69 |
| en1 | 82 | 2461 | 1049 | 619 | 0 | 96 | 100 | 69 |
| he2 | 83 | 2231 | 1352 | 582 | 0 | 100 | 100 | 69 |
| en2 | 77 | 2235 | 1307 | 932 | 0 | 96 | 100 | 69 |
| he3 | 86 | 2228 | 1301 | 478 | 0 | 100 | 100 | 69 |
| en3 | 86 | 2303 | 1078 | 481 | 0 | 96 | 100 | 69 |
| he4 | 86 | 2233 | 1336 | 477 | 0 | 100 | 100 | 69 |
| en4 | 82 | 2507 | 1287 | 586 | 0 | 96 | 100 | 69 |
| he5 | 85 | 2228 | 1359 | 528 | 0 | 100 | 100 | 69 |
| en5 | 81 | 2508 | 1031 | 653 | 0 | 96 | 100 | 69 |

- **Medians:** HE performance **85** (range 76–86), LCP 2231 ms, FCP 1352 ms, TBT 528 ms. EN performance **82** (range 77–86), LCP 2461 ms, FCP 1078 ms, TBT 619 ms.
- **Compared with the round-2 critical-CSS candidate** (median 91, TBT 273 ms): this build is slower in the lab (HE −6 points, TBT about +255 ms). The round-2 candidate had the CLS defect above, so the comparison is a trade-off the owner chose, not a regression bug.
- **Compared with the round-2 live series** (median 75, LCP 2.93 s, TBT 817 ms): better, but measured at different times. There was no concurrent live baseline in round 3.
- **Host-load noise:** benchmark index ranges from 1031 to 2304, and he1/en2 are the weakest runs. Treat ±5 points as noise.
- **Remaining Lighthouse findings:** main-thread work 6.0–6.2 s and bootup 1.5 s (score 0), forced reflow about 49 ms (react-vendor), unused JS about 22 KiB, image delivery about 117 KiB. These are the cost of inlining 89 KB of CSS plus the app bundle on a 4x CPU.
- **Page weight (first runs):** HE 1.55 MB / 11 requests, EN 2.06 MB / 16 requests, versus 23 requests in the round-2 live baseline. HTML is 153,720 bytes raw, 24,632 brotli (round 2: 95,025 / 15,950). HTML stays `no-store` by design, so every repeat view pays about 25 KB.
- **Historical experiments (not candidate measurements):** the full-CSS experiment that reached 100 once then 98, and the async-body-end experiment at 96 (LCP 2705 / FCP 947 / TBT 0 / CLS 0, report `w1p8h5kmjk`), are preserved as history. **No 100 is claimed for this build, and none can be.**
- **Not measured:** field CWV, rankings, traffic, AI citations, and the production (indexable) home. Preview SEO 69 reflects intentional `noindex`.

## 7. Rubric re-grade (readiness, not rank)

| Area | Round 2 | Round 3 | Basis |
|---|---|---|---|
| Broad SEO | 75 | **75** | CSS/loader risks closed; offset by the open P1-R3-A (saved-English CLS), the unfrozen `.vite/manifest.json`, and missing PSI/repeat-view binding. Press evidence, guides, hreflang, FAQ/schema parity are unchanged from round 2 |
| AEO | 71 | **71** | no change; nothing in this round touched answer content. Long guides, shared visible/schema FAQ and skill evidence stay as accepted in round 2 |

These are evidence-based readiness grades, not rank, traffic or citation claims.

## 8. Open items

**P0:** none.

**P1**
- **P1-R3-A.** Saved-English language flip: CLS 0.136–0.189 under real throttling. Repair and acceptance test in section 4.

**P2**
- **P2-1.** Unfrozen `/.vite/manifest.json` served (200); the 94 / 95 / 97 file counts do not reconcile.
- **P2-2.** Intermittent Hebrew CLS 0.05–0.085 under real throttling, not attributed.
- **P2-3.** The "full-style parity" gate is vacuous now; rename or replace it, and add a request-census assertion (zero stylesheet requests on `/`) to the build chain.
- **P2-4.** English-only contrast failure (2.53) on the tour-moments duration labels; English accessibility is 96.
- **P2-5.** Missing evidence bound to this version: repeated PSI, round-3 repeat-view, throttled-CTA proof on the real Hosting preview, refreshed `measurement-binding.json`.

**P3:** scroll drift of 24–110 px after hydration when the CTA was clicked before hydration; Hebrew page visible for 1–3 s for saved-English visitors; `dist-inquiry/` unbound; `build-boundaries.json` predates the final build; repeat views pay about 25 KB of HTML (accepted).

## 9. Final answer

**NO-GO.** Publication needs, at minimum: P1-R3-A fixed and re-frozen, the P2-1 binding reconciled, and the P2-5 evidence written for the new version. Because the fix changes the entry bundle, the source freeze, build manifest, preview version and Lighthouse series all need to be redone. This was the third and last bounded review in this family, so any further round needs an explicit new request from the owner.

## 10. Exact bindings used

- `source-hashes.json` sha256 `e064ec89bfba2d6536738f49060fbccfda036020a1256dfcce57eff8fde5543f` (218 files)
- `build-manifest.json` sha256 `b16cd555ccb87bc2f50882ee159dfcab2a1e4178ced48965bddb149e5e3fb6e9` (94 files)
- `frozen-binding.json` sha256 `6dd33084217239bb4cf62713be3e677739de42f188866b0fe8b04e0d9ebe6b26`
- `lighthouse-round3-series.json` sha256 `4e9de5a5be0cbcbbce2e8d1f8c531c96e98186ebe025d221e9454a5a392a1d13`
- `dist-booking/index.html` sha256 `c19414d601c26a56f1f8af5e7c1610103aeab8716f30cd5a40905ac9b921c21d` (same as served by the preview)
- Entry `assets/booking-index-D63aux39.js` sha256 `5b4fdddcb9cba96148967aeac5f1b574d8e858960779ab46ada5b19e11d2fb7b`; stylesheet `assets/booking-index-CzU0DfZa.css` sha256 `4f5e9e433d24d0ada44646a7120617dbbc71deb1f6f7dc86e47f384975ed66ea` (private shells only)
- Preview version `projects/hilik-site/sites/hilik-site/versions/f1cc1f08294cd7dd` (released 2026-10-10T20:59:54Z), channel URL `https://hilik-site--seo-aeo-oct10-t8bg3pcs.web.app`
- Lighthouse 13.5.0 / Chrome 154.0.0.0, Playwright 1.63.0 with the installed Chrome 154 for my own runs
- My scratch harnesses (outside the repo, not retained as evidence): hash recompute, request census and CSS-abort comparison, CDP-throttled CLS runs, attribution run, CTA matrix, gate re-implementation, HTTP byte check
