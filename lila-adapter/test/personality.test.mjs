import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assignedPersonality, validatePersonality, TIMING_STYLES } from '../personality.mjs';
import { freeze, effectivePolicy, targetTimeForPolicy, targetTime, LEGACY_TIMING_VERSION } from '../policy.mjs';

const roster = JSON.parse(readFileSync(new URL('../roster.json', import.meta.url)));
const indexed = new Map(roster.map(bot => [bot.id, bot]));

test('published assignments persist history, timing and style across games without changing move seeds', () => {
  for (const bot of roster) {
    assert.deepEqual(bot.personality, assignedPersonality(bot.id));
    validatePersonality(bot.personality);
    const first = freeze(bot), second = freeze(bot);
    assert.equal(first.history, second.history);
    assert.equal(first.history, bot.personality.history);
    assert.equal(first.humanTiming, second.humanTiming);
    assert.equal(first.timingStyle, second.timingStyle);
    assert.equal(first.temperature, second.temperature);
    assert.equal(first.topP, second.topP);
    assert.notEqual(first.samplingSeed, second.samplingSeed);
    assert.deepEqual(effectivePolicy(first, 30, indexed), effectivePolicy(first, 30, roster));
    assert.throws(() => effectivePolicy({ ...first, history: !first.history }, 30, indexed), /unavailable/);
    assert.throws(() => effectivePolicy({ ...first, humanTiming: !first.humanTiming }, 30, indexed), /unavailable/);
  }
  assert.equal(new Set(roster.map(bot => bot.personality.history)).size, 2);
  assert.equal(new Set(roster.map(bot => bot.personality.humanTiming)).size, 2);
  assert.equal(new Set(roster.map(bot => bot.personality.timingStyle)).size, 5);
});

test('previously frozen v2 games retain their history and timing after personality migration', () => {
  // Captured using fb44bcc's pre-personality roster and version algorithm.
  const pinned = JSON.parse(readFileSync(new URL('./fixtures/frozen-v2-static-bishop.json', import.meta.url)));
  assert.equal(effectivePolicy(pinned, 30, indexed).history, true);
  assert.equal(effectivePolicy(pinned, 30, indexed).temperature, 0);
  for (const bot of roster) {
    const { personality, ...legacyBot } = bot;
    const previous = freeze(legacyBot);
    assert.equal(previous.timingVersion, LEGACY_TIMING_VERSION);
    assert.deepEqual(effectivePolicy(previous, 30, roster), effectivePolicy(previous, 30, [legacyBot]));
    const draws = () => 0.5;
    assert.equal(targetTimeForPolicy(previous, { baseSeconds: 60, incrementSeconds: 0 }, draws),
      targetTime({ baseSeconds: 60, incrementSeconds: 0 }, draws));
  }
});

test('disabled timing never samples a wait; five styles stay ordered and preserve fast-control caps', () => {
  const policy = freeze(roster[0]);
  assert.equal(targetTimeForPolicy({ ...policy, humanTiming: false }, {}, () => { throw Error('Unexpected draw'); }), 0);
  const timings = Object.keys(TIMING_STYLES).map(timingStyle =>
    targetTimeForPolicy({ ...policy, humanTiming: true, timingStyle }, { baseSeconds: 300, incrementSeconds: 3 }, () => 0.5));
  assert.deepEqual(timings, [...timings].sort((a, b) => a - b));
  assert.equal(new Set(timings).size, 5);
  for (const timingStyle of Object.keys(TIMING_STYLES)) {
    const p = { ...policy, humanTiming: true, timingStyle };
    assert.ok(targetTimeForPolicy(p, { baseSeconds: 60, incrementSeconds: 0 }, () => 0.001) <= 3000);
    assert.ok(targetTimeForPolicy(p, { baseSeconds: 180, incrementSeconds: 2 }, () => 0.001) <= 4500);
  }
  assert.throws(() => validatePersonality({ history: true, humanTiming: true, timingStyle: 'constructor' }), /Invalid/);
});
