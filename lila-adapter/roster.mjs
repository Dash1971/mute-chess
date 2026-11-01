import { readFile } from 'node:fs/promises';

// Historical policy objects remain byte-for-byte intact. Completed study tools
// explicitly select the reference cohort; the public adapter uses all identities.
export async function loadReferenceRoster() {
  const original = JSON.parse(await readFile(new URL('./roster.json', import.meta.url)));
  const extra = JSON.parse(await readFile(new URL('./experiment-roster.json', import.meta.url)));
  return validateRoster([...original, ...extra]);
}
export function validateRoster(roster) {
  if (!Array.isArray(roster) || roster.length === 0 ||
      roster.some(b => !b || typeof b.id !== 'string' || typeof b.username !== 'string') ||
      new Set(roster.map(b => b.id)).size !== roster.length ||
      new Set(roster.map(b => b.username.toLowerCase())).size !== roster.length)
    throw Error('Duplicate or invalid roster identity');
  return roster;
}
export async function loadRoster() {
  const reference = await loadReferenceRoster();
  const catalog = JSON.parse(await readFile(new URL('./catalog-roster.json', import.meta.url)));
  return validateRoster([...reference, ...catalog]);
}
