import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const studies=fs.readFileSync(root+'studies.jsonl','utf8').trim().split('\n').map(JSON.parse);
const chapters=fs.readFileSync(root+'chapters.jsonl','utf8').trim().split('\n').map(JSON.parse);
const code=fs.readFileSync(root+'import.cjs','utf8');
function run(initial={}) {
  let writes=0;
  const collections={};
  for (const name of ['study','study_chapter_flat','f_categ']) {
    const docs=new Map(initial[name]??[]);
    collections[name]={ docs, getName:()=>name, findOne:({ _id })=>docs.get(_id), createIndex:()=>{},
      updateOne:({ _id },update)=>{writes++;if(!docs.has(_id))docs.set(_id,structuredClone(update.$setOnInsert));} };
  }
  const context={db:collections, require:name=>{assert.equal(name,'fs');return fs;},
    process:{env:{MUTE_LEARNING_ROOT:root}}, EJSON:{parse:JSON.parse}, print:()=>{}};
  return { execute:()=>vm.runInNewContext(code,context), collections, writes:()=>writes };
}
const first=run();first.execute();assert.equal(first.collections.study.docs.size,20);
assert.equal(first.collections.study_chapter_flat.docs.size,229);assert.equal(first.collections.f_categ.docs.size,3);
const existing=structuredClone(studies[0]);existing.name='Preserve a local lesson edit';
const repeat=run({study:[[existing._id,existing]]});repeat.execute();
assert.equal(repeat.collections.study.docs.get(existing._id).name,existing.name);
for(const [collection,doc] of [['study',studies[19]],['study_chapter_flat',chapters[228]]]) {
  const foreign={...doc,noSweatLesson:undefined};const conflict=run({[collection]:[[doc._id,foreign]]});
  assert.throws(conflict.execute,/Lesson ID collision/);assert.equal(conflict.writes(),0,'All collisions are preflighted');
}
console.log('Additive lesson/category import, idempotence and no-write collision checks passed');
