# Site media (hero loop and gallery posters)

Small, site-owned derivatives. The full tour videos stay on Google Cloud Storage
(`storage.googleapis.com/hilik-site-tour-videos/...`, see `src/data/content.js`).

## `hero/` — silent Bnei Brak ambient sequence (plan §18, S7; hero v2, board 7)

Built 2026-10-07 from Chilik's own productions only. No Channel 13 footage is used
in the background (those clips carry the broadcaster's logo, burned-in subtitles
and promos, and show people who are not part of the tour).

Five chapters, one silent loop. Script: `media-cache/build-loop.cjs` (outside the
repo, with the source downloads).

| Chapter | Shot | Source file (GCS, hilik-bnei-brak/) | Source time (s) | Speed | Phone crop centre |
|---|---|---|---|---|---|
| Food | Kugel on a plate (kiddush) | `bneibrak-150s.mp4` | 69.60–70.45 | 0.5× | 0.60 |
| Food | Salad counter | `bneibrak-150s.mp4` | 70.80–71.70 | 0.5× | 0.50 |
| Street | Chilik and guests on the street, with his sign | `bneibrak-zoo-720p.mp4` | 0.40–3.60 | 1× | 0.50 |
| The grocery | "שאבע'ס" sign | `bneibrak-zoo-720p.mp4` | 60.74–61.66 | 0.5× | 0.60 |
| People | A toast in the deli | `bneibrak-150s.mp4` | 52.00–55.80 | 1× | 0.62 |
| Chilik | Chilik smiling in the shop | `bneibrak-zoo-720p.mp4` | 62.00–66.00 | 1× | 0.55 |

Shot boundaries were checked with ffmpeg scene detection (cuts at zoo 3.77, 60.69,
61.69; 150s 69.54; none in 150s 50–62), so no shot crosses a cut.

Processing: slowed shots are motion-interpolated to 30 fps (`minterpolate`, mci);
0.4 s fade inside the food chapter, 0.6 s crossfades between chapters; the loop is
seamless (it ends on its own first frame: the chain closes on a copy of the first
shot and is trimmed so the last frame equals the first). No audio stream.
Chapter starts in the loop: food 0, street 2.2, the grocery 4.8, people 6.04,
Chilik 9.24 s (`CHAPTERS` in `src/components/Hero.jsx`).

| File | Codec | Size (px) | Bytes |
|---|---|---|---|
| `bnei-brak-sequence.webm` | VP9, CRF 44 | 1280×720 | 2,031,096 |
| `bnei-brak-sequence.mp4` | H.264 high, CRF 27, faststart | 1280×720 | 2,623,877 |
| `bnei-brak-sequence-phone.webm` | VP9, CRF 44 | 576×720 (4:5) | 1,187,153 |
| `bnei-brak-sequence-phone.mp4` | H.264 high, CRF 27, faststart | 576×720 (4:5) | 1,429,722 |
| `bnei-brak-sequence-poster.webp` | WebP q72, first frame | 1280×720 | 26,520 |
| `bnei-brak-sequence-phone-poster.webp` | WebP q72, first frame | 576×720 | 13,600 |

ffprobe (observed): one video stream each (vp9 / h264), 30 fps, duration 12.93 s,
no audio stream. Only one video file is ever requested per visit (phone or desktop,
WebM when VP9 is supported), after `load` and idle, and never under reduced motion,
Save-Data or `prefers-reduced-data` unless the visitor presses Play.

## `posters/` — one representative frame per gallery clip (plan §18, S8)

640×360 WebP (q70), named after the source file. Frames chosen without promo
banners: zoo 1.0 s, 150s 57 s, 120s 69.8 s, part-49 27 s, part-50 37 s,
part-51 9 s, part-58 19 s, part-59 16.5 s, part-60 22.5 s. Channel 13 clips keep
the broadcaster's on-screen logo, as in the clips themselves.
