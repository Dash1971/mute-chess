# Validation continuation timing amendment (#147)

The owner amended the overall execution window on October 31, 2026 at about
07:04 UTC, before any held-out study admissions or inspected validation results.
The latest authorized simulation stop is **13:00 UTC / 22:00 JST** that day;
stop admitting games at **12:30 UTC / 21:30 JST**. The aggregate limit remains
**3,000 public admissions**, including the original 200-game warmup. This changes
the available time, not the predictor procedure or acceptance target.

The original segment `r20261031p137` remains immutable on its reviewed source,
with its original 10:04:39 UTC admission cutoff and 10:34:39 UTC deadline.
Never hot-patch it or interrupt its active games to extend its window. The
[dated authorization](https://github.com/Dash1971/mute-chess/issues/137#issuecomment-6540414502)
and [implementation issue](https://github.com/Dash1971/mute-chess/issues/147)
preserve the original limit rather than silently rewriting its record.

## Conditional second segment

A separately reviewed continuation may start only after the original segment
finishes normally, its supervisor restores normal configuration, and native,
study and public games are all inactive. No continuation follows a failed run,
aborted fixture, integrity error or missing evidence. Qualification and a verified
merged-main deployment must pass before the new admission cutoff; otherwise
publish the reached sample honestly.

Continuation is validation-only: at least 2,000 original admissions must already
have completed, and the exact primary frozen predictor and training snapshot
must exist. The model must match the recorded prediction-freeze hash; separately
hash and preserve the training snapshot byte-for-byte. Use the same native
run ID and existing native study records so native enforcement of the aggregate
3,000-game limit remains effective. Never reset ratings, uncertainty, counts,
histories or completion records. Reopening occurs only through a clean process
start after normal cleanup, not by modifying a running process's closed flag.

The second segment writes to a separate evidence directory. Preserve original
events, checkpoint, supervisor receipt, roster, manifest, training snapshot,
predictor and PGNs byte-for-byte. Link predecessor hashes and both source
revisions; record actual resume ratings and any intervening public games. Seed
completed-game bookkeeping from the predecessor so earlier finishes are not
logged or counted twice. Admit remaining held-out-versus-training games using
all existing records and current native ratings.

The root supervisor performs an independent legal-PGN/native-result/unique-move
acknowledgment audit before continuation. It copies predecessor evidence into a
protected snapshot inside the new output, including the original root-only
resource and supervisor receipts. The adapter reads those copies rather than
changing permissions on original evidence. Root-owned receipts and snapshots
remain read-only to the worker; a sticky output directory permits new worker
logs without allowing replacement of protected root-owned entries. The storage
guard conservatively counts the current database plus original evidence,
protected copies and continuation output against the same one-GiB ceiling.

## Scientific and operational invariants

- Load the original primary model and predictions without fitting again. Never
  use held-out outcomes to choose features, penalties, configurations or models.
  Evaluate the primary with its correct recorded model version; newer main's
  secondary implementation must not relabel it as V2.
- Fit the separately preregistered V2 only from the exact original frozen V1
  training snapshot, and report both procedures against the combined validation
  evidence. Their test results cannot decide which procedure is presented.
- Keep the 200 training identities, 50 held-out identities, roster hashes,
  sampling/history policies, opening behavior, native +/-200 eligibility,
  rules, clocks, Glicko and provisional rules unchanged. Human games remain
  supported and are accounted for separately.
- Keep 22 concurrent total managed games, two inference workers, 400% logical
  CPU and 2,000 MiB worker memory. Added human waits stay off in study games;
  production timing personalities remain unchanged. No inference on the
  owner's Mac and no automatic retry or restart after failure.
- Root, native, worker and systemd guards must agree on the amended deadlines.
  Verify actual cleanup at the final stop; clock time is not a deployment
  handoff. Preserve isolated UI work and require runtime jar/main-class
  preflight before maintenance, as tracked in #143.

## Qualification and reporting

Fail closed for mismatched or missing receipts, source/roster/split/model hashes,
active games, incomplete training, predecessor errors, duplicate continuation,
exhausted admissions or late start. Verify native admission 3,000 succeeds and
3,001 fails across segments; fitting is unreachable during validation resume;
predictions and original evidence stay identical; and native earned ratings
are never overwritten. Qualification uses only the private 27028 namespace.

The final research publication must disclose the timing amendment, original and
continuation sources, measured intervals, admission/finish accounting and any
intervening public games. Report each capacity segment separately as well as
combined evidence; restarting workers changes warmup and resource counters.
Native Glicko estimates, relative uncertainty and closed-pool results remain
distinct from proof of alignment to human Lichess strength.
