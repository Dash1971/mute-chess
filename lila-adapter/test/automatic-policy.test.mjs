import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freezeAutomatic, automaticProduction, automaticTargetTime, effectivePolicy, targetTimeForPolicy } from '../policy.mjs';
import { freezeStudy, studyPolicy } from '../study-policy.mjs';
const roster = JSON.parse(readFileSync(new URL('../roster.json', import.meta.url)));
test('automatic games force waits while preserving the admitted production policy and roster', () => {
  const bot = roster.find(b => b.personality.humanTiming === false), before = JSON.stringify(bot);
  const policy = freezeAutomatic(bot), production = automaticProduction(policy), snapshot = JSON.stringify(policy);
  assert.equal(production.humanTiming, false);
  assert.equal(targetTimeForPolicy(production, { baseSeconds: 300, incrementSeconds: 3 }), 0);
  assert.ok(automaticTargetTime(policy, { baseSeconds: 300, incrementSeconds: 3 }, () => .5) > 0);
  const effective = effectivePolicy(production, 20, roster);
  assert.equal(effective.history, bot.personality.history);
  assert.equal(effective.selfElo, bot.conditioning_self);
  assert.equal(effective.opponentElo, bot.conditioning_opponent);
  assert.equal(JSON.stringify(policy), snapshot); assert.equal(JSON.stringify(bot), before);
  assert.throws(() => automaticProduction({ ...policy, addedHumanWait: false }), /unavailable/);
  assert.throws(() => effectivePolicy({ ...production, humanTiming: true }, 20, roster), /unavailable/);
});
test('old bounded study contract still rejects the automatic timing wrapper', () => {
  const study = freezeStudy(roster[0], 'test_run');
  assert.doesNotThrow(() => studyPolicy(study, 'test_run', 0, roster));
  assert.throws(() => studyPolicy(freezeAutomatic(roster[0]), 'test_run', 0, roster), /Invalid study/);
});
