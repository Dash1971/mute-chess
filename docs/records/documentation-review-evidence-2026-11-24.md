# Documentation review: read-only release evidence

Observed November 24, 2026 (JST) while reviewing issues #385–#387. This record
supports documentation corrections; it does not deploy code, change services,
update host/reference inventory or claim a fresh security-classifier run.

## Active release

The active `/opt/nosweatchess/current/RELEASE.json` and its matching
`corresponding-source/SECURITY_VERIFICATION.json` were read over the existing
authorized SSH connection. The release identifies:

- Mute main: `bc226308e6b7c77801dc3d120b5b34872a8fa0c9`.
- Native commit: `a372615f8a1fe3f6d48ba60913c44d7b6b40da48`.
- Native tree: `8ca5466297355f02cd67ec71726bb8abcc498839`.
- Upstream base: `b071608bc4ce71b31cda36ffa493100e3dc3580f`.
- Security verification timestamp: `2026-11-23T13:11:26.550090+00:00`.
- Release identity uses `nativeCommit`/`nativeTree`; the retired patch field is absent.

The matching verification records fast-xml-parser **5.12.0** as an installed
translation-generation **build dependency**, with frozen installation passed:

| Evidence | SHA-256 |
| --- | --- |
| Installed package metadata | `e969a1a5662a99171542a6380d7640ab5bd69c47d84a14f3ff25ba03e6d98f05` |
| Native bin manifest | `fa51ddfa23140257013b9c5f0033fb0ce06ee588a9d01c080c14bdf1e5a3bf84` |
| Native lock | `17ea39b026fbe5c6c440042e14bce31a217665cc9bd9b41536720f46c29e21dd` |

It also records `tournamentExportVisibilityVerified`,
`relayAddressValidationVerified`, `moderatorOAuthTotpVerified`,
`chatTimeoutPropagationVerified` and `structuredDataEscapingVerified` as true.
These are retained verification results, not checks rerun during this review.
[PR #382's deployment receipt](https://github.com/Dash1971/mute-chess/pull/382)
and the [November 23 baseline](../../deploy/public/live-checks/README.md#observed-baseline)
record the runtime/monitor checks and fresh classifier acceptance at that time.
The Racer advisory remains mitigated by gateway denial, not claimed patched.

## Source and public-profile checks

At the pinned native commit, `app/NoSweatBotCatalog.scala` reads both catalog
paths with `Files.readString`; `app/NoSweatService.scala` supplies
`public/nosweat-roster.json` and `public/nosweat-bot-aliases.json`. There is no
missing-file fallback. This confirms the development installation needs the
existing `stage-catalog.mjs` step.

The public [SignalTrain029 profile](https://mutechess.org/@/signaltrain029)
contained the Elon Musk display alias. This is a representative live alias
check, not a fresh audit of all 350 account records. The canonical mapping is
in `lila-adapter/catalog-aliases.json` in the deployed source.

GitHub's read-only private-vulnerability-reporting endpoint returned
`enabled: true`. Reporter instructions belong in `SECURITY.md`; no security
setting was changed.
