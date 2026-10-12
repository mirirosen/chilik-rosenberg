# Implementation and delivery lessons

These are diagnostic patterns from actual releases, not instructions to reproduce one site's architecture. Prefer the smallest trace-supported change fitting the existing framework.

## Initial HTML and route boundaries

When prerendering an SPA, prefer actual public components over a visually different duplicate placeholder. Share facts, escape HTML, safely serialize JSON-LD and inspect serialized noscript; nested noscript HTML can become escaped text. Verify matching-language hydration errors/node reuse when hydration is part of the design.

Explicitly enumerate public, admin, checkout, payment-return, legal and demo entry shells. Do not leak home prerender content/schema/hero preloads into other shells. Preserve each route's policy; legal pages are not automatically private. Check direct entry and post-JS noindex in preview/demo. Prove that deployment gates accept the real edition and reject a modified demo rather than trusting a folder name.

## Saved-language stability

Import-time document direction changes can mirror old prerender content before alternate-language rendering. Diagnose with real network/CPU throttling; unthrottled or only simulated runs may miss it. When this mismatch exists, commit lang/dir and replacement content together using the framework's appropriate mechanism. Do not mandate synchronous rendering for every toggle. Test fresh primary/non-primary browser locale, saved alternate language and explicit switching.

## CSS, streaming and deferred sections

Inline CSS reduces stylesheet blocking but enlarges HTML. Critical CSS reduces bytes but risks missing styles. Choose using measured transfer/render cost and responsive coverage. Compare intended inline CSS with the actual bundle and verify request counts. Held-stylesheet tests are vacuous when no stylesheet is requested; use a missing-CSS negative control to prove the check detects breakage.

Streamed HTML can shift geometry absent from fully loaded snapshots. Hero margins may collapse through ancestors and shift the root. Trace rectangles. Moving spacing to appropriately scoped parent padding can preserve final geometry when collapse is the proven cause; flow-root alone may just move the shift. Check fixed-header offsets, responsive geometry and unaffected shells.

For content-visibility, validate intrinsic-size estimates and entry into view. Overlap can affect contrast and interaction. Test anchor arrivals, keyboard focus, saved scroll, media and navigation into deferred sections. Do not globally add containment just to raise a lab score.

## Assets and loading

Identify the actual LCP element/resource before preloading. Match responsive candidate/media and request attributes to the consumed resource; inspect duplicate requests. Verify deferred media in the target browser rather than assuming an attribute universally works.

When supplied imagery requires exact preservation, compare decoded RGBA pixels for lossless conversion; an encoder flag is insufficient evidence. Otherwise use visually checked appropriate compression. Preserve originals when required.

Before delaying an entry script, verify visible controls remain usable. Intent-triggered loading needs bounded waits, cleanup, failure fallback and cancellation so late code does not steal focus/scroll.

## Evidence and deployment

Bind reviewed scope to source hashes, build inventory, artifact hashes and reports. Helpers may rewrite evidence timestamps; explicitly update bindings instead of using obsolete hashes. Keep failed previews and historical results labeled.

Confirm project/site/config/edition and required review status before an authorized deploy. Frontend work does not imply backend, database rules or Auth changes. Retain an accepted rollback reference. Reconcile hosting-managed reserved files separately from local inventory.

After publication check canonical status, deployed identity, redirect query preservation, real 404, public indexability and private protection on the actual hostname. Recheck affected flows and comparable measurements. Windows emulators may mishandle URL/glob separators: diagnose the tool separately and verify real hosting before blaming production.

Choose verification from affected risks: raw/rendered metadata, fresh/saved language, JS/no-JS, relevant routes, mobile/desktop, FAQ parity, layout shifts and cancellation. Block external mutations or use authorized sandboxes. Unit/build passes do not establish a real payment succeeded.
