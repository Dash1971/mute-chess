import assert from 'node:assert/strict';
import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';

const origin = process.env.LILA_ORIGIN ?? 'http://127.0.0.1:19663';
const socketOrigin = process.env.LILA_SOCKET_ORIGIN ?? 'http://127.0.0.1:19664';
assert.equal(new URL(origin).hostname, '127.0.0.1', 'Private smoke tests require loopback');
assert.equal(new URL(socketOrigin).hostname, '127.0.0.1');

async function page(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  const html = await response.text();
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assert.match(html, /<html/);
  return { response, html };
}

function upgrade(originHeader, expectedStatus) {
  return new Promise((resolve, reject) => {
    const key = randomBytes(16).toString('base64');
    const request = http.request(new URL('/analysis/socket/v5?sri=nscsmoke', socketOrigin), {
      headers: {
        Connection: 'Upgrade', Upgrade: 'websocket',
        'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': key, Origin: originHeader,
      },
    });
    request.setTimeout(10000, () => request.destroy(new Error('WebSocket handshake timed out')));
    request.on('error', reject);
    request.on('upgrade', (response, socket) => {
      try {
        assert.equal(response.statusCode, expectedStatus);
        const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
        assert.equal(response.headers['sec-websocket-accept'], accept);
        socket.destroy();
        resolve();
      } catch (error) { socket.destroy(); reject(error); }
    });
    request.on('response', response => {
      response.resume();
      try { assert.equal(response.statusCode, expectedStatus); resolve(); }
      catch (error) { reject(error); }
    });
    request.end();
  });
}

await page('/');
const { response, html } = await page('/analysis');
assert.match(html, /analyse|analysis/);
await page('/editor');
await page('/analysis/pgn/' + encodeURIComponent('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *'));
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"<>]+)"/g)]
  .map(match => match[1].replaceAll('&amp;', '&'));
assert.ok(assets.length > 0, 'Analysis page must reference built local assets');
for (const path of [...new Set(assets)].slice(0, 8)) {
  const asset = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(10000) });
  assert.equal(asset.status, 200, path);
  assert.ok((await asset.arrayBuffer()).byteLength > 0, path);
}
await upgrade(origin, 101);
await upgrade('https://untrusted.invalid', 403);
console.log(JSON.stringify({
  ok: true, origin,
  checks: ['homepage', 'analysis', 'editor', 'PGN replay', 'local assets', 'WebSocket upgrade', 'WebSocket origin rejection'],
  isolation: {
    coop: response.headers.get('cross-origin-opener-policy'),
    coep: response.headers.get('cross-origin-embedder-policy'),
  },
}, null, 2));
