# Native Lichess puzzles

This starter catalog contains **50,000 real standard-chess puzzles**, selected from
[Lichess's open puzzle database](https://database.lichess.org/#puzzles), released
under CC0 1.0. `catalog.json` pins the exact compressed and uncompressed content,
source URL, retrieval date, quality filter and rating range. This is a bounded
subset, not the complete Lichess catalog. No player identities or game histories
are invented from the CSV.

The native Lila puzzle selector, legal solution validation, hints, ratings,
completion/reveal review, variations, next-puzzle and automatic-next behavior
remain authoritative. The export FEN precedes the opponent's first move; the
native tree applies that move before solving, retaining the absolute move number.
When the original game is unavailable locally, its real Lichess game is linked
in review. Prior moves and unavailable player metadata are omitted.

## Reproduce and qualify

Stream the official export through zstd and `prepare.py`:

```
curl -fsSL https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc | python3 prepare.py lichess.csv.gz
```

The producer's closed input pipe after selecting 50,000 rows is expected. The
source URL changes over time: compare the CSV hash with `catalog.json`; a newer
export requires a separately reviewed catalog update. Deterministic gzip uses
an empty filename and timestamp zero. Verify every solution with the same native
Chessops version before importing:

```
node validate.mjs /path/to/lila/node_modules/.pnpm/chessops@0.15.1/node_modules/chessops
python3 -m unittest discover -s puzzles
```

`import.py DATABASE --mongosh /path/to/mongosh.js` accepts only the two existing
isolated loopback databases. It verifies both hashes and count, inserts only
absent puzzle records, and updates only this catalog's namespaced selection paths.
It never resets local puzzle ratings, votes, rounds or user progress. Imported
popularity starts as a documented 200-weight vote prior derived from the export;
the original vote count is unavailable. Original exported ratings, deviations,
play counts and daily dates are retained. Static paths cover the catalog's actual
rating buckets and themes using native top/good/all tiers; all imported puzzles
meet the same quality filter. Selection order within a bucket is deterministic.
The full upstream dynamic path-generation service is unnecessary for this catalog.

## Review assistance

Maia starts only in visible post-solve/post-reveal review with the native engine
switch on. Both channels use the existing analysis settings saved in this browser
(default 1500 and 2400). The shared native policy encoder and Mobile Maia arrow
renderer are used by both analysis and puzzles, including agreement colors and
square-centered geometry. Position changes invalidate pending policies; the next
puzzle, engine-off, hidden tab and page exit clear results and release inference.
No Stockfish/Maia assistance runs during solving; native user-requested hints
remain available. Stockfish keeps native puzzle review and alternative lines.

The owner clarified that no En Croissant puzzle port is needed. Codex assisted
implementation and automated qualification; no human manual testing or upstream
contribution is claimed.

Puzzle review uses the same leading-three move/percentage formatter as the analysis board. “All legal moves” expands a full comparison table for both Maia inputs, ordered by the primary channel. Every legal policy entry is included; small nonzero probabilities are displayed as <0.1% with a more precise hover value. Clicking a move explores it through the native puzzle variation controller. This display uses the existing inference result and adds no extra engine searches.
