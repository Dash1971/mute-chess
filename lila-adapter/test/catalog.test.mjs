import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadRoster, loadReferenceRoster, validateRoster } from '../roster.mjs';
import { generateCatalog } from '../generate-catalog.mjs';
import { canonicalCatalogPolicy } from '../catalog-calibration.mjs';
import { assignedPersonality } from '../personality.mjs';

const read=async n=>JSON.parse(await readFile(new URL(n,import.meta.url)));
const full=await loadRoster(), old=await loadReferenceRoster();
const manifest=await read('../../docs/data/catalog-2026-11-01/catalog-manifest.json');
const source=await read('../../docs/data/catalog-2026-11-01/reference-settings.json');
const perfs=await read('../../docs/data/catalog-2026-11-01/reference-perfs.json');
const aliases=await read('../catalog-aliases.json');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('ten thousand unique identities preserve the exact250 measured policies',()=>{
 assert.equal(full.length,10000);assert.equal(old.length,250);assert.deepEqual(old,source);
 assert.deepEqual(full.slice(0,250),old);
 assert.equal(hash(source),manifest.referenceRosterSha256);
 assert.equal(new Set(full.map(b=>b.username.toLowerCase())).size,10000);
 assert.equal(new Set(full.map(b=>(aliases[b.username]??b.name).toLowerCase().replace(/[^a-z0-9]/g,''))).size,10000);
 assert.ok(full.every(b=>b.name.length<=20&&b.username.length<=20));
 assert.throws(()=>validateRoster([...old,old[0]]),/Duplicate/);
 assert.throws(()=>validateRoster([...old,{id:'fresh',username:old[0].username.toUpperCase()}]),/Duplicate/);
});
test('assigned ratings reuse measured exact policies; no invented game histories',()=>{
 const sources=new Map(old.map(b=>[b.id,b]));
 for(const b of full.slice(250)){
   const a=b.rating_assignment;assert.equal(a.method,'measured-policy-reference-v1');assert.equal(a.gameCount,0);
   assert.equal(a.initialRd,100);assert.ok(a.referenceIds.length>0);
   for(const id of a.referenceIds)assert.deepEqual(canonicalCatalogPolicy(b),canonicalCatalogPolicy(sources.get(id)));
   for(const speed of ['blitz','rapid']){
     let n=0,d=0;
     for(const id of a.referenceIds){const p=perfs[id][speed];n+=p.rating/p.rd**2;d+=1/p.rd**2;}
     assert.ok(Math.abs(b.ratings[speed].initial_rating-n/d)<1e-8);assert.ok(n/d>=800);
   }
   for(const speed of ['blitz','rapid','bullet','classical','ultraBullet','correspondence']){
     assert.equal(b.ratings[speed].initial_rd,100);assert.ok(b.ratings[speed].initial_rating>=400&&b.ratings[speed].initial_rating<=4000);
   }
   assert.equal(b.personality.humanTiming,assignedPersonality(b.id).humanTiming);
   assert.equal(b.personality.timingStyle,assignedPersonality(b.id).timingStyle);
 }
});
test('the generated catalog is reproducible and fills both speed distributions',async()=>{
 const rebuilt=await generateCatalog();assert.deepEqual(rebuilt.all,full);assert.deepEqual(rebuilt.manifest,manifest);
 assert.equal(manifest.added,9750);assert.equal(manifest.preserved,250);
 assert.ok(manifest.distribution.achieved.blitz.maxCdfMismatchPercentagePoints<.01);
 assert.ok(manifest.distribution.achieved.rapid.maxCdfMismatchPercentagePoints<.13);
 for(const speed of ['blitz','rapid'])assert.equal(manifest.distribution.achieved[speed].bandCounts.reduce((a,b)=>a+b),10000);
 const newBots=full.slice(250), timing=newBots.filter(b=>b.personality.humanTiming).length/newBots.length;
 assert.ok(timing>.45&&timing<.55);
 assert.equal(new Set(newBots.map(b=>b.personality.timingStyle)).size,5);
});
test('existing alias changes are display-only and limited to measured placeholders',()=>{
 assert.equal(Object.keys(aliases).length,12);
 for(const [username,name]of Object.entries(aliases)){
   assert.match(username,/^Signal(?:Train|Test)\d{3}$/);assert.ok(name.length<=20);
   assert.ok(old.some(b=>b.username===username));
 }
 assert.equal(manifest.top20.blitz[0].name,'Wintermute');
 assert.ok(manifest.top20.blitz.some(b=>b.name==='Roy Batty'));
 assert.ok(manifest.top20.blitz.some(b=>b.name==='Judge Dredd'));
});
