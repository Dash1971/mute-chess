import { randomInt } from 'node:crypto';
import { pairing } from './study-schedule.mjs';

export function experimentStage(admitted, manifest) {
  if (admitted < manifest.stages.warmupEnd) return 'warmup';
  if (admitted < manifest.stages.trainingEnd) return 'training';
  return 'validation';
}

export function experimentPairing(roster, ratings, records, manifest, modelFrozen, random = n => randomInt(n)) {
  const stage = experimentStage(records.length, manifest);
  if (stage !== 'validation') {
    const allowed = new Set(stage === 'warmup' ? manifest.existingIds : manifest.trainingIds);
    return pairing(roster.filter(b => allowed.has(b.id)), ratings, records, random);
  }
  if (!modelFrozen) return null;
  const heldout = new Set(manifest.heldoutIds), training = new Set(manifest.trainingIds);
  const busy = new Set(records.filter(r => ['active', 'reserved'].includes(r.state)).flatMap(r => [r.white, r.black]));
  const counts = new Map(), colors = new Map();
  for (const r of records) for (const side of ['white', 'black']) {
    const key = r[side]+':'+r.speed;
    counts.set(key, (counts.get(key) ?? 0)+1);
    colors.set(r[side], (colors.get(r[side]) ?? 0)+(side === 'white' ? 1 : -1));
  }
  const candidates = [];
  for (const bot of roster) if (heldout.has(bot.id) && !busy.has(bot.id)) for (const speed of ['blitz', 'rapid']) {
    const own = ratings[bot.id]?.[speed]?.rating;
    if (!Number.isFinite(own)) throw Error('Missing held-out native rating');
    const eligible = roster.filter(b => training.has(b.id) && !busy.has(b.id) &&
      Math.abs(Math.round(ratings[b.id][speed].rating)-Math.round(own)) <= 200);
    if (eligible.length) candidates.push({ bot, speed, eligible, count: counts.get(bot.id+':'+speed) ?? 0 });
  }
  if (!candidates.length) return null;
  const minimum = Math.min(...candidates.map(c => c.count));
  const least = candidates.filter(c => c.count === minimum);
  const chosen = least[random(least.length)], other = chosen.eligible[random(chosen.eligible.length)];
  const white = (colors.get(chosen.bot.id) ?? 0) <= (colors.get(other.id) ?? 0) ? chosen.bot : other;
  return { white, black: white === chosen.bot ? other : chosen.bot, speed: chosen.speed };
}
