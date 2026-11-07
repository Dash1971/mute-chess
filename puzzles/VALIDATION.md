# Full puzzle catalog validation — 7 November 2026 (JST)

The official compressed export was downloaded into staging, outside the live
application and database. Its exact pin is in `full-catalog.json`.

| Check | Result |
| --- | --- |
| Archive bytes | 309,751,173 |
| Archive SHA-256 | `7b0d235fa40cfd7fdb7df1fec56a96b3b6ee1496b32ed2eb05be90d0ebf94253` |
| Source rows | 6,193,530 |
| Duplicate or out-of-order IDs | 0 |
| Source rating range | 399–3330 |
| Rows with opening tags | 1,231,709 |
| Native Chessops FEN/solution validation | All 6,193,530 passed |
| Bundled fixture FEN/solution validation | All 50,000 passed |
| Importer regression suite | 7 passed |
| Existing upstream-departure register suite | 5 passed |

Native validation used the installed pinned Chessops 0.15.1, without Stockfish
inference. CSV preparation and legal validation streamed records and did not
connect to MongoDB. The export uses the current `/game/ID` URL form; the importer
also accepts the older `/ID` form without changing native game IDs.

A separate MongoDB instance bound only to loopback port 27029 was used for data
qualification. It has no application users or private/live data. The unchanged
50,000-puzzle fixture imported successfully and the referenced native generator
produced **26,969 paths**, across **1,049 theme/opening/mix groups**, including
**1,986 mixed-training paths**. The former starter importer produced only one
fixed mixed path per rating bucket/tier (84 mixed paths in the live starter
catalog). The generated paths are the upstream algorithm's quality-ranked,
shuffled, partitioned lists rather than identical static copies.

The full-size trial then completed successfully with **6,193,530 catalog/total
puzzles** and **307,320 native paths**, including **2,159 mixed-training paths**
across **72 rating/tier groups**. In the top-tier group covering rating 1500,
there were **30 paths with 30 distinct first puzzles**. All three seeded legacy
fixed-tier paths were removed by native generation replacement.

A seeded existing puzzle retained its earned Glicko rating/deviation/volatility,
vote totals, play count, local issue flag, FEN, solution and themes exactly.
Its failed-puzzle round was unchanged. Missing opening metadata on a second
existing puzzle was backfilled. The locally flagged puzzle was excluded from
all generated paths. No real user account or game was created for these checks.

The test instance initially used a 256 MB WiredTiger cache; it was increased to
2 GB during full path generation, with available host memory checked first.
This was a test-only runtime setting, not a live database or service change.
The temporary instance was shut down after validation. This is correctness
qualification, not a controlled throughput benchmark.

All four existing source CI jobs passed for implementation commit
`c4af779336be5c3d364c21a1b45aa3f5742a80f6` (`adapter`, `upstream-patches`,
`native-forum`, `native-gif`). No live corpus import, merge, deployment, service
pause or scheduled live job has been performed.

The imported export cannot reproduce unpublished Lichess moderation metadata.
Native rules use the available exported fields and retain existing local issue
flags, ratings and votes. This change preserves native selection/replay behavior,
not an identical sequence of puzzles or a guarantee that repetitions never occur.
