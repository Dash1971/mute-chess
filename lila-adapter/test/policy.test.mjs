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
  const target = targetTime({}, () => values[index++]);
  assert.ok(target >= 550 && target <= 4500);
});

// Independent vectors from Mobile Maia's pinned Dart human_timing_test.dart.
function sample(baseSeconds, incrementSeconds, values) {
  let index=0; const value=targetTime({baseSeconds,incrementSeconds},()=>values[index++]);
  assert.equal(index,values.length);return value;
}
test('Mobile Maia fast-control timing includes rare pauses before scaling and capping',()=>{
  for(const [draws,expected] of [
    [[0,.5,.5],275], [[0,0,.06],2250], [[0,0,.059999,0],3000], [[0,0,0,.999999999],3000],
  ])assert.equal(sample(60,0,draws),expected);
  assert.equal(sample(120,1,[0,.5,.5]),413);
  assert.equal(sample(180,0,[0,0,0,.999999999]),4500);
  for(const control of [[120,1],[180,0],[180,2]])
    assert.equal(sample(...control,[.5,.5,.5]),Math.round(Math.exp(.50-Math.sqrt(-2*Math.log(.5))*.44)*.75*1000));
});
test('other controls keep the unscaled timing and tier selection never uses time remaining',()=>{
  const draws=[.25,.1,.5],legacy=sample(null,0,draws);
  for(const control of [[60,1],[60,2],[300,0],[300,3],[600,0],[600,5],[900,10],[1800,0],[1800,20],[30,0],[120,0]])
    assert.equal(sample(...control,draws),legacy);
  assert.ok(sample(60,0,draws)<sample(180,0,draws));
  assert.ok(sample(180,0,draws)<sample(300,0,draws));
});
