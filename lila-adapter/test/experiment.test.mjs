import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadReferenceRoster } from '../roster.mjs';
import { experimentStage, experimentPairing } from '../experiment-schedule.mjs';
const manifest = JSON.parse(readFileSync(new URL('../experiment-manifest.json', import.meta.url)));
const roster = await loadReferenceRoster();
test('reproducible design keeps original44, disjoint heldout and approved ranges', () => {
  assert.equal(roster.length, 250);
  assert.equal(manifest.trainingIds.length, 200);
  assert.equal(manifest.heldoutIds.length, 50);
  const original = JSON.parse(readFileSync(new URL('../roster.json', import.meta.url)));
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(original), manifest.originalRosterSha256);
  assert.equal(hash(roster), manifest.combinedRosterSha256);
  assert.deepEqual(roster.slice(0,44), original);
  assert.equal(manifest.trainingIds.some(id => manifest.heldoutIds.includes(id)), false);
  assert.equal(roster.filter(b => manifest.trainingIds.includes(b.id) && b.personality.history).length,100);
  assert.equal(roster.filter(b => manifest.heldoutIds.includes(b.id) && b.personality.history).length,25);
  for (const b of roster.slice(44)) {
    assert.ok(b.conditioning_self >= 600 && b.conditioning_self <= 2600);
    assert.equal(b.conditioning_self, b.conditioning_opponent);
    assert.ok(b.temperature_after_opening >= 0 && b.temperature_after_opening <= 1);
    assert.ok(b.top_p_after_opening >= 0 && b.top_p_after_opening <= 1);
    assert.equal(b.ratings.blitz.initial_rd, 300);
  }
  const winter = roster.find(b => b.username === 'Wintermute');
  assert.equal(winter.conditioning_self,2600); assert.equal(winter.temperature_after_opening,0);
  assert.equal(winter.personality.timingStyle,'very-fast');
});
test('heldout cannot enter before prediction freeze and matches training only', () => {
  const m = { existingIds:['a','b'], trainingIds:['a','b'], heldoutIds:['c'], stages:{warmupEnd:2,trainingEnd:4} };
  const bots = ['a','b','c'].map(id => ({id}));
  const ratings = Object.fromEntries(bots.map(b => [b.id,{blitz:{rating:1500},rapid:{rating:1500}}]));
  assert.equal(experimentStage(0,m),'warmup'); assert.equal(experimentStage(2,m),'training');
  const records = Array.from({length:4},()=>({white:'a',black:'b',speed:'blitz',state:'finished'}));
  assert.equal(experimentPairing(bots,ratings,records,m,false),null);
  const match = experimentPairing(bots,ratings,records,m,true,()=>0);
  assert.ok([match.white.id,match.black.id].includes('c'));
  assert.equal([match.white.id,match.black.id].filter(id=>id==='c').length,1);
});
