# SEO/AEO source promotion to main — 12 October 2026

The owner confirmed that `main` is the primary branch and explicitly approved including the public frontend dependencies required by the SEO/performance changes. This promotion brings the source, reproducible QA runners, organic plan and reviewed skill into Git. It does not redeploy the current live site.

## Scope

- Organic content, three static Hebrew/English guides, visible FAQ/schema parity, metadata, canonical/hreflang, sitemap/robots and private-route indexing boundaries.
- Actual React homepage prerendering, full public CSS in initial HTML, locale-aware mounting, low-priority public hydration and booking-intent navigation.
- Required existing public design, booking wrapper, public media/reference directory, supplied videos/posters and frontend payment-return routing. These prerequisites were created before the SEO work; their inclusion is approved dependency work, not a claim of SEO authorship.
- The existing `main` protected booking implementation remains the integration baseline. Only the new shared design data and two minimal compatibility edits are included: the picker heading exposes `inquiry-title` and keyboard focus, and the preview predicate also recognizes `booking-demo`. The wrapper preserves the baseline form's birth date across date reselection. The root booking translation subtree is preserved from `main`.
- Portable QA runners declare `playwright-core` in the lockfile and write only ignored `docs/seo/runtime/` output. The demo runner uses synthetic customer data, checks actual simulated checkout and removes real contact destinations; it blocks all external traffic.
- The reusable skill is already committed in `8e42b709053e6697b274fd76c8cc3af3936dd2a3` under `.agents/skills/organic-growth-audit/`. Its independent Codex review findings were corrected before that push.

Dirty backend/functions, payment-service rollout, protected booking redesign, unrelated release tooling and account screenshots remain outside this promotion. The original shared checkout is preserved. Generated builds/cache and large/private runtime evidence are not committed.

## Fresh verification

Results below concern this candidate in an isolated worktree based on `8e42b70`, not the historic published bundles.

| Check | Result |
|---|---|
| Root UI regression suite | 190/190 passed |
| Existing main protected UI suite | 104/104 passed |
| Booking build and initial-HTML verification | Passed, eight documents |
| Inquiry build and initial-HTML verification | Passed, seven documents |
| Actual demo runtime | Passed final compiled demo: synthetic credit/paid outcome, removed contacts, zero external attempts |
| Actual booking navigation | 28 hash arrivals, four scrolled arrivals and four focused CTA arrivals passed in Hebrew/English at mobile/desktop widths |
| Raw HTTP, rendered/no-JS, FAQ/schema and private/legal/guide routes | Passed on the local booking approximation |
| Hebrew hydration, saved English and no-JS FAQ | Both inquiry and booking passed, including Hebrew node reuse and visible no-JS answers |
| Complete CSS geometry and missing-CSS negative control | Passed Hebrew/English at six widths (360–1920 px), exact complete CSS bytes and geometry |
| Public/private/demo build boundaries | Passed seven private shells, genuine/stripped demo rejection |
| Early booking intent and cancellation | Passed early CTA with held actual picker JS, replacement navigation cancellation and subsequent focused CTA |
| Independent Codex candidate review | Accepted, zero open actionable findings; M1–M3 closed against all 91 source identities, three builds and eight evidence bindings |

The initial protected suite exposed a pre-existing Windows checkout line-ending sensitivity in the unchanged Terms copy hash. The checked-out file was restored to the exact LF bytes from `HEAD`, matching the fixture; no Terms source-content change or weakened hash fixture is included. The suite then passed completely.

The first concurrent CSS screenshot run and final inquiry hydration rerun hit browser timeouts. Sequential reruns passed the unchanged assertions, including all twelve CSS language/width combinations. The timeouts are retained as run diagnostics, not counted as product failures or silent passes.

The local HTTP server approximates only the exact, regex and `/**` patterns used by the checked-in Hosting configs. It preserves redirect query strings. It is not a Firebase Hosting certification. Browser QA blocks external services and performs no real booking, payment, contact message or deployment.

Independent closure: [main-codex-review-20261012.md](main-codex-review-20261012.md). Exact source/build/evidence identity: [promotion-source-manifest.json](promotion-source-manifest.json). Reviewed skill closure: [skill-codex-review-20261012.md](skill-codex-review-20261012.md).

## Historical measurements and continuing organic work

The other records in this directory are explicitly labeled historical. Raw evidence remains in the original local archive; references to excluded payloads are described as historical local artifacts, not promised as checkout files.

Published version `07c9655e12389d87` on 11 October produced live Google mobile Lighthouse scores of 100/100/100/100 once and 98/100/100/100 on repeat. Historical broad readiness was SEO 76 and AEO 71, compared with baseline 49/33. These are distinct measures; this Git promotion neither establishes stable 100 performance nor proves higher search rankings, organic traffic or AI citations.

Follow the ongoing query/content plan in [plan.md](plan.md), scoring boundaries in [scoring.md](scoring.md), and query set in [answer-engine-query-set.csv](answer-engine-query-set.csv). Search Console indexed-home and accepted recrawl/index requests are historical observations, not confirmation that every guide is indexed today. All new reviews use an independent Codex agent; old provider names in historical records are not active instructions.
