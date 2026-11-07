// Called only after import.py verifies the pinned source and every legal solution.
const fs = require('fs');
if (!['nosweat', 'nosweat_lila_dev', 'nosweat_puzzle_catalog_test'].includes(db.getName()))
  throw Error('Unexpected puzzle database');
const expected = Number(process.env.NSC_PUZZLE_COUNT);
const catalog = process.env.NSC_PUZZLE_CATALOG;
if (!Number.isSafeInteger(expected) || expected < 1 || !/^lichess-[a-z0-9-]+$/.test(catalog || ''))
  throw Error('Missing catalog pin');

// Full catalogs do not fit in readFileSync(). Keep at most one chunk and one write batch.
function* lines(path) {
  const fd = fs.openSync(path, 'r'), buffer = Buffer.alloc(65536);
  let pending = '';
  try {
    let size;
    while ((size = fs.readSync(fd, buffer, 0, buffer.length, null))) {
      pending += buffer.toString('ascii', 0, size);
      let end;
      while ((end = pending.indexOf('\n')) >= 0) {
        yield pending.slice(0, end);
        pending = pending.slice(end + 1);
      }
    }
    if (pending) yield pending;
  } finally { fs.closeSync(fd); }
}

let batch = [], count = 0;
function flush() {
  if (batch.length) db.puzzle2_puzzle.bulkWrite(batch, {ordered: false});
  batch = [];
}
for (const line of lines(process.env.NSC_PUZZLE_RECORDS)) {
  if (!line) continue;
  const record = JSON.parse(line), doc = record.value;
  if (record.kind !== 'puzzle' || doc.nosweatCatalog !== catalog) throw Error('Unexpected catalog record');
  doc.glicko.r = Double(doc.glicko.r); doc.glicko.d = Double(doc.glicko.d); doc.glicko.v = Double(doc.glicko.v);
  doc.vote = Double(doc.vote);
  if (doc.day) doc.day = new Date(doc.day.$date);
  delete doc.nosweatCatalog;
  // Only the catalog-membership marker changes on existing records. Earned data stays native.
  batch.push({updateOne: {filter: {_id: doc._id}, update: {$setOnInsert: doc, $set: {nosweatCatalog: catalog}}, upsert: true}});
  // Starter rows omitted opening tags. Backfill only missing metadata, never existing tags.
  if (doc.opening) batch.push({updateOne: {filter: {_id: doc._id, opening: {$exists: false}}, update: {$set: {opening: doc.opening}}}});
  if (++count > expected) throw Error('Too many puzzle records');
  if (count % 500 === 0) flush();
}
flush();
if (count !== expected || db.puzzle2_puzzle.countDocuments({nosweatCatalog: catalog}) !== expected)
  throw Error('Imported catalog count mismatch; existing paths retained');

db.puzzle2_path.createIndex({min: 1, max: -1});
db.puzzle2_puzzle.createIndex({day: 1}, {partialFilterExpression: {day: {$exists: true}}});
db.puzzle2_puzzle.createIndex({themes: 1});
db.puzzle2_puzzle.createIndex({opening: 1, votes: -1}, {partialFilterExpression: {opening: {$exists: true}}});
db.puzzle2_round.createIndex({p: 1}, {partialFilterExpression: {t: {$exists: true}}});
db.puzzle2_round.createIndex({u: 1, d: -1}, {partialFilterExpression: {u: {$exists: 1}}});
// Use native generation replacement, tier percentiles, rating buckets and randomization.
load(process.env.NSC_PUZZLE_PATHS);
print(JSON.stringify({catalogPuzzles: count, totalPuzzles: db.puzzle2_puzzle.countDocuments({}), paths: db.puzzle2_path.countDocuments({})}));
