// Local, read-only approximation of exact Firebase Hosting files/rewrites/headers.
// This is not evidence of deployed Hosting behavior. No proxy or write endpoint.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createGzip } from 'node:zlib';
const mode = process.argv[2] || 'booking';
if (!['booking', 'inquiry'].includes(mode)) throw Error('Unsupported mode');
const root = path.resolve(`dist-${mode}`);
const port = Number(process.argv[3] || 4173);
const config = JSON.parse(fs.readFileSync(`firebase.hosting.${mode}.json`, 'utf8')).hosting;
const match = (rule, pathname) => rule.regex ? new RegExp(rule.regex).test(pathname) : rule.source?.endsWith('/**') ? pathname.startsWith(rule.source.slice(0, -2)) : rule.source === pathname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let pathname, query; try { const url = new URL(req.url, 'http://localhost'); pathname = decodeURIComponent(url.pathname); query = url.search; } catch { res.writeHead(400); res.end(); return; }
  const redirect = config.redirects.find(rule => match(rule, pathname));
  if (redirect) { res.writeHead(redirect.type, { Location: redirect.destination + query }); res.end(); return; }
  const rewrite = config.rewrites.find(rule => match(rule, pathname));
  const file = path.resolve(root, (rewrite?.destination || (pathname === '/' ? '/index.html' : pathname)).slice(1));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, { 'Content-Type': types['.html'] }); res.end(fs.readFileSync(path.join(root, '404.html'))); return; }
  const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' };
  for (const rule of config.headers.filter(rule => match(rule, pathname))) for (const header of rule.headers) headers[header.key] = header.value;
  const compress = /\b gzip\b|^gzip|,gzip/.test(req.headers['accept-encoding'] || '') && ['.html', '.js', '.css', '.xml', '.txt', '.svg'].includes(path.extname(file));
  if (compress) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') res.end();
  else if (compress) fs.createReadStream(file).pipe(createGzip()).pipe(res);
  else fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Read-only ${mode} audit server: http://127.0.0.1:${port} (gzip supported)`));
