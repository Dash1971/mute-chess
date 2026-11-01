import { randomBytes, randomInt, createHash } from 'node:crypto';
import { MODEL_SHA256 } from './maia.mjs';
import { AdapterError } from './nostr-auth.mjs';
import { TIMING_STYLES, validatePersonality } from './personality.mjs';

export const LEGACY_TIMING_VERSION = 'lognormal-mobile-controls-clock-cap-v2';
export const TIMING_VERSION = 'lognormal-mobile-controls-personality-v3';

function legacyVersionFor(bot) {
  const { personality, ...legacyBot } = bot;
  return 'maia79-lila-v2-' + createHash('sha256').update(JSON.stringify({ bot: legacyBot, model: MODEL_SHA256,
    sampler: 'softmax-categorical-numpy-pcg64-inclusive-nucleus-v1', timing: LEGACY_TIMING_VERSION })).digest('hex').slice(0, 16);
}
export function versionFor(bot) {
  if (!bot.personality) return legacyVersionFor(bot);
  validatePersonality(bot.personality);
  return 'maia79-lila-v3-' + createHash('sha256').update(JSON.stringify({ bot, model: MODEL_SHA256,
    sampler: 'softmax-categorical-numpy-pcg64-inclusive-nucleus-v1', timing: TIMING_VERSION })).digest('hex').slice(0, 16);
}
export function freeze(bot) {
  const personality = bot.personality && validatePersonality(bot.personality);
  return { version: versionFor(bot), bot: bot.id, name: bot.name, modelSha256: MODEL_SHA256,
    encoderRevision: 'CSSLab-1e13597c-numpy-history-v1', selfElo: bot.conditioning_self,
    opponentElo: bot.conditioning_opponent, history: personality ? personality.history : randomInt(2) === 1,
    historyMixture: personality ? 'fixed per bot' : '50/50 frozen per game', profile: bot.sampling_profile,
    openingFullMoves: bot.opening.full_moves ?? 0, temperature: bot.temperature_after_opening,
    topP: bot.top_p_after_opening, timingVersion: personality ? TIMING_VERSION : LEGACY_TIMING_VERSION,
    ...(personality ? { humanTiming: personality.humanTiming, timingStyle: personality.timingStyle } : {}),
    samplingSeed: randomBytes(16).toString('hex'), rated: false,
    calibration: bot.rating_assignment ? 'research-seeded-policy-reference-v1' :
      (bot.conditioning_self >= 2200 ? 'experimental-unvalidated' : 'unvalidated-provisional') };
}
export function effectivePolicy(policy, ply, roster) {
  const bot = roster instanceof Map ? roster.get(policy.bot) : roster.find(bot => bot.id === policy.bot);
  const legacy = bot && policy.version === legacyVersionFor(bot) && policy.timingVersion === LEGACY_TIMING_VERSION;
  const current = bot?.personality && policy.version === versionFor(bot) && policy.timingVersion === TIMING_VERSION &&
    policy.history === bot.personality.history && policy.humanTiming === bot.personality.humanTiming &&
    policy.timingStyle === bot.personality.timingStyle;
  if (!bot || (!legacy && !current) || policy.modelSha256 !== MODEL_SHA256 ||
      policy.selfElo !== bot.conditioning_self || policy.opponentElo !== bot.conditioning_opponent ||
      typeof policy.history !== 'boolean' || !/^[a-f0-9]{32}$/.test(policy.samplingSeed))
    throw new AdapterError(503, 'Frozen policy is unavailable; game must be voided');
  const opening = ply < (bot.opening.full_moves ?? 0) * 2;
  return { selfElo: policy.selfElo, opponentElo: policy.opponentElo, history: policy.history,
    temperature: opening ? 1 : bot.temperature_after_opening, topP: opening ? 1 : bot.top_p_after_opening,
    seed: createHash('sha256').update(policy.samplingSeed + ':' + ply).digest('hex').slice(0, 16) };
}

export function targetTimeForPolicy(policy, clock, random) {
  if (policy.timingVersion === LEGACY_TIMING_VERSION) return targetTime(clock, random);
  if (policy.timingVersion !== TIMING_VERSION || typeof policy.humanTiming !== 'boolean' ||
      !Object.hasOwn(TIMING_STYLES, policy.timingStyle)) throw new AdapterError(503, 'Timing policy unavailable');
  if (!policy.humanTiming) return 0;
  const cap = clock?.baseSeconds === 60 && !clock.incrementSeconds ? 3000 :
    ((clock?.baseSeconds === 120 && clock.incrementSeconds === 1) ||
      (clock?.baseSeconds === 180 && [0, 2].includes(clock.incrementSeconds))) ? 4500 : 9000;
  return Math.min(cap, Math.round(targetTime(clock, random) * TIMING_STYLES[policy.timingStyle]));
}

// Port of Mobile Maia sampleHumanMoveTime (preview 8563954429c2...), with a
// separately versioned cap on added waiting. The human and bot clocks are Lila's.
export function targetTime({ baseSeconds = null, incrementSeconds = 0 } = {},
  random = () => randomInt(0x100000000) / 0x100000000) {
  const gaussian = Math.sqrt(-2 * Math.log(Math.max(random(), 0.000001))) * Math.cos(2 * Math.PI * random());
  let seconds = Math.min(4.5, Math.max(0.55, Math.exp(0.50 + gaussian * 0.44)));
  if (random() < 0.06) seconds += 1.5 + random() * 3;
  if (baseSeconds === 60 && incrementSeconds === 0) seconds = Math.min(seconds / 2, 3);
  else if ((baseSeconds === 120 && incrementSeconds === 1) ||
      (baseSeconds === 180 && (incrementSeconds === 0 || incrementSeconds === 2)))
    seconds = Math.min(seconds * 0.75, 4.5);
  return Math.round(seconds * 1000);
}
export function addedWait(targetMs, elapsedMs, remainingMs) {
  // Spend at most 5% of the remaining clock on artificial waiting, keeping 250ms.
  return Math.max(0, Math.min(targetMs - elapsedMs, remainingMs * 0.05 - 250));
}
