import { createHash } from 'node:crypto';

export const CATALOG_SPEEDS = Object.freeze(['blitz', 'rapid']);
export const CATALOG_THRESHOLDS = Object.freeze([1000, 1400, 1800, 2200, 2600]);
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const finite = value => typeof value === 'number' && Number.isFinite(value);

/** Canonicalize effective playing policy, not account identity or timing.
 * Zero temperature/top-p are the same argmax selector; full sampling makes an
 * opening override immaterial. History is retained to reuse an exact measured
 * input policy. This does not estimate a universal strength effect of history.
 */
export function canonicalCatalogPolicy(bot) {
  const c = bot.conditioning_self, opponent = bot.conditioning_opponent;
  const t = bot.temperature_after_opening, p = bot.top_p_after_opening;
  const history = bot.personality?.history;
  const fullMoves = bot.opening?.full_moves ?? 0;
  requireValue(finite(c) && c >= 600 && c <= 2600 && opponent === c, 'Unsupported conditioning inputs');
  requireValue(finite(t) && t >= 0 && t <= 1 && finite(p) && p >= 0 && p <= 1, 'Invalid sampling settings');
  requireValue(typeof history === 'boolean', 'Missing fixed history policy');
  requireValue(Number.isInteger(fullMoves) && fullMoves >= 0, 'Invalid opening policy');
  if (fullMoves > 0) requireValue(bot.opening.temperature === 1 && bot.opening.top_p === 1,
    'Unsupported opening override');
  const deterministic = t === 0 || p === 0;
  const effectiveOpening = t === 1 && p === 1 ? 0 : fullMoves;
  return [c, deterministic ? 0 : t, deterministic ? 0 : p, effectiveOpening, history];
}

function validateReference(roster, perfs) {
  requireValue(Array.isArray(roster) && roster.length > 0, 'Reference roster is empty');
  const ids = new Set();
  for (const bot of roster) {
    requireValue(typeof bot.id === 'string' && bot.id && !ids.has(bot.id), 'Duplicate or invalid reference identity');
    ids.add(bot.id);
    canonicalCatalogPolicy(bot);
    for (const speed of CATALOG_SPEEDS) {
      const perf = perfs[bot.id]?.[speed];
      requireValue(perf && finite(perf.rating) && finite(perf.rd) && perf.rd > 0 && perf.rd < 110 &&
        perf.provisional === false && Number.isInteger(perf.games) && perf.games > 0,
      `Missing established reference: ${bot.id}/${speed}`);
    }
  }
}

/** Pool repeated equivalent policies by inverse recorded RD squared.
 * This is a descriptive weighted center, not independent replication or a new
 * confidence interval. Do not copy the sources' game counts/RDs to new names.
 * The caller initializes new accounts using its separately disclosed assigned
 * uncertainty and truthful zero games; existing perfs are never modified here.
 */
export function calibrateCatalogTemplates(roster, perfs, { minRating = 800 } = {}) {
  validateReference(roster, perfs);
  requireValue(finite(minRating), 'Invalid supported lower bound');
  const grouped = new Map();
  for (const bot of roster) {
    const policy = canonicalCatalogPolicy(bot), key = JSON.stringify(policy);
    if (!grouped.has(key)) grouped.set(key, { key, policy, bots: [] });
    grouped.get(key).bots.push(bot);
  }
  const templates = [];
  for (const group of grouped.values()) {
    const sourceIds = group.bots.map(bot => bot.id).sort();
    const ratings = {}, sourceMaxRd = {};
    for (const speed of CATALOG_SPEEDS) {
      let numerator = 0, denominator = 0;
      sourceMaxRd[speed] = 0;
      for (const id of sourceIds) {
        const perf = perfs[id][speed], weight = 1 / perf.rd ** 2;
        numerator += weight * perf.rating;
        denominator += weight;
        sourceMaxRd[speed] = Math.max(sourceMaxRd[speed], perf.rd);
      }
      ratings[speed] = numerator / denominator;
    }
    // Keep unsupported templates out rather than clipping/relabeling strength.
    // Existing below-bound identities remain present in the original roster.
    if (CATALOG_SPEEDS.some(speed => ratings[speed] < minRating)) continue;
    templates.push({ key: group.key, policy: group.policy, prototypeId: sourceIds[0],
      sourceIds, ratings, sourceMaxRd });
  }
  requireValue(templates.length > 0, 'No supported measured templates');
  return templates.sort((a, b) => compare(a.key, b.key));
}

function distributionTarget(input, thresholds, minRating) {
  const freq = Array.isArray(input) ? input : input?.freq;
  requireValue(Array.isArray(freq) && freq.length > 0 && freq.every(n => finite(n) && n >= 0),
    'Invalid Lichess frequency snapshot');
  const start = input?.bucketStart ?? 400, step = input?.bucketStep ?? 25;
  requireValue(finite(start) && finite(step) && step > 0, 'Invalid histogram bucket definition');
  let denominator = 0;
  const cumulative = thresholds.map(() => 0);
  for (let i = 0; i < freq.length; i++) {
    const rating = start + i * step;
    if (rating < minRating) continue;
    denominator += freq[i];
    for (let j = 0; j < thresholds.length; j++) if (rating < thresholds[j]) cumulative[j] += freq[i];
  }
  requireValue(denominator > 0, 'No Lichess observations in supported domain');
  return { cdf: cumulative.map(n => n / denominator), includedSourcePlayers: denominator };
}

function bandsFromCdf(cdf, total) {
  const endpoints = [0, ...cdf, total];
  return endpoints.slice(1).map((n, i) => n - endpoints[i]);
}

/** Allocate new names to measured (Blitz,Rapid) policy vectors.
 * Greedy squared-CDF minimization treats both speeds equally at fixed published
 * thresholds. The tiny repeat penalty spreads ties among measured templates;
 * a SHA-256 seed ordering settles exact ties without runtime randomness.
 * There is no per-speed relabeling: one new name receives the actual joint
 * ratings of its selected policy. Original accounts' actual ratings contribute
 * to the achieved CDF and are never changed to make a histogram fit.
 */
export function allocateCatalog({ roster, perfs, distributions, totalSize = 10000,
  minRating = 800, thresholds = CATALOG_THRESHOLDS, seed = 'mute-calibrated-catalog-v1' }) {
  requireValue(Number.isInteger(totalSize) && totalSize >= roster.length, 'Catalog cannot discard existing identities');
  requireValue(Array.isArray(thresholds) && thresholds.length > 0 &&
    thresholds.every((n, i) => finite(n) && n > minRating && (!i || n > thresholds[i - 1])), 'Invalid CDF thresholds');
  const templates = calibrateCatalogTemplates(roster, perfs, { minRating }).map(template => ({ ...template,
    assignedCount: 0, tie: createHash('sha256').update(seed + ':' + template.key).digest('hex') }));
  // The public hash order makes the outcome independent of input JSON order.
  templates.sort((a, b) => compare(a.tie, b.tie) || compare(a.key, b.key));
  const targets = {}, current = [], targetCounts = [];
  for (const speed of CATALOG_SPEEDS) {
    targets[speed] = distributionTarget(distributions[speed], thresholds, minRating);
    for (let j = 0; j < thresholds.length; j++) {
      targetCounts.push(targets[speed].cdf[j] * totalSize);
      current.push(roster.reduce((n, bot) => n + Number(perfs[bot.id][speed].rating < thresholds[j]), 0));
    }
  }
  const features = templates.map(template => CATALOG_SPEEDS.flatMap(speed =>
    thresholds.map(boundary => Number(template.ratings[speed] < boundary))));
  for (let n = roster.length; n < totalSize; n++) {
    let best = 0, bestScore = -Infinity;
    for (let i = 0; i < templates.length; i++) {
      let score = -templates[i].assignedCount * 0.0001;
      for (let j = 0; j < current.length; j++)
        if (features[i][j]) score += 2 * (targetCounts[j] - current[j]) - 1;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    templates[best].assignedCount++;
    for (let j = 0; j < current.length; j++) current[j] += features[best][j];
  }
  const target = {}, achieved = {};
  for (let i = 0; i < CATALOG_SPEEDS.length; i++) {
    const speed = CATALOG_SPEEDS[i], cdfCounts = current.slice(i * thresholds.length, (i + 1) * thresholds.length);
    target[speed] = { ...targets[speed], bandCounts: bandsFromCdf(targets[speed].cdf.map(n => n * totalSize), totalSize) };
    achieved[speed] = { cdf: cdfCounts.map(n => n / totalSize), bandCounts: bandsFromCdf(cdfCounts, totalSize),
      maxCdfMismatchPercentagePoints: Math.max(...cdfCounts.map((n, j) => Math.abs(n / totalSize - targets[speed].cdf[j]) * 100)) };
  }
  return { totalSize, existingCount: roster.length, newCount: totalSize - roster.length,
    minRating, thresholds: [...thresholds], seed,
    templates: templates.map(({ tie, ...template }) => template).sort((a, b) => compare(a.key, b.key)),
    target, achieved };
}
