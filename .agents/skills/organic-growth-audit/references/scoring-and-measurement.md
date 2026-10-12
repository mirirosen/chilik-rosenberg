# Scoring and measurement

## Keep evidence types separate

| Evidence | Establishes | Does not establish |
|---|---|---|
| SEO/AEO rubric | Auditable preparation and coverage | Official Google/AI ranking score |
| Lighthouse/PageSpeed lab | Device/environment-specific metrics | Stable 100, indexing or field performance |
| Field performance | Real visits for a stated window | Immediate certification of a new release |
| Crawl/index status | What the engine processed | Request accepted becoming indexed |
| Search/AI/business results | Observed clicks, citations and leads | Causality just because a release preceded them |

Choose/disclose the rubric before changes; prefer an established project rubric. Keep weights unchanged between baseline and candidate. Record category points, evidence and deductions. Unknown items receive no invented credit and remain explicitly unknown rather than failed observations. If scoring archived evidence retrospectively, disclose that the rubric was chosen later.

The tables below are starting examples, with the AEO evidence examples suited to a service business. Before the baseline, define weighted criteria for the site's actual purpose. Documentation may need project/entity clarity, accurate API answers and prerequisites/version limits; commerce may need product identity, specifications and purchase constraints. Geography, ticket duration and booking are not universal requirements. Record the adapted criteria and weights rather than adding irrelevant content to satisfy these examples.

Distinguish not applicable (outside the site's purpose) from unknown (relevant but unmeasured). Define exclusions before scoring, disclose their weight and freeze the applicable denominator and criteria for the comparison. Criteria known to be applicable but unmet are assessed failures, not exclusions. If applicability changes later, version the rubric and re-score defensible archived evidence under it, or report a separate non-comparable series; never adjust weights after seeing a result.

| SEO category | Maximum | Evidence |
|---|---:|---|
| Discovery/indexability | 25 | Status, canonical, sitemap, robots, real links, public/private separation |
| Metadata/semantics | 20 | Distinct raw/rendered metadata, headings, share metadata, language |
| Content/navigation | 25 | Useful intent-matched text, factual completeness, links, translations |
| Technical experience | 15 | Build/browser checks, mobile/no-JS behavior, lab metrics; field data separate |
| Authority/measurement | 15 | Verified authorship, references, entity consistency, search/conversion evidence |

| AEO category | Maximum | Evidence |
|---|---:|---|
| Service/entity clarity | 20 | Provider, geography, service, audience |
| Accurate answers | 20 | Verified scope, price, duration, timing, booking limits |
| Extractable/discoverable text | 25 | Readable information, clear answers, useful linked guides; raw/rendered distinction |
| Structured relationships | 15 | Appropriate visible-fact schema, stable entity identity |
| Trust/corroboration | 10 | Named expertise, verifiable external sources |
| Observed AI visibility | 10 | Fixed prompts, engine/date, exact citations; no credit merely for markup |

These weights are a working convention, not a ranking algorithm. Schema is not a prerequisite for every AI engine. If a preparation-only rubric excludes observed visibility, agree on that definition before baseline rather than redistributing missing points afterward.

## Aggregate scores and evidence coverage

For every aggregate, show earned points E, assessed applicable maximum K, unknown applicable maximum U and excluded not-applicable weight N. The applicable denominator A = K + U stays fixed for a before/after pair. Unknown criteria earn no observed points, but their weight must remain visible: report an **evidence lower bound** of E/A, assessed coverage K/A, unknown weight U and excluded weight N. If useful, show the possible range E/A to (E+U)/A. Convert to a 100-point scale explicitly; do not silently normalize unknown weight away. When U is zero, the result is fully assessed under that rubric, not an official engine score.

When coverage changes, distinguish newly acquired evidence from underlying change. Example: an unchanged site has E=72, K=90, U=10, A=100; its lower bound is72/100 with90% coverage. Observing eight pre-existing AI-visibility points yields E=80, K=100, U=0. Report improved evidence coverage, not an eight-point product improvement. Compare shared assessed criteria with their stated weight, or re-score the archived baseline if it genuinely establishes the earlier state. Do not project a current citation back into an unobserved past. Otherwise mark the aggregate before/after comparison limited; separately report observed changes and unmeasured areas. Even equal coverage does not prove causal attribution.

## Laboratory protocol

Record URL/hostname/edition, timestamp, revision/artifact hash, device, browser/Lighthouse version, network/CPU throttling, cache/storage and compression. Separate local, preview and production observations; gzip localhost versus CDN is not a controlled comparison.

Use a declared repeat set appropriate to variability, commonly 3–5 comparable runs. Retain all planned runs including lower scores; report range/median plus FCP, LCP, CLS and TBT. Stop once verification suffices unless a changed candidate or unresolved concern justifies more testing. Do not retry solely for 100. Check timestamps and metrics for cached reports; different report links do not prove independence.

Example: production results 100 and 98 establish one lab100 and a 98–100 observed range. SEO76/AEO71 readiness can coexist with those results. Historical rolling28-day field data cannot certify a revision published minutes earlier. Lab TBT is not field INP. Lighthouse agent-browsing audits are not AI citation measurements.

## Indexing evidence states

Record separately: ownership verified; sitemap submitted; sitemap successfully fetched; inspection of indexed/crawled version; live-URL test; request accepted; subsequently indexed; Google-selected canonical. An older indexed home does not prove the new revision was crawled.

Derive URLs from the actual sitemap/router, not guessed slugs. Retain rejected requests, correct the actual URL and do not invent redirects/pages to conceal mistakes.

## Outcome measurement

Use equal windows (often 28 days), segmented by language, geography, device and brand/non-brand. Compare impressions, clicks, CTR, query/page mix and attributable leads. Record recrawl/release dates, seasonality and other campaigns. Inspect current account reporting instead of hard-coding which AI report exists. Do not assert causality without a defensible design.

Keep 10–20 priority AI prompts fixed with IDs/intent/language. Record engine/surface, date, session/search mode, prompt, business mention, exact linked URL and factual correctness. A mention is not a citation; a link is not a referral. Unrun prompts are unmeasured, not zero visibility. Repeat under comparable conditions. Avoid customer personal data in evidence/analytics.
