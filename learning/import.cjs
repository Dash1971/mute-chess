const fs = require('fs');
const root = process.env.MUTE_LEARNING_ROOT;
const read = name => fs.readFileSync(root + '/' + name, 'utf8').trim().split('\n').map(line => EJSON.parse(line));
const studies = read('studies.jsonl'), chapters = read('chapters.jsonl');
// Preflight all collisions before any write. Never overwrite an existing local study.
for (const [collection, docs] of [[db.study, studies], [db.study_chapter_flat, chapters]]) {
  for (const doc of docs) {
    const old = collection.findOne({ _id: doc._id });
    if (old && (old.noSweatLesson !== doc.noSweatLesson || (doc.studyId && old.studyId !== doc.studyId))) {
      throw new Error('Lesson ID collision in ' + collection.getName() + ': ' + doc._id);
    }
  }
}
for (const [collection, docs] of [[db.study, studies], [db.study_chapter_flat, chapters]]) {
  for (const doc of docs) collection.updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
}
for (const [id, name, desc] of [
  ['mute-general', 'General chess discussion', 'Chess and the Mute Chess community.'],
  ['mute-game-analysis', 'Game analysis', 'Discuss positions, games, and analysis.'],
  ['mute-feedback', 'Feedback', 'Report problems and suggest improvements to Mute Chess.'],
]) {
  db.f_categ.updateOne({ _id: id }, { $setOnInsert: { _id:id, name, desc,
    nbTopics:0, nbPosts:0, lastPostId:'', nbTopicsTroll:0, nbPostsTroll:0,
    lastPostIdTroll:'', quiet:false, hidden:false } }, { upsert:true });
}
db.study_chapter_flat.createIndex({studyId:1,order:1});
print(JSON.stringify({studies:studies.length, chapters:chapters.length, forumCategories:3}));
