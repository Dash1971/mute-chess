# Names used in the technical docs

- **Native:** the Lichess server and browser interface in our
  [Lila fork](https://github.com/Dash1971/lila). The
  [native pin](../deploy/lila/native-pin.json) selects the exact fork commit used
  by a Mute release. Native chess rules, clocks and game history remain the
  foundation; see [the architecture](architecture.md).
- **Companion PR:** the pull request in this repository that follows a reviewed
  change in the Lila fork, updates its source pin and includes related adapter,
  integration and documentation changes. See [the source workflow](native-fork.md).
- **Focused:** Mute's supported subset of Lichess features and navigation. Hidden
  features can remain in the source without being exposed on the site; see
  [the feature boundary](real-time-feature-surface.md).
- **Quiet Signal:** Mute's visual theme: graphite, chalk and mint interface
  colors, with a moss-colored chessboard. See [the design guide](design.md).
- **Departure register:** the [file-by-file list](../deploy/lila/upstream-departures.json)
  of intentional differences from the pinned upstream sources, their reasons and
  verification requirements. It helps reviewers keep upstream merges bounded;
  see [the maintenance overview](maintenance.md#keeping-track-of-every-difference).
- **OpenClaw:** the existing private operations/reporting system that collects
  host evidence and classifies it against the reviewed security inventory.
  `inventory_verified=true` means that collection passed the existing release
  identity/evidence checks; it is not a blanket claim that no vulnerabilities exist.
- **NoSweat / No Sweat Chess:** the earlier project name. Existing namespaces,
  service names, IDs, key stores and paths retain it for compatibility; the public
  brand is Mute Chess. Renaming prose must not migrate stored identities or data.
- **`/opt/club-maia`:** a historical host path for shared runtimes used by existing
  helpers. It is not the active application's release directory.
- **Mini:** the owner's existing Mac mini/Ubuntu build or hosting environment.
  A public contributor can use an isolated supported Ubuntu setup instead;
  see [installation](installation.md).
- **Release A/B:** labels for the completed November 23 native-source identity
  migration, not permanent release channels. A retained both identities; B used
  native commit/tree only. See [migration evidence](native-fork.md#staged-migration-evidence).

The [architecture](architecture.md) and [operations index](operations.md) explain
the current system without requiring these historical names.
