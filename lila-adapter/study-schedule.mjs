import { randomInt } from 'node:crypto';

// Study scheduling only. Public matchmaking remains the native PoolCatalog path.
export function pairing(roster, ratings, records, random = n => randomInt(n)) {
  const busy = new Set(records.filter(r => ['reserved', 'active'].includes(r.state)).flatMap(r => [r.white, r.black]));
  const counts = new Map(), colors = new Map();
  for (const r of records) for (const side of ['white', 'black']) {
    const key = `${r[side]}:${r.speed}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    colors.set(r[side], (colors.get(r[side]) ?? 0) + (side === 'white' ? 1 : -1));
  }
  const candidates = [];
  for (const bot of roster) for (const speed of ['blitz', 'rapid']) {
    if (busy.has(bot.id)) continue;
    const rating = ratings[bot.id]?.[speed]?.rating;
    if (!Number.isFinite(rating)) throw Error('Missing native rating');
    const eligible = roster.filter(other => other.id !== bot.id && !busy.has(other.id) &&
      Math.abs(Math.round(ratings[other.id][speed].rating) - Math.round(rating)) <= 200);
    if (eligible.length) candidates.push({ bot, speed, eligible, count: counts.get(`${bot.id}:${speed}`) ?? 0 });
  }
  if (!candidates.length) return null;
  const minimum = Math.min(...candidates.map(c => c.count));
  const leastPlayed = candidates.filter(c => c.count === minimum);
  const selected = leastPlayed[random(leastPlayed.length)];
  // Uniform eligible opponents; no recent-opponent avoidance or strength weighting.
  const opponent = selected.eligible[random(selected.eligible.length)];
  const white = (colors.get(selected.bot.id) ?? 0) <= (colors.get(opponent.id) ?? 0) ? selected.bot : opponent;
  return { white, black: white === selected.bot ? opponent : selected.bot, speed: selected.speed };
}
