// Verify catalog solutions with the pinned native Chessops rules, without loading full exports into RAM.
import { createReadStream, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
if (!root) throw Error('Pass the native chessops package directory');
const option = name => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const recordsFile = option('--records');
const metadataFile = option('--metadata');
const { Chess, normalizeMove } = await import(pathToFileURL(root + '/dist/esm/chess.js'));
const { parseFen } = await import(pathToFileURL(root + '/dist/esm/fen.js'));
const { parseUci } = await import(pathToFileURL(root + '/dist/esm/util.js'));
const metadata = JSON.parse(readFileSync(metadataFile || new URL('./catalog.json', import.meta.url)));
const sha = x => createHash('sha256').update(x).digest('hex');

async function* sourceRows() {
  if (recordsFile) {
    for await (const line of createInterface({ input: createReadStream(recordsFile), crlfDelay: Infinity })) {
      if (!line) continue;
      const record = JSON.parse(line);
      if (record.kind !== 'puzzle') throw Error('Unexpected catalog record');
      yield { PuzzleId: record.value._id, FEN: record.value.fen, Moves: record.value.line };
    }
  } else {
    // The small, pinned CI fixture has no quoted or multiline fields.
    const blob = readFileSync(new URL('./lichess.csv.gz', import.meta.url)), data = gunzipSync(blob);
    if (sha(blob) !== metadata.gzipSha256 || sha(data) !== metadata.csvSha256) throw Error('Catalog integrity mismatch');
    const lines = data.toString().trim().split(/\r?\n/), keys = lines.shift().split(',');
    for (const line of lines) {
      if (line.includes('"')) throw Error('Unexpected quoting in pinned CI fixture');
      const values = line.split(',');
      if (values.length !== keys.length) throw Error('Invalid CSV row');
      yield Object.fromEntries(keys.map((key, i) => [key, values[i]]));
    }
  }
}

let count = 0, previousId = '';
// Official ID-sorted snapshots need only the preceding ID to reject duplicates.
const ids = metadata.idOrder === 'ascii-ascending' ? undefined : new Set();
for await (const row of sourceRows()) {
  if (!/^[A-Za-z0-9]{5}$/.test(row.PuzzleId)) throw Error('Invalid puzzle ID');
  if (ids ? ids.has(row.PuzzleId) : row.PuzzleId <= previousId) throw Error('Duplicate or unordered puzzle');
  ids?.add(row.PuzzleId); previousId = row.PuzzleId;
  const pos = Chess.fromSetup(parseFen(row.FEN).unwrap()).unwrap();
  const moves = row.Moves.split(' ');
  if (moves.length < 2) throw Error('Incomplete puzzle solution');
  for (const uci of moves) {
    const parsed = parseUci(uci);
    if (!parsed) throw Error(`Invalid UCI ${row.PuzzleId} ${uci}`);
    const move = normalizeMove(pos, parsed);
    if (!pos.isLegal(move)) throw Error(`Illegal puzzle line ${row.PuzzleId} ${uci}`);
    pos.play(move);
  }
  if (++count > metadata.count) throw Error('Catalog count exceeds pin');
}
if (count !== metadata.count) throw Error('Catalog count mismatch');
console.log(JSON.stringify({validatedPuzzles: count, sourceSha256: metadata.archiveSha256 || metadata.csvSha256}));
