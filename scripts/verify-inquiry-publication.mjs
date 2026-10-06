import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publication = JSON.parse(fs.readFileSync(path.join(source, 'docs', 'inquiry-publication.json'), 'utf8'));
const output = path.join(source, 'dist-inquiry');
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const files = walk(output);
if (files.length !== publication.publicAssets.length) throw Error('Published file count changed');
for (const file of publication.publicAssets) {
  const bytes = fs.readFileSync(path.join(output, file.path));
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== file.size || sha !== file.sha256) throw Error('Published file mismatch: ' + file.path);
}
const config = fs.readFileSync(path.join(source, 'firebase.hosting.inquiry.json'));
if (crypto.createHash('sha256').update(config).digest('hex') !== publication.hostingConfigSha256) throw Error('Published Hosting configuration changed');
console.log(`All ${files.length} public files and the dedicated Hosting configuration match published version ${publication.hostingVersion}.`);
