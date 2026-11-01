import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freeze, freezeForHuman, effectivePolicy, HUMAN_OPPONENT_CONDITIONING } from '../policy.mjs';

const roster = ['roster.json', 'experiment-roster.json'].flatMap(file =>
  JSON.parse(readFileSync(new URL('../' + file, import.meta.url))));
const bot = roster.find(b => b.id === 'static-bishop');

test('human-game inference keeps bot self input and freezes the human rating exactly', () => {
  const snapshot = freezeForHuman(bot, 1737);
  assert.equal(snapshot.selfElo, bot.conditioning_self);
  assert.equal(snapshot.opponentElo, 1737);
  assert.equal(snapshot.opponentConditioning, HUMAN_OPPONENT_CONDITIONING);
  assert.equal(snapshot.calibration, 'human-opponent-conditioning-unvalidated');
  for (const ply of [0, 9, 10, 60]) {
    const request = effectivePolicy(snapshot, ply, roster);
    assert.equal(request.selfElo, bot.conditioning_self);
    assert.equal(request.opponentElo, 1737);
  }
  const nextGame = freezeForHuman(bot, 1811);
  assert.equal(effectivePolicy(snapshot, 61, roster).opponentElo, 1737);
  assert.equal(effectivePolicy(nextGame, 0, roster).opponentElo, 1811);
  assert.notEqual(nextGame.version, snapshot.version);
});

test('human model-range boundaries do not alter other bot settings', () => {
  for (const [rating, expected] of [[1500, 1500], [400, 600], [600, 600], [2600, 2600], [3100, 2600]]) {
    for (const entry of roster) {
      const snapshot = freezeForHuman(entry, rating);
      const request = effectivePolicy(snapshot, 20, roster);
      assert.equal(request.opponentElo, expected);
      assert.equal(request.selfElo, entry.conditioning_self);
      assert.equal(request.history, entry.personality.history);
      assert.equal(request.temperature, entry.temperature_after_opening);
      assert.equal(request.topP, entry.top_p_after_opening);
      assert.equal(snapshot.humanTiming, entry.personality.humanTiming);
      assert.equal(snapshot.timingStyle, entry.personality.timingStyle);
    }
  }
});

test('invalid supplied ratings and changed frozen human inputs are rejected', () => {
  for (const rating of [undefined, null, '1737', 1737.5, NaN, Infinity, 0, -1, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => freezeForHuman(bot, rating), /positive integer/);
  const snapshot = freezeForHuman(bot, 1737);
  for (const change of [
    { opponentElo: 1738 }, { opponentElo: 599 }, { opponentElo: 2601 },
    { opponentElo: '1737' }, { opponentConditioning: undefined },
    { selfElo: 700 }, { history: !snapshot.history }, { humanTiming: !snapshot.humanTiming },
  ]) assert.throws(() => effectivePolicy({ ...snapshot, ...change }, 20, roster), /unavailable/);
});

test('existing fixed-input and study policies stay valid and are never converted', () => {
  for (const entry of roster) {
    const snapshot = freeze(entry);
    const before = JSON.stringify(snapshot);
    assert.equal(snapshot.opponentConditioning, undefined);
    const request = effectivePolicy(snapshot, 20, roster);
    assert.equal(request.selfElo, entry.conditioning_self);
    assert.equal(request.opponentElo, entry.conditioning_opponent);
    assert.equal(JSON.stringify(snapshot), before);
  }
});

test('anonymous play assumes equal strength rather than the matchmaking default', () => {
  for (const entry of roster) {
    const request = effectivePolicy(freeze(entry), 20, roster);
    assert.equal(request.opponentElo, entry.conditioning_self);
  }
});
