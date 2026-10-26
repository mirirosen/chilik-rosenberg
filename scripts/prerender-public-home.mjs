import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const mode = process.argv[2];
if (!['booking', 'inquiry'].includes(mode)) throw Error('Production public modes only');
const output = path.resolve('dist-' + mode);
const manifest = JSON.parse(fs.readFileSync(path.join(output, '.vite/manifest.json'), 'utf8'));
const server = await createServer({ mode, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { renderPublicHome } = await server.ssrLoadModule('/scripts/render-public-home.jsx');
  const resolveAssets = html => {
    for (const [source, entry] of Object.entries(manifest)) {
      if (entry.file) html = html.replaceAll('/' + source, '/' + entry.file);
    }
    if (/\/(?:src|@fs)\//.test(html)) throw Error('Unresolved development asset in prerender');
    return html;
  };
  // The booking site also publishes an indexable English homepage at /en.
  // build-organic-pages.mjs wraps this markup into en.html and removes the file.
  if (mode === 'booking') fs.writeFileSync(path.join(output, '.prerender-en.html'), resolveAssets(await renderPublicHome(mode, 'en')));
  const content = resolveAssets(await renderPublicHome(mode, 'he'));
  const file = path.join(output, mode === 'booking' ? 'booking-index.html' : 'inquiry-index.html');
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'));
  const doc = dom.window.document, root = doc.getElementById('root');
  root.innerHTML = content;
  root.dataset.prerender = 'he';
  // Without JS the same complete copy remains readable, including FAQ answers.
  // Serialize first: JSDOM otherwise escapes nested noscript markup as text.
  const noScript = '<noscript><style>#faq [hidden]{display:block}#faq button{pointer-events:none}</style><p>להזמנה המקוונת יש להפעיל JavaScript. אפשר להתקשר לחיליק: <a href="tel:0506724312">0506724312</a>.</p></noscript>';
  fs.writeFileSync(file, dom.serialize().replace('</body>', noScript + '</body>'));
  dom.window.close();
  console.log('Prerendered complete Hebrew ' + mode + ' homepage' + (mode === 'booking' ? ' (and English /en markup)' : '') + ' from actual React components.');
} finally {
  await server.close();
}
