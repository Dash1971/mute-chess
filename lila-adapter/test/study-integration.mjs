// Disposable qualification only. The legal mate fixture is not calibration evidence.
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { generateSecretKey, getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { digest } from '../nostr-auth.mjs';
import { loadReferenceRoster } from '../roster.mjs';
import { StudyWorkers } from '../study-workers.mjs';
import { Maia } from '../maia.mjs';
import { freezeStudy, studyPolicy } from '../study-policy.mjs';
const origin = process.env.LILA_ORIGIN;
if (origin !== 'http://127.0.0.1:19763') throw Error('Qualification origin only');
const run = process.env.STUDY_QUAL_RUN_ID ?? 'q20261030a', roster = await loadReferenceRoster();
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
assert.equal(Object.keys(before.ratings).length, roster.length);
assert.equal(before.maximumConcurrency, before.workers === 2 ? 22 : 10);
assert.equal(before.maximumAdmitted, before.profile === 'strength-predictor-v1' ? 3000 : before.profile === 'calibration-200-v1' ? 200 : 100); assert.equal(before.admitted, 0);
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
// Multiple independent native games exercise both real model processes in the expanded plan.
const pairCount = before.workers === 2 ? 4 : 1;
const fixtures = [];
for (let index = 0; index < pairCount; index++) {
  const white = roster[4 + index * 4], black = roster[5 + index * 4];
  const policies = { white: freezeStudy(white, run), black: freezeStudy(black, run) };
  const game = await api('', { white: white.id, black: black.id, speed: 'rapid', policies });
  fixtures.push({ ...game, white, black });
}
const maia = new StudyWorkers(before.workers, () => new Maia(process.env.MAIA_PYTHON,
  new URL('../maia_worker.py', import.meta.url).pathname, process.env.MAIA_MODEL));
const workersUsed = new Set();
try {
  await maia.ready;
  const referencePolicy = studyPolicy(freezeStudy(roster[8], run), run, 0, roster);
  const references = await Promise.all(Array.from({ length: before.workers }, () => maia.predict([], referencePolicy)));
  assert.equal(new Set(references.map(r => r.move)).size, 1, 'same policy/seed gives the same move on each worker');
  for (let i = 0; i < 12; i++) {
    const state = await api('');
    await Promise.all(fixtures.map(async fixture => {
      const game = state.games.find(g => g.id === fixture.id);
      assert.ok(game?.playable);
      const moves = game.state.moves ? game.state.moves.split(' ') : [];
      const prediction = await maia.predict(moves, studyPolicy(game.policies[game.turn], run, game.ply, roster));
      workersUsed.add(prediction.studyWorker);
      await api(`/${game.id}/move`, { ply: game.ply, move: prediction.move });
    }));
  }
} finally { maia.close(); }
assert.equal(workersUsed.size, before.workers);
let admissionBoundary;
if (before.maximumAdmitted >= 200) {
  // Only the disposable namespace receives synthetic closed reservation documents.
  // They test native budget/cursor boundaries, not game outcomes or calibration.
  assert.ok(/^q[a-z0-9_]{2,31}$/.test(run));
  assert.ok(process.env.STUDY_QUAL_MONGOSH);
  const count = (await api('')).admitted;
  const script = `const run=${JSON.stringify(run)}; const existing=db.nosweat_study_game.countDocuments({runId:run});
    if(existing!==${count}) throw Error("Fixture count changed");
    const docs=Array.from({length:${before.maximumAdmitted-1}-existing},(_,i)=>({_id:"f"+String(i).padStart(7,"0"),runId:run,state:"finished"}));
    if(docs.length) db.nosweat_study_game.insertMany(docs);`;
  execFileSync(process.execPath, [process.env.STUDY_QUAL_MONGOSH,
    `mongodb://127.0.0.1:27028/nosweat_calibration_${run}`, '--quiet', '--eval', script], { stdio: 'pipe' });
  assert.equal((await api('')).admitted, before.maximumAdmitted-1);
  const makeSetup = (index) => {
    const white=roster[index], black=roster[index+1];
    return { white:white.id, black:black.id, speed:'rapid', policies:{white:freezeStudy(white,run),black:freezeStudy(black,run)} };
  };
  const finalGame = await api('', makeSetup(20));
  fixtures.push({ ...finalGame, white:roster[20], black:roster[21] });
  assert.equal((await api('')).admitted, before.maximumAdmitted);
  // Distinct unused seats ensure the 201st rejection is the budget, not busy-account protection.
  assert.equal((await request('/club/internal/study', makeSetup(24))).status, 409);
  assert.equal((await api('')).admitted, before.maximumAdmitted);
  admissionBoundary=before.maximumAdmitted;
}
await api('/stop', { runId: run });
state = await api('/ratings'); assert.equal(state.closed, true);
assert.equal((await request('/club/internal/study', { ...setup, policies })).status, 409);
for (const fixture of fixtures) for (const bot of [fixture.white, fixture.black])
  assert.equal(state.ratings[bot.id].rapid.games, before.ratings[bot.id].rapid.games);
const report = { qualificationOnly: true, profile: before.profile, workersUsed: [...workersUsed],
  syntheticMateFixture: first.id, nativeRatedUpdate: result,
  nativePerfsBefore: before.ratings, nativePerfsAfter: state.ratings,
  maiaNativeMoves: pairCount * 12, admissionBoundary, abortedUnratedFixtures: fixtures.map(f => f.id),
  checks: ['unauthorized', 'rated-human-admission-with-study-enabled', 'busy/capacity', 'stale-ply',
    'native-mate', 'native-glicko-persistence', 'maia-history-path', 'multiple-real-workers', ...(admissionBoundary ? [`native-${admissionBoundary}-admission-boundary`] : []), 'stop-no-rating', 'closed-admission'] };
await writeFile(process.env.STUDY_QUAL_REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ qualificationOnly: true, nativeMateAndGlicko: true,
  maiaMoves: pairCount * 12, workers: workersUsed.size, stopped: true }));
