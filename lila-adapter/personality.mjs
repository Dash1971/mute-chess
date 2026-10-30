import { createHash } from 'node:crypto';

export const TIMING_STYLES = Object.freeze({
  'very-fast': 0.45, fast: 0.7, normal: 1, slow: 1.3, 'very-slow': 1.6,
});

// Public, reproducible assignment seed. Move sampling still has its own secret
// per-game seed; changing timing never consumes the move sampler's randomness.
export function assignedPersonality(id) {
  const draw = label => createHash('sha256').update(`mute-pool-personality-v1:${id}:${label}`).digest().readUInt32BE();
  return {
    assignment: 'sha256-independent-fields-v1',
    history: draw('history') % 2 === 1,
    humanTiming: draw('human-timing') % 2 === 1,
    timingStyle: Object.keys(TIMING_STYLES)[draw('timing-style') % 5],
  };
}

export function validatePersonality(personality) {
  if (!personality || typeof personality.history !== 'boolean' || typeof personality.humanTiming !== 'boolean' ||
      !Object.hasOwn(TIMING_STYLES, personality.timingStyle))
    throw new Error('Invalid persistent bot personality');
  return personality;
}
