import { randomBytes, randomInt, createHash } from 'node:crypto';
import { MODEL_SHA256 } from './maia.mjs';
import { AdapterError } from './nostr-auth.mjs';

export function versionFor(bot) {
  return 'maia79-lila-v1-' + createHash('sha256').update(JSON.stringify({ bot, model: MODEL_SHA256,
    sampler: 'softmax-categorical-numpy-pcg64-inclusive-nucleus-v1', timing: 'lognormal-050-044-006-clock-cap-v1' })).digest('hex').slice(0, 16);
}
export function freeze(bot) {
  return { version: versionFor(bot), bot: bot.id, name: bot.name, modelSha256: MODEL_SHA256,
    encoderRevision: 'CSSLab-1e13597c-numpy-history-v1', selfElo: bot.conditioning_self,
    opponentElo: bot.conditioning_opponent, history: randomInt(2) === 1,
    historyMixture: '50/50 frozen per game', profile: bot.sampling_profile,
    openingFullMoves: bot.opening.full_moves ?? 0, temperature: bot.temperature_after_opening,
    topP: bot.top_p_after_opening, timingVersion: 'lognormal-050-044-006-clock-cap-v1',
    samplingSeed: randomBytes(16).toString('hex'), rated: false,
    calibration: bot.conditioning_self >= 2200 ? 'experimental-unvalidated' : 'unvalidated-provisional' };
}
export function effectivePolicy(policy, ply, roster) {
  const bot = roster.find(bot => bot.id === policy.bot);
  if (!bot || policy.version !== versionFor(bot) || policy.modelSha256 !== MODEL_SHA256 ||
      policy.selfElo !== bot.conditioning_self || policy.opponentElo !== bot.conditioning_opponent ||
      typeof policy.history !== 'boolean' || !/^[a-f0-9]{32}$/.test(policy.samplingSeed))
    throw new AdapterError(503, 'Frozen policy is unavailable; game must be voided');
  const opening = ply < (bot.opening.full_moves ?? 0) * 2;
  return { selfElo: policy.selfElo, opponentElo: policy.opponentElo, history: policy.history,
    temperature: opening ? 1 : bot.temperature_after_opening, topP: opening ? 1 : bot.top_p_after_opening,
    seed: createHash('sha256').update(policy.samplingSeed + ':' + ply).digest('hex').slice(0, 16) };
}

// Port of Mobile Maia sampleHumanMoveTime (preview 8563954429c2...), with a
// separately versioned cap on added waiting. The human and bot clocks are Lila's.
export function targetTime(random = () => randomInt(0x100000000) / 0x100000000) {
  const gaussian = Math.sqrt(-2 * Math.log(Math.max(random(), 0.000001))) * Math.cos(2 * Math.PI * random());
  let seconds = Math.min(4.5, Math.max(0.55, Math.exp(0.50 + gaussian * 0.44)));
  if (random() < 0.06) seconds += 1.5 + random() * 3;
  return Math.round(seconds * 1000);
}
export function addedWait(targetMs, elapsedMs, remainingMs) {
  // Spend at most 5% of the remaining clock on artificial waiting, keeping 250ms.
  return Math.max(0, Math.min(targetMs - elapsedMs, remainingMs * 0.05 - 250));
}
