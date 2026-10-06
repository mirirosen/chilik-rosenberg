import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(source, '.inquiry-cache', 'legacy-original');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'docs', 'inquiry-legacy-manifest.json'), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// Public static HTTP GETs only. Never authenticate, access admin data or deploy.
for (const file of manifest.files) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(file.path) || file.path.includes('..') || file.path.startsWith('/')) throw Error('Unsafe legacy path');
  const target = path.resolve(cache, file.path);
  if (!target.startsWith(cache + path.sep)) throw Error('Legacy path escaped cache');
  if (fs.existsSync(target) && sha(fs.readFileSync(target)) === file.sha256) continue;
  const url = new URL(file.path === 'index.html' ? '/admin' : '/' + file.path, 'https://hilik-site.web.app');
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error('Cannot obtain preserved public file: ' + file.path);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== file.size || sha(bytes) !== file.sha256) throw Error('Preserved public file changed: ' + file.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
console.log('Verified 15 preserved public legacy files in the ignored local cache.');
