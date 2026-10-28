import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freeze, effectivePolicy, addedWait, targetTime } from '../policy.mjs';
const roster = JSON.parse(readFileSync(new URL('../roster.json', import.meta.url)));
test('44 confirmed identities have unique names and fixed conditioning/profile pairs', () => {
  assert.equal(roster.length, 44); assert.equal(new Set(roster.map(b => b.username.toLowerCase())).size, 44);
  for (const elo of Array.from({ length: 11 }, (_, i) => 600 + i * 200)) {
    const bots = roster.filter(b => b.conditioning_self === elo);
    assert.equal(bots.length, 4);
    assert.deepEqual(bots.map(b => b.sampling_profile), ['full', 'balanced', 'focused', 'argmax']);
    assert.ok(bots.every(b => b.conditioning_opponent === elo));
  }
});
test('history and policy remain frozen; sampling changes only after both colors finish move five', () => {
  const bot = roster.find(b => b.id === 'static-bishop'); const policy = freeze(bot);
  for (const ply of [0, 1, 8, 9]) {
    const effective = effectivePolicy(policy, ply, roster);
    assert.equal(effective.temperature, 1); assert.equal(effective.topP, 1);
    assert.equal(effective.history, policy.history);
  }
  for (const ply of [10, 11, 99]) assert.equal(effectivePolicy(policy, ply, roster).temperature, 0);
  assert.deepEqual(effectivePolicy(policy, 20, roster), effectivePolicy(policy, 20, roster));
  assert.notEqual(effectivePolicy(policy, 20, roster).seed, effectivePolicy(policy, 21, roster).seed);
  assert.throws(() => effectivePolicy({ ...policy, version: 'changed' }, 20, roster), /unavailable/);
});
test('timing includes inference and stops adding delays when the clock is low', () => {
  assert.equal(addedWait(2000, 2500, 60000), 0);
  assert.equal(addedWait(2000, 500, 2000), 0);
  assert.equal(addedWait(2000, 500, 60000), 1500);
  let index = 0; const values = [0.5, 0.5, 0.5];
  const target = targetTime(() => values[index++]);
  assert.ok(target >= 550 && target <= 4500);
});
