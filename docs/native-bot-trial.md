# Native bot rating and capacity trial

The goal is to establish the **public** Maia accounts through actual rated native
games and measure the same workload. The owner clarified this on October 30, 2026:
keep the games in their public histories and let native Glicko update their public
ratings. A disposable database is for qualification only. There is no rating
import, reset of earned results, substitute Elo calculator or forced provisional
threshold. See #73 (scope/results) and #80 (implementation).

## First batch

- Existing 44 identities; original reference-derived Blitz/Rapid priors remain
  starting estimates. Preserve any ratings already earned on the site.
- Native rated standard games, 5+3 Blitz and 10+5 Rapid, with native BOT accounts
  on both sides. Keep rules, clocks, completion, farming/boost safeguards, Glicko-2
  and rating regulation unchanged.
- Hard limit: 100 admitted games or 90 minutes. Stop admissions at 75 minutes;
  drain until the deadline, then abort remaining games without invented results.
  No automatic extension or restart. Save partial results on failure.
- Owner-approved ramp: one concurrent game for the first five completions, two
  until ten, five until twenty, then up to ten. Human pool games count toward the
  same global ceiling. One game per identity. Normal capacity returns to two
  after the study deadline or disabling study mode.
- A dedicated server inference worker has a two-CPU quota and 1.4 GiB memory cap.
  Native public services keep their existing limits and serve real visitors;
  measure them separately. This replaces the earlier isolated-stack resource
  proposal. No inference or game simulation runs on the owner's Mac. Output is
  bounded and the operational monitor stops on worker failure, sustained public
  health degradation, excessive memory/disk growth or the absolute deadline.

The production timing personality is saved unmodified inside each frozen
`native-no-wait-study-v1` snapshot. The wrapper explicitly disables added human
waits; the driver never calls the timing sampler. History, model conditioning,
opening override, temperature, top-p and per-ply seed derivation use the existing
production policy validator. Changing Glicko never changes a bot's conditioning.

The scheduler prioritizes underrepresented bot/speed pairs, selects uniformly
among available opponents within 200 current native rating points, and balances
colors. It does not add recent-opponent avoidance or change public matchmaking.
A depleted rating band may have no eligible match; report missing coverage.

## Native integration boundary

`app/NoSweatStudy.scala` is a small private experiment controller/service around
native `newGame`, `GameRepo.insertDenormalized`, `round.onStart`, `BotConnected`,
`bot.player` and `FinishGame`. It reserves both bot seats in
`nosweat_study_game`. `modules/game/.../Env.scala` recognizes that explicit
reservation, verifies two enabled BOT users, and otherwise retains normal
human-versus-Maia admission. Friend invitations are unchanged. Study and normal
admissions share the existing serial queue and busy-seat checks.

Study mode defaults off. It requires explicit configuration, a safe run ID and
one exact deployment/database pairing: public `mutechess.org` with
`mongodb://127.0.0.1:27019/nosweat` and `publicRatings=true`, or qualification
`127.0.0.1:19763` with a namespaced database on port 27028. Main and secondary
Mongo URIs must agree. Internal endpoints retain adapter bearer authentication;
the public gateway blocks the whole `/club/internal/` prefix. No public bot API
or bot challenge UI is enabled. Configuring another origin/database fails closed.

The native source changes are registered in `deploy/lila/upstream-departures.json`.
Rebases must preserve the reservation checks, shared admission lock, deadlines
and `FinishGame` ordering after native perf persistence. No rating, round or
clock implementation is patched for this experiment.

## Evidence and interpretation

Save initial/current per-speed rating, RD, volatility, native rated game count and
provisional state; every game ID, frozen policy and seed; completion status and
native rating differences; PGNs; inference, request/commit and turn-to-commit
latencies; stage/concurrency; public health; native service CPU/RAM; and Mongo
operation/storage counters. Distinguish completed versus successfully rated
games. Native safeguards may reject rating updates; do not weaken them.

Two inference requests are allowed in flight to the shared serial ONNX worker.
Ten active games are not ten simultaneous model evaluations. Bot-versus-bot
requires inference for both seats, unlike the usual human-versus-bot workload.
This is not a browser/local-analysis capacity test, nor proof that ten human
clients have been qualified under every workload.

A 100-game batch gives only 200 player results spread over 88 bot/speed pairs.
It cannot promise established ratings for all accounts. Report RD and trajectory
coverage and decide on another bounded batch separately. Native RD <=110 is a
provisional checkpoint, not evidence that the absolute ladder matches Lichess.
The README's human Lichess-alignment goal still needs external/human validation.
No automatic Bullet/Classical transfer is part of this run; see the dated speed
reference and #78. The owner accepted ignoring clock pressure for this initial
Blitz/Rapid study; 1+0 Bullet remains later validation.

## Second bounded step: two workers, up to 22 games (#91)

The owner selected this step after the first run demonstrated substantial host
headroom at ten games. The original two-core quota was a pilot safeguard, not a
Maia or host limit. Finish that batch unchanged before deploying the next plan.

`ramp-22-v1` starts at ten games, increases to fifteen after ten completions,
twenty after twenty-five, and twenty-two after forty. It uses two instances of
the same pinned worker, with a combined four-core quota and 2,000 MiB memory
limit. Each worker retains two inference threads and at most two pending
requests. A failed worker stops the study; it does not silently continue under
a different declared configuration. The ordinary human-game adapter is unchanged.

The new run retains the 90-minute / 100-admitted-game budget and all native
safeguards. It continues from earned public perfs; no reseeding or importing.
Forty-four identities allow at most twenty-two simultaneous bot-versus-bot games.
Current rating windows or an unmatched remaining pair can reduce actual
concurrency; report the observed maximum without relaxing matchmaking, adding
identities or allowing the same bot in two games. Fifty games would require at
least one hundred identities and is outside this step.

The driver records the native plan, worker count, per-move worker index, frozen
policies and timings. Compare measured latency, CPU/RAM and native completion
across both runs; do not infer throughput scaling merely from spare host RAM.

First-batch evidence: [100 public games, ratings/RD and capacity measurements](data/bot-trials/r20261030a/README.md).
