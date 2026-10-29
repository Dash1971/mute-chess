import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import WebSocket from 'ws';
import { digest } from '../nostr-auth.mjs';
import http from 'node:http';
import https from 'node:https';

const origin = 'https://mutechess.org';
const transport = process.env.SMOKE_TRANSPORT ?? origin;
const run = randomBytes(3).toString('hex');
let cookie, game, socket;
async function call(path, body, authorization, expected = 200) {
  const html = body === undefined && (path.startsWith('/@/') || path.startsWith('/account/') || path === '/club/security' || path.startsWith('/training'));
  const accept = path.startsWith('/game/export/') ? 'application/x-chess-pgn' : html ? 'text/html' : 'application/json';
  const { status, headers, text } = await new Promise((resolve, reject) => {
    const request = (transport.startsWith('https:') ? https : http).request(transport + path, { method: body !== undefined ? 'POST' : 'GET',
    headers: { Accept: accept,
      ...(body === undefined ? {} : { 'Content-Type': body instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : 'application/json' }), Host: 'mutechess.org', Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}), ...(authorization ? { Authorization: authorization } : {}) },
    timeout: 15000 }, response => {
      let text = ''; response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, text }));
    });
    request.on('error', reject);
    request.on('timeout', () => request.destroy(Error('Request timeout')));
    request.end(body === undefined ? undefined : body instanceof URLSearchParams ? body.toString() : typeof body === 'string' ? body : JSON.stringify(body));
  });
  assert.ok([expected].flat().includes(status), `${path}: ${status} ${text.slice(0, 200)}`);
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { response: { headers: { get: name => headers[name.toLowerCase()]?.toString() } }, data };
}
async function waitFor(predicate, label) {
  for (let i = 0; i < 70; i++) { const result = await predicate(); if (result) return result; await delay(200); }
  throw Error('Timed out: ' + label);
}
async function round() { return (await call('/game/' + game.url.slice(1))).data; }
async function connect() {
  const data = await round();
  const base = transport.replace(/^http/, 'ws');
  socket = new WebSocket(`${base}/play/${game.url.slice(1)}/v5?sri=public${run}&v=${data.player.version}`, {
    headers: { Host: 'mutechess.org', Origin: origin, Cookie: cookie },
  });
  const events = [];
  socket.on('message', raw => { try { events.push(JSON.parse(String(raw))); } catch {} });
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return events;
}
try {
  await call('/club/internal/games', undefined, undefined, 404);
  const roster = (await call('/club/roster')).data;
  assert.equal(roster.length, 44);
  const key = generateSecretKey(), pubkey = getPublicKey(key);
  const challenge = (await call('/club/challenge', { pubkey })).data.challenge;
  const body = JSON.stringify({ challenge, username: 'AlphaCheck' + run });
  const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), content: '', tags: [
    ['u', origin + '/club/login'], ['method', 'POST'], ['challenge', challenge], ['payload', digest(body)],
  ] }, key);
  const authorization = 'Nostr ' + Buffer.from(JSON.stringify(event)).toString('base64');
  const login = await call('/club/login', body, authorization);
  const session = login.response.headers.get('set-cookie');
  assert.ok(/httponly/i.test(session) && /secure/i.test(session) && /samesite=lax/i.test(session));
  cookie = session.split(';')[0];
  assert.ok(cookie.startsWith('nosweat_session='));
  await call('/club/login', body, authorization, 401);
  assert.equal((await call('/club/me')).data.user.username, login.data.username);
  game = (await call('/club/play', { minutes: 5, increment: 3, color: 'white' })).data;
  assert.equal(game.rated, true);
  const initialRound = await round();
  assert.equal(initialRound.player.color, 'white');
  assert.equal(initialRound.player.rating, 1500);
  assert.ok(Math.abs(initialRound.player.rating - initialRound.opponent.rating) <= 200);
  const events = await connect();
  socket.send(JSON.stringify({ t: 'move', d: { u: 'e2e4', a: 1 } }));
  await waitFor(async () => (await round()).steps.at(-1).ply >= 2, 'first Maia reply');
  assert.ok(events.some(e => e.t === 'move'));
  socket.close();
  await connect();
  socket.send(JSON.stringify({ t: 'move', d: { u: 'g1f3', a: 2 } }));
  await waitFor(async () => (await round()).steps.at(-1).ply >= 4, 'reply after reconnect');
  socket.send(JSON.stringify({ t: 'resign' }));
  await waitFor(async () => (await round()).game.status.id >= 30, 'native resignation');
  const pgn = (await call('/game/export/' + game.id)).data;
  assert.match(pgn, /1\. e4/);
  const dasher = (await call('/dasher')).data;
  assert.equal(dasher.user.name, login.data.username);
  const profileForm = (await call('/account/profile')).data;
  assert.match(profileForm, /action="\/account\/profile"/);
  assert.match((await call('/account/security')).data, /Active sessions|Security/i);
  assert.match((await call('/club/security')).data, /Two-factor authentication/);
  await call('/account/oauth/token', undefined, undefined, 404);
  const bio = 'Profile check ' + run;
  await call('/account/profile', new URLSearchParams({ bio, displayName: 'Profile ' + run }), undefined, [302, 303]);
  const profile = (await call('/@/' + login.data.username)).data;
  assert.ok(profile.includes('Profile ' + run), 'Public name is visible');
  assert.equal((await call('/dasher')).data.user.displayName, 'Profile ' + run);
  assert.ok(profile.includes(bio), 'Saved profile biography is visible on the native profile');
  const puzzlePage = (await call('/training')).data;
  assert.match(puzzlePage, /"noSweat":true/);
  assert.match(puzzlePage, /"initialFen":/);
  const puzzleId = puzzlePage.match(/"puzzle":\{"id":"([A-Za-z0-9]{5})"/)?.[1];
  assert.ok(puzzleId, 'Native trainer selected a catalog puzzle for the test Nostr account');
  const completed = (await call('/training/complete/mix/' + puzzleId, new URLSearchParams({ win:'true', rated:'true' }))).data;
  assert.equal(completed.round.win, true);
  assert.equal(typeof completed.round.ratingDiff, 'number');
  assert.ok(completed.next.puzzle.id && completed.next.puzzle.id !== puzzleId);
  assert.equal(completed.next.noSweat, true);
  assert.equal(typeof completed.next.game.initialFen, 'string');
  await call('/training/batch', undefined, undefined, 404);
  await call('/training/coordinate', undefined, undefined, 404);
  await call('/analysis/atomic', undefined, undefined, 400);
  await call('/swag', undefined, undefined, 404);
  await call('/variant', undefined, undefined, 404);
  await call('/logout', {});
  assert.equal((await call('/club/me')).data.user, null);
  console.log(JSON.stringify({ ok: true, transport, run, game: game.id, checks: [
    '44 opponents', 'private routes blocked', 'signed Nostr login and replay rejection',
    'Secure HttpOnly session', 'Maia replies through native WebSocket', 'reconnect', 'resignation', 'PGN', 'account menu', 'native profile edit and persistence', 'native session security and Nostr 2FA settings; API tokens remain blocked', 'native puzzle selection, rated completion and next puzzle', 'standard-only boundary', 'logout',
  ] }, null, 2));
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ t: 'resign' }));
  socket?.close();
}
