> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](../promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Independent Codex review: public root padding

**Verdict: GO for the exact frozen Hosting-only candidate. P0: 0. P1: 0.**

Reviewer: separate Codex agent `/root/root_padding_review`, not the implementing agent. The newest user policy replaces the former Claude/Sonnet review requirement. No Claude, Anthropic API, product edits, deployment or customer writes were used in this review.

## Scope and identity

Accepted production/rollback: `fc3fb8e9bfbbe1e5`. Reviewed preview: `projects/hilik-site/sites/hilik-site/versions/e0a7ed7c6fdd8b74`, released `2026-10-11T04:09:02.790Z`, at `https://hilik-site--seo-aeo-oct10-t8bg3pcs.web.app/`.

I recomputed all **219 source hashes** and **94 booking artifact hashes**. Comparing the accepted source manifest with this freeze shows exactly one changed source file, `src/site-design.css`. Its change replaces the public hero's collapsing top margin with equivalent main padding, scoped to `#root[data-prerender]`. The rejected root-only `flow-root` experiment is absent. All **82 inquiry artifact hashes** also match the current inquiry manifest. The deployed preview HTML matches the local booking HTML SHA below.

| Guard | SHA-256 |
|---|---|
| `src/site-design.css` | `16ccc517698f46df6b13dfabb4d9ddcd809ebc3aacb8f4859e0b6463e0309727` |
| `dist-booking/index.html` | `d6cedffe387c3fcb9d4f39b242d98ddebdbc05e53d31e9fd45e7c5f1e47ea3bb` |
| `dist-booking/assets/booking-index-l2n4wkgT.css` | `5987e61dc6e9ebc00002e59cab1882448956aaa024f75078e1454e6c1478421a` |
| `source-hashes.json` | `3f398d8f305f0a83b8efbb2bd48a3784dd6cfbbfdd4d242152399b1c745ae48a` |
| `build-manifest.json` | `acc087834f1f00a5af21766032807d9c1e488034bc38170bd49b9da2e8ac7d2f` |

The Hosting listing contains 96 paths: the 94 local manifest paths plus Firebase-managed `/__/firebase/init.js` and `/__/firebase/init.json`, with no missing paths. I verified all 16 artifact hashes in the final `root-padding-binding.json`. Initially, regenerating the inquiry manifest changed its timestamp and invalidated the recorded manifest hash. The implementer regenerated the binding; my subsequent complete check passed. This integrity issue is closed, rather than waived.

## Independent reproduction and reviewed evidence

My own fresh Chrome contexts compared the actual accepted production page with the actual candidate in HE and saved EN, at 390 and 1440 pixels. Real CDP throttling used 150 ms latency, 1.6 Mbps download and 4× CPU. External services were blocked to avoid customer actions. Localized H1 and loaded fonts were awaited.

All four pairs passed exact deep comparison of the visible header, hero, hero image, hero copy and introduction rectangles. The accepted root was at y=72; the candidate root was at y=0. The candidate hero computed margin-top was 0px and main padding-top was 72px. Every independent candidate sample retained an unexpected layout-shift sum of **0**. This supports the margin-collapse fix without moving the visible content. Results and harness are retained in `codex-root-padding-independent-summary.json`, `codex-root-padding-independent.log` and `.inquiry-cache/codex-root-padding-review.cjs`.

The independent harness completed all assertions and logged all four passes, then hung in browser cleanup. Its own review process was stopped. Full in-memory rectangle records were therefore not exported; the summary explicitly preserves the real logged results and this limitation. No extra sample or geometry data was invented.

I also reviewed the completed, version-bound implementation evidence:

- 20 real Slow4G/4× CPU HE/EN ×390/1440 runs: maximum conservative shift sum **0.0017709806884430726**, every run below 0.1.
- 12 width/locale CSS cases: complete inline bundle byte parity, no initial CSS requests, actual external CSS reference parity, meaningful missing-CSS negative controls, and mobile menu behavior passed.
- Hydration/no-JavaScript evidence passed: Hebrew reused all 528 prerender nodes; saved English performed its deliberate client render; all 12 FAQ answers remain available without JavaScript.
- 36 navigation/arrival/CTA cases and 27 preview HTTP checks passed. The separately verified private/legal shells lack the `data-prerender` trigger and public inline-style marker; their external stylesheet behavior remains intact. Build boundaries cover seven shells and genuine/stripped demo rejection.
- Standard Lighthouse mobile limited regression sample: HE **92/100/100/69**, EN **87/100/100/69**, both CLS 0. These are two runs, not a stable speed estimate. Preview SEO 69 reflects intentional preview noindex.
- Saved Google mobile reports `bnmtyaw87r` and `pgjb9xwl26`: **97/100/100/69**, LCP 2555 ms, CLS 0. The second has identical metrics/capture details and may be a cached audit; it is not independent speed evidence.

The former intermittent 72px root-margin shift is **closed for this scoped revision**. The failed flow-root experiment remains preserved and was never published. Google and independent real-throttled evidence agree on closure; I am not relying on final DOM geometry alone.

## Remaining limits and grade

There are no open P0/P1 findings. Performance remains **97 in the cloud sample**, with LCP slightly above 2.5 seconds and lower local results on the contended host. This does not meet the user's 100-performance target and must not be presented as doing so. Repeat scores, production-hostname behavior and field Core Web Vitals require their own measurements. Saved-English visitors still initially receive Hebrew prerender content before the existing English client commit; this CSS change does not address that accepted limitation.

Broad readiness stays **SEO 76/100, AEO 71/100** under the previous independent rubric. The layout stability defect is resolved, but the release adds no content, entity or authority evidence, and the remaining speed/field-evidence limits do not justify a broad numerical uplift. Lighthouse SEO 100 on the accepted indexable production release is a separate technical lab score. Neither grade establishes search ranking, traffic growth or AI citations. GSC indexing requests are not proof of indexing.

## Publication guard

The implementing agent may publish the already authorized release after confirming the frozen source/build hashes and exact 94-file inventory still match. Use only project/site `hilik-site`, `firebase.hosting.booking.json`, and the reviewed `dist-booking` Hosting output. Do not deploy functions, rules, Auth or unrelated dirty checkout changes. Keep `fc3fb8e9bfbbe1e5` as this revision's rollback.

After publication, require canonical home HTTP 200 with HTML SHA `d6cedffe387c3fcb9d4f39b242d98ddebdbc05e53d31e9fd45e7c5f1e47ea3bb`, no public-home noindex header, verification file 200, private route noindex preserved, and fresh HE/EN real-throttled checks. Record actual production mobile metrics without attributing a preview score or cached rerun to an independent production measurement.

## Publication-evidence addendum — 11 October 2026

The implementing agent published the reviewed candidate as live version `projects/hilik-site/sites/hilik-site/versions/07c9655e12389d87` at `2026-10-11T07:09:27.503Z` (10:09:27 Asia/Jerusalem). `production-root-padding-release.json` records the same 94 reviewed artifacts plus two managed Firebase files, no missing paths and the accepted rollback. I independently fetched the canonical home after publication: HTTP 200, no `X-Robots-Tag`, and SHA `d6cedffe387c3fcb9d4f39b242d98ddebdbc05e53d31e9fd45e7c5f1e47ea3bb`, exactly matching my publication guard.

The saved `production-http-root-padding.json` contains 27 passed checks, including verification-file 200 and private-route noindex preservation. `production-root-padding-cls.json` is complete with 20 real-throttled HE/EN ×390/1440 runs; maximum conservative unexpected-shift sum **0.0034290123456790123**, all below 0.1.

I independently read both complete Google PageSpeed AX captures and inspected the saved first screenshot:

| Canonical mobile cloud report | Local report time | Performance / accessibility / best practices / SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| [8d3htdaqby](https://pagespeed.web.dev/analysis/https-www-chilik-tours-com/8d3htdaqby?form_factor=mobile) | 10:10:56 | **100 / 100 / 100 / 100** | 925 ms | 1429 ms | 0 ms | 0 |
| [v4oju2txaq](https://pagespeed.web.dev/analysis/https-www-chilik-tours-com/v4oju2txaq?form_factor=mobile) | 10:12:26 | **98 / 100 / 100 / 100** | 938 ms | 2401 ms | 0 ms | 0 |

These captures have different report times and metrics, unlike the potentially cached preview pair. They establish one actual **100 performance lab run** and a production repeat range of **98–100**. They do not establish stable 100 performance. The earlier 97 and lower local measurements remain valid historical evidence. No isolated causal attribution to this CSS change is established by these two production reports.

The same UI displays a passing historical CrUX assessment with LCP 2 seconds and CLS 0, while INP is unavailable. It describes a rolling **28-day** field window, which predates this release. It must not be attributed to the newly deployed candidate or treated as new 28-day validation.

Broad readiness remains **SEO 76/100, AEO 71/100**. A technical Lighthouse SEO score of 100 and an individual performance run of 100 do not establish content/authority completeness, search ranking, traffic growth or answer-engine citations.

Evidence identity checked for this addendum:

- `production-root-padding-release.json`: `1d819b725b8eccd241ddb5e7949317376b70853040660fa9b68c8b2a70079aee`
- `production-http-root-padding.json`: `0943ed1388fcc042ee352bfa1c7bdd2bd6e06df62722ddf63d8e4e9b3d7a0346`
- `production-root-padding-cls.json`: `a99a15d574fdb187a18b4fdb235873441ab2578145b047448d792486f7b80967`
- `pagespeed-production-root-padding-1.txt`: `9df7555e7a0b7b973b1b38feb7f9438bd05e23cec47c74cc865852ff2ebdfd4b`
- `pagespeed-production-root-padding-2.txt`: `59880212c7d18508209216d0346460419b5ce4b2ee18e5d55fbd1178f1915f1c`

The fresh post-publication browser matrix subsequently completed successfully at 10:14:05 local. I reviewed the retained `production-browser-root-padding.json`: 13 HTTP route/alias checks and 11 browser modes/cases passed, covering fresh English/Hebrew browser locales, JavaScript disabled, hydrated HE/saved EN, FAQ parity, six guide viewport cases, canonical URLs, no overflow and private-route protections. Its SHA is `fa6ed80f1868b8967177dc2b1d4d0142dc6bed101f60ca03ad624565eb494b86`. External availability/auth services were blocked and no checkout transaction was performed. The older 07:00 artifact was not used as proof for this release.

Post-publication acceptance is complete for the tested Hosting scope. The independent GO remains valid; there are no new P0/P1 findings. The achieved single lab 100 and repeat 98 are both retained, with the limits above.
