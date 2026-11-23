#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { loadRoster } from './roster.mjs';

// Runtime data is assembled from the adapter source, never committed to Lila.
export async function stageCatalog(root, verify = false) {
  const roster = await loadRoster();
  const aliases = JSON.parse(await readFile(new URL('./catalog-aliases.json', import.meta.url)));
  if (!aliases || Array.isArray(aliases) || typeof aliases !== 'object' ||
      Object.values(aliases).some(value => typeof value !== 'string'))
    throw Error('Invalid managed bot aliases');
  const files = {
    'nosweat-roster.json': Buffer.from(JSON.stringify(roster, null, 2) + '\n'),
    'nosweat-bot-aliases.json': Buffer.from(JSON.stringify(aliases, null, 2) + '\n'),
  };
  if (!verify) await mkdir(resolve(root, 'public'), { recursive: true });
  const hashes = {};
  for (const [name, data] of Object.entries(files)) {
    const destination = resolve(root, 'public', name);
    if (verify) {
      if (!(await readFile(destination)).equals(data)) throw Error('Staged catalog differs from adapter: ' + name);
    } else await writeFile(destination, data);
    hashes[name] = createHash('sha256').update(data).digest('hex');
  }
  return { population: roster.length, aliases: Object.keys(aliases).length, hashes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const verify = args[0] === '--verify';
  if (verify) args.shift();
  if (args.length !== 1) throw Error('Usage: stage-catalog.mjs [--verify] ASSEMBLED_RUNTIME_ROOT');
  console.log(JSON.stringify(await stageCatalog(resolve(args[0]), verify)));
}
