import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const mode = process.argv[2];
if (!['booking', 'inquiry'].includes(mode)) throw Error('Public production modes only');
const output = path.resolve('dist-' + mode);
const file = path.join(output, mode + '-index.html');
let html = fs.readFileSync(file, 'utf8');
// Discover the real responsive poster before parsing the full inline CSS and
// body. Mutually exclusive media queries keep each viewport to one image.
const parsed = new JSDOM(html);
const poster = parsed.window.document.querySelector('img.target-hero__food');
const phone = poster?.closest('picture')?.querySelector('source[media]');
if (!poster || !phone) throw Error('Responsive public hero poster missing');
for (const url of [poster.getAttribute('src'), phone.getAttribute('srcset')]) {
  if (!/^\/media\/hero\/[A-Za-z0-9_-]+\.webp$/.test(url || '')) throw Error('Unexpected hero poster path');
}
const posterPreloads = `<link rel="preload" as="image" fetchpriority="high" media="${phone.media}" href="${phone.srcset}"><link rel="preload" as="image" fetchpriority="high" media="(min-width: 768px)" href="${poster.getAttribute('src')}">`;
parsed.window.close();
// The booking template already supplies these hints. Regenerate them from the
// actual picture once, so inquiry and booking agree without duplicate hints.
html = html.replace(/<link\b[^>]*rel="preload"[^>]*>/g, link => /as="image"/.test(link) && /href="\/media\/hero\/[A-Za-z0-9_-]+\.webp"/.test(link) ? '' : link);
html = html.replace('<head>', '<head>' + posterPreloads);
const styles = [];
// Every responsive, LTR/RTL and interactive rule arrives with the public DOM.
// No activation script or late stylesheet is needed to complete the design.
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, link => {
  const href = link.match(/href="([^"]+)"/)?.[1];
  if (!href?.startsWith('/assets/') || !href.endsWith('.css')) return link;
  const cssFile = path.resolve(output, '.' + href);
  if (!cssFile.startsWith(output + path.sep)) throw Error('Invalid stylesheet path');
  const css = fs.readFileSync(cssFile, 'utf8');
  if (!css.trim() || /<\/style/i.test(css)) throw Error('Invalid stylesheet');
  // A relative asset URL would resolve differently inside HTML. Fail rather
  // than silently alter the design; current bundled CSS has no URL references.
  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    if (!/^(?:data:|https?:|\/|#)/i.test(match[2].trim())) throw Error('Relative CSS asset URL requires rebasing');
  }
  styles.push(`<style data-public-styles data-css-href="${href}">${css}</style>`);
  return '';
});
if (!styles.length) throw Error('No public stylesheet found');
let entry;
html = html.replace(/<script\b[^>]*type="module"[^>]*src="[^"]+"[^>]*><\/script>/g, tag => {
  if (entry) throw Error('Multiple public entries');
  entry = tag; return '';
});
const src = entry?.match(/src="([^"]+)"/)?.[1];
if (!src?.startsWith(`/assets/${mode}-index-`)) throw Error('Unexpected public entry');
// Download in parallel at low priority. Async execution happens only AFTER
// the root HTML exists, including cache hits; no timer or hidden content.
html = html.replace(/<link rel="modulepreload" /g, '<link rel="modulepreload" fetchpriority="low" ')
  .replace('</head>', `<link rel="modulepreload" fetchpriority="low" crossorigin href="${src}">${styles.join('')}</head>`)
  .replace('</body>', entry.replace('type="module"', 'type="module" async fetchpriority="low"') + '</body>');
fs.writeFileSync(file, html);
console.log(`Complete ${mode} public CSS inline; low-priority async hydration after root HTML, no activation dependency.`);
