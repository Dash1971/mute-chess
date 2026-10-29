// Executed by mongosh after import.py verifies the pinned catalog.
const fs = require('fs');
const lines = fs.readFileSync(process.env.NSC_PUZZLE_RECORDS, 'utf8').trim().split('\n');
const puzzles = [], paths = [];
for (const line of lines) {
  const record = JSON.parse(line), doc = record.value;
  if (record.kind === 'puzzle') {
    doc.glicko.r = Double(doc.glicko.r); doc.glicko.d = Double(doc.glicko.d); doc.glicko.v = Double(doc.glicko.v);
    doc.vote = Double(doc.vote);
    if (doc.day) doc.day = new Date(doc.day.$date);
    puzzles.push({ updateOne:{filter:{_id:doc._id},update:{$setOnInsert:doc},upsert:true} });
  } else {
    doc.gen = Long(doc.gen);
    paths.push({updateOne:{filter:{_id:doc._id,nosweatCatalog:doc.nosweatCatalog},update:{$set:doc},upsert:true}});
  }
}
for (let i=0;i<puzzles.length;i+=500) db.puzzle2_puzzle.bulkWrite(puzzles.slice(i,i+500),{ordered:false});
for (let i=0;i<paths.length;i+=500) db.puzzle2_path.bulkWrite(paths.slice(i,i+500),{ordered:false});
db.puzzle2_path.createIndex({min:1,max:-1});
db.puzzle2_puzzle.createIndex({day:1},{partialFilterExpression:{day:{$exists:true}}});
db.puzzle2_puzzle.createIndex({themes:1});
db.puzzle2_round.createIndex({p:1},{partialFilterExpression:{t:{$exists:true}}});
db.puzzle2_round.createIndex({u:1,d:-1},{partialFilterExpression:{u:{$exists:1}}});
print(JSON.stringify({puzzles:puzzles.length, paths:paths.length, catalogPuzzles:db.puzzle2_puzzle.countDocuments({nosweatCatalog:'lichess-cc0-2026-10'})}));
