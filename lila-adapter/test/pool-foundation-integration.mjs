// Private stack only: profile disclosure and one managed presence lease.
// No self-play, load test or owner account changes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const root = '/home/dash/no-sweat-lila';
const token = (await readFile(root + '/config/adapter.env', 'utf8')).match(/^ADAPTER_TOKEN=(.+)$/m)[1];
const origin = 'http://127.0.0.1:19663';
async function get(path, admin = false) {
  const r = await fetch(origin + path, { headers: { Accept: path.startsWith('/@/') ? 'text/html' : 'application/json',
    ...(admin ? { Authorization: 'Bearer ' + token } : {}) }, signal: AbortSignal.timeout(15000) });
  const text = await r.text();
  assert.equal(r.status, 200, path + ': ' + text.slice(0, 100));
  return path.startsWith('/@/') ? text : JSON.parse(text);
}
const roster = await get('/club/roster');
assert.equal(roster.length, 44);
const online = async username => {
  const html = await get('/@/' + username);
  const header = html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1] ?? '';
  return /class="[^"]*\bonline\b/.test(header);
};
async function waitFor(predicate, label) {
  for (let i = 0; i < 75; i++) { if (await predicate()) return; await delay(200); }
  throw Error('Timed out: ' + label);
}
const seen = new Set();
for (const bot of roster) {
  const key = [bot.personality.history, bot.personality.humanTiming, bot.personality.timingStyle].join(':');
  if (seen.has(key)) continue;
  seen.add(key);
  const html = await get('/@/' + bot.username);
  assert.match(html, /Bot settings/);
  for (const label of ['Maia rating input', 'Opponent rating input', 'Temperature', 'Top-p', 'Move history', 'Human timing', 'Timing style'])
    assert.ok(html.includes(label), label);
  assert.ok(html.includes(bot.personality.timingStyle.replaceAll('-', ' ')));
  assert.ok(html.includes('/docs/bot-population.md'));
}
const bot = roster[0];
assert.equal((await get('/club/internal/games', true)).length, 0, 'Do not interrupt private games');
await waitFor(() => online(bot.username), 'initial managed presence');
let stopped = false;
try {
  execFileSync('systemctl', ['--user', 'stop', 'nosweat-lila-adapter']);
  stopped = true;
  await waitFor(async () => !(await online(bot.username)), 'lease expiry makes bots offline');
  // An authenticated diagnostic read is not an adapter heartbeat.
  await get('/club/internal/games', true);
  assert.equal(await online(bot.username), false);
} finally {
  if (stopped) execFileSync('bash', [root + '/start-adapter.sh', root]);
}
await waitFor(() => online(bot.username), 'adapter recovery restores presence');
execFileSync('systemctl', ['--user', 'restart', 'nosweat-lila-ws']);
await waitFor(() => online(bot.username), 'WebSocket restart preserves managed presence');
console.log(JSON.stringify({ ok: true, profilesChecked: seen.size, roster: roster.length,
  checks: ['fixed settings', 'lease expiry', 'diagnostics do not renew lease', 'adapter recovery', 'WebSocket restart'] }));
