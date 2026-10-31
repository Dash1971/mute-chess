# Overnight bot rating establishment (#163)

The owner approved this follow-up on October 31 after the first bounded study.
Keep the same 250 identities, persistent Maia settings, Lichess-derived starting
anchor, earned native ratings and complete histories. The next step is more
native rated games, not a different rating system or a smaller roster.

## Goal and limits

**Goal: all 250 bots have nonprovisional native Blitz and Rapid ratings.** This
means 500 bot/speed ratings satisfy Lichess's existing provisional rule. Neither
the scheduler nor fitting code may change ratings, uncertainty, counts or flags.
Establishment measures relative precision in this anchored pool; independent
human/reference results remain useful for checking the external scale.

| Limit | Approved value |
| --- | --- |
| New public run / profile | `r20261031n163` / `rating-establishment-v1` |
| Private qualification run | `q20261031n163`, only the isolated 27028 namespace |
| Preparation began | October 31, 13:30 UTC / 22:30 JST |
| Stop new admissions | October 31, 21:00 UTC / November 1, 06:00 JST |
| Absolute game stop | October 31, 21:30 UTC / November 1, 06:30 JST |
| Additional public admissions | At most 3,000 for this new run |
| Concurrent managed games | At most 22, including human games; one game per bot |
| Inference | Two server workers, combined 400% logical CPU and 2,000 MiB |
| Controls | Native 5+3 Blitz and 10+5 Rapid |

Preparation is inside the eight-hour window. Late preparation cannot move the
cutoffs. Stop admissions early when the goal is reached, drain admitted games,
and verify the final native state. The hard stop wins over incomplete games.
No neural inference runs on the owner's Mac. Added human timing waits are off
only for study games; fixed production timing personalities remain unchanged.

This is a new authorization and new evidence directory. Never reopen the old
`r20261031p137` run, reuse its admission budget, rewrite its timestamps or alter
its frozen snapshot, published report or failed private qualification evidence.
The earlier 2,623 completed games remain in public histories and native perfs.
Do not apply the previous external −75 correction again or reseed an account.

## Scheduling and prediction freeze

Retain the original 200 training identities, including the original 44, and 50
held-out identities. Conditioning, history, temperature, top-p and opening rules
stay fixed per bot. Preserve native ±200 eligibility, shared admission/busy-seat
checks, chess rules, clocks, game completion and Glicko/provisional semantics.
This study scheduler does not replace public quick-pair selection.

1. Prioritize provisional training bot/speed pairs. Balance their new-run
   appearances and colors, using current native uncertainty to prioritize ties.
   Choose uniformly among all available eligible training opponents.
2. Once every training rating is nonprovisional, stop admissions and drain
   training games. Save the exact training snapshot and freeze predictions
   before admitting a held-out study game.
3. Use the existing fixed `strength137-ridge-rbf-effective-cv-v2` procedure:
   the same training-only weighted ridge fit, features, penalty grid, effective
   policy grouping and selection rule. Do not fit on held-out native labels or
   use observed test errors to choose a procedure. Fitted artifacts are private
   research files; fitting never writes to native ratings.
4. Prioritize provisional held-out bot/speed pairs against uniformly selected
   eligible training opponents. If a training rating needs maintenance after
   freezing, play training-only maintenance games without refitting predictions.
5. When all 500 native flags are nonprovisional, stop admissions and drain. Also
   stop for the game/time/resource limits or a public integrity/worker failure.

Previously observed held-out configurations are being measured more precisely;
this is a follow-up, not a new claim of fresh unseen-configuration validation.
Preserve the original procedures and predictions as historical references.
Current native perfs are the new run's baseline, including all previous games.
An earlier uncertain estimate is not silently substituted with a fitted rating.

No eligible opponent is a recorded coverage constraint, not permission to widen
the rating band, change a policy, manufacture establishment or reset a run.
Human play remains supported and uses the same managed-game capacity.

## Qualification, deployment and recovery

Follow issue → PR → checks → GitHub merge → verified-main build and deployment.
Keep the new native change within the namespaced study plan/scope; old profile
dates and behavior remain intact. Update the exact-path departure register.

Actual qualification uses a new disposable 27028 database and checks native
BOT moves, legal PGNs/results, native perfs, shared human capacity, both clocks,
the 3,000/3,001 admission boundary and deadline/scope refusals. Verify actual
loaded process PIDs, start times, classpaths and every staged app/WS jar. Retain
the GIF renderer and all nine public roles/security isolation. Run the worker
permission probe as the real service account with its intended sandbox.

Private includes use recognized `.conf` filenames and preserve required-include
semantics. Check effective native/adapter token agreement without printing it.
Explicitly apply directory modes after creation under a 0077 umask; verify all
public source/roster/assets are readable by their production service accounts.
Do not reset or reuse an old failed private fixture.

Before public admission, verify a fresh consistent encrypted database/config
backup and its off-host ciphertext hash. Preserve all managed/public perfs and
histories across deployment and compare actual snapshots. The root launcher
requires a fresh root-owned backup receipt for the exact new run/source/roster,
including a quiescent raw native-perf fingerprint. Never compare time-inflated
API uncertainty values with raw database bytes. No automatic database restore,
rating import or copied established history is allowed. Recovery restores only
code/configuration while preserving earned data.

Use a one-shot supervisor with matching root/native/worker/systemd limits.
Monitor public health, storage, worker resources, unique acknowledged moves,
legal final results and native count agreement. Public driver/integrity failure
stops for investigation with no automatic public retry. Pre-public preparation
or qualification faults must be diagnosed and repaired before admission, within
the unchanged time budget. Do not mistake a failed preparation for played games.

## Evidence and publication

Record source/model/roster/split hashes, current initial perfs, training freeze,
predictions, every admission/result/PGN, unique acknowledgments, native count
agreement, convergence by bot/speed, final perfs, resource windows and stop reason.
Keep the old manifest's logical roster/split commitments while distinguishing
its original source bytes from earlier operational JSON serialization. A new
establishment manifest carries this run's limits and epochs; old protocol dates
are not edited.

Publish the follow-up methods, data, figures, expected-rating mapping and its
uncertainty in `Dash1971/mobile-maia-research`, then link a brief summary from
the app. Explain plainly which ratings settled and what the settings predict.
Preserve the first report as the earlier bounded phase. Do not hide contrary
measurements, claim exact human Lichess alignment, or run extra games to improve
a reported score. No 10,000-account expansion is part of this authorization.
