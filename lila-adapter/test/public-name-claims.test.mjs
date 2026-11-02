import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../deploy/public/reserve-usernames.js', import.meta.url), 'utf8');
function execute(accounts, { database = 'nosweat_lila_dev', paused = true, matched = accounts.length } = {}) {
  const calls = [];
  const db = {
    getName: () => database,
    nosweat_activity: { findOne: () => ({ paused }) },
    user4: {
      find: () => ({ toArray: () => structuredClone(accounts) }),
      bulkWrite: writes => { calls.push(['write', structuredClone(writes)]); return { matchedCount: matched }; },
      createIndex: (...args) => calls.push(['index', ...structuredClone(args)]),
    },
  };
  return { run: () => vm.runInNewContext(source, { db, print: () => {} }), calls };
}

test('backfill matches NFKC/Java-trim/case normalization and changes only derived claims', () => {
  const accounts = [{ _id: 'AccountOne', profile: { displayName: '  ＡＬＩＣＥ  ' } }, { _id: 'Other' }];
  const before = structuredClone(accounts);
  const fixture = execute(accounts); fixture.run();
  const writes = fixture.calls[0][1];
  assert.deepEqual(writes[0].updateOne.update, { $set: { nameKeys: ['accountone', 'alice'] } });
  assert.deepEqual(writes[1].updateOne.update, { $set: { nameKeys: ['other'] } });
  assert.deepEqual(accounts, before);
  assert.deepEqual(fixture.calls[1], ['index', { nameKeys: 1 }, { name: 'public_name_keys_unique', unique: true, sparse: true }]);
});

test('duplicate claims are rejected before any writes or index creation', () => {
  for (const accounts of [
    [{ _id: 'one', profile: { displayName: 'Dash' } }, { _id: 'two', profile: { displayName: 'ＤＡＳＨ' } }],
    [{ _id: 'StormMeadow' }, { _id: 'human', profile: { displayName: 'stormmeadow' } }],
  ]) {
    const fixture = execute(accounts);
    assert.throws(fixture.run, /username collision/);
    assert.deepEqual(fixture.calls, []);
  }
});

test('same-account duplicate keys are stored once and blank names reserve only the handle', () => {
  const fixture = execute([{ _id: 'Alice', profile: { displayName: 'ＡＬＩＣＥ' } }, { _id: 'blank', profile: { displayName: '  ' } }]);
  fixture.run();
  assert.deepEqual(fixture.calls[0][1].map(w => w.updateOne.update.$set.nameKeys), [['alice'], ['blank']]);
});

test('changed profiles block index creation and retain the exact compare-and-set filter', () => {
  const fixture = execute([{ _id: 'one', profile: { displayName: 'Old Name' } }], { matched: 0 });
  assert.throws(fixture.run, /Account changed/);
  assert.deepEqual(fixture.calls[0][1][0].updateOne.filter, { _id: 'one', 'profile.displayName': 'Old Name' });
  assert.equal(fixture.calls.length, 1);
});

test('unexpected database and unpaused public activity reject before writes', () => {
  for (const options of [{ database: 'unrelated' }, { database: 'nosweat', paused: false }]) {
    const fixture = execute([{ _id: 'one' }], options);
    assert.throws(fixture.run);
    assert.deepEqual(fixture.calls, []);
  }
});
