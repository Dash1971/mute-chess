import http from 'node:http';
import { isIP } from 'node:net';
import { createReadStream, statSync, realpathSync, readFileSync } from 'node:fs';

const domain = 'mutechess.org';
const source = '/opt/nosweatchess/current/source.tar.gz';
const revision = JSON.parse(readFileSync('/opt/nosweatchess/current/RELEASE.json', 'utf8')).gitCommit;
const buckets = new Map();
const websocketPaths = /^\/(?:socket(?:\/v\d+)?|analysis\/socket(?:\/v\d+)?|lobby\/socket(?:\/v\d+)?|play\/[A-Za-z0-9]{12}\/v\d+|watch\/[A-Za-z0-9]{8}\/(?:white|black)\/v\d+)$/;
function pathOf(req) {
  try { return decodeURIComponent(new URL(req.url, 'http://local').pathname).replace(/\/+/g, '/'); }
  catch { return ''; }
}
function clientIp(req) {
  const value = req.headers['cf-connecting-ip'];
  return typeof value === 'string' && isIP(value) ? value : '127.0.0.1';
}
function allowed(req) {
  const ip = clientIp(req), now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket && buckets.size >= 10000) return false;
  if (!bucket || bucket.until < now) { bucket = { until: now + 60000, requests: 0 }; buckets.set(ip, bucket); }
  return ++bucket.requests <= 600;
}
setInterval(() => { const now = Date.now(); for (const [key, value] of buckets) if (value.until < now) buckets.delete(key); }, 60000).unref();
function headers(req, upgrade = false) {
  const result = { ...req.headers, host: domain, 'x-real-ip': clientIp(req),
    'x-forwarded-for': clientIp(req), 'x-forwarded-proto': 'https', 'x-forwarded-host': domain };
  for (const key of ['forwarded', 'x-nosweat-instance', 'proxy-authorization', 'proxy-connection',
    'x-http-method-override', 'x-original-url', 'x-rewrite-url']) delete result[key];
  if (!upgrade) { delete result.upgrade; delete result.connection; }
  return result;
}
function reject(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(message);
}
const server = http.createServer((req, res) => {
  res.setHeader('X-NoSweat-Revision', revision);
  if (req.headers.host === 'www.' + domain) {
    res.writeHead(308, { Location: 'https://' + domain + req.url }); return res.end();
  }
  if (req.headers.host !== domain) return reject(res, 421, 'Unknown host');
  if (!allowed(req)) return reject(res, 429, 'Too many requests. Please try again shortly.');
  const path = pathOf(req);
  if (!path || path.startsWith('/club/internal') || path.startsWith('/cli') || path.startsWith('/dev/') ||
      path.startsWith('/monitor') || path.startsWith('/metrics')) return reject(res, 404, 'Not found');
  if (path === '/source.tar.gz') {
    if (!['GET', 'HEAD'].includes(req.method)) return reject(res, 405, 'Method not allowed');
    const file = statSync(source);
    res.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Length': file.size,
      'Content-Disposition': 'attachment; filename="mutechess-source.tar.gz"', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(source).on('error', () => res.destroy()).pipe(res);
  }
  if (path.startsWith('/assets/')) {
    if (!['GET', 'HEAD'].includes(req.method)) return reject(res, 405, 'Method not allowed');
    const relative = path.slice(8).replace(/^_[^/]+\//, '');
    const root = '/opt/nosweatchess/current/lila/public';
    let filename, file;
    try {
      filename = realpathSync(root + '/' + relative);
      if (!filename.startsWith(realpathSync(root) + '/') || relative.split('/').some(x => x.startsWith('.'))) throw Error();
      file = statSync(filename); if (!file.isFile()) throw Error();
    } catch { return reject(res, 404, 'Not found'); }
    const types = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css',
      '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
      '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4' };
    const immutable = /\.[a-f0-9]{8}\./i.test(relative) || relative.startsWith('hashed/') || /^lifat\/nnue\/nn-[a-f0-9]{12}\.nnue$/.test(relative);
    res.writeHead(200, { 'Content-Type': types[filename.slice(filename.lastIndexOf('.'))] ?? 'application/octet-stream',
      'Content-Length': file.size, 'Cache-Control': immutable ? 'public,max-age=31536000,immutable' : 'public,max-age=300',
      'Cross-Origin-Resource-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    return createReadStream(filename).on('error', () => res.destroy()).pipe(res);
  }
  if (path === '/source') { res.writeHead(302, { Location: '/source.tar.gz' }); return res.end(); }
  const profileRoute = ((path === '/dasher' && ['GET', 'HEAD'].includes(req.method)) ||
    (path === '/account/profile' && ['GET', 'HEAD', 'POST'].includes(req.method)) ||
    (['/account/security', '/account/twofactor'].includes(path) && ['GET', 'HEAD'].includes(req.method)) ||
    (/^\/account\/signout\/(?:all|[A-Za-z0-9_-]{1,128})$/.test(path) && req.method === 'POST'));
  const puzzleRoute = (['GET', 'HEAD'].includes(req.method) && /^\/training(?:\/[A-Za-z0-9_-]+){0,3}$/.test(path) && !/^\/training\/(?:coordinate|batch|new|of-player|frame)(?:\/|$)/.test(path)) ||
    (req.method === 'POST' && /^\/training\/(?:complete\/[A-Za-z0-9_-]+\/[A-Za-z0-9]{5}|difficulty\/[A-Za-z0-9_-]+|[A-Za-z0-9]{5}\/(?:vote(?:\/[A-Za-z0-9_-]+)?|report))$/.test(path));
  const supported = puzzleRoute || profileRoute || path === '/' || /^\/(?:club(?:\/|$)|analysis(?:\/|$)|editor(?:\/|$)|game(?:\/|$)|@\/|login$|signup$|logout$|player-count$|account\/now-playing$|lobby\/seeks$|timeline$|pref(?:\/|$)|whats-next\/|opening(?:\/|$)|api\/cloud-eval$|paste$|import$)/.test(path) || /^\/[A-Za-z0-9]{8}(?:[A-Za-z0-9]{4})?(?:\/(?:white|black))?$/.test(path);
  if (!supported) return reject(res, 404, 'This page is unavailable. Return to the homepage.');
  if (Number(req.headers['content-length'] ?? 0) > 16 * 1024 * 1024) return reject(res, 413, 'Request too large');
  const upstream = http.request({ hostname: '127.0.0.1', port: 29663, path: req.url,
    method: req.method, headers: headers(req), timeout: 30000 }, response => {
    const output = { ...response.headers, 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin',
      'strict-transport-security': 'max-age=31536000' };
    delete output['x-powered-by'];
    res.writeHead(response.statusCode, output); response.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) reject(res, 503, 'Mute Chess is restarting. Please try again shortly.');
    else res.destroy();
  });
  upstream.on('timeout', () => upstream.destroy());
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
  req.pipe(upstream);
});
server.on('upgrade', (req, socket, head) => {
  if (req.headers.host !== domain || req.headers.origin !== 'https://' + domain ||
      !websocketPaths.test(pathOf(req)) || !allowed(req)) return socket.destroy();
  const upstream = http.request({ hostname: '127.0.0.1', port: 29664, path: req.url,
    method: 'GET', headers: headers(req, true) });
  upstream.on('upgrade', (response, remote, upstreamHead) => {
    socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n` +
      Object.entries(response.headers).map(([key, value]) => `${key}: ${value}\r\n`).join('') + '\r\n');
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) remote.write(head);
    remote.on('error', () => socket.destroy()); socket.on('error', () => remote.destroy());
    remote.on('close', () => socket.destroy()); socket.on('close', () => remote.destroy());
    socket.pipe(remote).pipe(socket);
  });
  upstream.on('response', () => socket.destroy());
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
  upstream.end();
});
server.headersTimeout = 10000;
server.requestTimeout = 30000;
server.maxConnections = 512;
server.listen(29660, '127.0.0.1', () => console.log('Mute Chess public gateway ready on loopback'));
