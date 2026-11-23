# Lichess integration — 23 November 2026

Candidate implementation for [#365](https://github.com/Dash1971/mute-chess/issues/365):
[native draft PR](https://github.com/Dash1971/lila/pull/1) and
[Mute companion draft PR](https://github.com/Dash1971/mute-chess/pull/372).
Neither PR is merged. No application deployment, live data migration, admission
change or service stop is part of this integration review.

The [original trial and complete conflict inventory](upstream-merge-2026-11-23.md)
remain the historical record. All 48 conflicted paths / 69 hunks are now resolved.
The native merge commit has the real fork `335cc0ac…` and frozen upstream
`b071608b…` as its two parents. Follow-up commits adapt tests and runtime startup.
The companion [pin](../deploy/lila/native-pin.json) records the final candidate;
[the departure register](../deploy/lila/upstream-departures.json) covers its 473
application departures exactly. The native CI workflow remains the sole approved
metadata exception. Rerere records were retained in the task archive.

## Resolution decisions

- Ported home, Insights and OpenGraph hooks to upstream's new locations instead
  of retaining obsolete view implementations. Mute branding, public display
  names, focused navigation, Arena spotlight and native privacy remain.
- Kept Nostr identity/profile handling, flair preservation, IPv6 rate-limit
  bucketing and native request-language selection. Existing Mute strings use
  upstream's new `I18nKey.unchecked` API; wording and translations are retained.
- Retained clock guards, supported modes, managed pairing/admission, configurable
  Maia Arena filling and native disconnect handling. Setup uses upstream's new
  imperative modal, with an explicit close control.
- Retained browser engines, Maia Lab, Brilliant confirmation/provenance, arrow
  geometry/tapering and badges. Internal review metadata captures the selected
  engine before asynchronous work; it does not restore removed upstream public
  metadata fields. UiEnv disables the same unsupported external endpoints through
  upstream's new `AnalyseEndpoints` interface.
- Moved Mute's analysis adapter creation after native engine initialization. A
  private browser check caught the constructor-order regression that compilation
  and existing unit fixtures did not. Initial terminal positions also guard the
  native pre-engine reset. This is a bounded lifecycle adaptation.
- Reconciled manifests first, then regenerated the complete pnpm lock with
  pnpm12.9.0. Translation parser remains exactly5.12.0. All283 Mute generated
  declarations match source XML, and stripping only those declarations reproduces
  upstream's tracked bootstrap exactly. Repeated builds are checked in CI.
- All five previously backported security fixes are in the new upstream ancestry.
  Native authorization, SSRF and Markdown escaping remain. The deep Markdown
  input regression checks escaped HTML on either normal parsing or stack-overflow
  fallback, because the path taken depends on JVM stack size.
- Adapted the public local-review JSON reader to its existing browser/writer
  contract (`nodesPerMove` and `version`). It assigns server-owned unknown
  identity; client-supplied account/fishnet fields are ignored. Three native
  regressions cover valid review, malformed metadata and identity spoofing.
- Staged Lila Netty modules resolve uniformly to4.2.21.Final. Jackson2.18.11,
  jsoup1.23.2, Guava33.7.2-jre and Jakarta Mail1.6.8 remain. The separately pinned
  WebSocket component stays on Netty4.2.19.Final. Inventory changes describe the
  candidate targets, not a verified live installation; a later deployment still
  requires the existing fresh security verification procedure.

## Validation and evidence

The source was built in a task-owned private stack on the existing build host.
It used separate MongoDB/Redis data and loopback ports19663–19665. Immutable engine
assets were referenced from the existing release, not duplicated model archives.
The live release and its services were untouched.

- Full integrated Scala compile and native `stage`: passed.
- Full browser TypeScript, CSS and bundle build: passed.
- Browser unit suite:504 passed,0 failed across38 suites.
- Adapter unit suite:133 passed,0 failed.
- Exact departure-register check:473 Lila paths and7 WebSocket patch paths.
- Private friends/challenge event regression: follow/block, ownership and native
  access rejection, real moves/clocks, resignation/PGN/history, mutual rematch,
  abort, decline and cancellation passed. Its stale assertion was corrected to
  retain the search box already present in the deployed baseline; notifications
  remain hidden.

Private native forum creation/replies, invalid form validation, human–Maia moves
and replies, watcher permissions, private player-URL isolation and finished-game
removal also passed, using the current supported subset of the older community
fixture (which still contained retired study functionality).

Final native CI, browser captures and private-page results are recorded below when
complete. CI links identify the exact tested commit rather than an earlier green
run. No human acceptance testing, live donation payment, full puzzle-catalog
performance run or deployment security verification is claimed by this document.
