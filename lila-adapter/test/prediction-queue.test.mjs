import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PredictionDeferred, PredictionQueue } from '../prediction-queue.mjs';

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
test('resign/flag/finish churn invalidates eight queued turns before admitting replacement games', async () => {
  const f = fixture(), observed = [];
  const turn = (id, ply = 0) => ({ id, ply, botToMove: true });
  const running = [turn('slow1'), turn('slow2')];
  let waiting = Array.from({ length: 8 }, (_, i) => turn(`original${i}`));
  const submit = game => f.queue.predict([], { seed: game.id }, false, game)
    .then(() => ({ id: game.id, played: true }), error => {
      assert.ok(error instanceof PredictionDeferred);
      assert.equal(error.status, 409, 'obsolete work must never enter the adapter failure route');
      return { id: game.id, deferred: error.code };
    });
  f.queue.synchronize([...running, ...waiting]);
  observed.push(...[...running, ...waiting].map(submit));
  await tick();
  assert.equal(f.pending.length, 2);
  for (let generation = 0; generation < 3; generation++) {
    waiting = Array.from({ length: 8 }, (_, i) => turn(`replacement${generation}-${i}`));
    f.queue.synchronize([...running, ...waiting]);
    observed.push(...waiting.map(submit));
    await tick();
    assert.equal(f.queue.waiting.length, 8, 'only current native games occupy waiting slots');
    assert.equal(f.pending.length, 2, 'replacement churn never overflows the worker');
  }
  for (let i = 0; i < 10; i++) { f.finish(); await tick(); }
  const results = await Promise.all(observed);
  assert.equal(results.filter(r => r.deferred === 'turn_obsolete').length, 24);
  assert.equal(results.filter(r => r.played).length, 10);
  assert.deepEqual(f.started.map(job => job.policy.seed), [...running, ...waiting].map(game => game.id));
});
test('ply changes and non-bot turns cancel waiting/running results while unrelated games continue', async () => {
  const f = fixture();
  const old = { id: 'changed', ply: 4, botToMove: true };
  const other = { id: 'other', ply: 8, botToMove: true };
  const waiting = { id: 'finished', ply: 2, botToMove: true };
  f.queue.synchronize([old, other, waiting]);
  const stale = assert.rejects(f.queue.predict([], {}, false, old), e => e.status === 409 && e.code === 'turn_obsolete');
  const continuing = f.queue.predict([], {}, false, other);
  const cancelled = assert.rejects(f.queue.predict([], {}, false, waiting), e => e.status === 409);
  await tick();
  f.queue.synchronize([{ ...old, ply: 6 }, other, { ...waiting, botToMove: false }]);
  assert.equal(f.queue.waiting.length, 0);
  assert.equal(f.queue.isCurrent(old), false);
  assert.equal(f.queue.isCurrent(waiting), false);
  f.finish(); f.finish(); await Promise.all([stale, continuing, cancelled]);
});
test('temporary saturation defers a fresh human turn neutrally and the next poll can retry it', async () => {
  const f = fixture(1);
  const games = ['a', 'b', 'c', 'new-human'].map(id => ({ id, ply: 0, botToMove: true }));
  f.queue.synchronize(games);
  const jobs = games.slice(0, 3).map(game => f.queue.predict([], {}, false, game));
  await assert.rejects(f.queue.predict([], {}, false, games[3]), e => {
    assert.ok(e instanceof PredictionDeferred);
    assert.equal(e.status, 409, 'temporary saturation must not abort a native game');
    return e.code === 'queue_busy';
  });
  await tick(); f.finish(); await tick();
  f.queue.synchronize(games);
  jobs.push(f.queue.predict([], { seed: 'retried-human' }, false, games[3]));
  for (let i = 0; i < 3; i++) { f.finish(); await tick(); }
  await Promise.all(jobs);
  assert.equal(f.started.at(-1).policy.seed, 'retried-human');
});
test('a turn invalidated before worker dispatch never consumes inference', async () => {
  const f = fixture(), game = { id: 'finished-before-dispatch', ply: 0, botToMove: true };
  f.queue.synchronize([game]);
  const cancelled = assert.rejects(f.queue.predict([], {}, false, game), e => e.status === 409);
  f.queue.synchronize([]);
  await cancelled; await tick();
  assert.equal(f.started.length, 0);
});
