# Tour-video gallery: nine provided clips

This draft references nine user-provided public KEEP clips in the `hilik-bnei-brak` group: three full clips and six short episodes. It does not edit or copy the videos, invent public footage or add promotional end cards. The `donkey-bnei-brak` group remains empty and hidden. If every `items` array is empty, both the section and its desktop/mobile navigation links render nothing. `#videos` resolves to the populated gallery.

All sources are under `https://storage.googleapis.com/hilik-site-tour-videos/hilik-bnei-brak/`. Item IDs and Hebrew/English titles preserve the supplied wording. The schema groups them by directory and stores those titles as `title.he`/`title.en`; `durationSec` preserves the supplied metadata and does not override the native player's decoded duration.

| ID | File | Supplied seconds |
| --- | --- | ---: |
| MxVd7LEjkJyq1eXMAuuT | bneibrak-zoo-720p.mp4 | 90 |
| ZUh34zcXVyiUPmbWPWAR | bneibrak-150s.mp4 | 150 |
| XEN797qZSr8SCo5xshoP | bneibrak-120s.mp4 | 120 |
| חלק-49 | part-49-hilik-invite-tour.mp4 | 44 |
| חלק-50 | part-50-tourists-to-bnei-brak.mp4 | 46 |
| חלק-51 | part-51-hilik-street-tourists.mp4 | 44 |
| חלק-58 | part-58-food-yapchik-tour.mp4 | 46 |
| חלק-59 | part-59-hilik-gefilte-tasting.mp4 | 44 |
| חלק-60 | part-60-zac-samantha-tour-react.mp4 | 46 |

The gallery belongs between Bio and MediaSection in `InquiryApp.jsx`, which is the contact-only public entry. Booking/payment code and production are outside this change.

## Future assets and metadata

Additional files are expected separately from `/workspace/haaretz-hamuvtachat/for-dot-site/` in another execution environment. This PR does not assume that path exists locally or fetch from it. Once more files are approved, put them in the corresponding `public/tour-videos/<group-id>/` directory (or use an approved HTTPS URL) and add items in a separate review.

Each group has an `id` and `items` array. Each item requires a unique stable `id`, a `src`, and nonempty `title.he` and `title.en` strings. A source may be `/tour-videos/...`, `tour-videos/...`, `public/tour-videos/...` (normalized to the public URL), or an absolute HTTPS media URL. Empty or incomplete items do not create a section or menu link. Do not use authentication credentials in URLs.

Optional fields:

- `poster`: a public local image or HTTPS URL; leave it absent until a real approved poster exists.
- `aspectRatio`: `16/9` (default), `9/16` or `1/1`. The player reserves this layout space and contains the footage without cropping.
- `captions`: an array of `{ src, srcLang, label: { he, en } }` objects for approved WebVTT files. The visitor's language selects the default caption track. Provide reviewed captions for spoken footage; local caption paths avoid cross-origin track restrictions.

Players use native controls, `playsInline` and `preload="metadata"`. They never autoplay. Titles label each player accessibly and use the selected site language. Layout follows RTL/LTR and the existing brand tokens, with no Lectify frame or end card added by the site.

The dedicated inquiry Hosting policy adds `media-src 'self' https:` for future HTTPS video URLs. API connections and form submission remain blocked. This configuration is not deployed by this PR. Cross-origin posters still need the existing image policy to permit their origin; local posters work without a policy change.

## Validation and release boundary

Run `npm run test:inquiry` and `npm run build:inquiry`. Populated test fixtures are metadata in the test suite only; they are never added to public content or published. Supplied URLs are checked with HTTP HEAD and native browser `loadedmetadata`; no new media files are downloaded into this repository or edited. Caption quality will be checked if reviewed caption files are supplied.

All nine URLs returned HTTP 200 and supported range requests. Native metadata reported 90.023267, 150.0499, 120.0199, 44.07, 46.06, 44.065, 46.06, 44.065 and 46.076 seconds in the table's order, matching the supplied whole-second durations within one second. The first two clips are 1280×720, the third is 854×480, and the six episodes are 1920×1080. Metadata loading was stopped immediately after decoding; no full playback or frame edits were performed for this change.

`docs/inquiry-publication.json` and `verify:inquiry` remain the immutable receipt for the earlier live Hosting version `61f29d16c280c86a`. This unreleased scaffold intentionally changes source/build hashes; it is not that previously published snapshot. Keep this PR as a draft. No merge or production deployment is authorized here.
