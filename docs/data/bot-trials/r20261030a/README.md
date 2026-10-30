# First public bot trial — October 30, 2026

Run `r20261030a`, implementation [598f5fe](https://github.com/Dash1971/mute-chess/commit/598f5feca75791d8d8d9608ee9f77ff4973c1c02), following #73/#80 and PR #82. All games remain public and their results updated the existing public accounts through native Lichess Glicko. Deployment preserved all 44 pre-existing bot perfs before play; there was no reset/import or forced RD reduction.

## Results

| Measure | Observed |
| --- | ---: |
| Completed / successfully rated games | 100 / 100 |
| Blitz / Rapid | 49 / 51 |
| Native player results added | 200 |
| Bots / bot-speed pairs represented | 44 / 88 |
| New games per bot-speed pair | 1–5, median 2 |
| Median RD before / after | 200.2 / 166.2 |
| Established bot-speed pairs after | 0 of 88 |
| Worker elapsed time | 22.7 minutes |
| Maximum active games observed | 10 |
| Aborted games / driver errors / health failures | 0 / 0 / 0 |

Finishes: 85 checkmates, 8 draws and 7 stalemates. No clock-decided outcomes, artificial waits or fabricated resignations were used. Every rated game agrees with the native perfs count: 100 games produced 200 player results. All 100 PGNs were saved.

The median absolute rating change was 57.2 points, with a maximum 299.4. These are still uncertain estimates: all 88 bot-speed ratings remain natively provisional. This batch reduces uncertainty but does not establish every bot or prove the README's human Lichess-alignment goal. Played-game graph component sizes were [42, 2] in Blitz and [44] in Rapid; additional play/reference evidence is needed across bands.

## Capacity evidence

One pinned Maia worker used a two-core inference quota. The run stepped through 1, 2, 5 and 10 active games. At the ten-game stage, observed throughput was 6.82 plies/second and turn-to-commit latency was 1.61 seconds at p95. Throughput was already about 6.8 plies/second at two and five games, indicating the shared inference process was the main throughput limit.

Sampled combined study-worker/native-service CPU had a median 2.09 core equivalents and p95 2.14, on an eight-vCPU host. Peak sampled combined memory was 2.24 GiB. The cheap public health endpoint had p95 5.7 ms and no failed samples. These totals exclude the supervisor/OS and are not a browser-analysis or ten-live-browser-client qualification. Bot-versus-bot requires inference on both seats; usual human-versus-bot load differs.

The one-shot supervisor stopped successfully at 100 admissions, restored the normal configuration/capacity, and preserved game history/perfs. The owner approved a separate two-worker, four-core trial up to 22 games in #91; it must continue from these earned ratings.

## Reproduce the report

- [Native initial/final ratings and RD](ratings.csv)
- [Game IDs, results and public replay links](games.csv)
- [Machine-readable summary](summary.json)
- [Raw evidence archive](evidence.tar.gz): checkpoints, frozen policies/seeds, move/resource logs and 100 PGNs. No credentials or human account records are included.

Evidence archive SHA-256: `aa3ad8da91ee2fe2146767515ace8fc2db353ac94c3a3c9646f09a4e25c51bec`.

Extract the archive and run `python3 deploy/study/analyze.py /path/to/r20261030a` from the repository. The tool only summarizes recorded native results; it does not compute replacement ratings. See [the methodology](../../../native-bot-trial.md).
