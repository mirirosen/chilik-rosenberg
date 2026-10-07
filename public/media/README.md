# Site media (hero loop and gallery posters)

Small, site-owned derivatives. The full tour videos stay on Google Cloud Storage
(`storage.googleapis.com/hilik-site-tour-videos/...`, see `src/data/content.js`).

## `hero/` — silent Bnei Brak ambient loop (plan §18, S7)

Built 2026-10-07 from Chilik's own productions only. No Channel 13 footage is used
in the background (those clips carry the broadcaster's logo, burned-in subtitles
and promos, and show private people).

| Order | Shot | Source file (GCS, hilik-bnei-brak/) | Source time (s) | Speed |
|---|---|---|---|---|
| 1 | Kugel on a plate (kiddush) | `bneibrak-150s.mp4` | 69.55–70.45 | 0.6× |
| 2 | Salad counter | `bneibrak-150s.mp4` | 70.80–71.70 | 0.6× |
| 3 | Deli liqueur shelf | `bneibrak-150s.mp4` | 28.05–29.45 | 0.75× |
| 4 | "שאבע'ס" storefront sign | `bneibrak-zoo-720p.mp4` | 60.80–61.72 | 0.6× |

The loop opens on food (continuing the earlier cholent image) rather than on the
storefront sign, which competed with the headline as a first frame.

Processing: square 720×720 crop centred on each subject, 0.4 s fade between shots,
no audio stream. `bnei-brak-ambient.mp4` (H.264 high, CRF 26, faststart),
`bnei-brak-ambient.webm` (VP9, CRF 38), poster `bnei-brak-ambient-poster.webp`
(frame at 0.5 s, the kugel, WebP q72).

ffprobe (observed): one video stream each (h264 / vp9), 720×720, 30 fps,
duration 5.17 s, no audio stream. Sizes: 486,991 B (mp4), 398,551 B (webm),
19,344 B (poster).

## `posters/` — one representative frame per gallery clip (plan §18, S8)

640×360 WebP (q70), named after the source file. Frames chosen without promo
banners: zoo 1.0 s, 150s 57 s, 120s 69.8 s, part-49 27 s, part-50 37 s,
part-51 9 s, part-58 19 s, part-59 16.5 s, part-60 22.5 s. Channel 13 clips keep
the broadcaster's on-screen logo, as in the clips themselves.
