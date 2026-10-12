> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](../promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Performance / SEO follow-up: hostile review, round 1 of at most 3

Reviewer: Sonnet 5.5 (High), the local Claude Code desktop conversation. No Anthropic API, SDK or CLI fallback. Date 2026-10-10, written 22:43 local.
Scope: `docs/seo/performance/review-request.md` (read twice, because it was updated at 22:27) and the sources and evidence it names. This is a **new** scope; nothing in the earlier three SEO reviews approves any of it.
Not done: no source edit, deploy, account action, Git write, build, test run, provider call or customer-data access. My browser measurements ran locally from a scratch folder, against `dist-booking` served on 127.0.0.1 with every non-local request blocked. The only file written is this one. The unrelated Stage 144 report was not touched.

Evidence labels: **observed** (I ran or read it), **reported** (stated in the package, not reproduced by me), **hypothesis**, **unknown**.

## Verdict

| Question | Verdict |
|---|---|
| Source, as of the 22:22:10 freeze | **Conditional GO.** No P0. Two P1 items stand (below), plus P2 items. |
| **Publication of the new candidate** | **Not GO.** The candidate is not frozen (it kept changing during this review), the evidence binds to superseded states, and one content paragraph is unsubstantiated. Round 2 needs a new freeze and fresh evidence. |
| Live site | Unchanged by this work. Live still serves `assets/booking-index-Df7a72dH.js`, with no inline stylesheet and no `data-prerender`; `/google5a2dfa5975623177.html` returns 404 (all observed with GET). |
| Score of 100 | **Not awarded.** Lighthouse and PageSpeed lab figures are not an SEO or AEO score, and there is no field, ranking, traffic or citation data. |

## What state I reviewed (the candidate moved)

| State | When (local) | What I observed |
|---|---|---|
| **F1: the 104-file freeze** | 22:22:10 | I recomputed SHA-256 for all 104 files: **104 of 104 matched**, none modified after the freeze (checked before 22:25). The 94 deployable files in `dist-booking` matched `build-manifest.json` (0 mismatches, 0 missing; the only extra file is the hidden `.vite/manifest.json`). |
| Poster-inline experiment | 22:25 to 22:31 | `Hero.jsx` (phone poster imported, later `decoding="sync"`), `vite.config.js` (`assetsInlineLimit`), `prerender-public-home.mjs` and `verify-home-hydration.cjs` changed after the freeze, with new builds, tests, a preview redeploy at 22:28 and logs. |
| Reverted | by 22:38 | A hash re-check showed those four files **match the freeze again**, and the built home HTML has no inline poster. |
| Hydration-mount experiment | 22:36:22 | `src/utils/mountPublicSite.jsx` now differs from the freeze (hydration wrapped in `startTransition`). No evidence file for it exists. |
| Build artifacts | continuous | `dist-booking/index.html` was rewritten at least five times while I worked (162,458 / 171,496 / 162,474 / 144,482 / 153,504 bytes seen). The frozen build no longer exists: 30 of its 94 files differ or are missing now. |

So: **hash-bound = F1 only.** Every browser number below is labelled with the build it came from. Where I could not pin the build, I say so.

## Verdict per change family

| Family | Verdict | Basis |
|---|---|---|
| Prerender plus hydration (`render-public-home.jsx`, `prerender-public-home.mjs`, `mountPublicSite.jsx`, entries, SSR guards) | **Conditional GO** | Observed in installed Chrome 154: **526 of 528 static nodes reused, 0 console errors or warnings**; saved English renders client-side (their `hydration-*.json`); no-JS shows all 12 FAQ answers (reported). Open: P2-1, P2-2. |
| Per-section Suspense and `content-visibility` | **Conditional GO** | Sections and hash targets exist; heading order has no level skips (observed); scroll-time CLS 0 to 0.006 in 3 runs each (mobile and desktop). Gaps in the navigation matrix (P2-6). |
| Lossless portrait WebP | **GO** | I decoded both files with FFmpeg to RGBA: 192,888 pixels, **0 differing** (alpha and RGB, transparent pixels included). 184,571 to 117,264 bytes. The original PNG is retained. |
| Intro captions H3 to H2 | **GO** | Home heading sequence has no skips (observed). Lighthouse accessibility 100 (reported in their files). |
| Gallery video posters `loading="lazy"` | **Conditional GO** | Effective only in current Chrome; inert elsewhere; harmless (P2-3). |
| Inline full CSS (`inline-public-styles.mjs`) | **Conditional GO** | Inlined, no `<link rel="stylesheet">` left on the home page, `url()` rebasing guarded (`:22-24`). Costs: P2-4, P2-2. |
| Packager gate (`package-inquiry-release.mjs`) | **Conditional GO** | Works on real HTML (below); no regression test (P2-5). |
| Fetch-priority hint | **Reverted, accepted** | No `fetchpriority="low"` anywhere in the built HTML (observed); only the two pre-existing `fetchpriority="high"` image preloads remain. Failed runs 79 and 60 are retained, as they should be. |
| Guides and GSC file | **HOLD on the press paragraph; rest conditional GO** | P1-B. FAQ and schema match in all six built guide pages. The GSC file is a 53-byte standard-format file, present in `dist-booking`, not in the sitemap; authenticity itself I cannot verify. |
| Personal skill | **GO** | `SKILL.md:31` contains the claimed performance, SSR, noscript, decoded-pixel and navigation checks and forbids manufacturing a 100. |

## Findings

No P0 found.

### P1-A. The candidate is not frozen, and the evidence binds to states that no longer exist

- **Observed:** F1 was superseded within minutes (table above). The 98 PageSpeed result is a screenshot of the PageSpeed web UI, dated 22:22:16, URL `hilik-site--seo-aeo-oct10-t8bg3pcs.web.app`, mobile: Performance 98, Accessibility 100, Best Practices 100, SEO 69 (expected: the preview serves `noindex`), field data "no data". That time matches the selected build deployed to the channel at 22:21:46, i.e. the frozen candidate. But the **same channel was redeployed at 22:28** (`preview-poster-deploy.log`), so the result cannot be reproduced against the channel's current content. The `.txt` beside the image is only an accessibility-tree diff with no numbers.
- **Claim to correct:** the request says "all JS edits precede latest root run". `root-tests-inline-final.log` started 22:15:48; `scripts/inline-public-styles.mjs` (22:16:20), `prerender-public-home.mjs` and `build-organic-pages.mjs` (22:19:55) were edited after it, and later `Hero.jsx`, `vite.config.js` and `mountPublicSite.jsx` too. The final `root-tests-poster-final.log` (183 of 183, started 22:27:32) predates the last `Hero.jsx` edit (22:31:41). Test counts are **reported**; I did not run them. Also: no test file imports `prerender-public-home`, `inline-public-styles`, `build-organic-pages`, `package-inquiry-release` or `mountPublicSite` (grep, observed), so the unit suite does not cover any of these edits.
- **Required for round 2:** stop editing; re-freeze after the last edit (source hashes, dist hashes, preview version id); rerun the test, build, hydration, navigation and Hosting matrices on that exact state; store the PageSpeed run with its URL and time and the build it measured.

### P1-B. The press-attribution paragraph is not substantiated by anything in the repo

- **Where:** `scripts/build-organic-pages.mjs:49` (`coverage`), rendered in both food guides.
- **Observed:** the repo's own data holds only the Mako URL, with no date or description (`src/data/content.js:107-111`). The guide adds "March 2024", "Thursday-night food tour" (Hebrew "ליל שישי"), a second article at `www.yuviyam.com/post/bnei-brak` that appears nowhere else in the repo, and a Hebrew sentence that gives a named third party a grammatical gender ("כתבה"). `audit-log.md` calls this "verified press attribution", but no stored evidence exists (no retrieved date, title or quote). I could not fetch the articles (no network), so the claims are **unverified**, not wrong.
- **Required:** store a short evidence note per source (retrieval date, headline, publication date, the sentence that supports the description), or remove the paragraph. Use gender-neutral wording for a named person unless the person's own page states otherwise.

### P2 findings

1. **P2-1. `startTransition(hydrateRoot)` has no evidence and no test** (`src/utils/mountPublicSite.jsx:12`, edited 22:36:22; no `docs/seo/performance` file mentions it). React's event replay covers dehydrated Suspense boundaries, while the header, hero and booking picker sit outside them. **Observed, current build, Chrome 154, header menu button clicked after React created the root but before the button was hydrated (hydrated-at-click false in 5 of 6 trials): the menu opened in 6 of 6.** The unhydrated window was about 0 ms at normal speed, 185 to 325 ms at 4x CPU throttle and 365 to 470 ms at 6x. That is encouraging but covers one control and has no baseline. Required: a lost-click and INP check across header menu, hero pause and play, CTA and FAQ under throttle, versus the non-transition mount.
2. **P2-2. Private and legal shells inherit `data-prerender="he"` and about 90 KB of inline CSS each.** Observed in `booking.html`, `confirmation.html`, `terms.html` and `manage-bookings.html` (91.6 KB, about 18.7 KB gzipped each): the shell loop clones the inlined home entry (`build-organic-pages.mjs:71`). "No private shell hydrates as home" currently relies only on the pathname check (`mountPublicSite.jsx:8`). If a shell were ever served at `/`, stub markup would be hydrated as the home page. Fix: drop the attribute from shells, keep an external cached stylesheet link for them, add a test.
3. **P2-3. `loading="lazy"` on `<video>`: real but narrow.** Observed with an isolating control (same build, attribute stripped): installed **Chrome 154** reflects the property and requests **0 gallery posters before scroll as built, 6 with the attribute stripped**; **Chromium 145** does not reflect it and requests 6 either way. Unsupported browsers are unharmed. "Standard native" is therefore too strong; whether the HTML Standard defines `loading` for `video` is **unverified** (no network). `video-loading.json` records no browser version and its harness script is not in the repo; the same-build rerun is how I confirmed it.
4. **P2-4. The home HTML grew a lot and is `no-store`.** Live home HTML was 11,838 bytes; the candidate home was 162,474 bytes (45,106 gzip, 38,325 brotli), of which about 89 KB is inline CSS. `/` has `Cache-Control: no-store` in `firebase.hosting.booking.json`, so the CSS is no longer cached across home visits. That helps a cold first view and costs repeat views. Measure repeat-view cost and consider revalidation (ETag) instead of `no-store` for `/` if the payment-return reasons for `no-store` allow it; that is a policy decision, not mine.
5. **P2-5. The packager gate has no regression test.** Observed, my own run of the new predicate: it **rejects the real demo HTML** (`dist-booking-demo/index.html`, via its robots and CSP metas) and **accepts** the public booking and inquiry homepages. It no longer matches the old substring check on `.preprod-banner`, and that DOM branch (`package-inquiry-release.mjs:21`) can never match static HTML, because the banner is created at runtime. Stripping both metas from the demo HTML makes it pass (the old check also passed it). Add a test with the real demo file and with a stripped copy.
6. **P2-6. Navigation evidence has a matrix gap.** `navigation-selected.json` covers only **Hebrew at 390 px and English at 1440 px**; Hebrew desktop (the main Hebrew use) and English mobile are missing, and it measures heading position only, not focus or arrival after the page was already scrolled.
7. **P2-7. Lab measurements are single runs under different CPU speeds.** Observed in the Lighthouse files: live 80 (CPU benchmark 2231), inline-lazy 97 (1901), the priority experiment 79 and 60 with TBT 700 and 8,250 ms (benchmarks 1279 and 2305). Run-to-run spread on near-identical code is far larger than the claimed gain, so 97 versus 80 is not a clean before and after. Lighthouse `lighthouse-local-contained.json` and `lighthouse-local-ssr.json` are byte-identical in size and fetch time: count them once. Required: at least five runs per build under one protocol, report the median and range, plus the PageSpeed run tied to a build.
8. **P2-8. Undeclared content scope.** `tests/ui/tour-videos.test.jsx` shows a new `tour-moments` group of nine local clips (8.2 MB in `public/media/tour`, under 2 MB each) and a moved gallery position. The request describes only the lazy attribute. Declare it, hash the media, and confirm approvals for the people who appear.

### P3 notes

- `hydration-*.json` asserts reuse of the **hero node only**; my all-nodes check (526 of 528) supports the claim and is a better check to adopt.
- Scroll-time CLS: 0 to 0.0057 (mobile) and 0 to 0.001 (desktop) in 3 runs each in Chrome 154; the shifts I could attribute came from the booking picker mounting (`.booking-screen__intro`). One earlier single run showed 0.0504 at desktop and did not reproduce; unexplained.
- Mobile LCP in clean local Chrome 154 runs on the (reverted) poster-inline build: 92 to 1,408 ms, LCP element the poster `<img>`; my first reading of 9.1 s was caused by my own script-holding harness, not the page. This path is no longer in the candidate.
- `InquiryApp.jsx:57-64` wraps eagerly imported components in `Suspense fallback={null}`; there is no code splitting, so the only effect is hydration scheduling (documented React behavior; its benefit is not isolated by any evidence here). The FAQ is also inside a boundary although the request calls it eager.
- Preview SEO 69 is the intended `X-Robots-Tag: noindex` of the preview channel; it says nothing about the SEO of the candidate.

## Evidence status

| Item | Status |
|---|---|
| 104-file hashes, 94-file manifest | Fresh at 22:22; **stale** for the current tree (1 file differs now; 4 differed earlier) |
| Root 183 and protected 108 tests | **Reported**; earlier runs predate later edits; not run by me |
| Builds booking, inquiry, demo | Logs exist for several states; the current build is not hash-bound |
| Hydration, navigation, static 8 and 7 | `selected` set passes on the frozen state (reported); `poster` set belongs to a reverted experiment; nothing exists for the 22:36 change |
| Real Hosting matrix | Preview channel, `noindex`; its content changed at 22:28 |
| PageSpeed UI 98 | Genuine, single run, tied to the 22:21:46 deploy; cannot be re-run on that content |
| Live site, GSC ownership, sitemap submission | Not done; live has 404 for the GSC file; ownership still pending publication |
| Field Core Web Vitals, rankings, traffic, AI citations | **None exist** |

## Scores (same rubric as `docs/seo/scoring.md` and `sonnet-final-review.md`; reviewer judgment)

These measure controllable readiness. They are not Google, Lighthouse or AI-platform scores and say nothing about rank.

| SEO category | Max | Previous (mine) | Now | Why it changed |
|---|---:|---:|---:|---|
| Discovery and indexability | 25 | 21 | 21 | No change; GSC ownership and indexing remain unmeasured. |
| Page metadata and semantics | 20 | 17 | 17 | No change to metadata. |
| Content and internal navigation | 25 | 17 | 20 | Guides now 617 to 815 words with practical FAQ blocks, the six menu dishes and links to `/#menu` and `/#videos`; still no first-hand station or conversation detail; press paragraph unverified, so no more credit. |
| Technical experience | 15 | 8 | 11 | Two independent lab runs on the real preview (97 and 98) plus my checks (full hydration reuse, no console errors, CLS about 0, lazy posters in current Chrome) support a real improvement; unfrozen candidate, spread across runs, no field data and no repeat-view cost cap it. |
| Authority and measurement | 15 | 5 | 5 | Nothing measured. |
| **SEO total** | **100** | **68** | **74** | |

| AEO category | Max | Previous (mine) | Now | Why it changed |
|---|---:|---:|---:|---|
| Service and entity clarity | 20 | 17 | 17 | No change. |
| Accurate answers | 20 | 17 | 17 | Guide FAQs reuse the existing answers; hedges retained; press claims add nothing until substantiated. |
| Extractable and discoverable text | 25 | 18 | 21 | Complete Hebrew home in the initial HTML, readable without JavaScript (their no-JS check: 12 answers), and deeper guides with FAQ and dish lists. |
| Structured relationships | 15 | 11 | 12 | Guide FAQ schema equals the visible FAQ in all six built guide pages (observed; booking and inquiry). Cross-document `@id` references remain. |
| Trust and external corroboration | 10 | 3 | 3 | Third-party links are unverified (P1-B); no credit. |
| Observed AI visibility | 10 | 0 | 0 | No fixed query set run. |
| **AEO total** | **100** | **66** | **70** | |

Lab Lighthouse and PageSpeed numbers feed only the technical row above. No ranking or traffic effect is claimed or inferable.

## Required reproductions for round 2

1. Freeze after the last edit; record source hashes, dist hashes and the preview version id; confirm none of them changes while the checks run.
2. On that state: unit tests (root and protected), booking, inquiry and demo builds, static 8 and 7, hydration (all-node reuse), no-JS FAQ visibility, saved-English client render, navigation for Hebrew 390 and 1440 and English 390 and 1440 with focus, and the Hosting matrix.
3. At least five Lighthouse runs per build under one protocol, with median and range, plus a PageSpeed run tied to the build; add a repeat-view measurement for the inline CSS.
4. Decide `startTransition` hydration with a lost-click and INP comparison, or revert it.
5. Substantiate or remove the press paragraph (P1-B); declare and hash the `tour-moments` media (P2-8).
6. Add tests for the packager gate and the shell attribute (P2-2, P2-5), and strip `data-prerender` and the inline CSS from private shells.

Round 1 of at most 3 is used. I will not raise any score or grant publication GO against a state that is still changing.
