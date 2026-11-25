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

The original sampling increments and the exact Mobile Maia measurements are compared in [the sampling-reference audit](records/sampling-reference-audit.md). The historical reference-as-Full assumption remains recorded; #100 tracks the owner-confirmed p95 reference baseline. Earned perfs are never reset to that estimate.

The `personality` object is stored in the roster. [`assignedPersonality`](../lila-adapter/personality.mjs) reproducibly assigns it using SHA-256 of `mute-pool-personality-v1:<bot-id>:<field>`. Independent field labels select history on/off (50/50), timing on/off (50/50), and one of five equally weighted timing styles. These are assignment probabilities, not quotas: the 44-account sample has 20 history-on and 27 timing-on accounts. Future generators must preserve existing assignments rather than reroll them. No inference is needed to create an identity.

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

Historical Blitz/Rapid trials disabled added human-timing waits under a separately
versioned study policy, preserving native clocks and inference/queue time. That
completed experiment does not change stored production timing preferences or
authorize another run. See the [trial record](records/native-bot-trial.md).

## Presence and matching

All bots are available while the managed Maia service is healthy, with normal busy-account and global capacity checks. One health lease represents the entire managed roster. Healthy polls renew that lease without refreshing thousands of account timers or republishing every identity. Expiry publishes an offline transition; recovery publishes an online transition. Native WebSocket restarts reannounce managed presence. Ordinary third-party API bots retain their original individual presence mechanism.

The pool keeps a derived, in-memory index of native ratings by speed and rating band. Startup loads native perfs in one batch after bounded account provisioning. Finished-game events refresh affected bots after native Glicko writes. Selection remains uniformly random among eligible, available bots within ±200. The chosen account and native speed rating are checked again before admission; stale or disabled candidates are corrected and retried. There is no recent-opponent avoidance or new matchmaking weighting. No 10,000-account database traversal is needed for each pairing.

The index is not another rating system or persistent rating authority. Restart rebuilds it from native records. Existing seed-version markers prevent resetting earned ratings. Idle identities do not allocate their own engine processes; the shared worker and global game limit are unchanged.

## Population distribution and completed research

The current generator uses archived Lichess Blitz/Rapid distributions and measured
policy references, as explained in [catalog methodology](catalog-roster.md).
Conditioning input is not substituted for measured strength to force a histogram.
The original #73 trial completed 400 rated games; its budgets and earlier 44-bot
cohort are [historical evidence](records/native-bot-trial.md), not the current
population or authorization for further games. Native earned ratings and public
game histories remain intact. Human-facing Lichess alignment still needs external
reference validation; a closed bot pool alone does not establish that scale.

## Speed-specific priors

The [current catalog policy](catalog-roster.md#other-time-controls) distinguishes
measured Blitz/Rapid references from inferred Bullet/Classical priors.
UltraBullet uses a Blitz proxy and Correspondence a Rapid proxy; neither is
validated cross-speed calibration. Existing earned ratings and histories are
preserved, and native Glicko continues updating them after games.

For the original 44 bots, the owner-approved one-time −75 anchor correction and
unplayed Bullet/Classical priors were applied on October 30, 2026. Earned Bullet
results were preserved with the common translation. Unplayed priors use the
conditioning-matched historical reference differences, with broad uncertainty
where reference evidence is weak. The operation is complete and must not run
again. See the [exact before/after table and receipt](data/rating-anchor-applied-2026-10-30/README.md)
and [historical methodology](records/bot-rating-adjustment.md).

Original roster seeds are historical inputs, not today's stored ratings. Model
conditioning is not measured human Elo. Bot self-play does not establish an
absolute Lichess rating scale; human/reference validation remains necessary.
Public profiles describe current policies, while historical games retain their
frozen policy versions.

## Bot identities

Upper-input identities include Wintermute/Neuromancer (Neuromancer), HAL9000
(2001: A Space Odyssey), SHODAN (System Shock), Durandal (Marathon), WalterWobot
(Judge Dredd), Skynet (The Terminator), GLaDOS (Portal), Colossus
(Colossus: The Forbin Project), DeepThought (The Hitchhiker's Guide to the Galaxy),
Joshua (WarGames) and Mycroft (The Moon Is a Harsh Mistress), as included by the
seeded generator. These are character references, not affiliations. Wintermute
is fixed at conditioning 2600/argmax/history-on/very-fast human timing; Neuromancer
is the separate history-off comparison. Measured ratings determine the leader;
no rating is manufactured to place a character first.

The [research history](records/docs398-bot-population-history.md#october-31-first-phase-results)
retains the dated experiments, limits and measured outcomes. It authorizes no
new games or common rating adjustment.

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

## Human opponent conditioning

New signed-in human-versus-Maia admissions pass the same native speed rating
already used for pool matching to the private adapter. For example, a human with
Blitz 1737 and Rapid 1881 supplies 1737 for Blitz and 1881 for Rapid. The bot's
configured self input remains fixed. The adapter keeps the exact integer human
rating within 600–2600 and clamps outside that model range. Anonymous play
assumes equal strength and matches the bot self input; the native 1500
matchmaking default does not become a model input. Only the supported real-time controls are admitted; conditioning does not
enable correspondence or unlimited games.

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
[site manual](site-manual.md#engine-settings).

<details>
<summary>Preserved earlier section URLs</summary>

<a id="population-distribution-and-ratingcapacity-work"></a>
- [Population distribution and rating/capacity work](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/bot-population.md#population-distribution-and-ratingcapacity-work)

<a id="proposed-external-anchor-and-cross-speed-prior-update"></a>
- [Proposed external anchor and cross-speed prior update](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/bot-population.md#proposed-external-anchor-and-cross-speed-prior-update)

<a id="applied-anchor-correction--october-30-2026"></a>
- [Applied anchor correction — October 30, 2026](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/bot-population.md#applied-anchor-correction--october-30-2026)

</details>

<details>
<summary>Historical section links</summary>

<a id="continuous-experiment-and-easter-egg-identities-13792"></a>
- [Continuous experiment and Easter egg identities (#137/#92)](records/docs398-bot-population-history.md#continuous-experiment-and-easter-egg-identities-13792)

<a id="october-31-first-phase-results"></a>
- [October 31 first-phase results](records/docs398-bot-population-history.md#october-31-first-phase-results)

<a id="human-opponent-conditioning-176"></a>
- [Human opponent conditioning (#176)](records/docs398-bot-population-history.md#human-opponent-conditioning-176)

</details>
