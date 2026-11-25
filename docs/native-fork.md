# Native source in the Lila fork

Native application source lives in [Dash1971/lila](https://github.com/Dash1971/lila),
with the exact fork commit and upstream base selected by Mute's native pin.
The [upstream policy](upstream-alignment.md) defines the maintained departures;
[implementation history](records/docs398-native-fork-history.md) retains the
completed move from patch snapshots into ordinary Git history.

## Source and review

- Native `main` holds the Mute application. Preserve its history: no rebasing or
  force-pushing deployed commits.
- Native `master` is an untouched upstream mirror, advanced only by fast-forward.
  Upstream arrives by merge into native `main`; urgent security backports use
  `git cherry-pick -x`.
- New native behavior belongs in the existing NoSweat namespaces. Keep upstream
  edits to small hooks; avoid moving or reformatting unrelated upstream code.
- The adapter, deployment, docs, datasets and small WebSocket/Redis/GIF patches
  stay in `mute-chess`.

For a native feature, open an issue here and a native PR against the fork's
`main`, referencing that issue. After native review/checks/merge, open the
companion PR here to bump `deploy/lila/native-pin.json` and carry integration/documentation changes. The companion PR closes the issue.
Adapter-only changes still need only a PR here.

The fork improves three-way merging and review; conflicts still need human
decisions. `cherry-pick -x` records a fix's source, rather than guaranteeing a
conflict-free later merge. Upstream changes remain separate reviewed work.

## Pinned builds and releases

The pin contains exactly `repository`, `commit` and `upstreamBase`, with full
commit SHAs. Build directly from that fork commit. Current release metadata,
build evidence and both security verification readers identify native source
with `nativeCommit` and `nativeTree`. The reviewed security inventory records
the fork repository/commit/tree alongside the original upstream base and
unchanged backport decisions.

Builds check out the pinned fork with `native-fork.py checkout`, rather than
applying the large patch. `native-fork.py verify` requires that exact HEAD and
rejects tracked, staged or untracked source changes. Git-ignored native build
output remains governed by upstream's ignore rules. The only additional allowed
status entries are:

- Untracked `public/nosweat/nostr.js`, checked against the matching browser build.
- Untracked files in `public/nosweat/analysis/`, checked by the existing complete
  source/download-pin asset verifier.
- The two downloaded standard-chess networks listed in `native-fork.py`, whose
  contents must match the pinned commit's LFS SHA-256 and size. Other network
  edits, staged network changes and symlink replacements fail.

Generated `ui/@types/lichess/i18n.d.ts` is **not** an ignored source edit. The UI
build retains its generated declaration as evidence, validates its Mute keys
against the native source catalog and the unchanged bootstrap declarations, then
restores that one generated file before source verification. Before each UI
build, remove this checked bootstrap file so Lila regenerates the types even
when its translation JavaScript cache is warm. Unexpected edits
fail instead of being reset. The generated `conf/version.conf` is already ignored
by upstream; runtime configuration and secrets remain outside Git/source archives.

The installer checks the pin, clean source status and `nativeCommit`/`nativeTree`
against release metadata. The security classifier requires matching full commit
and tree IDs in the release, real build verification and reviewed inventory;
missing identities fail. The collector already carries complete metadata and
needs no code change. All other classifier predicates, advisory decisions,
schedules, control hashes and isolation remain unchanged.

Release assembly stages `public/nosweat-roster.json` and
`public/nosweat-bot-aliases.json` from the adapter into the assembled release,
after native source verification. They are runtime data, not native Git source.
The installer uses `lila-adapter/stage-catalog.mjs` and verifies both outputs
against the canonical adapter inputs. The existing native source guard gains
no additional exceptions. For private tests running directly from a checkout,
stage these two files after building and verifying source, then remove the
generated files after stopping the fixture stack before verifying source again.

`nativeTree` is the fork commit's complete Git tree, including the approved CI
file; application equality retains the single metadata exception described below.
The departure inventory reads the pinned base-to-fork Git diff, excluding
only the approved workflow, while retaining every exact application path and
rationale. The footer source package includes `git archive` output of the fork,
the matching Mute main tree, and the retained small patches. Historical releases keep
all original receipts. Git history retains the bootstrap compatibility
artifact; current builds and release verification use the fork identity.

## Metadata and historical migration

Only `.github/workflows/mute.yml` is excluded from the application-departure
inventory as approved metadata; it remains part of the complete `nativeTree`.
Other workflow paths are not exempt. Review the exception if upstream gains the
same path. The fork keeps native UI/Scala checks, and its pinned Mute companion
supplies integration fixtures rather than overwriting native source.

The completed migration and 107 imported snapshots are retained in
[bootstrap history](records/docs398-native-fork-history.md#bootstrap-evidence),
with the original commit/tree/checksum mapping and compatibility-release evidence.
They are historical provenance, not a current release hold.

## Small rendering hooks

The focused navigation, profile actions, homepage and Mute organization metadata
live in NoSweat-owned renderers. Upstream entry points delegate to them in Mute
mode and retain upstream implementations otherwise. Moving the renderers does
not change their active markup, labels, routes, translations or preferences.
This limits future upstream conflicts to the entry hooks; independent Mute
renderers still need comparison when upstream behavior changes.

## Reviewed feature boundary

`conf/noSweatFeatures.json` in the native fork lists reviewed method, path and
native action triples. In Mute mode the existing HTTP request handler rejects
unlisted actions before execution. Missing metadata also fails closed, except
for the handler-owned signup redirects, pool-only refusals and OPTIONS responses.
Denials retain native error pages and filters; upstream mode remains intact. A new upstream
action does not become public merely by falling under an existing URL prefix.
The existing gateway policy remains the outer boundary, including private-route
blocks and translated notices for unsupported links.

The companion's gateway-parity regression checks the reviewed native entries
against `public-surface.mjs` and the pinned native route declarations, catching
stale entries and disagreement. The gateway module is staged beside the gateway
by the existing installer. These source checks are not runtime or browser-test
evidence. Existing controller-level authentication, Arena owner checks and
admission rules remain authoritative; the allowlist grants no permission itself.

<details>
<summary>Historical section links</summary>

<a id="pinned-builds-and-releases-364"></a>
- [Pinned builds and releases (#364)](records/docs398-native-fork-history.md#pinned-builds-and-releases-364)

<a id="staged-migration-evidence"></a>
- [Staged migration evidence](records/docs398-native-fork-history.md#staged-migration-evidence)

<a id="one-explicit-metadata-exception"></a>
- [One explicit metadata exception](records/docs398-native-fork-history.md#one-explicit-metadata-exception)

<a id="bootstrap-evidence"></a>
- [Bootstrap evidence](records/docs398-native-fork-history.md#bootstrap-evidence)

<a id="small-rendering-hooks-366"></a>
- [Small rendering hooks (#366)](records/docs398-native-fork-history.md#small-rendering-hooks-366)

<a id="reviewed-feature-boundary-366"></a>
- [Reviewed feature boundary (#366)](records/docs398-native-fork-history.md#reviewed-feature-boundary-366)

</details>
