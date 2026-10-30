import http from 'node:http';
import { readFile, writeFile, mkdir, appendFile, rename, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { Maia, MODEL_SHA256 } from './maia.mjs';
import { freezeStudy, studyPolicy } from './study-policy.mjs';
import { StudyWorkers } from './study-workers.mjs';
import { pairing } from './study-schedule.mjs';

const workerCount = Number(process.env.STUDY_WORKERS ?? 1);
if (![1, 2].includes(workerCount)) throw Error('Invalid study worker count');
const run = process.env.STUDY_RUN_ID, live = process.env.STUDY_PUBLIC_RATINGS === 'true';
const origin = process.env.LILA_ORIGIN, host = live ? 'mutechess.org' : '127.0.0.1:19763';
if (!/^[a-z][a-z0-9_]{2,31}$/.test(run ?? '') || origin !== (live ? 'http://127.0.0.1:29663' : 'http://127.0.0.1:19763'))
  throw Error('Study must target its explicit deployment scope');
const token = process.env.ADAPTER_TOKEN;
if (!token || token.length < 32) throw Error('Private adapter token required');
const roster = JSON.parse(await readFile(new URL('./roster.json', import.meta.url)));
if (roster.length !== 44) throw Error('This trial is limited to the existing 44 identities');
const output = process.env.STUDY_OUTPUT;
if (!output?.startsWith('/') || !(process.env.STUDY_MAIN_COMMIT ?? '').match(/^[0-9a-f]{40}$/))
  throw Error('Output directory and verified main revision required');
await mkdir(output, { recursive: true });
const events = `${output}/events.jsonl`, checkpoint = `${output}/checkpoint.json`;
let maia, last, stopping = false, failure, initial;
const lastServed = new Map();
const pending = new Map(), completed = new Set(), timings = [];
async function log(event) {
  await appendFile(events, JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n');
  if ((await stat(events)).size > 32 * 1024 * 1024) throw Error('Study event output limit');
}
function native(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(new URL(path, origin), { method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, Host: host, 'Content-Type': 'application/json' },
      timeout: 10000 }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; if (text.length > 2 * 1024 * 1024) response.destroy(Error('Response limit')); });
      response.on('error', reject);
      response.on('end', () => {
        if (response.statusCode !== 200) { const e = Error(`Native study HTTP ${response.statusCode}`); e.status = response.statusCode; reject(e); }
        else { try { resolve(JSON.parse(text)); } catch (e) { reject(e); } }
      });
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(Error('Native request deadline')));
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
async function save(state) {
  await writeFile(checkpoint + '.tmp', JSON.stringify({ run, publicRatings: live, main: process.env.STUDY_MAIN_COMMIT,
    initial, latest: state, failure, elapsedMs: Date.now() - initial.started,
    moveCount: timings.length, latency: percentiles(timings.map(t => t.totalMs)),
    inference: percentiles(timings.map(t => t.inferenceMs)),
    turnToCommit: percentiles(timings.map(t => t.turnToCommitMs)) }, null, 2));
  await rename(checkpoint + '.tmp', checkpoint);
}
function percentiles(values) {
  const sorted = values.toSorted((a, b) => a - b);
  const at = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)] : null;
  return { p50: at(.5), p95: at(.95), p99: at(.99), max: sorted.at(-1) ?? null };
}
async function play(game) {
  const started = performance.now();
  const moves = game.state.moves ? game.state.moves.split(' ') : [];
  if (moves.length !== game.ply) throw Error('Native move history/ply disagreement');
  const frozen = game.policies[game.turn];
  const result = await maia.predict(moves, studyPolicy(frozen, run, game.ply, roster));
  const returned = performance.now();
  try { await native(`/club/internal/study/${game.id}/move`, { ply: game.ply, move: result.move }); }
  catch (e) { if (e.status === 409) return; throw e; }
  const timing = { type: 'move', id: game.id, ply: game.ply, move: result.move,
    bot: frozen.production.bot, worker: result.studyWorker, inferenceMs: result.inferenceMs, totalMs: performance.now() - started,
    beforeCommitMs: returned - started, turnToCommitMs: Date.now() - game.lastMoveAt, addedWaitMs: 0, concurrency: last.games.length };
  timings.push(timing); await log(timing);
}
async function requestStop() {
  stopping = true;
  try { await native('/club/internal/study/stop', { runId: run }); } catch (e) { await log({ type: 'stop-error', error: e.message }); }
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { stopping = true; });
try {
  last = await native('/club/internal/study/ratings');
  if (last.runId !== run || last.publicRatings !== live || last.admitted !== 0 || last.closed || last.workers !== workerCount || ![100, 200].includes(last.maximumAdmitted) ||
      last.deadline - Date.now() > 90 * 60000 || Date.now() >= last.admissionEnd)
    throw Error('Study scope/budget mismatch or existing run; use a reviewed checkpoint-resume procedure');
  initial = { started: Date.now(), deadline: last.deadline, admissionEnd: last.admissionEnd,
    ratings: last.ratings, modelSha256: MODEL_SHA256,
    rosterSha256: createHash('sha256').update(JSON.stringify(roster)).digest('hex'),
    policyVersion: 'native-no-wait-study-v1', maximumAdmitted: last.maximumAdmitted, maximumConcurrency: last.maximumConcurrency,
    profile: last.profile, workerCount, stages: last.stages, clocks: { blitz: '5+3', rapid: '10+5' } };
  await log({ type: 'start', ...initial, publicRatings: live });
  await save(last);
  maia = new StudyWorkers(workerCount, () => new Maia(process.env.MAIA_PYTHON,
    new URL('./maia_worker.py', import.meta.url).pathname, process.env.MAIA_MODEL));
  await maia.ready;
  let previousFinished = 0;
  while (!stopping && Date.now() < initial.deadline) {
    last = await native('/club/internal/study');
    const finished = last.records.filter(r => r.state === 'finished');
    for (const r of finished) if (!completed.has(r.id)) {
      completed.add(r.id); await log({ type: 'finish', ...r });
      const response = await fetch(`${origin}/game/export/${r.id}.pgn`, { headers: { Host: host }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error(`PGN export failed: ${response.status}`);
      await writeFile(`${output}/${r.id}.pgn`, await response.text());
    }
    if (finished.length !== previousFinished || !last.games.length) {
      last = await native('/club/internal/study/ratings');
      await log({ type: 'ratings', completed: finished.length, ratings: last.ratings });
      previousFinished = finished.length; await save(last);
    }
    for (const g of last.games.toSorted((a, b) => (lastServed.get(a.id) ?? 0) - (lastServed.get(b.id) ?? 0))) if (g.playable && !pending.has(g.id) && pending.size < maia.maxPending) {
      lastServed.set(g.id, Date.now());
      const task = play(g).catch(e => { failure = e.message; stopping = true; }).finally(() => pending.delete(g.id));
      pending.set(g.id, task);
    }
    const capacity = last.capacity;
    if (last.admitted < initial.maximumAdmitted && last.games.length + last.publicGames < capacity && Date.now() < initial.admissionEnd) {
      // Fetch current native ratings before each admission; frozen policy inputs never follow Glicko.
      last = await native('/club/internal/study/ratings');
      const match = pairing(roster, last.ratings, last.records);
      if (match) {
        const policies = { white: freezeStudy(match.white, run), black: freezeStudy(match.black, run) };
        try {
          const created = await native('/club/internal/study', { white: match.white.id, black: match.black.id,
            speed: match.speed, policies });
          await log({ type: 'admission', ...created, white: match.white.id, black: match.black.id, speed: match.speed, policies });
        } catch (e) { if (e.status !== 409) throw e; }
      }
    }
    if (!last.games.length && (last.admitted >= initial.maximumAdmitted || Date.now() >= initial.admissionEnd)) break;
    if (last.records.some(r => r.state === 'aborted')) throw Error('Native abort observed; stop for investigation');
    await sleep(100);
  }
} catch (e) { failure = e.message; await log({ type: 'failure', error: failure }); }
finally {
  stopping = true;
  await Promise.allSettled([...pending.values()]);
  if (initial) await requestStop();
  maia?.close();
  try { last = await native('/club/internal/study/ratings'); if (initial) await save(last); }
  catch (e) { await log({ type: 'checkpoint-error', error: e.message }); }
  await log({ type: 'end', failure, completed: completed.size });
}
if (failure) process.exitCode = 1;
