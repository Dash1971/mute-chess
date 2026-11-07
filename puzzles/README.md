# Native Lichess puzzles

The full-catalog importer uses **all 6,193,530 puzzles** in the pinned official
[Lichess CC0 export](https://database.lichess.org/#puzzles). See
[`full-catalog.json`](full-catalog.json) for the exact compressed SHA-256, size,
source modification date and count. No popularity, rating-deviation, play-count
or rating-range cutoff reduces this snapshot. Large downloaded data stays outside
Git. The bundled 50,000-row `lichess.csv.gz` remains a fast development/CI fixture,
not the default live catalog.

Existing installations require an explicit full import. Deploying application
code alone does not replace the existing starter data.
## Selection stays native

The old importer generated one static path per 100-rating bucket and reused its
identical order in top/good/all tiers. That interacted poorly with native
session resets, bounded seen-puzzle skipping and tier fallback.

`native-paths.js` is the pinned Lila
[`cron/mongodb-puzzle-regen-paths.js`](https://github.com/lichess-org/lila/blob/b551752d2a0e7a63459d9812825d95a633a98737/cron/mongodb-puzzle-regen-paths.js).
The original hash and the one adaptation are recorded in `path-generator.json`:
an empty opening aggregation becomes `[]` instead of dereferencing null. All
other generation logic is unchanged, including:

- Native popularity percentiles: top 20%, good 50%, all 95% in each rating group.
- Multiple randomized paths, with native rating boundaries, path lengths and
  generation replacement; up to 30 paths per group.
- Native theme/opening eligibility and limits, including equality exclusion from
  mixed training, the 3.8-million mixed-generation sample limit and top 1,000
  openings. Importing the full database does not mean ignoring these quality rules.

The Scala selector, user session/seen checks, difficulty offsets, puzzle ratings,
solution validation, hints, replay-mistakes mode, anonymous selection and puzzle
review UI are unchanged. Deliberate replay and the native last-resort repeat
fallback still exist; this is not a promise never to repeat a puzzle. Anonymous
training retains Lichess's short-lived 150-puzzle pool without account history.

## Download, validate and import

Use the existing native development installation and a scratch filesystem with
room for the compressed archive, normalized records and database/indexes. The
importer uses `zstd`, Python 3.11+, Node 24+, mongosh and the installation's pinned
Chessops package. It streams the full CSV and uses 500-puzzle database batches.

```bash
mkdir -p "$MUTE_DEV/puzzle-catalog"
export MUTE_PUZZLE_ARCHIVE="$MUTE_DEV/puzzle-catalog/lichess_db_puzzle.csv.zst"
export MUTE_CHESSOPS="$MUTE_DEV/sources/lila/node_modules/.pnpm/chessops@0.15.1/node_modules/chessops"

curl -fL --retry 2 -o "$MUTE_PUZZLE_ARCHIVE" \
  https://database.lichess.org/lichess_db_puzzle.csv.zst

python3 "$MUTE_REPO/puzzles/import.py" "$MUTE_DATABASE" \
  --archive "$MUTE_PUZZLE_ARCHIVE" --mongosh "$MUTE_MONGOSH" \
  --chessops "$MUTE_CHESSOPS" --work-dir "$MUTE_DEV/puzzle-catalog"
```

The public source URL changes. A checksum mismatch requires a separately reviewed
snapshot-pin update, not silently accepting the new download or truncating it.
`prepare.py` is only the old starter-fixture producer; do not use it for the full
catalog.

Before any database write, the importer verifies the compressed pin/count,
normalizes all CSV rows (including current `/game/ID` and legacy game URLs), checks
unique ascending puzzle IDs and validates every FEN and solution move using
native Chessops. The official source is sorted by ID, so this check uses constant
memory rather than retaining millions of IDs. On import, existing puzzles retain
their earned Glicko ratings, votes, plays, themes and immutable position/solution;
only catalog membership and missing opening metadata are updated. Puzzle rounds,
user ratings, replay progress and historical puzzle records are never reset or
deleted. Source ratings/popularity and the documented 200-vote prior initialize
new records only. Generation runs only after the complete import count matches.

Native paths are refreshed after each import. The owner-approved release installs `refresh.cron` in the existing system cron
at minute 17 of each hour. It invokes only the native generator, skips while the
existing maintenance lock is held by an import/deployment, and logs through the
system journal (`mutechess-puzzle-paths`). No new scheduler or service is added.
Mongo's existing unit uses a 2 GB cache within a 3 GB memory limit for this catalog.
Do not run a manual generation concurrently with an import or another generation:

```bash
"$MUTE_MONGOSH" "$MUTE_DATABASE" --quiet --file "$MUTE_REPO/puzzles/native-paths.js"
```

Path generation is an operator-run native data job. Archive updates require a
new reviewed snapshot pin.

For data qualification without any database connection:

```bash
python3 "$MUTE_REPO/puzzles/import.py" --archive "$MUTE_PUZZLE_ARCHIVE" \
  --prepare-only "$MUTE_DEV/puzzle-catalog/records.jsonl" --chessops "$MUTE_CHESSOPS"
```

The bounded fixture remains available for development with `--starter` (rejected
for the live URI). CI validates that fixture's native solutions and importer
regressions; full-scale evidence is recorded separately. The only accepted Mongo
URIs are the existing loopback development/live databases and the isolated
loopback puzzle-test instance on port 27029. Never use the upstream destructive
development database seeder for this import.

## Source fidelity and review assistance

The export FEN precedes the opponent's first move. Native solving applies that
move before presenting the player's task, retaining the original move number.
When the source game is unavailable locally, review links the real Lichess game;
unavailable player names/history are omitted rather than invented.

Maia/Stockfish assistance remains confined to post-solve/post-reveal review.
Native hints, review controls, variation navigation and the existing browser
engine settings are unchanged. No engine assistance runs during solving, and
this catalog change adds no new UI wording or translation keys.
