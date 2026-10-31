import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadRoster } from '../roster.mjs';
import { CONTINUATION_PROFILE, CONTINUATION_ADMISSION_END, CONTINUATION_DEADLINE,
  recordDigest, validateContinuation, loadContinuation } from '../study-continuation.mjs';
const roster = await loadRoster();
const manifest = JSON.parse(await readFile(new URL('../experiment-manifest.json', import.meta.url)));
const sha = value => createHash('sha256').update(value).digest('hex');
function fixture() {
  const records = Array.from({ length: 2000 }, (_, i) => ({ id: `R${String(i).padStart(7,'0')}`,
    white: manifest.trainingIds[0], black: manifest.trainingIds[1], speed: 'blitz', state: 'finished',
    result: { status: 'mate', winner: 'black', plies: 4, whiteDiff: 0, blackDiff: 0, ratedUpdate: true } }));
  const model = { version: 'strength137-ridge-rbf-v1', rosterSha256: manifest.combinedRosterSha256,
    trainingIds: manifest.trainingIds, heldoutIds: manifest.heldoutIds,
    speeds: Object.fromEntries(['blitz','rapid'].map(s => [s, { predictions:
      Object.fromEntries(roster.map(b => [b.id, { rating: 1500 }])) }])) };
  const now = Date.parse('2026-10-31T10:10:00Z');
  const receipt = { version: CONTINUATION_PROFILE, runId: 'r20261031p137',
    predecessorMain: 'f656d5c22b062646cc48c54feced50cb2c6710f6', predecessorEnded: now-1000,
    admittedAtResume: 2000, maximumAdmitted: 3000, maximumConcurrency: 22, workerCount: 2,
    admissionEnd: CONTINUATION_ADMISSION_END, deadline: CONTINUATION_DEADLINE,
    modelVersion: model.version, recordsSha256: recordDigest(records) };
  const last = { runId: receipt.runId, profile: CONTINUATION_PROFILE, publicRatings: true,
    maximumAdmitted: 3000, maximumConcurrency: 22, workers: 2, deadline: receipt.deadline,
    admissionEnd: receipt.admissionEnd, closed: false, games: [], publicGames: 0, admitted: 2000, records };
  return { receipt, last, model, now };
}
test('continuation retains frozen primary predictions and aggregate predecessor records', () => {
  const f = fixture();
  assert.equal(validateContinuation(f.receipt,f.last,f.model,roster,manifest,f.now),f.model);
  assert.equal(f.last.admitted,2000);
  // It may qualify in the explicit isolated scope; a public/qualification mismatch fails.
  f.last.publicRatings = false;
  assert.throws(() => validateContinuation(f.receipt,f.last,f.model,roster,manifest,f.now));
  assert.equal(validateContinuation(f.receipt,f.last,f.model,roster,manifest,f.now,false),f.model);
});
test('changed deadlines, active games, source, count and frozen predictions are refused', () => {
  const mutations = [
    f => { f.receipt.deadline += 1; }, f => { f.receipt.predecessorMain = '0'.repeat(40); },
    f => { f.last.publicGames = 1; }, f => { f.last.games = [{ id:'active' }]; },
    f => { f.last.closed = true; }, f => { f.last.admitted = 3000; },
    f => { f.last.maximumConcurrency = 100; }, f => { f.last.records[0].result.plies++; },
    f => { f.model.version = 'refitted'; },
    f => { delete f.model.speeds.blitz.predictions[manifest.heldoutIds[0]]; },
  ];
  for (const mutate of mutations) {
    const f = fixture();mutate(f);
    assert.throws(() => validateContinuation(f.receipt,f.last,f.model,roster,manifest,f.now));
  }
  const f=fixture();
  assert.throws(() => validateContinuation(f.receipt,f.last,f.model,roster,manifest,CONTINUATION_ADMISSION_END));
});
test('record digest is order independent and rejects duplicate or unfinished games', () => {
  const { last }=fixture();
  assert.equal(recordDigest(last.records),recordDigest(last.records.toReversed()));
  assert.throws(() => recordDigest([last.records[0],last.records[0]]));
  assert.throws(() => recordDigest([{...last.records[0],state:'active'}]));
  assert.throws(() => recordDigest([{...last.records[0],result:{ratedUpdate:false}}]));
});
test('evidence loader verifies exact model and PGN bytes without rewriting predecessor', async t => {
  const f=fixture(),root=await mkdtemp(join(tmpdir(),'strength-continuation-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const predecessor=join(root,'original'),output=join(root,'continuation');
  await mkdir(predecessor);await mkdir(output);
  const payloads = Object.fromEntries(['checkpoint.json','supervisor.json','events.jsonl',
    'combined-roster.json','experiment-manifest.json','training-ratings.json','frozen-predictor.json','resources.jsonl']
    .map(n => [n, n==='frozen-predictor.json'?JSON.stringify(f.model):'{}']));
  f.receipt.predecessorFiles=Object.fromEntries(Object.entries(payloads).map(([n,b])=>[n,sha(b)]));
  f.receipt.predecessorPgnSha256={};
  for (const [name,bytes] of Object.entries(payloads)) await writeFile(join(predecessor,name),bytes);
  for (const record of f.last.records) {
    const pgn='[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1\n';
    await writeFile(join(predecessor,`${record.id}.pgn`),pgn);
    f.receipt.predecessorPgnSha256[record.id]=sha(pgn);
  }
  f.receipt.modelSha256=sha(payloads['frozen-predictor.json']);
  // The root auditor is tested independently with legal replay and complete ACKs.
  // This loader fixture represents its protected receipt, not a public result.
  const audit = { version:'strength137-integrity-v1',readOnly:true,run:f.receipt.runId,
    sourceMain:f.receipt.predecessorMain,dependencies:{chess:'1.11.2'},errors:[],
    checkedFinishedGames:f.last.admitted,recordsSha256:f.receipt.recordsSha256,
    uniqueVerifiedPlies:f.last.records.reduce((sum,r)=>sum+r.result.plies,0),
    acknowledgedPlies:f.last.records.reduce((sum,r)=>sum+r.result.plies,0),
    inputSha256:f.receipt.predecessorFiles,pgnSha256:f.receipt.predecessorPgnSha256 };
  const auditBytes=JSON.stringify(audit);
  f.receipt.integrityAuditSha256=sha(auditBytes);
  await writeFile(join(output,'integrity-audit.json'),auditBytes);
  await writeFile(join(output,'continuation.json'),JSON.stringify(f.receipt));
  const result=await loadContinuation(output,predecessor,f.last,roster,manifest,true,f.now);
  assert.equal(result.model.version,'strength137-ridge-rbf-v1');
  assert.equal(result.files['frozen-predictor.json'].toString(),payloads['frozen-predictor.json']);
  await writeFile(join(predecessor,`${f.last.records[0].id}.pgn`),'changed');
  await assert.rejects(loadContinuation(output,predecessor,f.last,roster,manifest,true,f.now),/Changed predecessor PGN/);
  assert.equal(await readFile(join(predecessor,'frozen-predictor.json'),'utf8'),payloads['frozen-predictor.json']);
});
