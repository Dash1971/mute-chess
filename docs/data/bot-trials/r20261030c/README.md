# Third public bot trial — October 30, 2026

Run `r20261030c`, deployed main [1d6ab4c](https://github.com/Dash1971/mute-chess/commit/1d6ab4c6194f3caa0904cc58f099e87bdbfec5e0), following #73/#98 and PR #99. This was one owner-authorized batch of up to 200 public games, continuing the earned perfs from the first 200. All 44 perfs documents were identical before/after deployment, and all 88 initial rating/game counts match the prior final checkpoint. No reset or manual rating correction occurred.

## Results

| Measure | Observed |
| --- | ---: |
| Admitted / completed / native-rated games | 200 / 200 / 200 |
| Blitz / Rapid | 101 / 99 |
| Native player results added | 400 |
| Bots / bot-speed pairs represented this batch | 44 / 85 |
| New games per bot-speed pair this batch | 0–9, median 5 |
| Established bot-speed ratings, before → after | 0 → 38 of 88 |
| Median RD, before → after | 143.0 → 111.9 |
| Final RD range | 91.0–255.1 |
| Worker elapsed time | 28.1 minutes |
| Maximum active games / configured ceiling | 22 / 22 |
| Aborts / driver errors / failed health samples | 0 / 0 / 0 |

Across all three batches: **400 public rated games, 800 native player results**. Each of the 88 bot-speed pairs gained 1–14 games, median 9, across those batches. Fifty pairs remain natively provisional. Three pairs gained no games in this batch: Holo Raven/Rapid, Kernel Ghost/Blitz and Ultraviolet/Rapid. Coverage remains uneven under the current scheduling, ±200 eligibility and one-game-per-identity constraints; no eligibility rule was relaxed to force coverage.

Native endings were 170 mates, 18 draws and 12 stalemates. No clock-decided outcomes were observed. All games/history/perfs remain public. The supervisor completed, stopped both workers, removed temporary study configuration and restored normal capacity. Final audit: eight public services healthy, zero native active games, both trial units inactive with successful exit status. The 90-minute deadline and 75-minute admission cutoff were not approached; admission stopped at exactly 200.

## How far did ratings move from the original assignments?

This comparison uses the **original roster seeds**, rather than the first trial checkpoint, which can already contain human results. Median absolute drift across 88 bot-speed ratings is **80.8 points**. **55/88** remain within 100 points and **82/88** within 200. The largest absolute drift is **319.1**. Mean signed drift is +0.5; a small pool-wide mean does not establish the absolute Lichess anchor.

Mean signed drift from the original assigned rating, eleven bots per profile/speed:

| Fixed sampling profile | Blitz | Rapid |
| --- | ---: | ---: |
| Full | -36.7 | -92.3 |
| Balanced | -18.8 | -3.7 |
| Focused | +30.2 | +44.6 |
| Argmax | +75.7 | +5.1 |

See [all original seeds, fixed settings, earned ratings and drift](seed-comparison.csv), [group summaries and largest deviations](seed-drift-summary.json), and [combined changes since the first trial](combined-ratings.csv). Individual uncertainty remains important; the profile means are descriptive and mix conditioning/history policies.

## Confirmed p95 reference and the candidate −75 correction

The owner supplied [ComradeRamen's September 26 post](https://discord.com/channels/1275283861890138122/1275283861890138125/1553341614368493649), showing `maia3-79m_1600` and temperature 1 / top-p 95%, and confirmed that configuration for the reference family. The original seed baseline treated the reference as Full 1/1. The [sampling-reference audit](../../../sampling-reference-audit.md) records that correction and the exact Mobile Maia research: +71.04 for 1/.95, +270.37 for .5/.9, and +322.67 for Argmax against Full, at conditioning 1600 with history off.

A **uniform −75-point adjustment is a candidate, not applied**. The CSV shows current ratings, current-minus-75, and an explicitly illustrative research-derived prior. As a descriptive check, the eight Balanced bots at conditioning 600–2000 differ from their dated October 28 Lichess p95 references as follows:

| Speed | Compared bots | Mean current minus reference | Mean after candidate −75 |
| --- | ---: | ---: | ---: |
| Blitz | 8 | +99.3 | +24.3 |
| Rapid | 8 | +49.7 | -25.3 |

This supports the rough scale of a common correction but does not prove an exact universal offset. Closed-pool play cannot identify a shared absolute shift. Research sampling starts at move one with history off; these bots mix persistent history and use five Full opening moves before non-Full settings. Native rating uncertainty, reference uncertainty, speed differences and transfer semantics remain relevant. [#100](https://github.com/Dash1971/mute-chess/issues/100) tracks selecting and documenting any external-anchor correction without resetting earned relative strengths or changing native Glicko.

## Move times and capacity

Two identical pinned workers ran under a combined 400% logical-CPU quota and 2,000 MiB worker-group memory cap. Added human waits were zero. Hardware: i7-3720QM, four physical cores/eight hardware threads, approximately 15 GiB RAM. Frozen history/conditioning/sampling policies were retained.

| Timing across logged submissions | Mean | p95 |
| --- | ---: | ---: |
| Maia encode/inference/sample | 194.2 ms | 259.3 ms |
| Submitted request through native move acknowledgement | 322.9 ms | 438.5 ms |
| Native turn timestamp through acknowledgement, including waiting | 2.04 s | 2.39 s |

Throughput was **10.18 unique final native plies/second**, or 10.25 inference/submission events per second including repeated work described below. Mean sampled combined worker/native CPU was 4.13 logical-core equivalents, p95 4.41. Peak sampled combined memory was 2.83 GiB. Local public health-check p95 was 6.1 ms, with zero failures. These totals exclude the OS/supervisor. The release build and qualification services were stopped before the run.

This is sustained BOT-versus-BOT load; human thinking time reduces the inference cadence, while fast clicking/premoves can create bursts. Keep the [VPS guide](../../../vps-sizing.md) distinction between measured throughput and modeled human capacity. The ordinary public adapter retains its original two-game limit; #96 tracks the production queue/capacity work.

## Headless round-state anomaly

Final audit found **116 repeated game/ply submissions across four games**, about 0.7% of logged submissions. Returned native ply moved backward, and frozen deterministic policies replayed the same moves. Four turn-timestamp samples consequently reach roughly 61–63 seconds; do not interpret the raw maximum as model compute time. All samples remain in the evidence.

Independent legal replay of **all 200 final PGNs** passed: every terminal result and native finish ply count agrees, all 17,142 final plies have matching logged submissions, every repeated move matches that final sequence, and no conflicting move was found. There are 200 distinct native-rated completions, not 200 plus duplicate games. These checks support retaining the games/perfs; no clock outcomes or altered final move sequences were found.

[#101](https://github.com/Dash1971/mute-chess/issues/101) tracks reproduction and a narrowly scoped fix before another headless trial. Source inspection suggests the native one-minute idle-round eviction/flush lifecycle interacting with a headless driver; that cause is a hypothesis, not a completed reproduction. Preserve upstream lifecycle/rules/clocks/Glicko and use native presence mechanisms where possible. No extra public batch is authorized by that issue.

## Evidence and reproduction

- [Current-batch native rating/RD changes](ratings.csv), [cumulative changes](combined-ratings.csv), [original-seed and candidate comparison](seed-comparison.csv).
- [Game IDs/public replay links](games.csv), [machine-readable summary](summary.json), [PGN/duplicate integrity audit](integrity.json).
- [Pinned research values and policy-evidence provenance](sampling-reference.json), [hardware](hardware.json).
- [Raw policies, checkpoints, resources, initial bot perfs and 200 PGNs](evidence.tar.gz).

Raw archive SHA-256: `00b24f98cae74149fd7ffe879a264d51b2473679a409c9986786b224bf0a4225`. It retains the original trial output; derived reports and the subsequent integrity audit are separate files here. Extract it and run `python3 deploy/study/analyze.py /path/to/r20261030c` to regenerate current-batch statistics. Mean timing fields are calculated from all recorded submissions. With the pinned worker Python dependencies installed, run `python3 docs/data/bot-trials/r20261030c/verify-final-pgns.py /path/to/r20261030c` for the legal replay/duplicate audit. Neither script runs inference or recalculates replacement ratings.
