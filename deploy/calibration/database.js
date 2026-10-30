// Executed by mongosh only. Production orchestration/backup gates live in adjust.py.
const fs = require('node:fs');
const crypto = require('node:crypto');
const request = JSON.parse(fs.readFileSync(process.env.MUTE_ADJUST_REQUEST, 'utf8'));
const uri = db.getMongo().getURI();
if (!/^mongodb:\/\/127\.0\.0\.1:(27019\/nosweat|27028\/nosweat_calibration_q[a-z0-9_]{2,31})(\?.*)?$/.test(uri))
  throw Error('Unexpected database scope');
const audit = db.getCollection('nosweat_rating_adjustment');
// mongosh promotes whole-valued Doubles to JS numbers on reads. Normalize the
// known Glicko fields, and separately assert their actual server-side BSON type.
const canonical = doc => {
  const value = EJSON.serialize(doc, { relaxed: false });
  if (doc) for (const [key, perf] of Object.entries(doc)) if (perf?.gl)
    for (const field of ['r', 'd', 'v']) {
      let number = String(perf.gl[field]);
      if (!/[.eE]/.test(number)) number += '.0';
      value[key].gl[field] = { $numberDouble: number };
    }
  return value;
};
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const image = value => EJSON.deserialize(value, { relaxed: false });
const assert = (value, reason) => { if (!value) throw Error(reason); };
const nativeTypes = ids => {
  const types = [];
  for (const speed of ['blitz', 'rapid', 'bullet', 'classical'])
    for (const field of ['r', 'd', 'v']) types.push({ $type: '$' + speed + '.gl.' + field });
  const documents = db.user_perf.aggregate([{ $match: { _id: { $in: ids } } },
    { $project: { types } }]).toArray();
  assert(documents.length === 44 && documents.every(d => d.types.every(t => t === 'double')),
    'Native Glicko fields must remain BSON Double');
  const aggregates = db.user_perf.aggregate([{ $match: { _id: { $in: ids }, 'standard.nb': { $gt: 0 } } },
    { $project: { types: ['r', 'd', 'v'].map(f => ({ $type: '$standard.gl.' + f })) } }]).toArray();
  assert(aggregates.every(d => d.types.every(t => t === 'double')), 'Native standard aggregate types changed');
};
const active = () => db.game5.countDocuments({ s: { $in: [10, 20] } }) +
  db.nosweat_game.countDocuments({ state: { $in: ['reserved', 'active'] } }) +
  db.nosweat_study_game.countDocuments({ state: { $in: ['reserved', 'active'] } });

if (request.mode === 'snapshot') {
  const users = db.user4.find({ noSweatBot: true },
    { _id: 1, title: 1, enabled: 1, noSweatBot: 1 }).sort({ _id: 1 }).toArray();
  const perfs = db.user_perf.find({ _id: { $in: users.map(u => u._id) } }).sort({ _id: 1 }).toArray();
  nativeTypes(users.map(u => u._id));
  print(JSON.stringify({ users, perfs: perfs.map(canonical), activeGames: active() }));
} else {
  assert(['prepare', 'apply', 'resume', 'restore', 'verify', 'record'].includes(request.mode), 'Unknown operation');
  assert(crypto.createHash('sha256').update(request.planJson).digest('hex') === request.planSha256,
    'Plan hash mismatch');
  const plan = JSON.parse(request.planJson);
  assert(plan.id === 'maia-p95-anchor-cross-speed-v1' && plan.offset === -75 && plan.rows.length === 44,
    'Unexpected plan');
  let ledger = audit.findOne({ _id: plan.id });
  if (request.mode === 'record') {
    print(JSON.stringify(ledger ? { status: ledger.status, planSha256: ledger.planSha256, backup: ledger.backup } : null));
  } else if (request.mode === 'verify') {
    assert(['applied', 'rolled-back'].includes(ledger?.status) && ledger.planSha256 === request.planSha256,
      'No matching completed record');
    for (const row of plan.rows)
      assert(same(db.user_perf.findOne({ _id: row.id }), image(ledger.status === 'applied' ? row.after : row.before)),
        'Current perf differs: ' + row.id);
    nativeTypes(plan.rows.map(row => row.id));
    print(JSON.stringify({ status: 'verified', identities: 44 }));
  } else {
    assert(active() === 0, 'Active games/reservations');
    const ids = db.user4.find({ noSweatBot: true }).sort({ _id: 1 }).toArray();
    assert(ids.length === 44 && ids.every((u, n) => u._id === plan.rows[n].id &&
      u.title === 'BOT' && u.enabled !== false), 'Managed cohort changed');
    nativeTypes(plan.rows.map(row => row.id));
    if (['prepare', 'apply'].includes(request.mode)) {
      assert(!ledger, 'Adjustment already recorded; never apply twice');
      assert(request.backup?.sha256 && request.backup?.path, 'Encrypted snapshot receipt required');
    } else {
      assert(ledger?.planSha256 === request.planSha256 && ledger.planJson === request.planJson,
        'Recovery must use the original recorded plan');
      assert(!['applied', 'rolling-back', 'rolled-back'].includes(ledger.status) || request.mode === 'restore',
        'Cannot resume a completed/reversing adjustment');
    }
    const restoring = request.mode === 'restore';
    // Preflight the whole cohort before changing the first document.
    for (const row of plan.rows) {
      const current = db.user_perf.findOne({ _id: row.id });
      assert(same(current, image(row.before)) || (!['prepare', 'apply'].includes(request.mode) && same(current, image(row.after))),
        'Stale/changed perf; keep writers stopped: ' + row.id);
    }
    if (!ledger) {
      audit.insertOne({ _id: plan.id, status: 'prepared', createdAt: new Date(),
        planSha256: request.planSha256, planJson: request.planJson, backup: request.backup });
    }
    if (request.mode === 'prepare') {
      print(JSON.stringify({ status: 'prepared', identities: 44 }));
    } else if (restoring && ledger.status === 'rolled-back') {
      for (const row of plan.rows) assert(same(db.user_perf.findOne({ _id: row.id }), image(row.before)),
        'Restored record no longer matches: ' + row.id);
      print(JSON.stringify({ status: 'already-restored', identities: 44 }));
    } else {
      if (db.getName() === 'nosweat') {
        const pending = JSON.parse(fs.readFileSync('/var/lib/nosweatchess-calibration/pending', 'utf8'));
        assert(process.getuid() === 0 && pending.id === plan.id && pending.planSha256 === request.planSha256,
          'Persistent maintenance guard required');
      }
      audit.updateOne({ _id: plan.id }, { $set: { status: restoring ? 'rolling-back' : 'applying' } });
      let written = 0;
      for (const row of plan.rows) {
        const target = image(restoring ? row.before : row.after);
        const source = image(restoring ? row.after : row.before);
        const current = db.user_perf.findOne({ _id: row.id });
        if (same(current, target)) continue;
        assert(same(current, source), 'Concurrent modification; keep writers stopped: ' + row.id);
        const set = {};
        // mongosh can coerce whole-number Double values to Int32 on a normal
        // update. Convert on the server to retain Lila's native BSON Double.
        for (const change of row.changes) for (const field of change.fields) {
          const value = field.split('.').reduce((value, key) => value[key], target);
          set[field] = { $toDouble: { $literal: String(value) } };
        }
        const result = db.user_perf.updateOne({ _id: row.id,
          $expr: { $eq: ['$$ROOT', { $literal: source }] } }, [{ $set: set }]);
        assert(result.modifiedCount === 1, 'Compare-and-set failed: ' + row.id);
        assert(same(db.user_perf.findOne({ _id: row.id }), target), 'Unexpected field mutation: ' + row.id);
        written++;
        // Qualification-only crash fixture; never available in the public namespace.
        if (db.getName().startsWith('nosweat_calibration_q') && request.testFailAfter === written)
          throw Error('Injected qualification failure');
      }
      for (const row of plan.rows)
        assert(same(db.user_perf.findOne({ _id: row.id }), image(restoring ? row.before : row.after)),
          'Final verification failed: ' + row.id);
      nativeTypes(plan.rows.map(row => row.id));
      audit.updateOne({ _id: plan.id }, { $set: { status: restoring ? 'rolled-back' : 'applied',
        completedAt: new Date(), sourceCommit: plan.sourceCommit } });
      print(JSON.stringify({ status: restoring ? 'restored' : 'applied', identities: 44, written }));
    }
  }
}
