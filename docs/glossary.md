# Names used in the technical docs

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
