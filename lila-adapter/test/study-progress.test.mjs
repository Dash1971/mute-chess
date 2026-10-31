import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StudyProgress } from '../study-progress.mjs';
const game = moves => ({ id: 'example1', ply: moves.length, state: { moves: moves.join(' ') } });
test('native rollback and conflicting history fail rather than replaying moves', () => {
  const p = new StudyProgress();
  p.observe(game(['e2e4', 'e7e5']));
  assert.throws(() => p.observe(game(['e2e4'])), /rollback/);
  assert.throws(() => p.observe(game(['d2d4', 'd7d5'])), /conflicting/);
});
test('acknowledged moves cannot be submitted twice', () => {
  const p = new StudyProgress();
  assert.equal(p.maySubmit(game([])), true);
  p.acknowledge(game([]), 'e2e4');
  assert.equal(p.maySubmit(game([])), false, 'GET racing acknowledgement is skipped');
  assert.throws(() => p.acknowledge(game([]), 'e2e4'));
  assert.equal(p.maySubmit(game(['e2e4'])), true);
});
