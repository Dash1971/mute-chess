# Second public bot trial — October 30, 2026

Run `r20261030b`, implementation [bdfce8d](https://github.com/Dash1971/mute-chess/commit/bdfce8dece4f2fd36aee5dae58333e0978ceaaed), following #73/#91 and PR #93. It continued from the first run's earned **public** perfs. All 44 raw perfs were identical before/after deployment; the driver’s initial ratings/game counts also match the previous final checkpoint. No reset/import or forced provisional change occurred.

## Results

| Measure | Observed |
| --- | ---: |
| Completed / successfully rated games | 100 / 100 |
| Blitz / Rapid | 50 / 50 |
| Native player results added | 200 |
| Bots / bot-speed pairs represented in this run | 44 / 86 |
| New games per bot-speed pair in this run | 0–5, median 2 |
| Median RD after both runs | 143.0 |
| Established bot-speed pairs after both runs | 0 of 88 |
| Worker elapsed time | 16.1 minutes |
| Maximum active games observed / configured ceiling | 21 / 22 |
| Aborts / driver errors / failed health samples | 0 / 0 / 0 |

Both runs together produced **200 public rated games and 400 native player results**. Every bot played both speeds across the two runs; each bot-speed pair gained 1–8 games in total. Median uncertainty fell from about 200 to 143 RD, with final RD 117.1–255.1. All remain natively provisional. More games are required to establish the ladder; native provisional/Glicko behavior remains unchanged. This does not yet validate the human Lichess-alignment goal.

The plan stepped 10 → 15 → 20 → 22, using two identical pinned workers under a combined four-logical-CPU quota and 2,000 MiB worker-group memory limit. Both workers appear in move logs; frozen model/policy/history inputs and no-added-wait semantics were retained. Under the existing roster/rating-window rules the scheduler filled at most 21 slots. It did not relax ±200 matching, duplicate a busy identity or invent another bot to reach 22.

Finishes: {"draw": 11, "mate": 85, "stalemate": 4}. No clock-decided outcomes or fabricated resignations were used. All 100 PGNs were saved, and native perfs game-count changes agree exactly with the 100 successfully rated games. The supervisor stopped the job, removed temporary configuration and restored normal capacity.

## Capacity and the competing build

The host is an **Intel i7-3720QM, four physical cores/eight hardware threads**, with approximately 15 GiB RAM. CPU-equivalent usage in the reports is Linux logical CPU time, not a count of physical cores. A modern VPS needs its own model-throughput check before treating vCPU counts as equivalent.

Sampled combined study-worker/native-service CPU had median 4.05 and p95 4.26 logical-core equivalents. Peak sampled combined memory was 2.77 GiB. Public health-endpoint p95 was 11.9 ms, with no failures. The totals exclude OS/supervisor and the separate build described below.

A separate Java forum build ran in `/home/dash/mute-forum-81-check` during the early portion and used roughly three logical CPUs when inspected. The raw archive includes `host-context.jsonl`, recording its observed CPU/liveness and host load until that process exited. The study remained healthy, but this is **not a controlled linear scaling benchmark**. Keep the contended samples and the resulting public ratings; do not selectively discard outcomes.

| Target stage | Observed max games | Plies/sec | p95 turn-to-commit |
| --- | ---: | ---: | ---: |
| 10 | 10 | 6.29 | 1.90 s |
| 15 | 15 | 6.72 | 2.61 s |
| 20 | 20 | 8.85 | 2.90 s |
| 22 | 21 | 9.29 | 3.31 s |

The final 22-slot stage observed about 9.29 plies/second, versus 6.82 in the original one-worker ten-game stage. Positions and concurrent host load differ; the gain is evidence for budgeting, not a promise of perfect doubling. Human games need inference for the bot's turns and include human thinking time, so active human-game capacity depends strongly on time control and reply-latency expectations. Browser/local-analysis and a large live WebSocket fleet were not load-tested.

See the [budget VPS sizing guide](../../../vps-sizing.md) for modeled human-player capacity and current price references. The ordinary adapter still has its original two-game cap; [#96](https://github.com/Dash1971/mute-chess/issues/96) tracks porting the tested bounded queue before opening larger human capacity.

## Evidence

- [Current-run rating/RD changes](ratings.csv)
- [Combined changes across both runs](combined-ratings.csv)
- [Game IDs and public replay links](games.csv)
- [Machine-readable summary](summary.json)
- [Hardware notes](hardware.json)
- [Raw policies, checkpoints, resources, host context and 100 PGNs](evidence.tar.gz)

Archive SHA-256: `1af8f0fa0ebc9651a9dc9623f410b8cd98962cc751b9a8aa9e4c9af4ef1146e7`. Extract and run `python3 deploy/study/analyze.py /path/to/r20261030b` to regenerate the current-run summary. The analyzer reads native ratings and does not calculate replacement Elo/Glicko values.
