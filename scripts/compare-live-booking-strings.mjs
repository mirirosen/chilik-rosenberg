// Read-only parity check before a booking hosting deploy: every user-visible Hebrew/English string
// literal in the LIVE booking app chunks must also exist in the local dist-booking build.
//   node scripts/compare-live-booking-strings.mjs [--live https://www.chilik-tours.com] [--dist dist-booking]
// Uses public GET requests only. Exit code 1 lists the missing strings; a missing string is either a
// live feature absent from the source or an intentional copy change that must be justified.
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []));
const live = (args.live || 'https://www.chilik-tours.com').replace(/\/$/, '');
const dist = path.resolve(args.dist || 'dist-booking');
const VENDOR = /^(firebase-vendor|react-vendor|lucide-vendor)-/;
// Live strings this branch replaces on purpose, with the reason. Anything else missing fails the check.
const INTENTIONAL = new Map([
  ['? יש לוודא את פרטי ההזמנה והתשלום לפני האישור. האישור אינו מחייב כרטיס אשראי.',
    'no-hold-before-payment: the admin confirm dialog now says confirming reserves the seat if room is left'],
]);
const HEB = /[֐-׿]/;

const get = async url => {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`GET ${url}: ${response.status}`);
  return response.text();
};
// The booking page's entry chunk and every chunk it (transitively) references.
async function liveChunks() {
  const chunks = new Map(), queue = [...(await get(`${live}/booking`)).matchAll(/\/assets\/(booking-index-[\w-]+\.js)/g)].map(m => m[1]);
  while (queue.length) {
    const name = queue.shift();
    if (chunks.has(name) || VENDOR.test(name)) continue;
    const source = await get(`${live}/assets/${name}`);
    chunks.set(name, source);
    for (const [, ref] of source.matchAll(/(?:assets\/|\.\/)([\w-]+\.js)/g)) if (!chunks.has(ref)) queue.push(ref);
  }
  return chunks;
}
const unescape = s => { try { return JSON.parse('"' + s.replace(/"/g, '\\"').replace(/\\'/g, "'").replace(/\\`/g, '`') + '"'); } catch { return s; } };
const literals = src => (src.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || []).map(l => unescape(l.slice(1, -1)));
const english = s => /^[A-Z][a-z']+(?: [A-Za-z0-9'’,.:;!?()/%&-]+){1,}[.!?]?$/.test(s) && !/[{}<>=]|\b(?:px|rem|var)\b/.test(s);
const visible = s => HEB.test(s) || english(s);

const local = fs.readdirSync(path.join(dist, 'assets')).filter(f => /\.(js|css)$/.test(f)).map(f => fs.readFileSync(path.join(dist, 'assets', f), 'utf8')).join('\n');
let checked = 0, missing = 0, justified = 0;
for (const [name, source] of await liveChunks()) {
  const seen = new Set(), absent = [];
  for (const literal of literals(source)) for (const piece of literal.split(/\$\{[^}]*\}/).map(p => p.trim()).filter(Boolean)) {
    if (!visible(piece) || seen.has(piece)) continue;
    seen.add(piece);
    if (!local.includes(piece) && !local.includes(JSON.stringify(piece).slice(1, -1))) absent.push(piece);
  }
  const unexplained = absent.filter(piece => !INTENTIONAL.has(piece));
  checked += seen.size; missing += unexplained.length; justified += absent.length - unexplained.length;
  console.log(`${name}: ${seen.size} visible strings, ${absent.length} missing`);
  for (const piece of absent) console.log(`  - ${piece.replace(/\s+/g, ' ').slice(0, 240)}${INTENTIONAL.has(piece) ? `  [intentional: ${INTENTIONAL.get(piece)}]` : ''}`);
}
console.log(`TOTAL ${checked} checked, ${justified} intentionally replaced, ${missing} missing without justification`);
process.exitCode = missing ? 1 : 0;
