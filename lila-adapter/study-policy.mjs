import { freeze, effectivePolicy } from './policy.mjs';

export const STUDY_VERSION = 'native-no-wait-study-v1';
export function freezeStudy(bot, runId) {
  if (!/^[a-z][a-z0-9_]{2,31}$/.test(runId)) throw Error('Invalid study run ID');
  return { version: STUDY_VERSION, runId, addedHumanWait: false, rated: true, production: freeze(bot) };
}
export function studyPolicy(snapshot, runId, ply, roster) {
  if (snapshot?.version !== STUDY_VERSION || snapshot.runId !== runId || snapshot.addedHumanWait !== false || snapshot.rated !== true)
    throw Error('Invalid study policy');
  // Validate the original production policy without mutating its persistent personality.
  return effectivePolicy(snapshot.production, ply, roster);
}
