# Business profile and purchase measurement implementation plan

> Execute the tasks in order in the existing dedicated checkout. One independent Codex reviewer must approve the exact code and external-edit candidate before publication.

**Goal:** Complete the verified parts of the existing Google Business Profile and audit purchase measurement without a real charge.

**Architecture:** Keep the existing GA4 tag, consent choices and server-confirmed purchase boundary. Prevent optional analytics storage failures from interrupting the paid confirmation. Public profile edits use approved facts only; private account evidence stays outside Git.

**Tech stack:** React, Vitest, existing Firebase Hosting, GA4 and Google Business Profile UI.

**Spec:** User request of 17 November 2026: complete the business profile, check GA4 purchases, implement work independent of further owner answers, obtain Codex review before publishing, and make no real charge.

## Constraints and review focus

- Keep purchase restricted to a valid reference with server-confirmed `paid` and `confirmed` state; no fabricated or historical purchase sent to Google.
- Preserve opt-out, private-route exclusions and existing providers, prices, capacity and booking notifications.
- Storage read/write failure must not turn a paid confirmation into an unavailable screen. Repeat status checks in one page must not duplicate a purchase, even when persistent storage fails.
- Normal persistent deduplication across reloads must remain effective. A browser that cannot persist storage cannot guarantee cross-reload suppression; GA4 still receives the same transaction ID.
- Update profile description and website attribution only after independent review. Phone, chat, location, hours, category and ownership remain pending verified facts.

## Tasks

- [ ] Audit existing profile, GA4 stream/key-event/report configuration and aggregate paid results in the same dated window. Record limitations privately.
- [ ] Add failing analytics storage tests and a real-component confirmation regression test; observe the expected failures before changing production code.
- [ ] Add minimal guarded storage and same-page deduplication; retain existing transaction ID and amount guards. Document the storage limitation.
- [ ] Run relevant suites, all three release builds and product boundaries; verify booking and mocked checkout with no real writes or analytics purchase transmission.
- [ ] Prepare exact profile description and website URL privately with approved source facts and unchanged-field baseline; request one independent Codex review of this candidate and code.
- [ ] Resolve review findings with the same reviewer, then publish only approved profile/Hosting edits and verify actual outcomes. Leave owner-dependent facts and processed-data uncertainty explicit.
