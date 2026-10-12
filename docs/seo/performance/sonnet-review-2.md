> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](../promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Performance / SEO follow-up: hostile review, round 2 of at most 3

Reviewer: Sonnet 5.5 (High), the local Claude Code desktop conversation. No Anthropic API, SDK or CLI fallback. Date 2026-10-10, written 23:30 local.
Scope: `review-request-2.md`, round 1 (`sonnet-review-1.md`), the frozen 219-file source and the 95-file deployable output, preview version `7c5cbf302c1e2a9d`, and the evidence in `docs/seo/performance/`.
Not done: no source edit, build, deploy, account action, Git write, customer write or provider call; no test runner. My browser work ran locally in installed Chrome 154 against `dist-booking`, with every non-local request blocked; I also made read-only HTTP GETs of the preview channel and the live site. The only file I wrote is this one. Stage work was not touched.

Evidence labels: **observed** (I ran or read it), **reported** (stated in the package, not reproduced by me), **hypothesis**, **unknown**.

## Verdict

| Question | Verdict |
|---|---|
| Source and measurement quality | **Mostly sound; one P1 open.** No P0. |
| **Publication of this frozen state** | **Not GO.** P1-A (English layout shift) is a reproducible regression the evidence matrix does not cover. |
| What it would take | Fix or consciously accept P1-A with evidence, and rerun the affected checks on a new freeze. The measurement series and the PageSpeed binding are otherwise complete. |
| Live site | Unchanged (observed): release `8e3909dab4d8fe4f`, bundle `booking-index-Df7a72dH.js`, no critical style, no loader, GSC file 404. |
| Score of 100 | **Not awarded.** Lab numbers are not an SEO/AEO score, and no field, ranking, traffic or citation data exists. |

## State binding (observed)

- **Source:** I recomputed SHA-256 for all **219** files in `source-hashes.json`: **219 of 219 match**, none is newer than the freeze (23:01:34); the last source edit was 22:59:56.
- **Output:** all **95** files in `build-manifest.json` match `dist-booking`; the only extras are the hidden `.vite/manifest.json` and `.vite/critical-report.json`. `dist-booking` was built at 23:00:11, after the last source edit. The `index.html` I tested has the manifest's hash.
- **Preview:** I fetched the preview channel (`hilik-site--seo-aeo-oct10-t8bg3pcs.web.app`) and compared bytes with the manifest: `index.html`, `public-style-loader.js`, the three guides, the four private/legal shells (via their clean routes), sitemap, robots, the GSC file, 404 and the CSS are **byte-identical**. The `.html` aliases 301 to the clean routes with the query string preserved. Headers on `/`: `X-Robots-Tag: noindex` (intentional preview isolation), `Cache-Control: no-store`, CSP with `script-src 'self'` and `style-src … 'unsafe-inline'`.
- **Channels (reported, `hosting-channels-frozen.json`):** live is `8e3909da…`, preview is `7c5cbf30…`, and a separate `booking-review` channel exists.
- **Unit tests:** root **186/186** (20 files, started 23:01:53) and protected **108/108** (started 23:01:53) are **reported**; both started after the last source edit. I did not run them.

## Verdict per change family

| Family | Verdict | Basis |
|---|---|---|
| Direct hydration (`mountPublicSite.jsx`) | **GO** | Source now calls `hydrateRoot` directly, no transition (`:5-11`); round 1's P2-1 is closed. Observed: Hebrew 526 of 528 nodes reused, 0 console errors; saved English renders client-side, no errors. |
| Critical CSS plus async full stylesheet | **HOLD (P1-A)** | Hebrew parity is exact; English is not. Also P2-1. |
| Private/legal shells | **GO** | Observed: all 7 shells (4 booking, 3 inquiry) lack `data-prerender`, the inline critical style, the deferred link and the loader, and carry a cached full stylesheet (`build-organic-pages.mjs:71-76`). |
| Packager gate (`public-inquiry-gate.mjs`) | **GO** | Observed on the real files: accepts `dist-inquiry`; rejects the real demo, the demo with its isolation metas and banner stripped, the booking public home, and an inquiry page with an injected banner. It now checks the entry script, so it no longer relies on strippable metas. |
| Booking intent / heading focus | **Conditional GO** | Lifecycle is sound (below); P2-2. |
| Press evidence and wording | **Conditional GO** | `press-evidence.md` records retrieval date, headline, publication date and short excerpts; the guides now use gender-neutral attribution and consistent "Thursday evening" wording. I could not fetch the articles (no network), so the evidence is **reported**. |
| Tour media | **GO** | Observed: all 9 MP4s match the recorded hashes locally, and **all 9 match the bytes served by www.chilik-tours.com today**, which supports "already live, unchanged". |
| Lazy gallery posters | **GO** | Browser version is now recorded (`video-loading-frozen.json`: Chrome 154); I confirmed it with a control in round 1 and the claim is correctly limited to supporting browsers. |
| Measurements | **GO (complete)** | Five alternating runs per build, my recomputation matches the summary; see below. |
| Skill | **GO** | Unchanged from round 1; its hash is in the freeze. |

## Findings

No P0 found.

### P1-A. Saved-English visitors get a large layout shift; the evidence gate covers Hebrew only

- **Where:** `scripts/inline-public-styles.mjs:11-23`: the critical CSS is extracted from the **Hebrew** prerender only, and the full stylesheet is activated later by `public/public-style-loader.js`. A visitor with a saved English choice gets a client render (by design) that is laid out with the Hebrew-derived critical CSS until the full stylesheet arrives.
- **Observed (Chrome 154, frozen `dist-booking`, full stylesheet held back):** Hebrew first-viewport parity is exact at 360, 768, 1024, 1440 and 1920 px, with at most 4.1 px at 390. **English differs by 186 px (360), 203 px (390), 51 px (768), 158 px (1024), 333 px (1440) and 534 px (1920)** between the critical-only and full-CSS states. At 390 px the hero grows from 754 to 794 px, the H1 from 121 to 161 px, the CTA moves 40 px, and the portrait frame sits at x=207 instead of x=4 (LTR rules are missing).
- **Layout shift with the stylesheet delayed 700 ms (a modest, realistic delay):** Hebrew **0** at 390 and 1440; English **0.244 at 390 and 0.123 at 1440**. Both English values are above the 0.1 "good" threshold.
- **Why the evidence misses it:** `critical-frozen-final.json` and the Lighthouse series use the Hebrew default. The request's own gate, "exact delayed-CSS parity", does not hold for English. Live has no such shift (its CSS blocks rendering).
- **Uncertain:** whether the full stylesheet arrives before the English client render on real networks. The stylesheet is fetched with `media="print"` priority, so it may arrive later than the main script. This is **unknown**, which is why a lab run is required.
- **Required reproduction and fix:** extract critical CSS from an English render as well and merge it (or otherwise make the English first viewport independent of late CSS), then rerun the stalled-CSS parity at all widths and the Lighthouse protocol with `localStorage.language = "en"`, five runs, CLS reported.

### P2 findings

1. **P2-1. The loader is a single point of failure.** Only `public-style-loader.js` (and, for shells, the build) turns the full stylesheet on; the main bundle has no fallback (grep, observed). **Observed with the loader request blocked:** the stylesheet stays `media="print"` and below-fold headings render at 16 px instead of the normal 32 px. The same happens if the stylesheet itself fails. Add an equivalent activation step in the main module as a fallback.
2. **P2-2. The 5-second wait for the booking heading versus a lazy 484 KB chunk.** Source review: `bookingIntent.js:4-27` and `NavigationContext.jsx:25-63` are correct: the wait registers the intent, observes mutations, and is cleaned up on abort or timeout; the listener is removed on unmount (`BookingSiteApp.jsx:37-39`); on timeout or failure it falls back to `#date-selection` without a customer transaction. **Observed:** Hebrew focused the heading in every run (late and early clicks, mobile and desktop); a wheel event right after the click cancelled the focus and did not force a scroll. English at 390 px focused the heading in only one of three attempts in my runs (the others fell back to the hash after the bound); my machine was CPU-contended, so treat this as a risk signal, not proof. The booking section needs the 114 KB-gzip Firebase chunk. Consider preloading that chunk on CTA hover or focus, and measure arrival under the series throttle.
3. **P2-3. The measured gain is not a first-paint gain.** Series FCP median is 1,782 ms versus 1,721 ms live. The gains are in LCP, TBT, payload and request count (below), so the critical-CSS rationale ("no blocking round trip") is not what the series shows. Do not attribute the improvement to one change.
4. **P2-4. LCP is borderline.** The final PageSpeed run gives LCP 2.93 s; the series median is 2.40 s (range 2.38 to 2.43 s). The "good" bound is 2.5 s at the 75th percentile of field data, and no field data exists.
5. **P2-5. New build dependency.** `critical@9.0.0` returned as a devDependency: 36 added lock entries (css-tree, linkedom, lightningcss and its 12 platform binaries, and others), no install scripts, licenses MPL-2.0, BSD-2-Clause, MIT, ISC and Apache-2.0. It is build-time only; record the license and audit decision.
6. **P2-6. The new gates are manual.** `verify-public-build-boundaries.mjs`, `verify-home-critical-css.cjs`, `verify-home-hydration.cjs` and `verify-home-navigation.cjs` are not part of the build chain or the unit suite (`package.json` scripts), so they can drift. The packager does call the gate; the rest should run in CI.

### P3 notes

- Hydration reuse: the record says 528/528; my all-node check with the same method as round 1 gives 526/528 (the two differing nodes are unidentified). The conclusion (no errors, nearly all nodes reused) is unchanged.
- Saved English: the Hebrew server HTML is visible and clickable for a moment and is then discarded by the client render; an early click lands on dead nodes. This is the existing "deliberately separate" design.
- The preview's SEO 69 and "Page is blocked from indexing" come from the intentional `noindex` header, as the request says.

## Measurement series (observed; complete, recomputed from the ten files)

Protocol, identical in all ten runs: mobile, simulated Slow 4G (RTT 150 ms, 1,638 kbps), 4x CPU slowdown, same installed Chrome, alternating live and preview.

| Metric | Live baseline (5 runs) | Frozen preview (5 runs) |
|---|---|---|
| Performance | median **75**, range 55 to 80 | median **91**, range 84 to 97 |
| LCP | median 2.93 s (2.91 to 3.40) | median 2.40 s (2.38 to 2.43) |
| TBT | median 817 ms (546 to 3,886) | median 273 ms (22 to 534) |
| FCP | median 1,721 ms | median 1,782 ms |
| Speed Index | median 2,661 ms | median 2,214 ms |
| CLS | 0 in all runs | 0 in all runs (Hebrew) |
| Transfer, requests | 1,769 KiB, 23 | 1,523 KiB, 14 |
| Accessibility, best practices | 98, 100 | 100, 100 |
| SEO (Lighthouse) | 100 | 69 (intentional `noindex`) |

- The CPU benchmark index varied from 1,603 to 2,083 across runs, and the spread inside each build is large (live 55 to 80, preview 84 to 97), so single runs cannot be compared. The medians separate the builds, but "100" was never reached and the TBT spread shows host noise. The recorded caveat (host load and origin differences) is correct.
- **PageSpeed (final, observed in the saved tree):** report time 23:06:05, URL the preview channel, mobile: Performance **95**, Accessibility 100, Best Practices 100, SEO 69 (blocked from indexing); FCP 1,217 ms, LCP 2,928 ms, TBT 0, CLS 0, Speed Index 1,288 ms. The preview version `7c5cbf30` was released at 23:01:10 and was the channel content when I compared bytes, so the run binds to this state. The earlier async-CSS run (98, LCP 2.40 s) measured a previous build.
- **Repeat view (`repeat-view.json`, observed in the file):** second visit transfers the HTML again (16.3 KB, no-store by design) and **0 bytes** for the CSS and the loader. This answers round 1's repeat-cost concern.
- Live reference reading from round 1 (80 and a few single runs) stays a historical observation, not a causal comparison.

## Round 1 findings: disposition check

| Round 1 | Status |
|---|---|
| P1-A moving candidate | **Closed.** Hashes, manifest and preview version are bound and match. |
| P1-B press attribution | **Closed on evidence recorded** (reported; not independently fetchable by me). |
| P2-1 transition hydration | **Closed** (observed in source). |
| P2-2 shells | **Closed** (observed, 7 of 7). |
| P2-3 video lazy support | **Closed** (version recorded; claim limited). |
| P2-4 inline CSS repeat cost | **Closed** (observed `repeat-view.json`), but replaced by a new risk, P1-A. |
| P2-5 packager | **Closed** (observed on real files). |
| P2-6 navigation gaps | **Largely closed**: four language/viewport combinations plus focus are reported; English mobile is the weak spot (P2-2). |
| P2-7 measurements | **Closed** (series complete; PageSpeed bound). |
| P2-8 media scope | **Closed** (9 of 9 match local record and live bytes). |

## Rubric scores (same rubric; reviewer judgment)

These measure controllable readiness, not rank. Lab speed feeds only the technical row.

| SEO category | Max | Round 1 | Now | Why |
|---|---:|---:|---:|---|
| Discovery and indexability | 25 | 21 | 21 | No change; GSC ownership and indexing remain unmeasured. |
| Page metadata and semantics | 20 | 17 | 17 | No change. |
| Content and internal navigation | 25 | 20 | 20 | Guides unchanged; the press paragraph is now evidenced, which removes a penalty but adds no content. |
| Technical experience | 15 | 11 | 12 | A complete five-run series, a bound PageSpeed run and a repeat-view measurement support a real lab improvement; capped by the English layout shift, the single point of failure, borderline LCP and no field data. |
| Authority and measurement | 15 | 5 | 5 | Nothing measured. |
| **SEO total** | **100** | **74** | **75** | |

| AEO category | Max | Round 1 | Now | Why |
|---|---:|---:|---:|---|
| Service and entity clarity | 20 | 17 | 17 | No change. |
| Accurate answers | 20 | 17 | 17 | No change. |
| Extractable and discoverable text | 25 | 21 | 21 | No change. |
| Structured relationships | 15 | 12 | 12 | No change. |
| Trust and external corroboration | 10 | 3 | 4 | Third-party coverage now has recorded retrieval evidence (reported). |
| Observed AI visibility | 10 | 0 | 0 | No query set run. |
| **AEO total** | **100** | **70** | **71** | |

Reported separately, as the audit rules require: **lab performance** (series above, not a score of SEO), **rubric readiness** (table above), and **real indexing, ranking, traffic and AI citations** (none exist; none claimed).

## Required before publication GO (round 3)

1. Resolve P1-A, then freeze again with new source and output hashes and a new preview version.
2. On the new state: stalled-CSS parity in Hebrew **and** English at 360, 390, 768, 1024, 1440 and 1920 px; a five-run English-saved Lighthouse series with CLS; the Hebrew series and a final PageSpeed run bound to the new version.
3. Add the loader fallback (P2-1) or record a reasoned acceptance.
4. Repeat the booking-intent arrival under the series throttle for all four language and width combinations (P2-2).
5. Keep the other evidence as is: shells, packager gate, hydration, press evidence, media hashes, tests (rerun after any new edit).

Round 2 of at most 3 is used. I will not grant publication GO while P1-A is open or the state is not re-frozen.
