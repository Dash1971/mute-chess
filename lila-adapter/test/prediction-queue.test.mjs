import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PredictionQueue } from '../prediction-queue.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(maximumWaiting = 10) {
  const started = [], pending = [];
  const worker = { healthy: true, predict: (moves, policy) => new Promise((resolve, reject) => {
    started.push({ moves, policy }); pending.push({ resolve, reject });
    assert.ok(pending.length <= 2, 'never overflow the actual worker');
  }) };
  return { queue: new PredictionQueue(worker, maximumWaiting), worker, started, pending,
    finish() { pending.shift().resolve({ move: 'e2e4' }); } };
}
test('ten simultaneous game turns fit, use at most two inference slots, and complete fairly', async () => {
  const f = fixture();
  const jobs = Array.from({ length: 10 }, (_, i) => f.queue.predict([String(i)], { seed: i }, true));
  for (let i = 0; i < 10; i++) { await tick(); f.finish(); }
  await Promise.all(jobs);
  assert.deepEqual(f.started.map(s => s.policy.seed), Array.from({ length: 10 }, (_, i) => i));
});
test('human turns take the next available slot ahead of background work without interrupting it', async () => {
  const f = fixture();
  const jobs = [0, 1, 2, 3].map(i => f.queue.predict([], { seed: i }, true));
  jobs.push(f.queue.predict(['human'], { seed: 'human' }));
  await tick(); f.finish(); await tick();
  assert.equal(f.started[2].policy.seed, 'human');
  for (let i = 0; i < 4; i++) { f.finish(); await tick(); }
  await Promise.all(jobs);
  assert.deepEqual(f.started.map(s => s.policy.seed), [0, 1, 'human', 2, 3]);
});
test('shutdown rejects queued work and releases slots', async () => {
  const f = fixture();
  const first = f.queue.predict([], {}), second = f.queue.predict([], {});
  const queued = f.queue.predict([], {});
  const rejected = assert.rejects(queued, /unavailable/);
  await tick(); f.queue.close(); await rejected;
  await assert.rejects(f.queue.predict([], {}), /unavailable/);
  f.finish(); f.finish(); await Promise.all([first, second]);
});
test('a failed request releases its slot for the next game', async () => {
  const f = fixture();
  const first = f.queue.predict([], {}), rejected = assert.rejects(first, /failed/);
  const jobs = [f.queue.predict([], {}), f.queue.predict([], {})];
  await tick(); f.pending.shift().reject(Error('inference failed')); await rejected; await tick();
  assert.equal(f.started.length, 3);
  f.finish(); f.finish(); await Promise.all(jobs);
});
test('waiting capacity is finite and rejects overflow before dispatch', async () => {
  const f = fixture(1);
  const jobs = [f.queue.predict([], {}), f.queue.predict([], {})];
  const queued = f.queue.predict([], {}), rejected = assert.rejects(queued, /unavailable/);
  await assert.rejects(f.queue.predict([], {}), /full/);
  await tick(); assert.equal(f.started.length, 2);
  f.queue.close(); await rejected; f.finish(); f.finish(); await Promise.all(jobs);
});
test('continuous human demand still serves queued automatic games after two contested human turns', async () => {
  const f = fixture();
  const jobs = [f.queue.predict([], { seed: 'running1' }), f.queue.predict([], { seed: 'running2' })];
  jobs.push(f.queue.predict([], { seed: 'background' }, true));
  for (let i = 0; i < 5; i++) jobs.push(f.queue.predict([], { seed: `human${i}` }));
  await tick(); f.finish(); await tick();
  assert.equal(f.started[2].policy.seed, 'background');
  for (let i = 0; i < 7; i++) { f.finish(); await tick(); }
  await Promise.all(jobs);
});
