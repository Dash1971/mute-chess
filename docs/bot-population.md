# Bot population and persistent personalities

This is the infrastructure stage of [#69](https://github.com/Dash1971/mute-chess/issues/69), implemented in #72. It preserves the 44 existing identities and their earned native ratings. The planned population is 10,000; expansion follows the separately scoped rating/capacity work. No bot-versus-bot run has started. Country personas and scheduled breaks are deferred in #71.

## Fixed settings

The authoritative configuration is [`lila-adapter/roster.json`](../lila-adapter/roster.json). Each bot keeps its conditioning inputs, temperature, top-p, opening policy, move-history switch, human-timing switch and timing style across games and deployments. Native bot profiles expose the current settings. BOT identification remains visible.

Existing sampling policies are unchanged: Full (temperature 1, top-p 1), Balanced (1, .95), Focused (.5, .9), and Argmax (0, 1). Non-Full policies use Full sampling through both colors' first five moves, then their fixed sampling settings. Conditioning inputs describe the network's input, not measured playing strength. Sampling and timing do not adapt to whether the human is winning.

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

## Presence and matching

All bots are available while the managed Maia service is healthy, with normal busy-account and global capacity checks. One health lease represents the entire managed roster. Healthy polls renew that lease without refreshing thousands of account timers or republishing every identity. Expiry publishes an offline transition; recovery publishes an online transition. Native WebSocket restarts reannounce managed presence. Ordinary third-party API bots retain their original individual presence mechanism.

The pool keeps a derived, in-memory index of native ratings by speed and rating band. Startup loads native perfs in one batch after bounded account provisioning. Finished-game events refresh affected bots after native Glicko writes. Selection remains uniformly random among eligible, available bots within ±200. The chosen account and native speed rating are checked again before admission; stale or disabled candidates are corrected and retried. There is no recent-opponent avoidance or new matchmaking weighting. No 10,000-account database traversal is needed for each pairing.

The index is not another rating system or persistent rating authority. Restart rebuilds it from native records. Existing seed-version markers prevent resetting earned ratings. Idle identities do not allocate their own engine processes; the shared worker and global game limit are unchanged.

## Population distribution and rating/capacity work

Lichess publishes separate [Bullet](https://lichess.org/stat/rating/distribution/bullet), [Blitz](https://lichess.org/stat/rating/distribution/blitz) and [Rapid](https://lichess.org/stat/rating/distribution/rapid) weekly distributions. The eventual roster generator should target these separately, document finite-roster rounding and unsupported strength ranges, and publish dated source frequencies. A model conditioning number must not be substituted for measured strength to force a desired histogram.

[#73](https://github.com/Dash1971/mute-chess/issues/73) will plan a bounded, server-hosted bot-versus-bot run that actually sets/updates native speed ratings while measuring complete-stack capacity. The owner must agree the pilot scope before it runs. Ten appearances per bot in each of Blitz and Rapid across 10,000 identities would mean 100,000 games total; this is workload arithmetic, not an approved job or proof of rating stability. Self-play needs external anchors to support alignment with the Lichess scale. Provisional status and uncertainty remain honest; no synthetic public game counts or artificially lowered deviation are introduced here.

Public profiles link here for methodology. Historical game policy details retain their own version; a current profile describes the current policy.
