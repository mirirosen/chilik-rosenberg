# Independent Codex review: organic-growth-audit

Date: 2026-10-12 (Asia/Jerusalem). Reviewer: separate Codex agent `/root/seo_aeo_skill_review`. Implementer: parent agent. No skill, website, provider, account, credential or deployment changes were performed by this reviewer.

Decision: **corrections requested**. Three actionable P2 findings; no P0/P1 findings. The skill has useful, generally accurate guidance, but narrow requests and incomplete/non-service scoring need explicit handling before closure.

## Reviewed scope and method

Read `SKILL.md`, `agents/openai.yaml`, all four references, `skill-creator/SKILL.md` and its `references/openai_yaml.md`. Reviewed the complete instruction set for scope, technical assertions, evidence, permissions, maintainability and contradictions. Performed independent desk-based forward tests with the hypothetical inputs below; these are reasoning tests, not executed website audits or observed engine outcomes. No external mutations were used.

Initial SHA-256:

| Relative file | SHA-256 |
|---|---|
| SKILL.md | 83BD9E3757EFB2FF8B1BA23371EA86D283D3EEAD8133BEAAE7ED7413A43C1BCF |
| agents/openai.yaml | 1D71E9F642EE606FC7A0B16EEA51C7342579AF801F6FD1A436F62BD132418C97 |
| references/content-and-answer-engines.md | 220E472F5DA76AACF582BE633DA33556FAC341C89EF8862D21D67F4FDD549782 |
| references/implementation-and-delivery.md | DAD119A48580E69A0BF07C418CBF7B3EFE4699061F9A007CA0506671EF6058C4 |
| references/primary-sources.md | 47D7422905AE17EB0A950BB0A040286926848E8CEB50EC467DC79D7464B7353B |
| references/scoring-and-measurement.md | 30CFE334553842F120BB1383AB763D820566C4F4E6BFD093F21F3412547AE8DA |

## Actionable findings

### F1 — P2: mandatory final deliverables expand narrow requests

Location: `C:/Users/User/.codex/skills/organic-growth-audit/SKILL.md:45` and `:49`; related baseline instructions at `:19`.

The entry point says it supports audit-only and measurement work within user scope, but later mandates saving a baseline, plan, changes, audit log, findings and final evidence, and producing a 30/60/90-day plan without a mode condition. The generic baseline also assumes a checkout and deployment target. A request such as “Inspect only this page's canonical and tell me whether it is wrong; do not change files” is naturally covered by SEO, yet following the final mandatory instructions produces unwanted files and a growth plan. A measurement-only request also does not need a deployment workflow.

Minimal fix: make repository/build/deployment work conditional on implementation/publication scope; identify unavailable checkout information as not applicable for remote-only work. Tie saved artifacts and a multi-month plan to the requested deliverable. Retain the substantial plan for a full growth assignment, and let a narrow audit/measurement return its focused evidence and next action.

### F2 — P2: default AEO rubric assumes a local/service business

Location: `C:/Users/User/.codex/skills/organic-growth-audit/references/scoring-and-measurement.md:25`–`:30` and `:32`.

The discovery description covers website SEO/AEO/GEO generally, but the fallback AEO score allocates 40 points to “Service/entity clarity” and “Accurate answers” with geography, service, price, duration and booking examples. There is no instruction to adapt applicability before baseline. A free open-source library documentation site can be excellent at answering API questions while having no service geography, ticket price, duration or booking. Treating these facts as missing either penalizes the wrong domain or invites irrelevant additions. Calling weights a convention does not specify how this input should be evaluated.

Minimal fix: explicitly describe the table as a starting example. Define applicable criteria for the site's actual purpose before baseline (for documentation, project/entity clarity and accurate technical answers), distinguish not applicable from unknown, and freeze the adapted criteria/denominator for comparison. Do not change weights after observing the result.

### F3 — P2: unknown-weight totals can be misreported as improvement

Location: `C:/Users/User/.codex/skills/organic-growth-audit/references/scoring-and-measurement.md:13`, `:30` and `:32`.

The instructions correctly deny invented credit and keep unknown observations labeled, but give no total/coverage convention and no rule for comparing scores when access to evidence changes. For example, an unchanged site earns 72 known points and has 10 visibility points unmeasured. After account access becomes available, the same site's previously existing citations earn eight points. Reporting 72 → 80 as improved readiness is misleading: only evidence coverage changed. The skill's broad separation of outcome types helps but does not settle the arithmetic or this comparison.

Minimal fix: show assessed/unknown/not-applicable weight alongside any aggregate, or use an explicitly labeled lower-bound score with unknown-weight coverage. Distinguish evidence newly observed from underlying product improvement. Compare the shared assessed criteria or re-evaluate the archived baseline when defensible; otherwise mark the aggregate comparison limited. Retain the frozen rubric and never normalize missing points away silently.

## Forward-test cases

| Input | Desk-based result under initial instructions |
|---|---|
| Canonical-only remote audit, explicitly no file writes | Conflicting full-delivery requirements: F1. Correct focus is status, canonical target and requested explanation; no checkout/build/growth plan. |
| Free open-source library docs, full SEO/AEO grade, no existing rubric | Service/booking evidence has undefined applicability: F2. Requires a purpose-appropriate baseline rubric. |
| Same unchanged site, AI evidence unavailable before / available after | Unknown-credit rule allows 72 → 80 without distinguishing evidence acquisition: F3. |
| Full local-tour improvement assignment, publication authorized, saved English preference | Sound: verify facts, raw/rendered parity, language stability, protected routes, independent required review and artifact identity. No mandatory architectural rewrite is prescribed. |
| “Get to 100” after planned mobile scores 100, 98, 96 | Sound: keep all comparable runs, report range/median, do not rerun solely for 100, separate readiness and outcomes. |
| Audit plus proposed robots change; no deployment authorization | Sound: skill invocation alone authorizes neither crawler-policy publication nor deployment; prepared change stays reviewable. Existing explicit authorization remains usable. |
| Claimed FAQ markup guarantees Google rich results or AI citations | Sound: markup validity, feature support and measured citation are separate; live docs required. |
| Required independent Codex reviewer unavailable | Sound: review remains pending, no implementing-agent self-certification. Active project/user policy chooses the channel. |

## Technical claim verification

Official sources read on 2026-10-12. No actionable false-platform claim found:

- [Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) supports ordinary SEO, original useful content, no special AI markup/chunking, and Google Search ignoring llms.txt. Its July 2026 reporting guidance is newer than the older AI-features page; the skill correctly warns about stale conflicting reporting text.
- [Google documentation updates](https://developers.google.com/search/updates) confirms FAQ rich results stopped appearing on May 7, 2026 and documentation was removed in June. This unusual dated claim was independently verified rather than rejected from older recollection.
- [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) and [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring) support the corresponding high-level guidance.

## Structural validation and optional notes

All four references are linked from the entry point. Required name/description and UI metadata look consistent; default prompt explicitly names `$organic-growth-audit`, short description is within the documented limit, and automatic invocation was not disabled. No scaffold placeholders or provider-specific review requirement were found.

Attempting bundled `quick_validate.py` was blocked by the environment: Windows `python` is an App Execution Alias; the discovered bundled interpreter starts but lacks `yaml` (`ModuleNotFoundError`). This is an execution limitation, not a skill finding. Parent may use its existing validated Python/PyYAML setup; do not report this reviewer ran a successful structural validator until it actually does.

Optional, not acceptance blockers: clean up compact typography such as `real404` and `First30days` if editing nearby; a short official-reference link for a non-Google AI crawler could ease future discovery, but live engine-specific checking is already required. Do not add engine catalogs or universal architecture rules solely for completeness.

Independent closure is pending receipt of a corrected candidate. Reviewer must re-read changed files and rerun relevant scenarios; this report does not certify a version not yet reviewed.

## Independent closure — corrected candidate

The preceding sections preserve the initial review. **Final decision: accepted for the reviewed skill scope, zero open actionable findings.** This acceptance is skill instruction/structure review, not product certification or a promise of search/AI results.

Independently read the actual updated entry point and full scoring reference, examined the entire baseline/candidate diff, and verified all six candidate file hashes directly from disk against the candidate manifest. No reliance on the implementer's description as evidence of closure.

| Finding | Closure evidence |
|---|---|
| F1 | Explicit mode selection now limits narrow audits/measurement to requested evidence, conditions code/build/publication work and saved artifacts, and restricts the 30/60/90 plan to full growth/planning scope. Canonical-only remote/no-write input produces a focused answer with URL/response evidence; no checkout, file write or growth plan is required. |
| F2 | Rubric tables are now examples; purpose-specific weighted criteria are chosen before baseline. Documentation and commerce examples demonstrate adaptation, not irrelevant service additions. N/A, unknown and applicable failure are distinguished; criteria/exclusions/denominator are frozen or a changed series is marked non-comparable. Open-source docs can be graded on project/API clarity without fabricated booking facts. |
| F3 | Earned E, assessed K, unknown U and excluded N are reported; A=K+U remains fixed. Lower bound and coverage disclose missing evidence. The unchanged-site example explicitly separates acquired evidence from product improvement and disallows projecting current citations into an unobserved past. Shared-criteria or defensible archived comparison handles the original failure. |

Repeated all eight desk-forward scenarios. The three failure cases above are resolved; saved-language, score-chasing, mutation authorization, FAQ/citation and unavailable-reviewer protections remain intact. Additional arithmetic checks: E=60, K=70, U=10, N=20 gives A=80, a 75/100 lower bound, 87.5% assessed coverage and an explicitly possible 75–87.5 range; unknown weight remains in A rather than inflating the result to 60/70. A later change in applicability requires the now-documented rubric version/non-comparability handling.

Re-ran the actual bundled structural validator with the existing isolated PyYAML path supplied by the parent (`C:/Users/User/.codex/tmp/seo-skill-validation-deps`): exit 0, **“Skill is valid!”**. The earlier environment limitation is resolved for this run; no package installation or skill mutation was performed by the reviewer. Previously confirmed reference routing and UI fields remain consistent. Remaining optional observations do not block acceptance and do not require further edits.

Accepted exact SHA-256:

| Relative file | SHA-256 |
|---|---|
| SKILL.md | db7da3114b41879f2242a26f0b5b0da8ee4e64681f14321f28b49ca83367de67 |
| agents/openai.yaml | 1d71e9f642ee606fc7a0b16eea51c7342579af801f6fd1a436f62bd132418c97 |
| references/content-and-answer-engines.md | 2baacb6ee98d991fd6187a9f1cbf7bccc935cfdc6a354b8cdab1c8d1f8e586e4 |
| references/implementation-and-delivery.md | f6ddf928380979649bd88e07ba9816e1e96c1df5671425b6cf6eb60f53f35f23 |
| references/primary-sources.md | 47d7422905ae17eb0a950bb0a040286926848e8ceb50ec467dc79d7464b7353b |
| references/scoring-and-measurement.md | 47209c476d9e00fccceb232f7c39fc16e40a98041936d62e5396eca8e4235863 |

All file hashes matched the final candidate manifest during closure. Future substantive edits require their own appropriate verification; this decision binds only these bytes. No website or production deployment was requested or performed in this review.

## Repository release-scope review

At the user's subsequent explicit request to push the skill, reviewed the isolated checkout `C:/Users/User/.codex/tmp/hilik-seo-skill-release-20261012`. HEAD and `origin/main` both resolved to `d21f32c1a53babb5899d3593f4832b4faaa8da1a` at inspection. **Release-scope decision: accepted, zero findings**, bound to the six staged additions described below; this review neither commits nor pushes.

The cached diff consists exclusively of the six previously accepted files under `.agents/skills/organic-growth-audit/` (206 inserted lines, no deletions). Verified every working-copy file AND every staged Git blob directly using SHA-256 against the accepted candidate manifest; all match the exact accepted hashes in the table above. Therefore Git line-ending conversion has not altered the reviewed bytes. `git diff --cached --check` passed. No unstaged diff or untracked files were present in this isolated checkout.

Ran bundled `quick_validate.py` on the repository copy with the existing isolated PyYAML path: exit 0, “Skill is valid!”. Path inventory includes only SKILL.md, agents/openai.yaml and the four linked references. No product/site source, credentials, providers, account configuration, backend, deployment config or unrelated project files occur in the proposed diff. This review did not touch the existing dirty website checkout or perform any deployment. Primary-branch coordination/publication remains with the implementing parent and existing authorization.
