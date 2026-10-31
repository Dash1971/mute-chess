import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalCatalogPolicy, calibrateCatalogTemplates, allocateCatalog } from '../catalog-calibration.mjs';

function bot(id, c, t = 1, p = 1, history = false) {
  return { id, conditioning_self: c, conditioning_opponent: c,
    temperature_after_opening: t, top_p_after_opening: p,
    opening: { temperature: 1, top_p: 1, full_moves: 5 }, personality: { history } };
}
function perf(rating, rd = 80) { return { rating, rd, provisional: false, games: 20 }; }
const snapshot = (blitz, rapid, rd = 80) => ({ blitz: perf(blitz, rd), rapid: perf(rapid, rd) });

function fixture() {
  const roster = [bot('weak', 600), bot('middle', 1600), bot('strong', 2600, 0, 1), bot('legacy-low', 600, 1, .95)];
  const perfs = { weak: snapshot(850, 900), middle: snapshot(1550, 1650),
    strong: snapshot(2800, 2700), 'legacy-low': snapshot(775, 850) };
  const freq = new Array(97).fill(0);
  freq[0] = 99999; // Excluded below-800 population must not dominate allocation.
  freq[(850 - 400) / 25] = 20;
  freq[(1550 - 400) / 25] = 70;
  freq[(2700 - 400) / 25] = 10;
  return { roster, perfs, distributions: { blitz: { freq }, rapid: { freq } } };
}

test('canonical policy collapses argmax aliases and immaterial full-sampling openings', () => {
  assert.deepEqual(canonicalCatalogPolicy(bot('a', 2600, 0, .3)), canonicalCatalogPolicy(bot('b', 2600, .8, 0)));
  const full = bot('full', 600); const noOverride = structuredClone(full); noOverride.opening.full_moves = null;
  assert.deepEqual(canonicalCatalogPolicy(full), canonicalCatalogPolicy(noOverride));
  assert.notDeepEqual(canonicalCatalogPolicy(bot('a', 2600, 0, 1, true)), canonicalCatalogPolicy(bot('b', 2600, 0, 1, false)));
});

test('duplicate policies use RD-weighted joint estimates, without inventing game evidence', () => {
  const roster = [bot('z', 2600, 0, 1), bot('a', 2600, 1, 0)];
  const perfs = { z: snapshot(3000, 2800, 100), a: snapshot(2600, 2400, 50) };
  const result = calibrateCatalogTemplates(roster, perfs);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].sourceIds, ['a', 'z']);
  assert.equal(result[0].prototypeId, 'a');
  assert.ok(Math.abs(result[0].ratings.blitz - 2680) < 1e-9);
  assert.ok(Math.abs(result[0].ratings.rapid - 2480) < 1e-9);
  assert.equal(result[0].games, undefined);
  assert.equal(result[0].ratings.blitz.provisional, undefined);
});

test('allocation preserves original marginals, excludes unsupported new seeds and totals exactly', () => {
  const input = fixture(), before = JSON.stringify(input);
  const result = allocateCatalog({ ...input, totalSize: 10000 });
  assert.equal(JSON.stringify(input), before);
  assert.equal(result.newCount, 9996);
  assert.equal(result.templates.reduce((n, t) => n + t.assignedCount, 0), 9996);
  assert.ok(!result.templates.some(t => t.sourceIds.includes('legacy-low')));
  for (const speed of ['blitz', 'rapid']) {
    assert.equal(result.target[speed].includedSourcePlayers, 100);
    assert.equal(result.achieved[speed].bandCounts.reduce((a, b) => a + b, 0), 10000);
    assert.ok(result.achieved[speed].maxCdfMismatchPercentagePoints <= .011);
  }
  // The below-bound existing account still contributes to the achieved first band.
  const weakCopies = result.templates.find(t => t.prototypeId === 'weak').assignedCount;
  assert.equal(result.achieved.blitz.bandCounts[0], weakCopies + 2);
});

test('seeded allocation is deterministic and independent of reference JSON order', () => {
  const input = fixture();
  const a = allocateCatalog({ ...input, totalSize: 100 });
  const b = allocateCatalog({ ...input, roster: [...input.roster].reverse(), totalSize: 100 });
  assert.deepEqual(a, b);
});

test('invalid/provisional source labels and duplicate IDs are rejected', () => {
  const input = fixture();
  input.perfs.middle.blitz.provisional = true;
  assert.throws(() => allocateCatalog(input), /established reference/);
  input.perfs.middle.blitz.provisional = false;
  input.perfs.middle.blitz.rd = 110;
  assert.throws(() => allocateCatalog(input), /established reference/);
  input.perfs.middle.blitz.rd = 80;
  input.roster.push(input.roster[0]);
  assert.throws(() => allocateCatalog(input), /Duplicate/);
});

test('unsupported histogram and impossible catalog sizes fail before allocation', () => {
  const input = fixture();
  assert.throws(() => allocateCatalog({ ...input, totalSize: 3 }), /discard/);
  assert.throws(() => allocateCatalog({ ...input, distributions: { blitz: { freq: [-1] } } }), /frequency/);
  assert.throws(() => allocateCatalog({ ...input, distributions: { blitz: { freq: [0] } } }), /supported domain/);
});
