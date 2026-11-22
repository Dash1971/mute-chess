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
companion PR here to bump `deploy/lila/native-pin.json`, regenerate the patch,
and carry integration/documentation changes. The companion PR closes the issue.
Adapter-only changes still need only a PR here.

## The phase-1 compatibility patch

The three pin fields are `repository`, `commit` and `upstreamBase`, with full
commit SHAs. Generate the committed compatibility artifact with:

```sh
python3 deploy/lila/export-patch.py \
  --output deploy/lila/patches/lila-nostr-maia.patch
```

The exporter checks out the pinned commit in a temporary directory, resets only
that disposable checkout's index to the upstream base, and calls the existing
`native-source.patch_for` serializer. It does not reset or modify the caller's
checkout. `--source /path/to/native/repository` reuses commits fetched by CI or
an offline check; that repository must contain both pinned commits.

CI exports the pinned fork and compares the output byte for byte with the
committed patch before building/testing the native UI. The existing native
Scala check continues to apply that generated compatibility patch in phase 1.
The installer, release scripts, departure register, `RELEASE.json` and monitor
identity are unchanged. A direct fork-based build/release contract is separately
scoped in #364; this PR neither deploys nor changes the running application.

## One explicit metadata exception

The owner approved adding `.github/workflows/mute.yml` while preserving every
application file. A repository containing that extra file necessarily has a
different overall Git tree hash. For application equality, remove **only that
path from a temporary Git index**, then compare the resulting tree hash with
the original application tree. The exporter omits exactly that test file;
other `.github` files remain part of the comparison. It refuses the exception
if a future upstream base already owns the same path.

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
approved test file. The exported patch must retain SHA-256
`916d236030f7ec0467fe27b90485d0d8a8c73bcc2d7cd302d8e32cb1e7cbe2a5`.

The [snapshot mapping](data/native-fork-phase1-2026-11-23.json) records every
original/imported commit, tree and patch checksum. This is snapshot-level history,
not a claim that mixed changes within old PRs were split into new feature commits.
No current upstream merge, semantic refactor, data extraction, engine build or
live release is part of this bootstrap.
