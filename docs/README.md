# Mute Chess documentation

An index of the pages in this folder. New here? Start with the first four.

## Start here

- [Project README](../README.md): what Mute Chess is and what it offers.
- [Feature and site behavior manual](site-manual.md): rules, engine settings,
  the bot pool, reconnecting and Arenas.
- [Install Mute Chess](installation.md): run your own instance from source.
- [How we maintain Mute Chess](maintenance.md): the two repositories, regular
  Lichess merges and security fixes.

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

## Design and decisions

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

- [Brilliant detection with the site's engine](brilliant-native-review-validation.md)
- [Sampling evidence and the original rating priors](sampling-reference-audit.md)
- [Native bot rating and capacity trial](native-bot-trial.md)
- [One-time p95 anchor correction and cross-speed priors](bot-rating-adjustment.md)
- [Overnight bot rating establishment](overnight-rating-establishment.md)
- [Continuous Maia strength experiment](strength-experiment.md), its
  [secondary analysis](strength-secondary-analysis.md) and
  [validation continuation](strength-validation-continuation.md)
- [Budget VPS sizing](vps-sizing.md)
- Trial and reference data: [`data/`](data/)

## Dated records

Kept as written; they are evidence, not current instructions.

- [Missing frontend manifest, 2 November 2026](rca-2026-11-02-missing-frontend-manifest.md)
- [Upstream merge trial, 23 November 2026](upstream-merge-2026-11-23.md)
- [Lichess integration, 23 November 2026](upstream-integration-2026-11-23.md)
- [README feature captures](screenshots/README.md) and other
  [screenshots](screenshots/)

## Retired prototype

The first Node/Fastify prototype is stopped and is not the current site.

- [Prototype architecture](architecture.md)
- [Prototype runbook](operations.md)
