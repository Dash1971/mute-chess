# Mute Chess documentation

An index of the pages in this folder. New here? Start with the first four.

## Start here

- [Project README](../README.md): what Mute Chess is and what it offers.
- [Feature and site behavior manual](site-manual.md): rules, engine settings,
  the bot pool, reconnecting and Arenas.
- [Install Mute Chess](installation.md): run your own instance from source.
- [How we maintain Mute Chess](maintenance.md): the two repositories, regular
  Lichess merges and security fixes.

- [Architecture](architecture.md): services, source authority and directory map.
- [Contributing](../CONTRIBUTING.md) and [adapter development](../lila-adapter/README.md).
- [Security reporting](../SECURITY.md), [operations](operations.md),
  [verified releases](releases.md) and [technical names](glossary.md).

## Features

- [Nostr sign-in and key backup](nostr-sign-in-backup.md)
- [Official Mute Chess Nostr identity](nostr.md)
- [Maia Lab](maia-lab.md)
- [Engine arrows and classification badges](arrow-behavior.md), with its
  [comparison gallery](arrow-behavior/gallery.md)
- [Brilliant moves: Mute Exchange](brilliant-moves.md)
- [The expanded Maia opponent pool](catalog-roster.md)
- [Public bot names](bot-names.md)
- [Public bot activity](public-bot-activity.md)
- [Community Arenas](arena-plan.md)
- [Lightning patron support](lightning-patrons.md)
- [Basic Insights and unsupported feature links](basic-insights-and-unsupported-links.md)
- [Focused Mute Chess experience](focused-play.md)
- [Supported real-time surface](real-time-feature-surface.md)
- [Native explorer, community, learning and settings](native-learning-community.md)
- [Native preset chat, supported languages and bot flairs](native-chat-languages-flairs.md)

## Maintenance, security and upstream

- [How we maintain Mute Chess](maintenance.md): overview.
- [Staying aligned with Lichess](upstream-alignment.md): policy, supported
  differences and the upstream update steps.
- [Native source in the Lila fork](native-fork.md): fork history, pinned builds
  and release identity.
- [Security versions and advisory review](security-maintenance.md), with the
  reviewed [version inventory](security-inventory.json).
- [Departure register](../deploy/lila/upstream-departures.json): every file
  that differs from Lichess, with its reason.
- [Reference source inventory](chess-sources.json),
  [third-party notices](../THIRD_PARTY.md) and
  [analysis source provenance](../analysis/PROVENANCE.md).
- [Native development environment](../deploy/lila/README.md) and
  [release and public deployment](../deploy/public/README.md).

- [Committed release gates](../deploy/public/live-checks/README.md).
- [Image/GIF renderer](../deploy/public/gif-renderer.md).
- [Learning content](../learning/README.md) and [puzzle validation](../puzzles/VALIDATION.md).
- [Quiet Signal design](../design/quiet-signal/README.md) and
  [verification](../design/quiet-signal/VERIFICATION.md).

## Design and decisions

- [Owner decision records](decisions/README.md): detailed historical instructions.

- [Foundation decision: Lichess as the base](chess-foundation.md) (28 October 2026,
  with later corrections)
- [Mute Chess: the club in 2097](design.md)
- [Mute Chess rebrand](mute-chess-rebrand.md)
- [Focused account and onboarding branding audit](account-branding-audit.md)
- [Accepted analysis presentation](analysis-presentation.md)
- [Native analysis-board export](analysis-export.md)
- [Moves by Rating source audit](maia-rating-chart.md)
- [Bot population and persistent personalities](bot-population.md)
- [Control-dependent Maia timing](bot-timing.md)

## Implementation notes

- [Public names in chat](chat-public-names.md)
- [Public names in statistics](stats-public-names.md)
- [Key-copy feedback](key-copy-feedback.md)

## Research and experiments

These describe dated studies. Their numbers apply to the date and setup stated
on each page.

- [Brilliant detection with the site's engine](records/brilliant-native-review-validation.md)
- [Sampling evidence and the original rating priors](records/sampling-reference-audit.md)
- [Native bot rating and capacity trial](records/native-bot-trial.md)
- [One-time p95 anchor correction and cross-speed priors](records/bot-rating-adjustment.md)
- [Overnight bot rating establishment](records/overnight-rating-establishment.md)
- [Continuous Maia strength experiment](records/strength-experiment.md), its
  [secondary analysis](records/strength-secondary-analysis.md) and
  [validation continuation](records/strength-validation-continuation.md)
- [Budget VPS sizing](records/vps-sizing.md)
- Trial and reference data: [`data/`](data)

## Dated records

- [Research and dated-record index](records/README.md)
- [Original foundation history](records/foundation-2026-10-28.md)

Kept as written; they are evidence, not current instructions.

- [Security release delay, 23 November 2026](records/rca-2026-11-23-security-release-delay.md)
- [Documentation review evidence, 24 November 2026](records/documentation-review-evidence-2026-11-24.md)
- [Missing frontend manifest, 2 November 2026](rca-2026-11-02-missing-frontend-manifest.md)
- [Upstream merge trial, 23 November 2026](upstream-merge-2026-11-23.md)
- [Lichess integration, 23 November 2026](upstream-integration-2026-11-23.md)
- [README feature captures](screenshots/README.md) and other
  [screenshots](screenshots)

## Retired prototype

The first Node/Fastify prototype is stopped and is not the current site.

- [Prototype source and history](../archive/node-prototype/README.md)
- [Prototype architecture](../archive/node-prototype/architecture.md)
- [Prototype runbook](../archive/node-prototype/operations.md)

## Additional reference pages

These include preserved links to moved records and detailed comparison or decision pages.

- [Source combinations 00–07](arrow-behavior/agreements-1.md)
- [Source combinations 08–15](arrow-behavior/agreements-2.md)
- [Source combinations 16–23](arrow-behavior/agreements-3.md)
- [Source combinations 24–31](arrow-behavior/agreements-4.md)
- [Matching-piece geometry and tapering examples](arrow-behavior/geometry.md)
- [Capture and input QC](arrow-behavior/qc-review.md)
- [Original Qh6 overlap and badge palette examples](arrow-behavior/reported-and-badges.md)
- [Existing Mute preferences and native hand-offs](arrow-behavior/settings.md)
- [Qh5 below the Qh6 agreement](arrow-behavior/shorter-maia.md)
- [One-time p95 anchor correction and cross-speed priors](bot-rating-adjustment.md)
- [Brilliant detection with the site's engine](brilliant-native-review-validation.md)
- [First public bot trial — October 30, 2026](data/bot-trials/r20261030a/README.md)
- [Second public bot trial — October 30, 2026](data/bot-trials/r20261030b/README.md)
- [Third public bot trial — October 30, 2026](data/bot-trials/r20261030c/README.md)
- [Applied bot rating anchor correction](data/rating-anchor-applied-2026-10-30/README.md)
- [Draft rating-adjustment preview — October 30, 2026](data/rating-anchor-draft-2026-10-30/README.md)
- [October31 strength experiment qualification](data/strength-experiment-2026-10-31/README.md)
- [Owner decision record: analysis and learning](decisions/analysis-and-learning.md)
- [Owner decision record: arenas](decisions/arenas.md)
- [Owner decision record: bot pool and research](decisions/bot-pool-and-research.md)
- [Owner decision record: identity and interface](decisions/identity-and-interface.md)
- [Owner decision record: native and release](decisions/native-and-release.md)
- [Native bot rating and capacity trial](native-bot-trial.md)
- [Overnight bot rating establishment (#163)](overnight-rating-establishment.md)
- [Sampling evidence and the original rating priors](sampling-reference-audit.md)
- [Upstream integration browser checks](screenshots/upstream-2026-11-23/README.md)
- [Exact-pin review captures](screenshots/upstream-review-2026-11-23/README.md)
- [Continuous Maia strength experiment (#137)](strength-experiment.md)
- [Pre-registered effective-configuration CV correction (#144)](strength-secondary-analysis.md)
- [Validation continuation timing amendment (#147)](strength-validation-continuation.md)
- [Budget VPS sizing — October 30, 2026](vps-sizing.md)
