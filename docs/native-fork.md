# Native source in the Lila fork

[Architecture proposal #362](https://github.com/Dash1971/mute-chess/issues/362)
and [phase 1 #363](https://github.com/Dash1971/mute-chess/issues/363) move our
native application changes from an opaque patch into normal Git history in
[Dash1971/lila](https://github.com/Dash1971/lila). Product behavior and the
[upstream policy](upstream-alignment.md) stay the same.

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

## Pinned builds and releases (#364)

The pin contains exactly `repository`, `commit` and `upstreamBase`, with full
commit SHAs. Build directly from that fork commit. Current release metadata,
build evidence and both security verification readers identify native source
with `nativeCommit` and `nativeTree`. The reviewed security inventory records
the fork repository/commit/tree alongside the original upstream base and
unchanged backport decisions.

Builds now check out the pinned fork with `native-fork.py checkout`, rather than
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
restores that one generated file before source verification. Unexpected edits
fail instead of being reset. The generated `conf/version.conf` is already ignored
by upstream; runtime configuration and secrets remain outside Git/source archives.

The installer checks the pin, clean source status and `nativeCommit`/`nativeTree`
against release metadata. The security classifier requires matching full commit
and tree IDs in the release, real build verification and reviewed inventory;
missing identities fail. The collector already carries complete metadata and
needs no code change. All other classifier predicates, advisory decisions,
schedules, control hashes and isolation remain unchanged.

`nativeTree` is the fork commit's complete Git tree, including the approved CI
file; application equality retains the single metadata exception described below.
For this bootstrap those identities are fork tree
`4e5bf5bb963f86c50451e03590f17eb9d3603658` and application tree
`35f172f31e25747cd4c5370e0950c404f0be1632`.

The departure inventory now reads the pinned base-to-fork Git diff, excluding
only the approved workflow, while retaining every exact application path and
rationale. The footer source package includes `git archive` output of the fork,
the matching Mute main tree, and the retained small patches. Release A keeps
all historical receipts. Git history retains the bootstrap compatibility
artifact; current builds and release verification use the fork identity.

### Staged migration evidence

Release A was deliberately built from the fork with both identities, retaining
the original comparison and unchanged classifier. Before retiring that check,
run the old and new identity checks on the **same deployed Release A**, with
matching reviewed inventory and fresh verification. Release B then drops the
retired field and artifact. Both deployments require normal source/build,
runtime and monitor verification. The [identity-only classifier diff](data/native-fork-phase2-2026-11-23/identity.diff)
records the bounded external change; its collector remains unchanged.

## One explicit metadata exception

The owner approved adding `.github/workflows/mute.yml` while preserving every
application file. A repository containing that extra file necessarily has a
different overall Git tree hash. For application equality, remove **only that
path from a temporary Git index**, then compare the resulting tree hash with
the original application tree. The departure inventory omits exactly that test file;
other `.github` files remain part of the comparison. Review the exception if a future upstream base owns the same path.

The fork workflow retains the existing native UI and Scala checks. Its pinned
Mute companion snapshot supplies the adapter roster and puzzle validator; it
does not supply or overwrite native source. Update that companion reference
through review when the integration fixtures change. Inherited upstream
workflows are disabled through repository Actions settings, preserving their
files for upstream merges.

## Bootstrap evidence

The import replays all **107** first-parent commits on Mute `main` that changed
the native patch, through `910c329fc79286162797e5908a57b2b3b3e97984`.
Every snapshot used upstream base
`b551752d2a0e7a63459d9812825d95a633a98737`; no upstream merge was needed.
All 107 patches applied, with **zero skipped or folded snapshots**. Each imported
commit preserves its original author, author date, committer, committer date and
message, with a `Mute-Chess-Commit: <sha>` trailer for the original Mute commit.

The last imported application commit is
`752d6a9161368be8cfab44d0bb40a68e542bc498`. Its tree is exactly
`35f172f31e25747cd4c5370e0950c404f0be1632`, independently matching the original
pinned Lila plus the patch. The subsequent bootstrap commit adds only the
approved test file. The phase-1 exported artifact retained SHA-256
`916d236030f7ec0467fe27b90485d0d8a8c73bcc2d7cd302d8e32cb1e7cbe2a5`.

The [snapshot mapping](data/native-fork-phase1-2026-11-23.json) records every
original/imported commit, tree and patch checksum. This is snapshot-level history,
not a claim that mixed changes within old PRs were split into new feature commits.
No current upstream merge, semantic refactor, data extraction, engine build or
live release is part of this bootstrap.
