import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StudyWorkers } from '../study-workers.mjs';

function fakeWorker() {
  const worker = { healthy: true, pending: new Map(), ready: Promise.resolve(), closed: false };
  worker.predict = (moves, policy) => new Promise(resolve => {
    const key = Symbol();
    worker.pending.set(key, () => { worker.pending.delete(key); resolve({ moves, policy }); });
  });
  worker.close = () => { worker.closed = true; };
  return worker;
}
test('two workers balance four bounded requests, preserve inputs and recover capacity', async () => {
  const pool = new StudyWorkers(2, fakeWorker);
  await pool.ready;
  const moves = ['e2e4'], policy = { seed: 'pinned' };
  const jobs = Array.from({ length: 4 }, () => pool.predict(moves, policy));
  assert.deepEqual(pool.workers.map(w => w.pending.size), [2, 2]);
  await assert.rejects(pool.predict(moves, policy), /full/);
  for (const w of pool.workers) for (const complete of [...w.pending.values()]) complete();
  for (const result of await Promise.all(jobs)) {
    assert.equal(result.moves, moves); assert.equal(result.policy, policy);
  }
  assert.deepEqual(pool.workers.map(w => w.pending.size), [0, 0]);
  pool.close(); assert.ok(pool.workers.every(w => w.closed));
});
test('a failed worker stops the whole study rather than silently reducing its declared worker count', async () => {
  const pool = new StudyWorkers(2, fakeWorker);
  pool.workers[0].healthy = false;
  await assert.rejects(pool.predict([], {}), /unavailable/);
  assert.equal(pool.workers[1].pending.size, 0);
  assert.throws(() => new StudyWorkers(3, fakeWorker));
});
