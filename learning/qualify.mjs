// Explicit private-stack corpus qualification; never accepts a production origin.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const chapters=(await readFile(new URL('./chapters.jsonl',import.meta.url),'utf8')).trim().split('\n').map(JSON.parse);
for(const chapter of chapters) {
  const response=await fetch(`http://127.0.0.1:19663/practice/load/${chapter.studyId}/${chapter._id}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200,'Native lesson load '+chapter._id);
  const data=await response.json();assert.equal(data.study.chapter.id,chapter._id);
  assert.equal(data.analysis.game.variant.key,'standard');assert.ok(data.analysis.treeParts.length>0);
}
console.log(JSON.stringify({ok:true,nativeStandardChaptersLoaded:chapters.length}));
