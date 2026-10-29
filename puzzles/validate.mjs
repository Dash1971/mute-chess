// Verify every catalog solution using the pinned native Chessops rules library.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
if (!root) throw Error('Pass the native chessops package directory');
const { Chess, normalizeMove } = await import(pathToFileURL(root + '/dist/esm/chess.js'));
const { parseFen } = await import(pathToFileURL(root + '/dist/esm/fen.js'));
const { parseUci } = await import(pathToFileURL(root + '/dist/esm/util.js'));
const metadata = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url)));
const blob = readFileSync(new URL('./lichess.csv.gz', import.meta.url));
const data = gunzipSync(blob);
const sha = x => createHash('sha256').update(x).digest('hex');
if (sha(blob) !== metadata.gzipSha256 || sha(data) !== metadata.csvSha256) throw Error('Catalog integrity mismatch');
const lines = data.toString().trim().split(/\r?\n/);
const keys = lines.shift().split(',');
let count = 0;
const ids = new Set();
for (const line of lines) {
  // This pinned export has no quoted fields or embedded CSV separators.
  if (line.includes('"')) throw Error('Unsupported CSV quoting; use a CSV parser for this export');
  const values = line.split(',');
  if (values.length !== keys.length) throw Error('Invalid CSV row');
  const row = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
  if (ids.has(row.PuzzleId)) throw Error('Duplicate puzzle');
  ids.add(row.PuzzleId);
  const pos = Chess.fromSetup(parseFen(row.FEN).unwrap()).unwrap();
  for (const uci of row.Moves.split(' ')) {
    const parsed = parseUci(uci);
    if (!parsed) throw Error(`Invalid UCI ${row.PuzzleId} ${uci}`);
    const move = normalizeMove(pos, parsed);
    if (!pos.isLegal(move)) throw Error(`Illegal puzzle line ${row.PuzzleId} ${uci}`);
    pos.play(move);
  }
  count++;
}
if (count !== metadata.count) throw Error('Catalog count mismatch');
console.log(JSON.stringify({validatedPuzzles: count, csvSha256:sha(data)}));
