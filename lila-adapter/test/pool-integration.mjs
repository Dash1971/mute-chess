import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import WebSocket from 'ws';
import { digest } from '../nostr-auth.mjs';
const origin = 'http://127.0.0.1:19663';
const token = (await readFile(new URL('../../config/adapter.env', import.meta.url), 'utf8')).match(/^ADAPTER_TOKEN=(.+)$/m)[1];
const run = randomBytes(3).toString('hex'), sockets = [], created = [];
class Client {
  jar = new Map();
  cookie() { return [...this.jar].map(([key, value]) => key + '=' + value).join('; '); }
  async call(path, body, expected = 200, authorization, accept = 'application/json') {
    const response = await fetch(origin + path, { method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
      headers: { Origin: origin, Accept: accept, 'Content-Type': 'application/json', Cookie: this.cookie(), ...(authorization ? { Authorization: authorization } : {}) },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0], split = pair.indexOf('='); this.jar.set(pair.slice(0, split), pair.slice(split + 1));
    }
    const text = await response.text(); let result; try { result = JSON.parse(text); } catch { result = text; }
    assert.equal(response.status, expected, path + ': ' + response.status + ' ' + text.slice(0, 150));
    return result;
  }
  async login() {
    const key = generateSecretKey(), pubkey = getPublicKey(key);
    const { challenge } = await this.call('/club/challenge', { pubkey });
    const raw = JSON.stringify({ challenge, username: 'PoolCheck' + run });
    const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), content: '', tags: [
      ['u', origin + '/club/login'], ['method', 'POST'], ['challenge', challenge], ['payload', digest(raw)],
    ] }, key);
    const auth = 'Nostr ' + Buffer.from(JSON.stringify(event)).toString('base64');
    const login = await this.call('/club/login', raw, 200, auth);
    await this.call('/club/login', raw, 401, auth);
    return login;
  }
  async play(setup) { const game = await this.call('/club/play', setup); created.push(game); return game; }
  async round(game) { return this.call('/game/' + game.url.slice(1)); }
}
const admin = new Client();
const games = () => admin.call('/club/internal/games', undefined, 200, 'Bearer ' + token);
async function waitFor(predicate, label) {
  for (let i = 0; i < 90; i++) { const result = await predicate(); if (result) return result; await delay(200); }
  throw Error('Timed out: ' + label);
}
async function abort(game) {
  await admin.call('/club/internal/' + game.id + '/failure', {}, 200, 'Bearer ' + token);
  await waitFor(async () => !(await games()).some(g => g.id === game.id), 'void');
}
async function connect(client, game) {
  const round = await client.round(game);
  const ws = new WebSocket(`ws://127.0.0.1:19664/play/${game.url.slice(1)}/v5?sri=pool${run}&v=${round.player.version}`, {
    headers: { Cookie: client.cookie(), Origin: origin },
  });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  sockets.push(ws); return ws;
}
async function playAndResign(client, game) {
  const data = await client.round(game), white = data.player.color === 'white';
  const opponent = data.opponent.user;
  assert.equal(opponent.title, 'BOT');
  if (!game.anonymous) {
    assert.ok(Math.abs(data.player.rating - data.opponent.rating) <= 200);
  }
  let ws = await connect(client, game);
  if (!white) await waitFor(async () => (await games()).find(g => g.id === game.id && g.ply >= 1), 'white Maia first move');
  ws.send(JSON.stringify({ t: 'move', d: { u: white ? 'e2e4' : 'e7e5', a: 1 } }));
  await waitFor(async () => (await games()).find(g => g.id === game.id && g.ply >= (white ? 2 : 3)), 'Maia reply');
  ws.close(); ws = await connect(client, game);
  ws.send(JSON.stringify({ t: 'move', d: { u: white ? 'g1f3' : 'g8f6', a: 2 } }));
  await waitFor(async () => (await games()).find(g => g.id === game.id && g.ply >= (white ? 4 : 5)), 'reply after reconnect');
  ws.send(JSON.stringify({ t: 'resign' }));
  await waitFor(async () => !(await games()).some(g => g.id === game.id), 'resignation');
  const pgn = await client.call('/game/export/' + game.id, undefined, 200, undefined, 'application/x-chess-pgn');
  assert.match(pgn, /1\./);
  return { data, white };
}
try {
  const guest = new Client(), user = new Client();
  const home = await guest.call('/', undefined, 200, undefined, 'text/html');
  assert.match(home, /lobby__app/); assert.doesNotMatch(home, /Find a familiar opponent/);
  const loginPage = await guest.call('/login', undefined, 200, undefined, 'text/html');
  assert.match(loginPage, /nostr-extension/); assert.match(loginPage, /nostr-generate/); assert.match(loginPage, /nostr-nsec/);
  await guest.call('/club/play', { bot: 'pixel-moth' }, 400);
  const anonymous = await guest.play({ minutes: 5, increment: 3 });
  assert.equal(anonymous.anonymous, true); assert.equal(anonymous.rated, false);
  const same = await guest.play({ minutes: 10, increment: 0 }); assert.equal(same.id, anonymous.id);
  const owned = await guest.round(anonymous); assert.equal(owned.player.spectator, undefined);
  await user.login();
  const rated = await user.play({ minutes: 5, increment: 3 }); assert.equal(rated.rated, true);
  const initial = await user.round(rated); assert.equal(initial.player.rating, 1500); assert.equal(initial.player.provisional, true);
  await new Client().call('/club/play', { minutes: 5, increment: 3 }, 503);
  await playAndResign(guest, anonymous);
  const { white } = await playAndResign(user, rated);
  const final = await waitFor(async () => {
    const exported = await user.call('/game/export/' + rated.id);
    return Number.isInteger(exported.players[white ? 'white' : 'black'].ratingDiff) && exported;
  }, 'native Glicko rating update');
  const diff = final.players[white ? 'white' : 'black'].ratingDiff;
  assert.ok(diff < 0);
  const next = await user.play({ minutes: 5, increment: 3 });
  const nextRound = await user.round(next); assert.equal(nextRound.player.rating, 1500 + diff);
  assert.ok(Math.abs(nextRound.player.rating - nextRound.opponent.rating) <= 200);
  await abort(next);
  const controls = [[1,0],[2,1],[3,0],[3,2],[5,0],[5,3],[10,0],[10,5],[15,10],[30,0],[30,20],[0.25,0],[180,180]];
  for (const [minutes, increment] of controls) {
    const game = await guest.play({ minutes, increment });
    const data = await guest.round(game);
    assert.equal(data.clock.initial, minutes * 60); assert.equal(data.clock.increment, increment);
    await abort(game);
  }
  for (const timeMode of ['correspondence','unlimited']) {
    const game = await guest.play({ timeMode, days: 7 });
    assert.equal(game.rated, false); await abort(game);
  }
  const again = await guest.play({ like: rated.id });
  const againRound = await guest.round(again);
  assert.equal(againRound.clock.initial, 300); assert.equal(againRound.clock.increment, 3);
  assert.equal(again.rated, false); await abort(again);
  await guest.call('/club/play', { minutes: 0, increment: 0 }, 400);
  await guest.call('/club/play', { minutes: 181, increment: 3 }, 400);
  await user.call('/club/play', { bot: 'cipher-fox' }, 400);
  await user.call('/logout', {}); assert.equal((await user.call('/club/me')).user, null);
  console.log(JSON.stringify({ ok: true, run, ratingDiff: diff, fixtures: [anonymous.id, rated.id], checks: [
    'native homepage and Nostr login page', 'anonymous casual ownership and rejoin', 'no manual bot selection',
    'random matched bot within 200', 'initial provisional 1500', 'native rated result and next-game rating',
    'native WebSocket reconnect', 'PGN', 'global capacity', '11 quick controls and custom limits', 'correspondence and unlimited', 'new opponent keeps the prior clock',
  ] }, null, 2));
} finally {
  for (const ws of sockets) ws.close();
  for (const game of created) if ((await games().catch(() => [])).some(g => g.id === game.id)) await abort(game).catch(() => {});
}
