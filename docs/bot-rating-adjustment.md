# One-time p95 anchor correction and cross-speed priors

**Applied on October 30, 2026 with owner approval.** See the
[completion receipt and exact before/after table](data/rating-anchor-applied-2026-10-30/README.md).
The operation used installed verified-main source `b8f9573344f45931b9e6f09de0e93eb5aaf7f8a5`
and reviewed plan SHA-256 `bf8bddd0333d7ec965d993eff7e49da6235c62d55022bcfa04e5c82b5aff9327`. All 44 bots and native field types
were verified before play reopened. The original draft preview remains historical
evidence; deploying source alone still never runs the adjustment.

The [400-game trial report](https://github.com/Dash1971/mute-chess/tree/main/docs/data/bot-trials/r20261030c)
retains earned native ratings and documents the confirmed temperature 1 / top-p
.95 Lichess reference. The owner requested a candidate common −75 correction and
Bullet/Classical reference mapping in the same draft. This is an external anchor
operation, not a change to Glicko or a promise of exact human Lichess strength.

## Reviewed field changes

Only the 44 existing enabled `noSweatBot` accounts, with native BOT title and
canonical roster identities, are eligible. There are 176 candidate pool-rating rows, plus 30 existing derived standard snapshots.

| Current category | Proposed operation |
| --- | --- |
| Blitz and Rapid | Current earned rating −75; preserve RD, volatility, counts, timestamps and all other perf fields. |
| Bullet/Classical with rated games | Current earned rating −75; preserve their earned information and uncertainty. |
| Unplayed Bullet | Adjusted earned Blitz + matched Lichess (Bullet − Blitz). |
| Unplayed Classical | Adjusted earned Rapid + matched Lichess (Classical − Rapid). |

The read-only preview found **three earned Bullet accounts**: Chrome Sparrow,
Patchwork and Sideband, one game each. Their ratings receive only the common
translation. The other 41 Bullet and all 44 Classical ratings receive proposed
starting estimates: 91 earned translations and 85 unplayed-speed priors.

Unplayed categories retain RD at least 200; fallback estimates retain RD at least
300. Existing greater RD is never reduced. Volatility, zero-game counts and last
activity stay unchanged. Native provisional status therefore remains honest.
The existing native `standard` aggregate receives the same −75 translation where it has rated results (30 bots in this preview). Translation commutes with Lichess's weighted aggregation because all contributing earned speed ratings shift equally; no averaging formula is reimplemented. The operation fails if earned Correspondence would make that incomplete. Default/unplayed standard aggregates are untouched.

No Bullet/Classical games are started here. UltraBullet, Correspondence, puzzles,
humans, external bots, identities and frozen move policies remain unchanged.

Original roster priors and historical game/profile-history entries remain intact
for provenance. A separately versioned audit records the calibration event; the
current rating may differ from the last historical game snapshot. No fake game,
loss or rating-history rewrite is inserted to disguise that difference.

## Dated reference mapping

[October 30 public Lichess data](data/lichess-maia-adjustment-reference-2026-10-30.json)
contains ratings, games, RD and provisional flags for all eleven matching
`maia3-79m` accounts. Refresh it with `deploy/calibration/fetch_reference.py`
when preparing execution; planning rejects references over seven days old.

For each target/source pair, use the matching conditioning family if both
reference speeds are non-provisional, have RD ≤110 and have at least 30 games.
Otherwise choose the nearest conditioning family that satisfies those criteria,
breaking ties by account ID. The preview identifies the requested and used
accounts. At this snapshot, the 2200–2600 families fall back to the 2000 family
for both transfers, giving 24 clearly marked fallback rows. These thresholds and
fallbacks are reviewable prior assumptions, not an upstream recommendation.

Among the supported 600–2000 references, Bullet − Blitz ranges **+240 to +502**,
and Classical − Rapid **+55 to +256**. The code uses each selected pair, not one
universal offset. Sampling/history/opening differences and sparse upper bands
limit transfer accuracy. Use the measured source-speed earned rating as the
base; do not reset it to its original roster seed.

[Preview CSV](data/rating-anchor-draft-2026-10-30/preview.csv) lists all 176 pool-rating and 30 aggregate exact
before/after values and reference decisions. [Preview metadata](data/rating-anchor-draft-2026-10-30/preview.json)
records dates, hashes and scope. Its all-zero source revision is deliberately
inapplicable to production; it is a review artifact rather than an executable
approved plan.

## Upstream contract and operational boundary

There is **no native patch or rating-formula change**. Native `user_perf` remains
authoritative. Only selected `*.gl.r` and, for broad unplayed priors when needed,
`*.gl.d` fields are set; every other field is compared against the reviewed
before/after image. Writes explicitly retain native BSON Double types. MongoDB
standalone supplies per-document atomicity, not a 44-document transaction.

`nosweat_rating_adjustment` stores one fixed migration ID, the reviewed plan,
source commit, encrypted-backup receipt and status. A second application fails.
Recovery classifies each whole perf document as exactly before or exactly after;
anything else blocks recovery instead of overwriting intervening results.

A persistent maintenance marker plus standard systemd `ExecStartPre` drop-ins
blocks all four public writer/front-door units during mutation. It survives a
process crash and reboot. It is cleared only after exact full-cohort verification.
No application/worker is automatically restarted on failure or success.

Root commands require the installed source/release attestation, exact main
commit, exclusive release lock, no security containment, stopped app/adapter/WS/
gateway, no running study, no study configuration, and zero native active games
or reservations. Database access is pinned to public loopback port 27019/database
`nosweat`; the qualification runner is pinned separately to port 27028 and a new
`nosweat_calibration_q*` namespace.

Native in-memory user/perf caches and the Maia pool index are rebuilt by the
subsequent normal app startup. BOT users are excluded from native leaderboards
(`enabled && noBot && !rankban`), so no leaderboard re-ranking or global Redis
flush is appropriate. Preserve sessions, settings and native history/statistics.

## Recorded execution procedure and recovery reference

1. Merge the parents and this PR through normal checks, then deploy the verified
   main source with this tooling. Retarget/rebase the stack as parents merge.
   Draft source and the illustrative preview are not deployable execution plans.
2. Use the normal live-game guard: first verify zero active games/reservations;
   close the gateway to new admissions, allow in-flight requests to settle and
   recheck. If a game appeared, reopen admission and defer. Stop the remaining
   public writer/WS units only after the zero-game recheck. Never abort a game
   for this correction.
3. Refresh/review the public reference JSON. Set `tool` to the installed
   `corresponding-source/deployment/calibration/adjust.py` and `revision` to its
   exact verified-main release commit. Run as root:

   ```sh
   python3 "$tool" plan --commit "$revision" --reference /root/reviewed-reference.json
   ```

   Inspect its pool-rating/aggregate CSV and plan hash. New games, cohort changes, edited
   proposals, changed source or stale before-images require a new review.
4. With `plan_file` and `plan_hash` set to that exact output:

   ```sh
   python3 "$tool" prepare --commit "$revision" --plan "$plan_file" --sha256 "$plan_hash"
   ```

   This takes a fresh full encrypted `mongodump` and creates the durable audit;
   **ratings remain unchanged**. Copy the ciphertext off-host and verify the
   receipt SHA-256 using the existing protected backup/key procedure.
5. Explicitly apply the reviewed, prepared plan:

   ```sh
   python3 "$tool" apply --commit "$revision" --plan "$plan_file" --sha256 "$plan_hash"
   ```

   It arms maintenance guards, performs compare-and-set updates and checks exact
   after-images/native field types before releasing the marker. Services stay
   stopped. Retain the JSON receipt and plan off-host with restricted access.
6. Start the native app/WS/adapter with the gateway still closed. Check readiness,
   representative bot profiles in all four speeds and native pool-index rebuild;
   compare stored values to the plan. Then reopen the gateway and verify public
   health. Historical game ratings and original seed records should be unchanged.
   Publish the non-secret completion receipt, source/reference revisions and
   actual before/after table in GitHub methodology; keep backup keys, private
   files and credentials out of that publication.
   Keep #100 open for human/reference validation and #101 for headless-trial
   lifecycle work; this operation starts no calibration games.

## Failure and recovery

Keep writers stopped and the persistent guard in place. Do not deploy/restart
around a partial cohort or subtract again manually. Use the original plan/hash,
release and authenticated encrypted snapshot receipt.

- `resume` completes only still-before documents, without subtracting twice.
- `restore` moves exactly-after documents back to their original images; it
  refuses any document changed by intervening results. It is also resumable
  after interruption. No whole live database restore is performed.
- `finish` verifies a completed applied/restored cohort and clears a leftover
  matching marker after a crash between DB completion and guard release.
- `verify` is read-only and checks a completed cohort before admitting new games.
  It should fail after legitimate new games have changed the exact snapshot.

The root-only plan/audit/backup are needed for recovery. Never delete an
incomplete audit or invent another migration ID to bypass its protection. Once
normal play resumes, any reversal requires a new scoped plan; restoring an old
whole perf would discard legitimate earned results.

## Verification

`python3 -m unittest discover -s deploy/public -p 'test_*.py'` covers field-level
planning, source/age/cohort/active-game guards, broad provisional priors, earned
Bullet preservation, tampered plans and the read-only preview path. CI also
parses the Mongo shell program.

`deploy/calibration/qualify.py` seeds a new disposable namespace with 44 synthetic
managed bots, a human, an unmanaged bot and historical fixtures. It exercises
stale plans, prepare-without-rating-writes, interruption after seven updates,
resume, duplicate application, changed-result rejection, interrupted restore,
exact recovery, native BSON types and unchanged humans/users/games/history. It
runs no inference and creates no native games. Production acceptance is recorded in the completion receipt linked above,
including the encrypted off-host backup, exact after-images, unchanged unrelated
state, native cache/index refresh and reopening of admission.
