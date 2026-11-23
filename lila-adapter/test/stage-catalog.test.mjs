import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageCatalog } from '../stage-catalog.mjs';
import { loadRoster } from '../roster.mjs';

test('runtime catalog preserves the complete canonical roster and aliases', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mute-catalog-'));
  try {
    const umask = process.umask(0o077);
    let result;
    try { result = await stageCatalog(root); } finally { process.umask(umask); }
    assert.equal((await stat(join(root, 'public'))).mode & 0o777, 0o755);
    assert.equal(result.population, 10000);
    assert.deepEqual(JSON.parse(await readFile(join(root, 'public/nosweat-roster.json'))), await loadRoster());
    assert.deepEqual(JSON.parse(await readFile(join(root, 'public/nosweat-bot-aliases.json'))),
      JSON.parse(await readFile(new URL('../catalog-aliases.json', import.meta.url))));
    assert.deepEqual(await stageCatalog(root, true), result);
    for (const file of ['nosweat-roster.json', 'nosweat-bot-aliases.json']) {
      const path = join(root, 'public', file), original = await readFile(path);
      assert.equal((await stat(path)).mode & 0o777, 0o644);
      await writeFile(path, '{}\n');
      await assert.rejects(stageCatalog(root, true), /differs from adapter/);
      await rm(path);
      await assert.rejects(stageCatalog(root, true), { code: 'ENOENT' });
      await writeFile(path, original);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
