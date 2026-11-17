# Website typography

Requested 17 November 2026: more natural, attractive Hebrew typography. Assistant 400–700 handles body/UI; Frank Ruhl Libre 400–700 handles display headings. Existing sizes, controls, prices, booking logic, consent and CSP are preserved. Hebrew display headings use natural letter spacing.

The six WOFF2 subsets are copied unchanged from Google Fonts, with fingerprinted filenames. They cover Hebrew, Latin and Latin Extended. font-display:swap keeps fallback text visible. Runtime font requests remain same-origin; no Google Fonts stylesheet, external font request or new tracking is introduced. Full SIL OFL 1.1 notices accompany the font assets under public/fonts. Do not replace with a commercial design font or remove its license notices.

Official upstream families: https://github.com/google/fonts/tree/main/ofl/assistant and https://github.com/google/fonts/tree/main/ofl/frankruhllibre . CSS source: https://fonts.googleapis.com/css2?family=Assistant:wght@400..700&family=Frank+Ruhl+Libre:wght@400..700&display=swap

Verification: build all editions, check actual font loading/rendering and fallback on mobile/desktop HE/EN, guide and payment form readability, and the existing isolated registration/payment harness without real Auth/order/charge. One independent Codex review is required before the authorized Hosting publication.

Asset provenance (downloaded 2026-11-17T17:00:04.094Z):

- assistant-hebrew-f9805e7a.woff2 — 7312 bytes; SHA256 f9805e7a16e108bcf6701e6a623fcf560bff3f28522fa94d310e833b3bd60400; https://fonts.gstatic.com/s/assistant/v24/2sDcZGJYnIjSi6H75xkzamW5O7w.woff2
- assistant-latin-ext-5e2544c1.woff2 — 11132 bytes; SHA256 5e2544c15529ea4e9d1e9a8b074cab8013bc0c144b0fd9af9259eae94131a52c; https://fonts.gstatic.com/s/assistant/v24/2sDcZGJYnIjSi6H75xkzZmW5O7w.woff2
- assistant-latin-26b77cc3.woff2 — 22096 bytes; SHA256 26b77cc3179a17ab4cf970985d5e51f06c472abcc6415f9bff6651e9285f21c2; https://fonts.gstatic.com/s/assistant/v24/2sDcZGJYnIjSi6H75xkzaGW5.woff2
- frank-ruhl-libre-hebrew-acdf9ed0.woff2 — 18748 bytes; SHA256 acdf9ed0a3fc287df8401d796892c1f72118f291e510e38328396f48e200b08c; https://fonts.gstatic.com/s/frankruhllibre/v23/j8_w6_fAw7jrcalD7oKYNX0QfAnPW7Ll4ajn.woff2
- frank-ruhl-libre-latin-ext-0ec10091.woff2 — 20932 bytes; SHA256 0ec100915c6f4ad2a4eea9d04381d24e660564508d70237067aa5b80349b8c7f; https://fonts.gstatic.com/s/frankruhllibre/v23/j8_w6_fAw7jrcalD7oKYNX0QfAnPW77l4ajn.woff2
- frank-ruhl-libre-latin-b8081e5e.woff2 — 44332 bytes; SHA256 b8081e5e9acd530df59ef062f9274e201569b94c9bfa6881950f3eb259d7b375; https://fonts.gstatic.com/s/frankruhllibre/v23/j8_w6_fAw7jrcalD7oKYNX0QfAnPW7Dl4Q.woff2
