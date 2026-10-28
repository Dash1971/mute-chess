import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import WebSocket from 'ws';
import { digest } from '../nostr-auth.mjs';

const origin = 'http://127.0.0.1:19663';
const run = randomBytes(3).toString('hex');
const token = (await readFile(new URL('../../config/adapter.env', import.meta.url), 'utf8')).match(/^ADAPTER_TOKEN=(.+)$/m)?.[1];
assert.ok(token);
const sockets = [];
async function call(path, { cookie, body, authorization, originHeader = origin, raw, expected = 200 } = {}) {
  const response = await fetch(origin + path, { method: body !== undefined || raw !== undefined ? 'POST' : 'GET', redirect: 'manual',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Origin: originHeader,
      ...(cookie ? { Cookie: cookie } : {}), ...(authorization ? { Authorization: authorization } : {}) },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined), signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let json; try { json = JSON.parse(text); } catch { json = text.slice(0, 300); }
  assert.equal(response.status, expected, `${path}: ${response.status} ${JSON.stringify(json)}`);
  return { json, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
}
async function login(index, key = generateSecretKey(), username = 'Check' + run + index, expected = 200) {
  const pubkey = getPublicKey(key);
  const { json: challenge } = await call('/club/challenge', { body: { pubkey } });
  const raw = JSON.stringify({ challenge: challenge.challenge, username });
  const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), content: '', tags: [
    ['u', origin + '/club/login'], ['method', 'POST'], ['challenge', challenge.challenge], ['payload', digest(raw)],
  ] }, key);
  const authorization = 'Nostr ' + Buffer.from(JSON.stringify(event)).toString('base64');
  const result = await call('/club/login', { raw, authorization, expected });
  if (expected !== 200) return result;
  assert.ok(result.cookie?.startsWith('nosweatliladev='));
  assert.ok(/httponly/i.test(result.headers.get('set-cookie')), 'Native session cookie must be HttpOnly');
  assert.ok(/samesite=lax/i.test(result.headers.get('set-cookie')), 'Native session cookie must be SameSite=Lax');
  assert.ok(/max-age=604800/i.test(result.headers.get('set-cookie')), 'Native session cookie must expire after seven days');
  await call('/club/login', { raw, authorization, expected: 401 });
  return { key, pubkey, cookie: result.cookie, username: result.json.username };
}
async function games() { return (await call('/club/internal/games', { authorization: 'Bearer ' + token })).json; }
async function waitFor(predicate, label) {
  const start = Date.now();
  while (Date.now() - start < 14000) { const value = await predicate(); if (value) return value; await delay(200); }
  throw Error('Timed out: ' + label);
}
async function round(game, user) {
  return (await call('/game/' + game.url.slice(1), { cookie: user.cookie })).json;
}
async function connect(game, user) {
  const data = await round(game, user);
  assert.equal(data.player.spectator, undefined);
  assert.ok(data.opponent.user?.title === 'BOT' || data.opponent.user?.title === 'BOT');
  const ws = new WebSocket(`ws://127.0.0.1:19664/play/${game.url.slice(1)}/v5?sri=check${run}&v=${data.player.version}`, {
    headers: { Cookie: user.cookie, Origin: origin },
  });
  const events = [];
  ws.on('message', data => { try { events.push(JSON.parse(String(data))); } catch {} });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  sockets.push(ws);
  return { ws, events };
}
async function abort(game) { await call(`/club/internal/${game.id}/failure`, { authorization: 'Bearer ' + token, body: {} }); }

let first, second;
try {
  await waitFor(async () => {
    try {
      const [app, adapter] = await Promise.all([
        fetch(origin + '/club/roster', { signal: AbortSignal.timeout(2000) }),
        fetch('http://127.0.0.1:19665/health', { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(2000) }),
      ]);
      return app.ok && adapter.ok;
    } catch { return false; }
  }, 'private app and Maia readiness');
  await call('/club/internal/games', { expected: 403 });
  await call('/club/challenge', { body: { pubkey: 'a'.repeat(64) }, originHeader: 'https://untrusted.invalid', expected: 403 });
  const roster = (await call('/club/roster')).json;
  assert.equal(roster.length, 44);
  await login('reserved', generateSecretKey(), 'lichess', 409);
  await login('reservedbot', generateSecretKey(), 'PixelMoth', 409);
  const a = await login('a'); const b = await login('b'); const c = await login('c');
  const same = await login('again', a.key, 'ShouldNotRename');
  assert.equal(same.username, a.username);
  assert.equal((await call('/club/me', { cookie: a.cookie })).json.user.username, a.username);
  await call('/setup/hook', { body: {}, cookie: a.cookie, expected: 403 });
  await call('/login', { body: {}, expected: 403 });
  await call('/club/play', { cookie: a.cookie, body: { bot: 'pixel-moth', control: 'bullet' }, expected: 400 });
  first = (await call('/club/play', { cookie: a.cookie, body: { bot: 'pixel-moth', control: 'blitz', color: 'white' } })).json;
  assert.equal(first.rated, false);
  const repeat = (await call('/club/play', { cookie: a.cookie, body: { bot: 'cipher-fox', control: 'rapid' } })).json;
  assert.equal(repeat.id, first.id, 'Duplicate requests rejoin the same game');
  second = (await call('/club/play', { cookie: b.cookie, body: { bot: 'analog-ghost', control: 'rapid', color: 'black' } })).json;
  await call('/club/play', { cookie: c.cookie, body: { bot: 'cipher-fox', control: 'blitz' }, expected: 503 });
  await call('/club/game/' + first.id, { cookie: b.cookie, expected: 404 });
  const details = (await call('/club/game/' + first.id, { cookie: a.cookie })).json;
  assert.equal(typeof details.policy.history, 'boolean');
  assert.equal(details.policy.samplingSeed, undefined);
  assert.equal(details.policy.modelSha256, '3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010');
  const { ws, events } = await connect(first, a);
  ws.send(JSON.stringify({ t: 'move', d: { u: 'e2e4', a: 1 } }));
  const replied = await waitFor(async () => (await games()).find(g => g.id === first.id && g.ply >= 2), 'Maia reply');
  assert.equal(replied.state.moves.split(' ')[0], 'e2e4');
  assert.equal(replied.state.moves.split(' ').length, 2);
  assert.ok(replied.state.btime < 303000 && replied.state.btime > 280000, 'Maia inference and waiting consume the native clock');
  assert.ok(events.some(e => e.t === 'move'), 'Native WebSocket broadcasts moves');
  const before = replied.state.moves;
  ws.send(JSON.stringify({ t: 'move', d: { u: 'e2e4', a: 1 } }));
  await delay(350);
  assert.equal((await games()).find(g => g.id === first.id).state.moves, before, 'An invalid/stale retry cannot apply a move twice');
  ws.close();
  const reconnected = await connect(first, a);
  reconnected.ws.send(JSON.stringify({ t: 'move', d: { u: 'g1f3', a: 2 } }));
  await waitFor(async () => (await games()).find(g => g.id === first.id && g.ply >= 4), 'move after reconnect');
  await waitFor(async () => (await games()).find(g => g.id === second.id && g.ply >= 1), 'Maia plays white');
  const black = await connect(second, b);
  black.ws.send(JSON.stringify({ t: 'move', d: { u: 'c7c5', a: 1 } }));
  await waitFor(async () => (await games()).find(g => g.id === second.id && g.ply >= 3), 'Maia rapid reply');
  reconnected.ws.send(JSON.stringify({ t: 'resign' }));
  await waitFor(async () => !(await games()).some(g => g.id === first.id), 'native resignation');
  const pgn = await fetch(origin + '/game/export/' + first.id, { headers: { Cookie: a.cookie } });
  assert.equal(pgn.status, 200); assert.match(await pgn.text(), /1\. e4/);
  if (process.argv.includes('--worker-failure')) {
    const parent = Number(execFileSync('systemctl', ['--user', 'show', 'nosweat-lila-adapter', '--property=MainPID', '--value'], { encoding: 'utf8' }).trim());
    const children = (await readFile(`/proc/${parent}/task/${parent}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean);
    let worker;
    for (const child of children) {
      const command = await readFile(`/proc/${child}/cmdline`, 'utf8');
      if (command.includes(fileURLToPath(new URL('../maia_worker.py', import.meta.url)))) worker = Number(child);
    }
    assert.ok(worker, 'Locate only this private adapter worker');
    process.kill(worker, 'SIGKILL');
  } else await abort(second);
  await waitFor(async () => !(await games()).some(g => g.id === second.id), 'service failure void');
  const failed = (await call('/club/game/' + second.id, { cookie: b.cookie })).json;
  assert.equal(failed.state, 'service_failure');
  await call('/logout', { cookie: a.cookie, body: {} });
  assert.equal((await call('/club/me', { cookie: a.cookie })).json.user, null);
  console.log(JSON.stringify({ ok: true, fixtureRun: run, games: [first.id, second.id],
    checks: ['signed Nostr login and replay rejection', 'stable identity', 'native session and logout',
      '44 bots', 'reserved admission and capacity', 'both colors and clocks', 'real Maia replies',
      'native move WebSocket', 'stale move rejection', 'reconnect', 'resignation and PGN', 'service failure void'] }, null, 2));
} finally {
  for (const ws of sockets) ws.close();
  for (const game of [first, second].filter(Boolean)) {
    if ((await games().catch(() => [])).some(g => g.id === game.id)) await abort(game).catch(() => {});
  }
}
