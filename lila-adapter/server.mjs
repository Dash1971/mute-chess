import http from 'node:http';
import { loadRoster } from './roster.mjs';
import { readFile } from 'node:fs/promises';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { NostrAuth, AdapterError } from './nostr-auth.mjs';
import { Maia } from './maia.mjs';
import { createZapInvoice, validateZapReceipt, InvoiceError } from './lightning.mjs';
import { freeze, freezeForHuman, effectivePolicy, targetTimeForPolicy, addedWait } from './policy.mjs';
import { validatePersonality } from './personality.mjs';

const token = process.env.ADAPTER_TOKEN;
const origin = process.env.LILA_ORIGIN ?? 'http://127.0.0.1:19663';
const publicOrigin = process.env.PUBLIC_ORIGIN ?? origin;
if (!token || token.length < 40 || new URL(origin).hostname !== '127.0.0.1') throw Error('Private adapter configuration required');
const roster = await loadRoster();
const botsById = new Map(roster.map(bot => {
  validatePersonality(bot.personality);
  return [bot.id, bot];
}));
if (botsById.size !== roster.length || new Set(roster.map(bot => bot.username.toLowerCase())).size !== roster.length)
  throw Error('Duplicate bot identity');
const auth = new NostrAuth(publicOrigin);
const maia = new Maia(process.env.MAIA_PYTHON, fileURLToPath(new URL('./maia_worker.py', import.meta.url)), process.env.MAIA_MODEL);
await maia.ready;
let stopping = false;
let lastNativeSuccess = Date.now();
const inFlight = new Set();
const lastSubmitted = new Map();
const instance = randomUUID();
let latestGames = [];
const native = (path, body) => new Promise((resolve, reject) => {
  // Keep the transport on loopback, preserve the public Host, and never follow redirects.
  const request = http.request(new URL(path, origin), { method: body ? 'POST' : 'GET',
    headers: { Host: new URL(publicOrigin).host, Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json', 'X-NoSweat-Instance': instance }, timeout: 5000 }, response => {
    let text = '';
    response.setEncoding('utf8');
    response.on('data', chunk => { text += chunk; if (text.length > 2 * 1024 * 1024) response.destroy(Error('Native response too large')); });
    response.on('error', reject);
    response.on('end', () => {
      try {
        const data = JSON.parse(text);
        if (response.statusCode !== 200) throw new AdapterError(response.statusCode, data.error ?? 'Native game service unavailable');
        resolve(data);
      } catch (error) { reject(error); }
    });
  });
  request.on('error', reject);
  request.on('timeout', () => request.destroy(Error('Native request timed out')));
  request.end(body ? JSON.stringify(body) : undefined);
});
async function play(game) {
  if (!game.botToMove || inFlight.has(game.id) || lastSubmitted.get(game.id) === game.ply) return;
  inFlight.add(game.id);
  try {
    const started = performance.now();
    const moves = game.state.moves ? game.state.moves.split(' ') : [];
    const policy = effectivePolicy(game.policy, game.ply, botsById);
    const targetMs = targetTimeForPolicy(game.policy, { baseSeconds: game.clock?.initial ?? null, incrementSeconds: game.clock?.increment ?? 0 });
    const result = await maia.predict(moves, policy);
    const elapsed = performance.now() - started;
    const remaining = (game.botColor === 'white' ? game.state.wtime : game.state.btime) ?? 60000;
    const waitMs = addedWait(targetMs, elapsed, remaining - elapsed);
    if (waitMs > 0) await delay(waitMs);
    if (!maia.healthy || stopping) throw Error('Maia worker unavailable');
    await native(`/club/internal/${game.id}/move`, { ply: game.ply, move: result.move,
      timing: { targetMs, actualMs: Math.round(performance.now() - started), inferenceMs: result.inferenceMs } });
    lastSubmitted.set(game.id, game.ply);
  } catch (error) {
    if (error.status !== 409) {
      console.error(JSON.stringify({ event: 'maia_game_failure', id: game.id, error: error.message }));
      await native(`/club/internal/${game.id}/failure`, {}).catch(() => {});
    }
  } finally { inFlight.delete(game.id); }
}
async function poll() {
  while (!stopping) {
    try {
      if (!maia.healthy) throw Error('Maia worker unavailable');
      const games = await native('/club/internal/games');
      if (!Array.isArray(games)) throw Error('Invalid native game list');
      latestGames = games;
      lastNativeSuccess = Date.now();
      const ids = new Set(games.map(g => g.id));
      for (const id of lastSubmitted.keys()) if (!ids.has(id)) lastSubmitted.delete(id);
      for (const game of games) void play(game);
      if (games.length === 0) await delay(750);
    } catch (error) {
      if (Date.now() - lastNativeSuccess > 15000) {
        console.error('Native game service or Maia unavailable; exiting for recovery');
        process.exitCode = 1; stop(); break;
      }
    }
    await delay(250);
  }
}
const server = http.createServer(async (request, response) => {
  const send = (status, data) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(data));
  };
  try {
    const supplied = Buffer.from(request.headers.authorization ?? '');
    const expected = Buffer.from('Bearer ' + token);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new AdapterError(403, 'Private adapter authentication required');
    if (request.url === '/health' && request.method === 'GET') return send(maia.healthy ? 200 : 503, { ok: maia.healthy, pending: maia.pending.size });
    if (request.method !== 'POST') throw new AdapterError(404, 'Unknown endpoint');
    let text = '';
    for await (const chunk of request) {
      text += chunk;
      if (Buffer.byteLength(text) > 16384) throw new AdapterError(413, 'Request too large');
    }
    let body;
    try { body = JSON.parse(text); } catch { throw new AdapterError(400, 'Invalid JSON'); }
    if (request.url === '/challenge') return send(200, auth.challenge(body.pubkey, body.action));
    if (request.url === '/verify') return send(200, auth.verify(body.authorization, body.rawBody));
    if (request.url === '/patron/invoice') return send(200, await createZapInvoice(body.request));
    if (request.url === '/patron/receipt') {
      try { return send(200, validateZapReceipt(body.receipt)); }
      catch { throw new AdapterError(400, 'Invalid or untrusted payment receipt'); }
    }
    if (request.url === '/freeze') {
      if (!maia.healthy) throw new AdapterError(503, 'Maia unavailable');
      const bot = botsById.get(body.bot);
      if (!bot) throw new AdapterError(400, 'Unknown opponent');
      return send(200, Object.hasOwn(body, 'opponentRating') ? freezeForHuman(bot, body.opponentRating) : freeze(bot));
    }
    throw new AdapterError(404, 'Unknown endpoint');
  } catch (error) {
    if (error instanceof InvoiceError) {
      console.warn(JSON.stringify({ event: 'lightning_invoice_failed', code: error.code }));
      send(error.status, { error: error.publicMessage, code: error.code });
    } else send(error.status ?? 503, { error: error instanceof AdapterError ? error.message : 'Adapter unavailable' });
  }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
const port = Number(process.env.ADAPTER_PORT ?? 19665);
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
maia.child.once('exit', () => {
  if (stopping) return;
  void Promise.allSettled(latestGames.map(game => native(`/club/internal/${game.id}/failure`, {})))
    .finally(() => { process.exitCode = 1; stop(); });
});
console.log(`Private Nostr/Maia adapter listening on 127.0.0.1:${port}`);
void poll();
function stop() { stopping = true; server.close(); maia.close(); }
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
