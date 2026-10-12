import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = process.argv.includes('--demo');
const output = path.join(root, demo ? 'dist-booking-demo' : 'dist-booking');
fs.renameSync(path.join(output, 'booking-index.html'), path.join(output, 'index.html'));
// The SSR asset map is a build input, never a public artifact.
if (fs.existsSync(path.join(output, '.vite/manifest.json'))) {
  fs.unlinkSync(path.join(output, '.vite/manifest.json'));
  fs.rmdirSync(path.join(output, '.vite'));
}
if (!demo) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/inquiry-legacy-manifest.json'), 'utf8'));
  for (const file of manifest.files.filter(file => !file.reserved)) {
    const source = path.join(root, '.inquiry-cache/legacy-original', file.path);
    if (crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex') !== file.sha256) throw Error('Legacy asset mismatch: ' + file.path);
    const destination = path.resolve(output, file.path === 'index.html' ? 'legacy-admin.html' : file.path);
    if (!destination.startsWith(output + path.sep)) throw Error('Invalid legacy asset destination');
    if (fs.existsSync(destination) && file.path !== 'hero-images/README.md' && crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex') !== file.sha256) throw Error('Legacy asset collision: ' + file.path);
    fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(source, destination);
  }
}
console.log(demo ? 'Booking demo packaged; live Auth, APIs and contact links disabled.' : 'Booking release packaged with the preserved legacy admin. No deployment performed.');
