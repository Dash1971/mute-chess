import { readFile } from 'node:fs/promises';

// Keep the original 44-entry file intact for frozen policies and the historical
// one-time migration. The additive experimental population is explicitly versioned.
export async function loadRoster() {
  const original = JSON.parse(await readFile(new URL('./roster.json', import.meta.url)));
  let extra = [];
  try { extra = JSON.parse(await readFile(new URL('./experiment-roster.json', import.meta.url))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const roster = [...original, ...extra];
  if (new Set(roster.map(b => b.id)).size !== roster.length ||
      new Set(roster.map(b => b.username.toLowerCase())).size !== roster.length)
    throw Error('Duplicate roster identity');
  return roster;
}
