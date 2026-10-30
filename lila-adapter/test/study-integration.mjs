// Disposable qualification only. The legal mate fixture is not calibration evidence.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { digest } from '../nostr-auth.mjs';
import { Maia } from '../maia.mjs';
import { freezeStudy, studyPolicy } from '../study-policy.mjs';
const origin = process.env.LILA_ORIGIN;
if (origin !== 'http://127.0.0.1:19763') throw Error('Qualification origin only');
const run = 'q20261030a', roster = JSON.parse(await readFile(new URL('../roster.json', import.meta.url)));
const token = process.env.ADAPTER_TOKEN;
const request = (path, body, auth = token) => new Promise((resolve, reject) => {
  const req = http.request(new URL(path, origin), { method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, timeout: 10000 }, res => {
    let text = ''; res.on('data', c => text += c); res.on('end', () => {
      try { resolve({ status: res.statusCode, data: JSON.parse(text) }); } catch (e) { reject(e); }
    });
  }); req.on('error', reject); req.on('timeout', () => req.destroy(Error('Deadline')));
  req.end(body === undefined ? undefined : JSON.stringify(body));
});
async function api(path, body) { const response = await request('/club/internal/study' + path, body); assert.equal(response.status, 200, JSON.stringify(response.data)); return response.data; }
let before;
for (let i = 0; i < 100; i++) {
  try { before = await api('/ratings'); break; } catch { await sleep(1000); }
}
assert.ok(before); assert.equal(before.publicRatings, false); assert.equal(before.runId, run);
assert.equal(Object.keys(before.ratings).length, 44); assert.equal(before.admitted, 0);
assert.equal((await request('/club/internal/study', undefined, 'invalid')).status, 403);
// Rated human admission must still fall back to the normal reservation path while study mode is on.
async function human(path, body, extra = {}) {
  const response = await fetch(origin + path, { method: 'POST', headers: { Origin: origin,
    'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data));
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const key = generateSecretKey(), pubkey = getPublicKey(key);
const challenge = (await human('/club/challenge', { pubkey })).data.challenge;
const loginBody = { challenge, username: 'StudyCheck' };
const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now() / 1000), content: '', tags: [
  ['u', origin + '/club/login'], ['method', 'POST'], ['challenge', challenge], ['payload', digest(JSON.stringify(loginBody))],
] }, key); key.fill(0);
const account = await human('/club/login', loginBody, { Authorization: 'Nostr ' + Buffer.from(JSON.stringify(event)).toString('base64') });
const humanGame = await human('/club/play', { minutes: 5, increment: 3, rated: true, color: 'white' }, { Cookie: account.cookie });
assert.equal(humanGame.data.rated, true);
assert.equal((await request(`/club/internal/${humanGame.data.id}/failure`, {})).status, 200);
for (let i = 0; i < 50 && (await api('')).publicGames; i++) await sleep(100);
const a = roster[0], b = roster[1];
assert.ok(Math.abs(before.ratings[a.id].blitz.rating - before.ratings[b.id].blitz.rating) <= 200);
const policies = { white: freezeStudy(a, run), black: freezeStudy(b, run) };
const setup = { white: a.id, black: b.id, speed: 'blitz', policies };
const first = await api('', setup);
assert.equal((await request('/club/internal/study', setup)).status, 409);
assert.equal((await request(`/club/internal/study/${first.id}/move`, { ply: 8, move: 'e2e4' })).status, 409);
for (const [ply, move] of ['f2f3', 'e7e5', 'g2g4', 'd8h4'].entries()) await api(`/${first.id}/move`, { ply, move });
let state;
for (let i = 0; i < 40; i++) {
  state = await api('/ratings');
  if (state.records.find(r => r.id === first.id)?.state === 'finished') break;
  await sleep(100);
}
const result = state.records.find(r => r.id === first.id);
assert.equal(result.result.status, 'mate'); assert.equal(result.result.ratedUpdate, true);
for (const bot of [a, b]) {
  assert.equal(state.ratings[bot.id].blitz.games, before.ratings[bot.id].blitz.games + 1);
  assert.ok(state.ratings[bot.id].blitz.rd < before.ratings[bot.id].blitz.rd);
}
const pgnResponse = await fetch(`${origin}/game/export/${first.id}.pgn`);
assert.equal(pgnResponse.status, 200);
assert.match(await pgnResponse.text(), /\[Result "0-1"\]/);
// Fresh pair: verify actual Maia inference, frozen per-bot history and native moves.
const c = roster[4], d = roster[5];
const secondPolicies = { white: freezeStudy(c, run), black: freezeStudy(d, run) };
const second = await api('', { white: c.id, black: d.id, speed: 'rapid', policies: secondPolicies });
const maia = new Maia(process.env.MAIA_PYTHON, new URL('../maia_worker.py', import.meta.url).pathname, process.env.MAIA_MODEL);
try {
  await maia.ready;
  for (let i = 0; i < 12; i++) {
    const s = await api(''); const game = s.games.find(g => g.id === second.id);
    assert.ok(game?.playable);
    const moves = game.state.moves ? game.state.moves.split(' ') : [];
    const prediction = await maia.predict(moves, studyPolicy(game.policies[game.turn], run, game.ply, roster));
    await api(`/${second.id}/move`, { ply: game.ply, move: prediction.move });
  }
} finally { maia.close(); }
await api('/stop', { runId: run });
state = await api('/ratings'); assert.equal(state.closed, true);
assert.equal((await request('/club/internal/study', { ...setup, policies })).status, 409);
assert.equal(state.ratings[c.id].rapid.games, before.ratings[c.id].rapid.games);
const report = { qualificationOnly: true, syntheticMateFixture: first.id, nativeRatedUpdate: result,
  nativePerfsBefore: before.ratings, nativePerfsAfter: state.ratings,
  maiaNativeMoves: 12, abortedUnratedFixture: second.id, checks: ['unauthorized', 'rated-human-admission-with-study-enabled', 'busy/capacity', 'stale-ply', 'native-mate', 'native-glicko-persistence', 'maia-history-path', 'stop-no-rating', 'closed-admission'] };
await writeFile(process.env.STUDY_QUAL_REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ qualificationOnly: true, nativeMateAndGlicko: true, maiaMoves: 12, stopped: true }));
