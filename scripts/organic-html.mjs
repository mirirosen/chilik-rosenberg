import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { organicCopy, guidePaths, siteOrigin, buildHomeSchema } from '../src/data/organicContent.js';
import { bookingFaqOverrides } from '../src/data/bookingFaqCopy.js';
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const schemaTag = graph => `<script id="organic-schema" type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
export function faqsFor(language = 'he', booking = false) {
  const base = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'src', 'locales', language + '.json'), 'utf8')).faqs;
  if (!booking) return base;
  const resources = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'apps', 'protected-booking', 'src', 'locales', language + '.json'), 'utf8'));
  for (const [key, value] of Object.entries(bookingFaqOverrides(language, resources))) base[key] = { ...base[key], ...value };
  return base;
}
export function overviewHtml(language = 'he', heading = 'h1') {
  const copy = organicCopy[language];
  return `<${heading}>${escapeHtml(copy.title)}</${heading}><p>${escapeHtml(copy.intro)}</p><dl>${copy.facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><p>${escapeHtml(copy.caution)}</p><nav aria-label="${escapeHtml(copy.guides)}"><h2>${escapeHtml(copy.guides)}</h2><ul>${guidePaths.map((path, index) => `<li><a href="${path}">${escapeHtml(copy.links[index])}</a></li>`).join('')}</ul></nav>`;
}
export function homeFallback(booking) {
  const copy = organicCopy.he;
  const faqs = faqsFor('he', booking);
  const heroTitle = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'src/locales/he.json'), 'utf8')).hero.title;
  return `<main id="main-content" class="organic-overview"><h1>${escapeHtml(heroTitle)}</h1>${overviewHtml('he', 'h2')}<p><a href="https://wa.me/972506724312">${escapeHtml(copy.contact)}</a></p><h2>${copy.faq}</h2>${Object.values(faqs).map(({ question, answer }) => `<section><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></section>`).join('')}<p><a href="tel:0506724312">0506724312</a> · <a href="mailto:hr20192022@gmail.com">hr20192022@gmail.com</a> · <a href="/terms">תנאי שימוש ותקנון</a></p></main>`;
}
export function metadataHtml({ title, description, path = '/', language = 'he', graph }) {
  const url = siteOrigin + path;
  return `<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<meta property="og:url" content="${url}"><meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:locale" content="${language === 'he' ? 'he_IL' : 'en_GB'}">
<meta property="og:image" content="${siteOrigin}/media/hero/bnei-brak-sequence-poster.webp">
<meta property="og:image:alt" content="${escapeHtml(title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${siteOrigin}/media/hero/bnei-brak-sequence-poster.webp">
${graph ? schemaTag(graph) : ''}`;
}
export function stripMetadata(html) {
  return html.replace(/<title>[\s\S]*?<\/title>/g, '').replace(/<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/g, '').replace(/<link rel="canonical"[^>]*>/g, '').replace(/<script id="organic-schema"[^>]*>[\s\S]*?<\/script>/g, '');
}
export function organicSeoPlugin(mode) {
  return {
    name: 'organic-seo-initial-html',
    transformIndexHtml(html) {
      if (!['inquiry', 'booking'].includes(mode)) return html;
      const copy = organicCopy.he;
      const booking = mode === 'booking';
      const graph = buildHomeSchema({ language: 'he', description: copy.description, faqs: faqsFor('he', booking) });
      const css = fs.readFileSync(path.join(sourceRoot, 'src', 'organic-seo.css'), 'utf8');
      return stripMetadata(html).replace('</head>', `${metadataHtml({ ...copy, graph })}<style>${css}</style></head>`)
        .replace(/<noscript>[\s\S]*?<\/noscript>/g, '<noscript><p>להזמנה המקוונת יש להפעיל JavaScript; לבירור אפשר להתקשר לחיליק.</p></noscript>')
        .replace('<div id="root"></div>', `<div id="root">${homeFallback(booking)}</div>`);
    },
  };
}
