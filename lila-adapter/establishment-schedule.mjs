// Bounded follow-up study scheduling, never public pool matchmaking or rating writes.
import { randomInt, createHash } from 'node:crypto';

export const ESTABLISHMENT_PROFILE = 'rating-establishment-v1';
export const ESTABLISHMENT_RUN = 'r20261031n163';
export const ESTABLISHMENT_PRIVATE_RUN = 'q20261031n163';
export const ESTABLISHMENT_START = Date.parse('2026-10-31T13:30:00Z');
export const ESTABLISHMENT_ADMISSION_END = Date.parse('2026-10-31T21:00:00Z');
export const ESTABLISHMENT_DEADLINE = Date.parse('2026-10-31T21:30:00Z');
// Exact checked-in source bytes, distinct from the old driver's pretty-printed
// operational manifest. The follow-up cannot silently redesign policies/splits.
export const ESTABLISHMENT_ORIGINAL_MANIFEST_SHA256 = '1ba436c37456a7f621225791d6fa039891632f9029076c0377f77683c500b6d7';
export const ESTABLISHMENT_ROSTER_SHA256 = 'ac9cb13a2c2e6b59daf1c7d09a74527da7c07fcdd166ea2d0389e72c5d669296';
const SPEEDS = ['blitz', 'rapid'];
const hash = value => createHash('sha256').update(value).digest('hex');
function require(ok, reason) { if (!ok) throw Error(reason); }

export function establishmentManifest(roster, manifest, originalManifestBytes, run = ESTABLISHMENT_RUN) {
  require([ESTABLISHMENT_RUN, ESTABLISHMENT_PRIVATE_RUN].includes(run), 'Unknown establishment run');
  const training = new Set(manifest.trainingIds), heldout = new Set(manifest.heldoutIds);
  require(roster.length === 250 && training.size === 200 && heldout.size === 50 &&
    training.size === manifest.trainingIds.length && heldout.size === manifest.heldoutIds.length &&
    ![...training].some(id => heldout.has(id)) && roster.every(b => training.has(b.id) || heldout.has(b.id)) &&
    new Set(roster.map(b => b.id)).size === 250 && hash(JSON.stringify(roster)) === manifest.combinedRosterSha256,
  'Establishment requires the unchanged 250-policy roster and original split');
  require(JSON.stringify(JSON.parse(originalManifestBytes)) === JSON.stringify(manifest),
    'Original manifest bytes do not describe the supplied split');
  require(hash(originalManifestBytes) === ESTABLISHMENT_ORIGINAL_MANIFEST_SHA256 &&
    manifest.combinedRosterSha256 === ESTABLISHMENT_ROSTER_SHA256,
  'Establishment requires the frozen original source manifest/roster commitments');
  return { version: ESTABLISHMENT_PROFILE, runId: run,
    startedAtUtc: new Date(ESTABLISHMENT_START).toISOString(),
    admissionEndUtc: new Date(ESTABLISHMENT_ADMISSION_END).toISOString(),
    hardStopUtc: new Date(ESTABLISHMENT_DEADLINE).toISOString(),
    maximumAdmitted: 3000, maximumConcurrency: 22, workerCount: 2,
    originalManifestSha256: hash(originalManifestBytes), originalRosterSha256: manifest.originalRosterSha256,
    combinedRosterSha256: manifest.combinedRosterSha256,
    trainingIds: manifest.trainingIds, heldoutIds: manifest.heldoutIds,
    goal: 'All250 native nonprovisional Blitz AND Rapid; stop admissions and drain',
    procedure: 'strength137-ridge-rbf-effective-cv-v2',
    heldoutStatus: 'Previously observed policies; this follow-up is not fresh unseen-configuration validation',
    ratingWrites: 'Native Glicko only; retain earned initial perfs, no reseeding or forced flags' };
}

export function validateEstablishmentScope(last, metadata, publicRatings, now = Date.now()) {
  const expectedRun = publicRatings ? ESTABLISHMENT_RUN : ESTABLISHMENT_PRIVATE_RUN;
  require(metadata.version === ESTABLISHMENT_PROFILE && metadata.runId === expectedRun &&
    last.profile === ESTABLISHMENT_PROFILE && last.runId === expectedRun &&
    last.publicRatings === publicRatings && last.admitted === 0 && last.records.length === 0 &&
    last.games.length === 0 && last.closed === false && last.maximumAdmitted === 3000 &&
    last.maximumConcurrency === 22 && last.workers === 2 &&
    last.deadline === ESTABLISHMENT_DEADLINE && last.admissionEnd === ESTABLISHMENT_ADMISSION_END &&
    now >= ESTABLISHMENT_START && now < ESTABLISHMENT_ADMISSION_END,
  'Establishment scope, deadline, or fresh-run mismatch; no predecessor/resume permitted');
}

export function establishmentStatus(roster, ratings, manifest, modelFrozen, records = []) {
  const training = new Set(manifest.trainingIds), heldout = new Set(manifest.heldoutIds);
  const remaining = [];
  for (const bot of roster) for (const speed of SPEEDS) {
    const perf = ratings[bot.id]?.[speed];
    require(perf && Number.isFinite(perf.rating) && Number.isFinite(perf.rd) && perf.rd > 0 &&
      typeof perf.provisional === 'boolean', 'Missing or invalid native establishment perf');
    if (perf.provisional) remaining.push({ id: bot.id, speed, rd: perf.rd });
  }
  const trainingRemaining = remaining.filter(row => training.has(row.id));
  const heldoutRemaining = remaining.filter(row => heldout.has(row.id));
  const active = records.some(r => ['active', 'reserved'].includes(r.state));
  // Even an already-established population crosses a documented, drained freeze.
  const epoch = !modelFrozen ? trainingRemaining.length ? 'training' : active ? 'draining-training' : 'freeze-ready' :
    !remaining.length ? 'complete' : trainingRemaining.length ? 'training-maintenance' : 'heldout';
  return { epoch, modelFrozen, trainingRemaining: trainingRemaining.length,
    heldoutRemaining: heldoutRemaining.length, remaining };
}

export function validateEstablishmentModel(model, roster, manifest, ratings, records) {
  require(establishmentStatus(roster, ratings, manifest, false, records).epoch === 'freeze-ready',
    'Training must be established and in-flight games drained before freezing');
  require(model.version === 'strength137-ridge-rbf-effective-cv-v2' &&
    model.rosterSha256 === manifest.combinedRosterSha256 &&
    JSON.stringify(model.trainingIds) === JSON.stringify(manifest.trainingIds) &&
    JSON.stringify(model.heldoutIds) === JSON.stringify(manifest.heldoutIds) &&
    SPEEDS.every(speed => roster.every(bot => Number.isFinite(model.speeds[speed]?.predictions[bot.id]?.rating))),
  'Establishment fixed V2 fit/source/split mismatch');
  return model;
}

export function establishmentPairing(roster, ratings, records, manifest, modelFrozen, random = n => randomInt(n)) {
  const status = establishmentStatus(roster, ratings, manifest, modelFrozen, records);
  if (['complete', 'freeze-ready', 'draining-training'].includes(status.epoch)) return null;
  const training = new Set(manifest.trainingIds);
  const targets = status.remaining.filter(row => status.epoch === 'heldout' ? !training.has(row.id) : training.has(row.id));
  const busy = new Set(records.filter(r => ['active', 'reserved'].includes(r.state)).flatMap(r => [r.white, r.black]));
  const counts = new Map(), colors = new Map();
  for (const record of records) for (const side of ['white', 'black']) {
    const key = record[side] + ':' + record.speed;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    colors.set(key, (colors.get(key) ?? 0) + (side === 'white' ? 1 : -1));
  }
  const candidates = [];
  for (const target of targets) {
    if (busy.has(target.id)) continue;
    const own = ratings[target.id][target.speed];
    const eligible = roster.filter(bot => training.has(bot.id) && bot.id !== target.id && !busy.has(bot.id) &&
      Math.abs(Math.round(ratings[bot.id][target.speed].rating) - Math.round(own.rating)) <= 200);
    if (eligible.length) candidates.push({ ...target, bot: roster.find(bot => bot.id === target.id),
      eligible, count: counts.get(target.id + ':' + target.speed) ?? 0 });
  }
  if (!candidates.length) return null;
  const minimum = Math.min(...candidates.map(row => row.count));
  const scarce = candidates.filter(row => row.count === minimum);
  const highestRd = Math.max(...scarce.map(row => row.rd));
  const leastSettled = scarce.filter(row => row.rd === highestRd);
  const chosen = leastSettled[random(leastSettled.length)];
  const other = chosen.eligible[random(chosen.eligible.length)];
  const white = (colors.get(chosen.id + ':' + chosen.speed) ?? 0) <= (colors.get(other.id + ':' + chosen.speed) ?? 0) ? chosen.bot : other;
  return { white, black: white === chosen.bot ? other : chosen.bot, speed: chosen.speed, epoch: status.epoch };
}
