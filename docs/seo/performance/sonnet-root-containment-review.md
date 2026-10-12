> Historical audit record from 10–11 October 2026. Measurements describe the published versions named below, not the source-only main promotion. Raw browser/account screenshots and large experiment payloads remain in the original local archive and are not included in Git. Current promotion scope and fresh checks: [promotion-to-main.md](../promotion-to-main.md). Historical reviewer instructions do not authorize new Claude work.

# Root-margin containment review (candidate preview `5ddc5f0930566d87`)

Reviewer: local Claude Code Desktop conversation (Sonnet 5.5 High). No Anthropic API, SDK or CLI fallback was used.
Mode: read-only. I edited no product source, did not deploy, and wrote no customer data. My only writes were scratch scripts outside the repo and this report.
Evidence labels: **observed** = I ran it, **reported** = read from the package's files.

## 1. Verdict

**NO-GO for publishing candidate `5ddc5f0930566d87`. No P0, no P1.**

- The change is safe: it altered nothing a visitor can see, and everything else in the build is unchanged.
- It also does not do what it was built to do. **It does not remove the layout shift**; it only changes which element the browser blames.
- The currently live release `fc3fb8e9bfbbe1e5` stays acceptable. The residual shift it carries is the same P2 I recorded in the locale-closure review, and this candidate does not improve it.
- A successor candidate (padding approach) was frozen over the same files while I was reviewing (section 6). I have not reviewed it; the A/B below suggests it is directionally correct.

## 2. What the change is, and the state I verified (observed)

| Item | Result |
|---|---|
| Source delta vs `source-hashes-delivery-accepted.json` | exactly one file: `src/site-design.css`, which adds `#root[data-prerender] { display: flow-root; }` with a comment. 218 other source and skill files identical |
| Freeze at 07:05 (`source-hashes.json` 219 files, `build-manifest.json` 94 files) | 219/219 and 94/94 recomputed and matching; no extra file in `dist-booking/`. `site-design.css` sha256 `417b5b93e3d9…` in that freeze |
| Preview `5ddc5f0930566d87` | released 2026-10-11T04:04:02.945Z; the 94 manifest paths plus `/__/firebase/init.js` and `init.json` make the 96 Hosting paths, with none missing. The preview's `index.html` sha256 equals the frozen manifest entry (`22287a8fb19d19b32354a79042df2859549fd9e3cdd606ff7bd0eb1f7a19547a`) |
| Compared with the live accepted page (`fc3fb8e9`) | inline CSS differs by exactly the 40-character rule `#root[data-prerender]{display:flow-root}`; the rest of `index.html` is identical after normalising hashed filenames; the entry JS is byte-identical (313,423 bytes, same after normalising names). All 52 media files unchanged |
| Live production now | unchanged: `booking-index-sh8y-g7o.js`, no `flow-root` rule, GSC file 200 |

## 3. The decisive finding: the shift is still there (observed)

**Mechanism.** The hero has a 72 px top margin. In the streamed HTML, `<main id="main-content">` (and with it the hero) arrives after a first chunk. Before it arrives, everything in the flow sits at y=0; when it lands, the hero's margin collapses upward through `main` and its ancestors, and the first non-containing ancestor moves from y=0 to y=72. `flow-root` on `#root` stops the collapse at `#root`, but `.target-site` (the `min-h-screen` div directly inside it, which paints the page area) is still an ancestor the margin collapses through.

**Deterministic reproduction.** I served the HTML in two chunks, split just before `<main id="main-content"`, with a 700 ms pause between them. JavaScript was blocked so only parsing and layout were involved. Chrome 154, 390 and 1440 px, 2–3 runs each, comparing the live accepted page (old), the candidate fetched from its preview (new), and scratch copies with other CSS added (the candidate is not modified):

| Variant | 390 px (delay 700 ms) | 1440 px (delay 700 ms) | Delay 0 | Node reported |
|---|---|---|---|---|
| old (live `fc3fb8e9`) | CLS **0.0853** × 3 | CLS **0.05** × 3 | 0 | `div#root` y 0→72 |
| **new (this candidate)** | CLS **0.0853** × 2 | CLS **0.05** × 2 | 0 | **`div.target-site` y 0→72** |
| `main#main-content{display:flow-root}` added | 0 | 0 | 0 | none |
| `#root>.target-site{display:flow-root}` added | 0 | 0 | 0 | none |
| `.target-hero{margin-top:0}` plus `#main-content{padding-top:var(--header-height)}` (the padding approach) | 0 | 0 | 0 | none |

- **The shift score is identical before and after the change.** Only the blamed node changes, from `#root` to `.target-site`. The hypothesis in the request (margin collapses through the root) was right; the containment was one level too high.
- The three alternatives that work all leave the hero at y=72 (`heroFinal` 72 in every case), so containing the margin lower down does not change where the content ends up.
- With no delay between chunks (fast delivery) all variants give 0. The defect only appears when the first chunk is painted before the `<main>` chunk arrives, which is what happens on slow or throttled connections with a 153 KB HTML document.

**The package's own fresh evidence says the same (reported):**
- `root-containment-cls.json` (20 real Slow-4G/4x-CPU runs): 18 zero, one HE-1440 run 0.0034 on `target-hero__loop`, and **one EN-390 run of 0.08 whose source is `div.target-site min-h-screen`, previous y=0, current y=72, at 777 ms** (run 3). That is this same shift on the node the candidate was expected to have fixed.
- Google PageSpeed run on this preview (`pagespeed-root-containment-1`, 95 performance): CLS **0.087**, culprit `body.booking-edition > div#root > div.target-site`.
- Five clean runs in each of four cells are expected even for the old build, because the real-throttled occurrence rate was already about 1 run in 20. Twenty runs cannot demonstrate removal; the chunked reproduction can, and it shows no removal.

## 4. Other checks on the candidate (observed or reported)

| Check | Result |
|---|---|
| CSS parity gate, 12 cases (`root-containment.json`, reported) | passes for all 12 (bytes, zero initial CSS requests, reference geometry, negative control) |
| Hydration (`hydration-root-containment.json`, reported) | HE reuses 528/528 nodes; saved-EN client-renders (0/528 by design) |
| Navigation (`navigation-root-containment.json`, reported) | passed |
| Private shells | the rule is scoped to `#root[data-prerender]`, which the 4 + 3 shells do not carry (round-3 and locale-closure checks of `data-prerender` absence still hold on the unchanged shell template) |
| Local Lighthouse, 1 HE + 1 EN (reported) | 90 and 87 performance, accessibility 100, CLS 0, TBT 305 and 388 ms. A two-run sample; it is not a performance finding either way |
| Visible geometry | consistent with the package's probe and with my `heroFinal` 72 in all variants; `flow-root` on the root has no visible side effect that I could find |
| Side effects of `display:flow-root` on `#root` | none observed. It creates a block formatting context: it contains floats and margins inside the root; it does not change `position:fixed` descendants (the header stays fixed) |

## 5. Regrade (readiness, not rank)

| Area | Locale-closure review | Now | Reason |
|---|---|---|---|
| Broad SEO | 76 | **76** | no change: this candidate neither improves nor degrades the product; the live release already carries the locale and CSS repairs |
| AEO | 71 | **71** | no content change |

Technical Lighthouse SEO (69 on the `noindex` preview, 100 on the live home) and these broad readiness grades are different measures. Google live scores of 97/100/100/100 are one run and say nothing about rank, field CWV or AI citations. Search Console "indexed" and "recrawl accepted" do not show that a new version was crawled.

## 6. Process finding: the freeze was overwritten during this review

At 07:08:46–07:09:09 `source-hashes.json`, `build-manifest.json` and `frozen-binding.json` were rewritten for a **different candidate**. The binding now names preview `e0a7ed7c6fdd8b74` (released 04:09:02Z), and `src/site-design.css` now hashes `16ccc517698f…` and contains the padding rules (`#root[data-prerender] .target-hero { margin-top: 0 }`, `#root[data-prerender] #main-content { padding-top: var(--header-height) }`) instead of `flow-root`. The manifest's `index.html` is `d6cedffe…`, not the `22287a8f…` I verified. `dist-booking/` was being rebuilt at the same time (briefly without `index.html`).

- My verdict covers only `5ddc5f0930566d87`, whose freeze I verified at about 07:05 and whose `index.html` I re-verified byte-for-byte from the preview.
- The successor has not been reviewed by me. Its reported package evidence shows zero for 19 of 20 runs so far and Lighthouse 92 and 87 with CLS 0 (`root-padding-cls.json` was still "running" when I looked), which is consistent with my A/B on the same CSS, but that is not a review.
- The request said no product edits while I review. Superseding the freeze is understandable (the evidence made the candidate obsolete), but each candidate needs its own frozen binding and measurement set; old `measurement-binding` files must not be read as binding the new one.

## 7. Open items

**P0, P1:** none.

**P2-1.** The residual `#root` / `.target-site` shift (0.05–0.087 in lab) is still open on both the live release and this candidate. It is invisible to fast connections and was not measured in the field.
**P2-2.** `root-containment-binding.json` does not exist; the evidence for this candidate was unbound when it was superseded.

**P3.** The twenty real-throttled runs cannot reject a defect that occurs in about 5% of runs; use the chunked-delivery reproduction as the acceptance test for this class of defect.

## 8. What I need to see to grant GO for the successor

1. A fresh freeze for the padding approach with `source-hashes.json`, `build-manifest.json` and `frozen-binding.json` bound to one preview version and not overwritten again during review; the 219/94 counts recomputed.
2. The chunked-HTML A/B above (old, new; 390 and 1440; delay 700 ms and 0) giving CLS 0 and final hero y=72, plus the real-throttled 20 runs at or below 0.1 and no `div#root` / `div.target-site` shift source.
3. Unchanged visible geometry across the 12 style cases, hydration (528/528), navigation and the 7 private shells, because the padding approach moves a margin into a parent and could change cases the flow-root rule could not (for example, the mobile menu or any other child of `main`).
4. Hosting-only preconditions as before: recompute hashes at the moment of publication, deploy `hosting:hilik-site` only from `dist-booking/` with `firebase.hosting.booking.json`, keep `fc3fb8e9bfbbe1e5` as the rollback target, and re-check the production home afterwards (no `noindex`, GSC file 200, private routes keep their headers). I will not publish; that remains the owner's action.

## 9. Bindings for this review

- Candidate preview `projects/hilik-site/sites/hilik-site/versions/5ddc5f0930566d87`, released 2026-10-11T04:04:02.945Z, `https://hilik-site--seo-aeo-oct10-t8bg3pcs.web.app`
- Candidate `index.html` sha256 `22287a8fb19d19b32354a79042df2859549fd9e3cdd606ff7bd0eb1f7a19547a` (preview bytes equal the frozen manifest entry)
- Accepted live comparison: release `fc3fb8e9bfbbe1e5`, entry `assets/booking-index-sh8y-g7o.js`
- On-disk freeze files as of 07:11 (superseding, not reviewed), binding preview `e0a7ed7c6fdd8b74`: `source-hashes.json` sha256 `3f398d8f305f0a83b8efbb2bd48a3784dd6cfbbfdd4d242152399b1c745ae48a`, `build-manifest.json` `acc087834f1f00a5af21766032807d9c1e488034bc38170bd49b9da2e8ac7d2f`, `frozen-binding.json` `a398bd57d48cc68a4c172eed1b681c5e6b9696f847d0e71b23de627caf3f6263`. The freeze I verified at 07:05 for `5ddc5f0930566d87` no longer exists on disk under those file names
- Package evidence read: `root-containment-cls.json`, `root-containment.json`, `hydration-root-containment.json`, `navigation-root-containment.json`, `lighthouse-root-containment-series.json`, `pagespeed-root-containment-1(.txt, -expanded.txt)`, `root-margin-probe.json`
- Tools: Playwright 1.63.0 with installed Chrome 154 (mine); Lighthouse 13.5.0 (package)
- My harnesses (scratch, not retained as evidence): hash recompute, live-versus-candidate HTML/CSS/JS diff, two-chunk streamed-HTML A/B with scratch CSS variants
