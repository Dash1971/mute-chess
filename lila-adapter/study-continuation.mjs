// The owner-authorized validation tail cannot reseed or refit a failed run.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const CONTINUATION_PROFILE = 'strength-validation-continuation-v1';
export const CONTINUATION_ADMISSION_END = Date.parse('2026-10-31T12:30:00Z');
export const CONTINUATION_DEADLINE = Date.parse('2026-10-31T13:00:00Z');
const PRIMARY_MAIN = 'f656d5c22b062646cc48c54feced50cb2c6710f6';
const PRIMARY_VERSION = 'strength137-ridge-rbf-v1';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function require(ok, reason) { if (!ok) throw Error(reason); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function recordDigest(records) {
  const ids = new Set();
  const normalized = records.map(r => {
    require(!ids.has(r.id) && r.state === 'finished' && r.result?.ratedUpdate === true,
      'Continuation requires unique finished, rated predecessor records');
    ids.add(r.id);
    return Object.fromEntries(['id', 'white', 'black', 'speed', 'state', 'result'].map(k => [k, r[k]]));
  }).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return digest(canonical(normalized));
}
export function validateContinuation(receipt, last, model, roster, manifest, now = Date.now(), publicRatings = true) {
  require(receipt.version === CONTINUATION_PROFILE && receipt.runId === 'r20261031p137' &&
    receipt.predecessorMain === PRIMARY_MAIN && receipt.modelVersion === PRIMARY_VERSION,
  'Unreviewed continuation scope');
  require(receipt.admissionEnd === CONTINUATION_ADMISSION_END && receipt.deadline === CONTINUATION_DEADLINE &&
    now >= receipt.predecessorEnded && now < CONTINUATION_ADMISSION_END, 'Continuation deadline mismatch');
  require(receipt.maximumAdmitted === 3000 && receipt.maximumConcurrency === 22 && receipt.workerCount === 2 &&
    last.runId === receipt.runId && last.profile === CONTINUATION_PROFILE && last.publicRatings === publicRatings &&
    last.maximumAdmitted === 3000 && last.maximumConcurrency === 22 && last.workers === 2 &&
    last.deadline === receipt.deadline && last.admissionEnd === receipt.admissionEnd &&
    last.closed === false && last.games.length === 0 && last.publicGames === 0,
  'Continuation native budget or active-game mismatch');
  require(last.admitted === receipt.admittedAtResume && last.admitted >= 2000 && last.admitted < 3000 &&
    last.records.length === last.admitted && recordDigest(last.records) === receipt.recordsSha256,
  'Continuation predecessor record mismatch');
  require(roster.length === 250 && digest(JSON.stringify(roster)) === manifest.combinedRosterSha256 &&
    model.rosterSha256 === manifest.combinedRosterSha256 && model.version === PRIMARY_VERSION &&
    JSON.stringify(model.trainingIds) === JSON.stringify(manifest.trainingIds) &&
    JSON.stringify(model.heldoutIds) === JSON.stringify(manifest.heldoutIds) &&
    model.trainingIds.length === 200 && model.heldoutIds.length === 50,
  'Continuation frozen model/roster/split mismatch');
  for (const speed of ['blitz', 'rapid']) require(roster.every(b =>
    Number.isFinite(model.speeds[speed]?.predictions[b.id]?.rating)), 'Missing frozen primary prediction');
  return model;
}
export async function loadContinuation(output, predecessor, last, roster, manifest, publicRatings, now = Date.now()) {
  require(predecessor?.startsWith('/') && output !== predecessor, 'Separate predecessor evidence directory required');
  const receiptBytes = await readFile(`${output}/continuation.json`);
  const receipt = JSON.parse(receiptBytes);
  const files = {};
  const required = ['checkpoint.json', 'supervisor.json', 'events.jsonl', 'combined-roster.json',
    'experiment-manifest.json', 'training-ratings.json', 'frozen-predictor.json', 'resources.jsonl'];
  require(Object.keys(receipt.predecessorFiles).length === required.length, 'Incomplete predecessor hash receipt');
  for (const name of required) {
    const bytes = await readFile(`${predecessor}/${name}`);
    require(digest(bytes) === receipt.predecessorFiles[name], `Changed predecessor evidence: ${name}`);
    files[name] = bytes;
  }
  require(Object.keys(receipt.predecessorPgnSha256).length === receipt.admittedAtResume,
    'Incomplete predecessor PGN hash receipt');
  for (const [id, hash] of Object.entries(receipt.predecessorPgnSha256)) {
    require(/^[a-zA-Z0-9]{8}$/.test(id), 'Invalid predecessor PGN ID');
    require(digest(await readFile(`${predecessor}/${id}.pgn`)) === hash, `Changed predecessor PGN: ${id}`);
  }
  const auditBytes = await readFile(`${output}/integrity-audit.json`);
  require(digest(auditBytes) === receipt.integrityAuditSha256, 'Integrity audit receipt bytes changed');
  const audit = JSON.parse(auditBytes);
  require(audit.version === 'strength137-integrity-v1' && audit.readOnly === true &&
    audit.run === receipt.runId && audit.sourceMain === PRIMARY_MAIN &&
    audit.dependencies?.chess === '1.11.2' && Array.isArray(audit.errors) && audit.errors.length === 0 &&
    audit.checkedFinishedGames === receipt.admittedAtResume && audit.recordsSha256 === receipt.recordsSha256 &&
    audit.uniqueVerifiedPlies === last.records.reduce((sum,r) => sum+r.result.plies,0) &&
    audit.acknowledgedPlies === audit.uniqueVerifiedPlies &&
    canonical(audit.inputSha256) === canonical(receipt.predecessorFiles) &&
    canonical(audit.pgnSha256) === canonical(receipt.predecessorPgnSha256),
  'Incomplete or mismatched predecessor integrity audit');
  require(digest(files['frozen-predictor.json']) === receipt.modelSha256, 'Primary model bytes changed');
  const model = validateContinuation(receipt, last, JSON.parse(files['frozen-predictor.json']), roster, manifest, now, publicRatings);
  return { receipt, receiptSha256: digest(receiptBytes), model, files };
}
