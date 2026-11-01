> **The 10,000-bot pool is live.** See [the calibrated roster](catalog-roster.md)
> for its rating distribution, persistent settings and Research-seeded profiles.
> The original 250 accounts keep their earned ratings and histories; 9,750 new
> identities start with assigned nonprovisional ratings and zero completed games.
> Historical experiment descriptions below preserve the earlier methodology.

# Bot population and persistent personalities

The original population infrastructure ([#69](https://github.com/Dash1971/mute-chess/issues/69),
implemented in #72) retained 44 existing identities. Subsequent research expanded
that reference cohort to 250 and established their native Blitz and Rapid
ratings. The current pool adds 9,750 identities using those measured policies;
see [the calibrated roster](catalog-roster.md). Country personas and scheduled
breaks remain deferred in #71.

## Human rating goal

A human player's established Mute Chess rating should roughly translate to their established Lichess strength in the same speed pool. We will engineer toward that goal using reference-derived priors, native Glicko-2 calibration and human/reference validation, reporting differences and uncertainty. Bot self-play supplies relative-strength evidence; human-facing alignment is a separate empirical validation target.

## Fixed settings

The historical 250-bot reference cohort combines
[`roster.json`](../lila-adapter/roster.json) and
[`experiment-roster.json`](../lila-adapter/experiment-roster.json). Those files
retain the original policies and initialization records for reproducibility;
live earned ratings are not reset from them. The current loader also includes
[`catalog-roster.json`](../lila-adapter/catalog-roster.json), bringing the public
pool to 10,000 identities.

Each bot keeps its self-conditioning input, temperature, top-p, opening policy,
move-history switch, human-timing switch and timing style across games and
deployments. Native profiles expose these settings and identify bots clearly.
The new catalog's assigned RD 100 and zero-game initialization is documented in
[the current rating policy](catalog-roster.md#ratings); historical experimental
RD and provisional descriptions below do not override that policy.

The original 44 profiles retain their named sampling settings: Full (temperature 1, top-p 1), Balanced (1, .95), Focused (.5, .9), and Argmax (0, 1). Non-Full policies use Full sampling through both colors' first five moves, then their fixed sampling settings. Conditioning inputs describe the network's input, not measured playing strength. Sampling and timing do not adapt to whether the human is winning.

The original sampling increments and the exact Mobile Maia measurements are compared in [the sampling-reference audit](sampling-reference-audit.md). The historical reference-as-Full assumption remains recorded; #100 tracks the owner-confirmed p95 reference baseline. Earned perfs are never reset to that estimate.

The new `personality` object is stored in the roster. [`assignedPersonality`](../lila-adapter/personality.mjs) reproducibly assigns it using SHA-256 of `mute-pool-personality-v1:<bot-id>:<field>`. Independent field labels select history on/off (50/50), timing on/off (50/50), and one of five equally weighted timing styles. These are assignment probabilities, not quotas: the 44-account sample has 20 history-on and 27 timing-on accounts. Future generators must preserve existing assignments rather than reroll them. No inference is needed to create an identity.

The older descriptive `history_policy` and `timing_policy` fields remain unchanged solely to reproduce version-2 hashes and frozen games. For version-3 games, the explicit `personality.history` and `personality.humanTiming` values take precedence; the legacy prose does not control those games.

History on uses the current board plus up to seven prior positions; off repeats the current board in all eight model slots. This affects the network input only. Native game history, repetition and rules are always retained. A fresh game no longer draws a new history mode for a version-3 personality.

## Timing

Timing starts from Mobile Maia's lognormal distribution and original-control tiers documented in [bot-timing.md](bot-timing.md). Five style multipliers are applied to that target:

| Style | Multiplier |
| --- | ---: |
| Very fast | 0.45 |
| Fast | 0.70 |
| Normal | 1.00 |
| Slow | 1.30 |
| Very slow | 1.60 |

Total targets are capped at 3 seconds for 1+0, 4.5 seconds for 2+1 / 3+0 / 3+2, and 9 seconds otherwise. Actual added waiting subtracts elapsed inference/queue time, spends at most 5% of the remaining clock and retains the existing 250 ms reserve. Human timing off adds no artificial wait; it does not remove inference or transport latency. A style remains assigned but inactive while timing is off. Effects on flag rates and strength are not yet calibrated.

Move sampling gets its own fresh per-game seed. Timing randomness and assignment hashes never consume the move sampler's random stream. Each game freezes the model hash, policy version and personality settings. Previously frozen version-2 games still use their original per-game history choice and version-2 timing; adding personality fields does not invalidate them.

For the initial Blitz/Rapid experiment in #73, the owner has chosen **no added human-timing waits**. Retain native clocks, actual inference/queue time, sampling settings and history. Record this as a separately versioned study policy/override, rather than presenting the games as unchanged production timing policies. The production roster's stored timing switches/styles stay intact. This speeds the baseline and gives a useful engine-capacity workload; a later production-like timing check and 1+0 Bullet validation can follow. The separately gated study override is implemented in #80 and defaults off; see [the trial methodology](native-bot-trial.md).

## Presence and matching

All bots are available while the managed Maia service is healthy, with normal busy-account and global capacity checks. One health lease represents the entire managed roster. Healthy polls renew that lease without refreshing thousands of account timers or republishing every identity. Expiry publishes an offline transition; recovery publishes an online transition. Native WebSocket restarts reannounce managed presence. Ordinary third-party API bots retain their original individual presence mechanism.

The pool keeps a derived, in-memory index of native ratings by speed and rating band. Startup loads native perfs in one batch after bounded account provisioning. Finished-game events refresh affected bots after native Glicko writes. Selection remains uniformly random among eligible, available bots within ±200. The chosen account and native speed rating are checked again before admission; stale or disabled candidates are corrected and retried. There is no recent-opponent avoidance or new matchmaking weighting. No 10,000-account database traversal is needed for each pairing.

The index is not another rating system or persistent rating authority. Restart rebuilds it from native records. Existing seed-version markers prevent resetting earned ratings. Idle identities do not allocate their own engine processes; the shared worker and global game limit are unchanged.

## Population distribution and rating/capacity work

Lichess publishes separate [Bullet](https://lichess.org/stat/rating/distribution/bullet), [Blitz](https://lichess.org/stat/rating/distribution/blitz) and [Rapid](https://lichess.org/stat/rating/distribution/rapid) weekly distributions. The eventual roster generator should target these separately, document finite-roster rounding and unsupported strength ranges, and publish dated source frequencies. A model conditioning number must not be substituted for measured strength to force a desired histogram.

[#73](https://github.com/Dash1971/mute-chess/issues/73) tracks the owner-authorized bounded trial of the existing **44 public bots**. Its real native games update public perfs and remain in game histories. Preserve earned ratings; original priors initialize only absent accounts and disposable qualification data. Ten appearances per bot in each of Blitz and Rapid would mean **440 games total**; the first batch is limited to 100 admitted games / 90 minutes, ramping to ten concurrent games as approved. See [the exact budget, safeguards and interpretation](native-bot-trial.md). Self-play needs external anchors for Lichess-scale alignment; native provisional status and uncertainty remain honest.

## Speed-specific priors

The roster already has distinct initial Blitz and Rapid ratings, based on the October 28, 2026 Lichess Maia3 reference snapshot rounded to 50-point seeds, followed by the existing sampling-profile adjustments. Forty of the 44 identities have different initial Blitz and Rapid values. Examples from the Full sampling profile:

| Bot | Initial Blitz | Initial Rapid |
| --- | ---: | ---: |
| Pixel Moth | 900 | 950 |
| Cobalt Mist | 1300 | 1250 |
| Neon Rook | 1500 | 1650 |
| Ghost Relay | 1800 | 1700 |

These are original configuration seeds; earned live ratings can differ. Core initial RD is 200, while the experimental upper settings use 300 or the larger source RD. Native initialization never resets existing earned ratings.

Bullet currently inherits the initial Blitz prior, and Classical inherits the initial Rapid prior. These are temporary starting estimates, **not yet observed cross-speed transfers**. UltraBullet also inherits Blitz and Correspondence inherits Rapid; neither should be silently equated to the later Bullet/Classical calibration.

The planned next step is to use the same Maia3 reference accounts' observed speed differences to seed Bullet/Classical after the Blitz/Rapid trial:

```text
Bullet prior    ≈ calibrated Blitz + reference(Bullet − Blitz)
Classical prior ≈ calibrated Rapid + reference(Classical − Rapid)
```

Use differences from the matching model/conditioning family and nearby supported strength bands, with uncertainty for sampling/history/timing differences. A single universal offset is not assumed. The [dated reference data](data/lichess-maia-speed-reference-2026-10-28.json) preserves ratings, RD, game counts and provisional status for all eleven Maia3-79M accounts. For the 600–2000 reference accounts, observed Bullet-minus-Blitz differences range from +247 to +514, and Classical-minus-Rapid from +23 to +304. Sparse/provisional upper accounts cannot support equally confident transfers. These are historical observations, not current account ratings or measurements of our exact deployment policies.

Cross-speed transfers remain provisional priors with separate uncertainty; do not copy an established Blitz/Rapid RD into an unvalidated speed or alter native provisional rules. Refresh the source data when implementing the mapping, then validate Bullet (including 1+0 timing) and Classical through actual games and human/reference evidence. No speed-mapping or live-rating changes are made by this documentation update.

Maia's current move selector has no clock input or time-dependent search. With added waits disabled, Blitz and Rapid self-play can therefore have very similar relative-strength evidence when clocks do not decide games. The external speed-specific priors remain important because human opposition differs across the Lichess pools. Do not expect a closed bot pool alone to reproduce all of those human-facing differences.

Public profiles link here for methodology. Historical game policy details retain their own version; a current profile describes the current policy.

## Proposed external anchor and cross-speed prior update

[#103](https://github.com/Dash1971/mute-chess/issues/103) prepares a **draft-only**
one-time −75 earned-rating translation and matched Bullet/Classical priors.
[Scope, dated references, before/after preview and recovery procedure](bot-rating-adjustment.md)
are public for review. Nothing is applied by merging/deploying the source;
original seeds, histories and native Glicko remain intact. Publish a non-secret
completion receipt and actual before/after table here after any separately
approved execution rather than presenting this draft as completed calibration.


## Applied anchor correction — October 30, 2026

The owner-approved one-time −75 correction and unplayed Bullet/Classical priors
were applied to the existing 44 bots. Native Glicko continues unchanged from the
corrected stored ratings; original seeds and past game/history ratings remain
historical values. [Exact before/after table, reference data and verification
receipt](data/rating-anchor-applied-2026-10-30/README.md). This operation started
no new calibration games.

## Continuous experiment and Easter egg identities (#137/#92)

The exact approved ranges, endpoint aliasing, training-only model selection,
prospective held-out tests and October31 hard stop are in
[strength-experiment.md](strength-experiment.md). New configurations use full
sampling for five full opening moves and then fixed temperature/top-p. Original
policies, seeds and earned perfs are never overwritten. Repeated identities with
the same effective configuration are not independent evidence about the mapping.

Upper-input identities include Wintermute/Neuromancer (Neuromancer), HAL9000
(2001: A Space Odyssey), SHODAN (System Shock), Durandal (Marathon), WalterWobot
(Judge Dredd), Skynet (The Terminator), GLaDOS (Portal), Colossus
(Colossus: The Forbin Project), DeepThought (The Hitchhiker's Guide to the Galaxy),
Joshua (WarGames) and Mycroft (The Moon Is a Harsh Mistress), as included by the
seeded generator. These are character references, not affiliations. Wintermute
is fixed at conditioning2600/argmax/history-on/very-fast human timing; Neuromancer
is the separate history-off comparison. Measured ratings determine the leader;
no rating is manufactured to place a character first.

### October 31 first-phase results

The completed study contains 2,623 native rated games: 200 original-roster
warmup games, 1,800 additional training games and 623 held-out games. The
remaining 377 were not admitted after isolated continuation qualification failed;
the study workers were stopped and earned ratings retained. Of the original 44,
43 had nonprovisional Blitz ratings and all 44 had nonprovisional Rapid
ratings at that stage. The 50 held-out configurations remained provisional after 6–7 games per
speed.

Primary held-out native-label MAE was 131.4 Blitz / 127.3 Rapid; the preregistered
secondary procedure gave 127.7 / 127.3, against 124.0 / 119.5 for the unchanged
seed baseline. These measurements did not demonstrate an improvement over
the existing heuristic. These uncertain closed-pool
labels do not establish alignment with human Lichess strength. New identities
must retain honest uncertainty and learn through native Glicko; no established
history or RD is copied from another bot.

The canonical [methods, results, complete games and reproduction tools](https://github.com/Dash1971/mobile-maia-research/tree/4800b4e6f5e68d55e64d8c15fa07efe4a4e3c7de/studies/bot-strength-seeding-2026-10-31)
live in Mobile Maia Research. They also document capacity measurements and the
limits of extrapolating them to human games or VPS hardware. This report
introduces no new common rating adjustment or production capacity increase.


### Reference calibration and the live expanded pool

The 250 reference identities have established native Blitz and Rapid ratings,
retaining their Lichess-derived starting anchor, persistent settings and earned
game histories. The expanded pool preserves those accounts and adds 9,750
persistent identities with assigned nonprovisional ratings. New profiles label
them **Research-seeded**: they reuse measured playing policies, not another
account's completed games or rating history.

The [illustrated report](https://github.com/Dash1971/mobile-maia-research/blob/140e2eb411923930fb0d5950b92abf6f3c0166dd/studies/bot-rating-establishment-2026-10-31/REPORT.md)
explains the Lichess reference, the impact of engine settings and the measured
policies used to seed the expanded pool. The [roster methodology](catalog-roster.md)
shows the allocation, supported rating ranges and reproducible generator.

Native Glicko continues updating ratings normally. Matching human Lichess
strength remains a project goal that we will monitor through actual play;
bot-only calibration does not independently guarantee that correspondence.

## Human opponent conditioning (#176)

New signed-in human-versus-Maia admissions pass the same native speed rating
already used for pool matching to the private adapter. For example, a human with
Blitz 1737 and Rapid 1881 supplies 1737 for Blitz and 1881 for Rapid. The bot's
configured self input remains fixed. The adapter keeps the exact integer human
rating within 600–2600 and clamps outside that model range. Anonymous play
assumes equal strength and matches the bot self input; the native 1500
matchmaking default does not become a model input. Native correspondence and
unlimited admission retain their existing perf-key selection.

For signed-in humans, `freezeForHuman` records `human-speed-rating-v1` and a
separate v4 policy version bound to the bot policy and opponent input. Rating
updates cannot change an admitted game's snapshot. Old v2/v3 games retain their
previous fixed input; `freeze`, anonymous games and study policies remain
unchanged. Validation rejects malformed ratings, changed conditioning and
mismatched bot/history/timing settings. There is no adaptive response to the
score or clock, no new matching rule, and no rating write.

The completed calibration and catalog seed methodology measured fixed
self/opponent conditioning. They do not validate the new human-conditioned
behavior; native Glicko continues to update earned ratings from actual results.
This feature does not recalibrate, reseed or launch another study. Bot profiles
disclose the new rule. Analysis and puzzle-review channels continue to use their
selected rating for both inputs, as documented in
[README](../README.md#engine-settings).
