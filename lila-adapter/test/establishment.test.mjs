import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadReferenceRoster } from '../roster.mjs';
import { ESTABLISHMENT_PROFILE, ESTABLISHMENT_RUN, ESTABLISHMENT_PRIVATE_RUN,
  ESTABLISHMENT_START, ESTABLISHMENT_ADMISSION_END, ESTABLISHMENT_DEADLINE,
  establishmentManifest, validateEstablishmentScope, establishmentStatus,
  establishmentPairing, validateEstablishmentModel } from '../establishment-schedule.mjs';

const roster = await loadReferenceRoster();
const bytes = readFileSync(new URL('../experiment-manifest.json', import.meta.url));
const manifest = JSON.parse(bytes);
const metadata = establishmentManifest(roster, manifest, bytes);
const settled = bots => Object.fromEntries(bots.map(bot => [bot.id,
  Object.fromEntries(['blitz', 'rapid'].map(speed => [speed, { rating: 1500, rd: 80, games: 30, provisional: false }]))]));
const small = ['a', 'b', 'c', 'h'].map(id => ({ id }));
const split = { trainingIds: ['a', 'b', 'c'], heldoutIds: ['h'], combinedRosterSha256: 'a'.repeat(64) };
const native = () => ({ runId: ESTABLISHMENT_RUN, profile: ESTABLISHMENT_PROFILE,
  publicRatings: true, admitted: 0, records: [], games: [], publicGames: 0, closed: false,
  maximumAdmitted: 3000, maximumConcurrency: 22, workers: 2,
  admissionEnd: ESTABLISHMENT_ADMISSION_END, deadline: ESTABLISHMENT_DEADLINE });
const model = bots => ({ version: 'strength137-ridge-rbf-effective-cv-v2', rosterSha256: split.combinedRosterSha256,
  trainingIds: split.trainingIds, heldoutIds: split.heldoutIds,
  speeds: Object.fromEntries(['blitz', 'rapid'].map(speed => [speed,
    { predictions: Object.fromEntries(bots.map(bot => [bot.id, { rating: 1500 }])) }])) });

test('new-run metadata preserves exact original roster/split/manifest commitments', () => {
  assert.equal(metadata.runId, ESTABLISHMENT_RUN);
  assert.equal(metadata.maximumAdmitted, 3000);
  assert.equal(metadata.originalManifestSha256, createHash('sha256').update(bytes).digest('hex'));
  assert.deepEqual(metadata.trainingIds, manifest.trainingIds);
  assert.deepEqual(metadata.heldoutIds, manifest.heldoutIds);
  assert.equal(metadata.combinedRosterSha256, manifest.combinedRosterSha256);
  assert.throws(() => establishmentManifest(roster.slice(1), manifest, bytes));
  assert.throws(() => establishmentManifest([...roster].reverse(), manifest, bytes));
  assert.throws(() => establishmentManifest(roster, { ...manifest, heldoutIds: manifest.trainingIds.slice(0, 50) }, bytes));
});

test('fresh exact public/private scopes reject old runs, wrong budgets and late starts', () => {
  validateEstablishmentScope(native(), metadata, true, ESTABLISHMENT_START);
  const privateMeta = establishmentManifest(roster, manifest, bytes, ESTABLISHMENT_PRIVATE_RUN);
  validateEstablishmentScope({ ...native(), runId: ESTABLISHMENT_PRIVATE_RUN, publicRatings: false }, privateMeta, false, ESTABLISHMENT_START);
  for (const patch of [{ runId: 'r20261031p137' }, { admitted: 1 }, { records: [{ id: 'old' }] },
    { games: [{ id: 'active' }] }, { closed: true }, { workers: 1 }, { publicRatings: false },
    { maximumConcurrency: 23 }, { maximumAdmitted: 3001 }, { deadline: ESTABLISHMENT_DEADLINE + 1 },
    { admissionEnd: ESTABLISHMENT_ADMISSION_END + 1 }])
    assert.throws(() => validateEstablishmentScope({ ...native(), ...patch }, metadata, true, ESTABLISHMENT_START));
  assert.throws(() => validateEstablishmentScope(native(), metadata, true, ESTABLISHMENT_START - 1));
  assert.throws(() => validateEstablishmentScope(native(), metadata, true, ESTABLISHMENT_ADMISSION_END));
});

test('all250 BOTH native flags, not low RD or an artificial game count, define the target', () => {
  const ratings = settled(roster);
  assert.equal(establishmentStatus(roster, ratings, manifest, true).epoch, 'complete');
  const id = manifest.heldoutIds.at(-1);
  ratings[id].rapid = { rating: 1500, rd: 20, games: 1000, provisional: true };
  const state = establishmentStatus(roster, ratings, manifest, true);
  assert.equal(state.epoch, 'heldout'); assert.equal(state.heldoutRemaining, 1);
  assert.deepEqual(state.remaining.map(row => [row.id, row.speed]), [[id, 'rapid']]);
  delete ratings[id].blitz;
  assert.throws(() => establishmentStatus(roster, ratings, manifest, true));
});

test('training barrier drains actual active/reserved records and cannot admit heldout before freeze', () => {
  const ratings = settled(small);
  ratings.h.blitz.provisional = true;
  const active = [{ white: 'a', black: 'b', speed: 'rapid', state: 'active' }];
  for (const state of ['active', 'reserved']) {
    const records = [{ ...active[0], state }];
    assert.equal(establishmentStatus(small, ratings, split, false, records).epoch, 'draining-training');
    assert.equal(establishmentPairing(small, ratings, records, split, false), null);
  }
  assert.equal(establishmentStatus(small, ratings, split, false).epoch, 'freeze-ready');
  assert.equal(establishmentPairing(small, ratings, [], split, false), null);
  assert.ok(establishmentPairing(small, ratings, [], split, true, () => 0));
});

test('training targets prioritize scarce coverage, then current RD, with per-speed color balance', () => {
  const ratings = settled(small);
  ratings.a.blitz.provisional = ratings.b.rapid.provisional = true;
  ratings.a.blitz.rd = 120; ratings.b.rapid.rd = 160;
  const records = [{ white: 'b', black: 'c', speed: 'rapid', state: 'finished' }];
  const match = establishmentPairing(small, ratings, records, split, false, () => 0);
  assert.equal(match.speed, 'blitz'); // Zero new appearances takes priority over a higher RD.
  assert.ok([match.white.id, match.black.id].includes('a'));
  const chosen = establishmentPairing(small, ratings, [], split, false, () => 0);
  assert.equal(chosen.speed, 'rapid'); // Equal coverage: least settled first.
  assert.ok([chosen.white.id, chosen.black.id].includes('b'));
});

test('opponents remain uniform across ALL eligible training accounts, including provisional ones', () => {
  const ratings = settled(small);
  ratings.a.blitz.provisional = ratings.b.blitz.provisional = true;
  ratings.a.blitz.rd = 160; ratings.b.blitz.rd = 120;
  const trainingOpponents = new Set();
  for (let n = 0; n < 2; n++) {
    const match = establishmentPairing(small, ratings, [], split, false, size => size === 2 ? n : 0);
    trainingOpponents.add([match.white.id, match.black.id].find(id => id !== 'a'));
  }
  assert.deepEqual(trainingOpponents, new Set(['b', 'c'])); // Provisional b is not filtered away.
  ratings.a.blitz.provisional = ratings.b.blitz.provisional = false;
  ratings.h.blitz.provisional = true;
  const opponents = new Set();
  // Keep b provisional only in the opposite speed to isolate heldout target.
  ratings.b.blitz.provisional = false; ratings.b.rapid.provisional = true;
  for (let n = 0; n < 3; n++) {
    const match = establishmentPairing(small, ratings, [], split, true, size => size === 3 ? n : 0);
    // Training maintenance runs first until every training flag is native false.
    assert.equal(match.epoch, 'training-maintenance');
  }
  ratings.b.rapid.provisional = false;
  for (let n = 0; n < 3; n++) {
    const match = establishmentPairing(small, ratings, [], split, true, size => size === 3 ? n : 0);
    opponents.add([match.white.id, match.black.id].find(id => id !== 'h'));
  }
  assert.deepEqual(opponents, new Set(['a', 'b', 'c']));
});

test('color balancing is per speed and gives a repeated White target the Black seat', () => {
  const ratings = settled(small);
  ratings.h.blitz.provisional = true;
  const records = [{ white: 'h', black: 'a', speed: 'blitz', state: 'finished' }];
  const match = establishmentPairing(small, ratings, records, split, true, () => 0);
  assert.equal(match.black.id, 'h');
});

test('synthetic progression crosses one drained freeze then completes without altering native flags itself', () => {
  const ratings = settled(small);
  for (const bot of small) for (const speed of ['blitz', 'rapid']) ratings[bot.id][speed].provisional = true;
  const records = []; let modelFrozen = false, freezes = 0;
  for (let n = 0; n < 50; n++) {
    const status = establishmentStatus(small, ratings, split, modelFrozen, records);
    if (status.epoch === 'complete') break;
    if (status.epoch === 'freeze-ready') { modelFrozen = true; freezes++; continue; }
    const match = establishmentPairing(small, ratings, records, split, modelFrozen, () => 0);
    assert.ok(match);
    const ids = [match.white.id, match.black.id];
    if (!modelFrozen) assert.ok(ids.every(id => split.trainingIds.includes(id)));
    else assert.equal(ids.filter(id => id === 'h').length, 1);
    records.push({ white: match.white.id, black: match.black.id, speed: match.speed, state: 'finished' });
    // Test fixture supplies native transitions; scheduler never computes or forces these.
    for (const id of ids) ratings[id][match.speed].provisional = false;
  }
  assert.equal(freezes, 1);
  assert.equal(establishmentStatus(small, ratings, split, modelFrozen, records).epoch, 'complete');
  assert.equal(establishmentPairing(small, ratings, records, split, modelFrozen), null);
});

test('native +/-200 rounded boundary and both busy seats are retained without widening', () => {
  const ratings = settled(small);
  ratings.h.blitz.provisional = true;
  ratings.h.blitz.rating = 1500.49;
  ratings.a.blitz.rating = 1700.49; // native rounded difference200
  ratings.b.blitz.rating = 1700.51; // rounded difference201
  ratings.c.blitz.rating = 1000;
  let match = establishmentPairing(small, ratings, [], split, true, () => 0);
  assert.deepEqual(new Set([match.white.id, match.black.id]), new Set(['h', 'a']));
  const busy = [{ white: 'a', black: 'c', speed: 'rapid', state: 'reserved' }];
  assert.equal(establishmentPairing(small, ratings, busy, split, true), null);
  ratings.h.blitz.rating = 2700;
  assert.equal(establishmentPairing(small, ratings, [], split, true), null);
});

test('frozen-model validation requires the drained native training goal and exact V2 split/predictions', () => {
  const ratings = settled(small), fitted = model(small);
  validateEstablishmentModel(fitted, small, split, ratings, []);
  for (const bad of [{ ...fitted, version: 'strength137-ridge-rbf-v1' },
    { ...fitted, trainingIds: ['h'] }, { ...fitted, heldoutIds: [] },
    { ...fitted, speeds: {} }]) assert.throws(() => validateEstablishmentModel(bad, small, split, ratings, []));
  ratings.a.rapid.provisional = true;
  assert.throws(() => validateEstablishmentModel(fitted, small, split, ratings, []));
  ratings.a.rapid.provisional = false;
  assert.throws(() => validateEstablishmentModel(fitted, small, split, ratings,
    [{ white: 'a', black: 'b', speed: 'blitz', state: 'active' }]));
});

test('scheduling never mutates fixed policies, native perf values, records or original manifest', () => {
  const ratings = settled(roster);
  ratings[manifest.trainingIds[0]].blitz.provisional = true;
  ratings[manifest.heldoutIds[0]].rapid.provisional = true;
  const before = JSON.stringify({ roster, ratings, manifest });
  for (let i = 0; i < 25; i++) establishmentPairing(roster, ratings, [], manifest, false, size => i % size);
  assert.equal(JSON.stringify({ roster, ratings, manifest }), before);
});
