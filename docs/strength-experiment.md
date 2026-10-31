# Continuous Maia strength experiment (#137)

Owner authorization: October 31, 2026. Predict expected native Blitz/Rapid
strength from conditioning rating, history, temperature and top-p, so new
identities can receive informed priors without individually playing a tournament.
The predictor is research tooling; native Glicko remains the public rating authority.

## Frozen scope and budget

**Dated owner amendment:** at approximately 07:04 UTC on October 31 the owner
allowed finishing the intended 3,000 games by 22:00 JST / 13:00 UTC, without
increasing the game budget. The original running segment retains the limits
below. Any validation-only continuation requires separate qualification, clean
normal predecessor completion and the exact frozen primary predictions; see
[the amendment and continuation safeguards](strength-validation-continuation.md).
No restart after failure is authorized.

- Preparation began 02:34:39 UTC / 11:34:39 JST. Absolute stop is **October 31,
  10:34:39 UTC / 19:34:39 JST**, including preparation and qualification.
- At most **3,000 public admissions**, including the first 200 existing-bot games.
  No automatic extension, restart after failure or overnight continuation.
- Existing two workers, combined 400% logical CPU and 2,000 MiB study memory;
  at most 22 total managed games, including human games; one game per bot.
  Stop admissions 30 minutes before the absolute deadline, drain normally and
  retain explicit unfinished/aborted accounting if the hard deadline is reached.
- No inference on the owner's Mac. Stop on integrity failure, failed worker,
  sustained public health degradation, containment or the reviewed storage cap.
- Public histories and earned perfs remain. No reset, repeated baseline
  subtraction, fabricated game counts or forced establishment. Preserve native
  +/-200 eligibility, rules, clocks, rating safeguards and human admission.
- Fix and qualify #101 before public games. Follow issue/PR/check/GitHub merge/
  verified-main deployment. Qualification alone uses an isolated database.

## Population and sampling

Retain the 44 existing identities and policies byte-for-byte. Add 156 training
configurations and 50 held-out configurations: **250 identities total**. Use a
published fixed seed and separate independently shuffled strata for conditioning,
temperature and top-p, balanced history, plus explicit boundaries/reference cases.
This is space-filling randomized coverage, not independent arbitrary draws that
can cluster and miss large regions. The conditioning input is an integer 600–2600;
self and opponent conditioning are equal and fixed per identity in this study.
The network's conditioning number is never described as measured playing strength.

Both temperature and top-p span **0–1 inclusive**, as explicitly requested.
Temperature zero selects argmax; top-p zero retains the highest-probability legal
move. Those are equivalent deterministic endpoints, not independent strength
effects. Use enough paired boundaries to verify this, without oversampling the
same effective policy. Do not claim separate top-p effects when temperature is
zero. Keep model hash, encoder, legal mask, inclusive nucleus/tie ordering, fresh
per-game seeds and opening behavior in every policy artifact.

New configurations all use full sampling through the first five full moves, then
their fixed settings. Existing bots keep their original opening policy. Include
opening policy in the analysis so that those original Full bots are not silently
treated as identical to a different policy. Human timing switches and styles are
fixed per identity but waits are off in the study; no timing-style strength effect
is estimated. Bullet/Classical and independently varied opponent-conditioning
inputs are out of scope for this first fit.

## Admission stages and validation

1. Up to 200 games with the existing 44, continuing earned ratings.
2. Up to 1,800 games across the 200 training configurations. Balance scarce
   bot/speed appearances and colors in the study scheduler; choose opponents
   uniformly within native eligibility. Public matchmaking is unchanged.
3. Freeze the fitted model and all 50 held-out predictions before their first
   study games. Up to 1,000 held-out-versus-training games, aiming at 20 held-out
   appearances each (about 10 per speed). Never fit on held-out outcomes or their
   final ratings. Existing/training opponents may continue normal native Glicko
   updates; freeze research predictions and record their exact pregame ratings.

These are ceilings, not promises of completed coverage. The absolute deadline
wins. If qualification or training consumes the budget, publish the reached stage
and an inconclusive result instead of silently reducing the evaluation standard.
New public human games are tracked separately from study admissions and can
change native perfs; never mistake them for training labels.

Fit an interpretable weighted ridge model to native training rating estimates,
with nonlinear conditioning and temperature/top-p terms, history interactions and
separate speed fits. Weight uncertain labels by 1/(RD squared + 50 squared).
The native game outcomes update those labels through unchanged Glicko; use fresh
outcomes separately for prospective expected-score evaluation. Select
regularization/complexity using configuration-grouped training-only validation;
games from one configuration must not straddle a purported unseen-configuration
split. Compare the published seed baseline and simpler additive model; choose among
additive/interaction features and penalties 0.1, 1, 10, 100 using five
configuration-grouped folds. Prefer additive within five points of the best CV MAE. Prefer
the simplest model whose held-out predictions work; do not assume a linear Elo
slider or impose unsupported monotonic effects. Keep the model artifact, feature
definition, input domain, uncertainty method and reproducible fit/evaluation code.

The practical goal is **held-out mean absolute rating error <=100 points**.
Final native ratings after ten games per speed are noisy labels, so publish their
RD, coverage and uncertainty alongside MAE; do not claim a precise true-strength
error from uncertain labels. Also evaluate frozen expected-score predictions
against fresh outcomes (Brier score/log loss and calibration), including subgroup
errors by history, conditioning and sampling region. Bootstrap configurations,
not individual plies. Distinguish uncertainty in fitted mean strength, noisy
individual results and the shared external Lichess anchor. Closed-pool evidence
cannot remove an absolute scale error. If the goal is not demonstrated, report
that and identify the next informative configurations/games within a future budget.

Pre-held-out implementation audit (#144): V1 hashes account identity for CV;
the200 training identities represent196 known effective configurations, and two
alias groups span folds. Retain the running primary unchanged, qualify its CV
description, and report the independently pre-registered
[effective-configuration secondary analysis](strength-secondary-analysis.md).
That correction uses exactly the same frozen training snapshot and fixed
selection rules; never tune it with held-out results or deploy during this run.

No 10,000-account creation or copying an established donor's RD/history follows
automatically. A future generator uses the validated domain and predictive
uncertainty to propose priors; native Glicko then learns from each account's games.

## Names and #92

Reserve **Wintermute**, conditioning 2600 with argmax, for the upper roster.
History-on is pre-registered for Wintermute, with a separate history-off argmax
2600 counterpart (Neuromancer) for comparison. Preserve these fixed policies
through calibration rather than changing a rated identity afterward. Retain the fastest existing
human-like production timing style (not an invented fixed delay). Study waits
remain off. Do not manufacture a highest rating if another policy beats it;
publish that result and its uncertainty. Add recognizable sci-fi AI names from
the sources in #92 to selected high-input configurations, preserve existing
handles/history, and record source references in the roster methodology.

## Required receipt

Record approved limits, exact source/model/configuration/split hashes, encrypted
pre-run backup verified on/off host, all admitted game IDs and legal final PGNs,
frozen settings/seeds, native result/game-count agreement, before/after perfs,
monotonic state checks, unique plies versus submission attempts, resource and
health metrics, stage/stop reason, training-only selection, frozen held-out
predictions, fit/evaluation artifacts and limitations. Publish methods/results on
GitHub. Do not count synthetic qualification fixtures as calibration evidence.
