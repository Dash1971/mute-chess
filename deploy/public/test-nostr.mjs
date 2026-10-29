import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

const root = await mkdtemp(join(tmpdir(), 'mutechess-gateway-'));
let server, upstream;
try {
  upstream = http.createServer((req, res) => { res.writeHead(209); res.end(req.url); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  await mkdir(join(root, 'lila/public/nosweat'), { recursive: true });
  await writeFile(join(root, 'RELEASE.json'), JSON.stringify({ gitCommit: 'test-revision' }));
  for (const name of ['app-icon-512.png', 'social.png', 'favicon-32.png']) {
    await writeFile(join(root, 'lila/public/nosweat', name), 'image-fixture');
  }
  const source = await readFile(new URL('./gateway.mjs', import.meta.url), 'utf8');
  // Change only deployment paths and the listen call; execute the real request handler.
  const fixture = source.replaceAll('/opt/nosweatchess/current', root)
    .replace('port: 29663', `port: ${upstream.address().port}`)
    .replace(/^server\.listen\(29660,.*$/m, 'export { server };');
  assert.notEqual(fixture, source);
  await writeFile(join(root, 'gateway.mjs'), fixture);
  ({ server } = await import(join(root, 'gateway.mjs')));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = 'GET', host = 'mutechess.org') => new Promise((resolve, reject) => {
    const req = http.request(origin + path, { method, headers: { Host: host, Origin: 'https://primal.net' } }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: new Headers(res.headers),
        json: async () => JSON.parse(Buffer.concat(chunks).toString()),
        arrayBuffer: async () => Buffer.concat(chunks) }));
    });
    req.on('error', reject); req.end();
  });
  const response = await request('/.well-known/nostr.json?name=mutechess');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^application\/json/);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
  const identity = await response.json();
  assert.equal(identity.names.mutechess, '76be7cd760ed47c0414c6b1d769ae12db25e98f60cf045388ad2e5d8b7c31050');
  assert.equal(identity.names._, identity.names.mutechess);
  assert.equal(identity.names.club, identity.names.mutechess);
  assert.equal(identity.relays[identity.names.mutechess].length, 3);
  assert.equal((await request('/.well-known/nostr.json?name=unknown')).status, 200);
  assert.equal((await request('/.well-known/nostr.json', 'HEAD')).status, 200);
  assert.equal((await request('/.well-known/nostr.json', 'OPTIONS')).status, 204);
  assert.equal((await request('/.well-known/nostr.json', 'POST')).status, 405);
  assert.equal((await request('/.well-known/nostr.json', 'GET', 'evil.example')).status, 421);
  assert.equal((await request('/.well-known/other.json')).status, 404);
  assert.equal((await request('/metrics')).status, 404);
  for (const [path, method] of [
    ['/analysis', 'GET'], ['/account/preferences/display','GET'], ['/account/preferences/chess-clock','HEAD'],
    ['/account/preferences/game-behavior','GET'], ['/account/preferences','POST'],
    ['/account/preferences/notification','POST'], ['/storm','GET'], ['/storm','POST'], ['/streak','GET'],
    ['/api/streak','GET'], ['/api/player/autocomplete?term=Native','GET'],  ['/learn','GET'], ['/learn/score','POST'],
    ['/training/coordinate','GET'], ['/training/coordinate/score','POST'], ['/practice','GET'],
    ['/practice/load/BJy6fEDf/01234567','GET'], ['/practice/complete/01234567/2','POST'], ['/games','GET'],
    ['/games/best/replacement/01234567?exclude=abcdefgh','GET'], ['/forum','GET'],
    ['/forum/mute-feedback/new','POST'], ['/forum/mute-feedback/a-topic/new','POST'],
    ['/forum/delete/aPostId','POST'], ['/study','GET'], ['/study','POST'], ['/study/01234567/abcdefgh','GET'],
    ['/run/captcha/00000000?solution=e2e4','GET'], ['/notify','GET'], ['/notify/clear','POST'],
  ]) assert.equal((await request(path, method)).status, 209, `${method} ${path}`);
  for (const [path, method] of [
    ['/account/preferences/network','GET'], ['/account/preferences/network','POST'], ['/account/passwd','POST'],
    ['/account/oauth/token','GET'], ['/api/account/preferences','GET'], ['/api/study','POST'],
    ['/api/streak/27','POST'], ['/storm','DELETE'], ['/learn','DELETE'], ['/games/atomic','GET'], ['/forum/search','GET'],
    ['/study/search','GET'], ['/blog','GET'], ['/coach','GET'], ['/club/internal/games','GET'],
  ]) assert.equal((await request(path, method)).status, 404, `${method} ${path}`);
  for (const name of ['app-icon-512.png', 'social.png', 'favicon-32.png']) {
    const image = await request('/assets/nosweat/' + name);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('cross-origin-resource-policy'),
      name === 'favicon-32.png' ? 'same-origin' : 'cross-origin');
    await image.arrayBuffer();
  }
  console.log('NIP-05, CORS, public profile images and gateway boundary checks passed');
} finally {
  if (upstream?.listening) await new Promise(resolve => upstream.close(resolve));
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
