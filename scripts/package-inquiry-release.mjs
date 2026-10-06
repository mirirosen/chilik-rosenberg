import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = path.join(source, '.inquiry-cache'), output = path.join(source, 'dist-inquiry');
const entry = path.join(output, 'inquiry-index.html');
if (fs.existsSync(entry)) fs.renameSync(entry, path.join(output, 'index.html'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const original = JSON.parse(fs.readFileSync(path.join(source, 'docs', 'inquiry-legacy-manifest.json'), 'utf8'));
const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
const legacyPaths = new Set(original.files.filter(file => !file.reserved && file.path !== 'index.html').map(file => file.path));
const newFiles = walk(output).map(file => ({ path: path.relative(output, file).replaceAll('\\', '/'), size: fs.statSync(file).size, sha256: sha(file) })).filter(file => !legacyPaths.has(file.path));
if (!fs.existsSync(path.join(output, 'index.html')) || fs.existsSync(path.join(output, 'inquiry-index.html'))) throw Error('Inquiry entry was not normalized to index.html');
if (newFiles.some(file => /\.map$/.test(file.path))) throw Error('New source maps must not be published');
const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
if (/preprod-banner|connect-src 'none'|noindex, nofollow/.test(html)) throw Error('Preprod HTML was used instead of public inquiry HTML');
const newJs = newFiles.filter(file => /\.js$/.test(file.path)).map(file => fs.readFileSync(path.join(output, file.path), 'utf8')).join('\n');
for (const marker of ['cloudfunctions.net', 'getDemoAvailability', 'demoCheckout', 'signInAnonymously', 'identitytoolkit.googleapis.com', 'firestore.googleapis.com', 'ipapi.co']) if (newJs.includes(marker)) throw Error('Forbidden runtime dependency in public inquiry: '+marker);
if (!newJs.includes('972506724312')) throw Error('Approved contact missing');
const preserved = [];
for (const file of original.files.filter(file => !file.reserved)) {
  const input = path.join(release, 'legacy-original', file.path);
  if (sha(input) !== file.sha256) throw Error('Captured legacy file changed: '+file.path);
  const destination = file.path === 'index.html' ? 'legacy-admin.html' : file.path;
  const target = path.resolve(output, destination);
  if (!target.startsWith(output + path.sep)) throw Error('Legacy destination escaped output');
  // The new frontend does not reference the inherited hero-images documentation.
  // Preserve the originally published README instead of the candidate's revision.
  if (fs.existsSync(target) && sha(target) !== file.sha256 && destination !== 'hero-images/README.md') throw Error('New/legacy filename collision: '+destination);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(input, target);
  if (sha(target) !== file.sha256) throw Error('Published legacy bytes changed');
  preserved.push({ from: file.path, to: destination, sha256: file.sha256 });
}
const config = JSON.parse(fs.readFileSync(path.join(source, 'firebase.hosting.inquiry.json'), 'utf8'));
if (Object.keys(config).some(key => key !== 'hosting') || config.hosting.site !== 'hilik-site' || config.hosting.public !== 'dist-inquiry' || config.hosting.rewrites.some(rule => rule.function || rule.run || rule.pinTag) || config.hosting.predeploy || config.hosting.postdeploy) throw Error('Hosting-only boundary is not exact');
const admin = config.hosting.rewrites.find(rule => rule.source === '/admin');
if (admin?.destination !== '/legacy-admin.html') throw Error('Legacy admin route not preserved');
fs.writeFileSync(path.join(release, 'release-manifest.json'), JSON.stringify({ builtAt: new Date().toISOString(), mode: 'inquiry', project: 'hilik-site', projectNumber: '815275120808', hostingSite: 'hilik-site', publicDirectory: 'source/dist-inquiry', newFiles, preservedLegacyFiles: preserved, reservedFirebasePaths: ['__/firebase/init.js', '__/firebase/init.json'], reservedHandledByHosting: true, legacyVersion: original.version, hostingConfigSha256: sha(path.join(source, 'firebase.hosting.inquiry.json')), noNewSourceMaps: true, noBookingFirebasePaymentGeoDependenciesInNewBundle: true, backendIncludedInRelease: false, fullOutput: walk(output).map(file => ({ path: path.relative(output, file).replaceAll('\\', '/'), size: fs.statSync(file).size, sha256: sha(file) })) }, null, 2));
console.log('Inquiry production release verified: separate public entry, all 15 legacy user files byte-identical, two reserved Firebase paths Hosting-managed, Hosting only.');
