import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freezeStudy, studyPolicy } from '../study-policy.mjs';
import { effectivePolicy } from '../policy.mjs';
import { pairing } from '../study-schedule.mjs';
const roster = JSON.parse(readFileSync(new URL('../roster.json', import.meta.url)));
test('study override retains every production policy input and production timing personality', () => {
  for (const bot of roster) {
    const p = freezeStudy(bot, 'trial1');
    assert.equal(p.addedHumanWait, false); assert.equal(p.rated, true);
    assert.equal(p.production.humanTiming, bot.personality.humanTiming);
    assert.equal(p.production.timingStyle, bot.personality.timingStyle);
    for (const ply of [0, 9, 10, 80])
      assert.deepEqual(studyPolicy(p, 'trial1', ply, roster), effectivePolicy(p.production, ply, roster));
    assert.throws(() => studyPolicy(p, 'other', 0, roster));
    assert.throws(() => studyPolicy({ ...p, addedHumanWait: true }, 'trial1', 0, roster));
    assert.throws(() => studyPolicy({ ...p, production: { ...p.production, selfElo: 42 } }, 'trial1', 0, roster));
  }
});
test('study schedule uses current per-speed native ratings and excludes both busy seats', () => {
  const bots = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const ratings = Object.fromEntries(bots.map((b, i) => [b.id, { blitz: { rating: 1000 + i * 200 }, rapid: { rating: 2000 + i * 200 } }]));
  for (let n = 0; n < 20; n++) {
    const match = pairing(bots, ratings, [], size => n % size);
    assert.notEqual(match.white.id, match.black.id);
    assert.ok(Math.abs(ratings[match.white.id][match.speed].rating - ratings[match.black.id][match.speed].rating) <= 200);
  }
  const match = pairing(bots, ratings, [{ white: 'a', black: 'b', speed: 'blitz', state: 'active' }], () => 0);
  assert.deepEqual(new Set([match.white.id, match.black.id]), new Set(['c', 'd']));
  assert.equal(pairing(bots, ratings, [{ white: 'a', black: 'b', speed: 'blitz', state: 'active' },
    { white: 'c', black: 'd', speed: 'rapid', state: 'active' }]), null);
});
