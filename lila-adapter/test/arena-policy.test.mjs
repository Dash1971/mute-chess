import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadRoster } from '../roster.mjs';
import { freezeArena, arenaProduction, arenaTargetTime, effectivePolicy } from '../policy.mjs';

const bots = await loadRoster();
const bot = bots.find(b => b.personality && !b.personality.humanTiming) ?? bots[0];

test('Arena freezes human opponent conditioning and forces timing without changing the bot', () => {
  const before = structuredClone(bot);
  for (const rated of [true, false]) {
    const policy = freezeArena(bot, rated, 1432);
    const production = arenaProduction(policy);
    assert.equal(production.opponentElo, 1432);
    assert.equal(production.rated, rated);
    assert.equal(effectivePolicy(production, 12, bots).opponentElo, 1432);
    assert.ok(arenaTargetTime(policy, { baseSeconds: 900, incrementSeconds: 10 }, () => 0.5) > 0);
  }
  assert.deepEqual(bot, before);
});

test('two-bot Arena policies retain each bot inputs, seed and validation', () => {
  const first = freezeArena(bot, true), second = freezeArena(bot, true);
  assert.equal(arenaProduction(first).opponentElo, bot.conditioning_opponent);
  assert.notEqual(first.production.samplingSeed, second.production.samplingSeed);
  assert.doesNotThrow(() => effectivePolicy(arenaProduction(first), 14, bots));
  assert.throws(() => arenaProduction({ ...first, addedHumanWait: false }));
  assert.throws(() => arenaProduction({ ...first, rated: false }));
  assert.throws(() => freezeArena(bot, 'yes'));
  assert.throws(() => freezeArena(bot, true, NaN));
});
