# Public native deployment

## Release order

For a first local installation, start with the [installation guide](../../docs/installation.md). This document describes the existing host-specific public deployment.

Use one permanent branch: `main`. Open a short-lived PR, review it, pass GitHub checks, merge on GitHub, and only then deploy. Run `python3 deploy/public/verify-main.py` from a clean checkout of the current main commit. It rejects feature branches, dirty trees and main revisions without a successful push workflow. Check out the native commit in `deploy/lila/native-pin.json`, verify its clean
source status, and rebuild the native app and full UI from that fork; partial UI builds do not update the asset manifest.

A release must carry RELEASE.json with `gitCommit`, `branch: "main"`, and
`sourceVerified: true`. The installer verifies the pinned native HEAD/tree and
clean source status, the Mute archive's embedded main commit, and the complete
browser/analysis asset pins before activation. RELEASE.json records
`nativeCommit` and `nativeTree`. Preserve the merged commit and verification
metadata in the public corresponding-source archive. Confirm the live
X-NoSweat-Revision header after deployment. Delete merged feature branches.
Never activate a feature branch and merge it later.

## Security verification is a release completion requirement

Every deployment must refresh the current-release security verification, including UI/style-only changes with unchanged dependencies. After activation, verify the actual libraries, compiled sanitizer and private runtime/backport fingerprints against the maintained inventory and the matching real build receipt. Preserve historical receipts. Record the active commit, native fork commit/tree, inventory hash, verification time and source evidence in `corresponding-source/SECURITY_VERIFICATION.json`, with the same current record at the existing `corresponding-source/SECURITY279_BUILD.json` report-reader path. Follow [the record format and completion check](../../docs/security-maintenance.md#every-deployment-completion-check).

Use the existing host-monitor planned-maintenance wrapper for the cutover and declare `/opt/nosweatchess/current/RELEASE.json` as the expected change. Confirm its release fingerprint is accepted and no other control-file or isolation drift is present before completion. A missed earlier release must be verified against approved source/build/runtime evidence before a scoped release-only baseline approval; never reset unrelated intrusion baselines.

Run the existing OpenClaw collector/classifier against the active release and confirm `inventory_verified` is true before declaring deployment complete. A changed application revision requires fresh verification even when all security versions are unchanged; changed security inputs require an inventory/applicability update too. Do not alter report predicates, schedules or unrelated intrusion-monitor baselines to make this check pass. Keep original build provenance and unresolved advisories truthful.

## Runtime and payload

The native Maia/Nostr application is deployed publicly at `mutechess.org`. See
[the rebrand notes](../../docs/records/mute-chess-rebrand-2026-10-29.md) for the cutover history.
This is a separate runtime from the private development stack and the retired
Node prototype. Codex assisted implementation and automated verification; no
human manual acceptance or upstream contribution is claimed.

`install.py PAYLOAD` runs as root on the dedicated Ubuntu host. It creates the
separate `nosweat-{gateway,app,ws,adapter,mongo,redis,gif}` service accounts,
root-owned releases under `/opt/nosweatchess`,
separate secrets under `/etc/nosweatchess`, and data under `/srv/nosweatchess`.
Prepare/build the pinned sources using `../lila/README.md`. Include
`mute-chess.tar` from `git archive --format=tar <verified-main>`; its embedded
commit must match RELEASE.json. The source footer archive contains that Mute
tree, `lila-native.tar` from the fork commit and the retained small patches.
The payload includes
the remaining small patches, adapter code with `npm ci --omit=dev`, the public club assets,
gateway, installer, pinned Python requirements (copy `lila-adapter/requirements.txt`
to `PAYLOAD/requirements.txt`), BUILD.md, LICENSE,
THIRD_PARTY.md, the complete `third-party` directory and deployment scripts.
Include the pinned renderer artifact at `PAYLOAD/gif-renderer`, with official
source, exact moss-theme overlay and verified build receipt described in
[gif-renderer.md](gif-renderer.md). Keep the renderer build receipt with the matching release.
Renderer build and installation follow the owner's current release authorization;
this guide does not lift any active hold. The October 31 study restriction remains
recorded in the [dated owner decision](../../docs/decisions/analysis-and-learning.md#native-analysis-board-export-and-initial-import-october-31-2026).
Include `design/quiet-signal` and `design/logo-explorations/final` (excluding
`node_modules` and Python environments). The installer checks for the brand sources
before preparing a release and includes them with the corresponding-source archive.
The installer copies staged Java libraries and builds an independent Python
environment. The external model is SHA-256 verified. Keep keys and data out of
the payload and source archive.

Managed catalog data comes from the payload's `lila-adapter`: the installer
runs `stage-catalog.mjs` on the assembled release, then verifies both generated
JSON files against those same canonical inputs. Source-only native builds stay
clean; the fork no longer contains a second roster or alias map. Custom release
packaging must perform the same stage/verify calls on its assembled `lila` root
before activation. Missing or invalid runtime catalog files fail closed before
managed-bot initialization. This changes file delivery, not account IDs, names,
playing policies, seeding, earned ratings or history.

The fresh Mongo database is `nosweat` on loopback port 27019. Apply upstream
`lila/bin/mongodb/indexes.js` and this directory's guarded `indexes.js` before
accepting logins. Redis is on 16380. Native HTTP/WS/adapter ports are
29663/29664/29665; the gateway is 29660 and renderer is 6175. All listeners bind loopback. Seven
`nosweatchess-*` system services use restart-on-failure, memory limits, a read-only
release, restricted writes and loopback-only network access. Enable them for boot.
The existing Cloudflare connector is a separate service and owns tunnel credentials.

## Service isolation and migration

Stop the complete public stack in a checked maintenance window before running
the installer. It refuses to reassign ownership while any public service is active.
`service-isolation.py` owns the shared account, file and systemd network policy;
the installer uses the exact same module. It may also be applied as a configuration
migration to an existing application release after review/checks/merge on main.
Record the operations commit separately from the unchanged application RELEASE.json.

Each service has a distinct non-login identity. Only Mongo and Redis receive
persistent write paths, confined to their own directories. The gateway has no
configuration/secret access; the adapter receives its environment through systemd
and can read the model but cannot read the application/session secrets. The app
and WebSocket services receive separate configuration, and the latter gets only
its own signing configuration. Backup key/storage remain root-only.

The `nosweatchess-isolation` unit atomically loads only its own nftables table;
it does not replace UFW rules. It is required by the seven services and by the
Cloudflare connector at boot. Established connections/replies are allowed.
New connections from each identity are limited as follows:

| Identity | New outbound connections |
| --- | --- |
| Gateway | Loopback native HTTP 29663 and WebSockets 29664 |
| Application | Loopback Mongo 27019, Redis 16380, adapter 29665 and renderer 6175 |
| WebSockets | Loopback Mongo 27019 and Redis 16380 |
| Adapter | Loopback native HTTP 29663; HTTPS only to the installer-resolved Wallet of Satoshi/Living Room of Satoshi addresses; local stub DNS |
| Mongo / Redis | None; replies to clients remain allowed |
| GIF renderer | None; replies to application clients remain allowed |
| Cloudflare connector | Loopback gateway 29660, local stub DNS, Cloudflare tunnel endpoints on 7844 |

New connections to the public databases are rejected from other local identities,
including private development processes; root keeps an administration path. The
private adapter and GIF renderer accept new connections only from the app or root. This phase
enforces the local database boundary through Linux UIDs/network policy; it does
not add database passwords or per-collection database roles. App and WebSocket
services retain the database access required by native Lichess, including seen-at
updates. Kernel/root compromise and abuse through an authorized app connection
remain outside that boundary.

Before migration, block new admissions, verify zero active Maia admission records and zero active native games (`game5` statuses 10/20, including friend invitations that became games), stop app writers
and make a consistent encrypted database/configuration rollback snapshot. Keep
the previous units, file ownership and configuration for rollback. Verify the
account/access matrix, nftables persistence and successful real native Maia/Nostr
play, WebSocket reconnect, analysis, PGN and source delivery after migration.
Do not mark a live game finished merely to make maintenance proceed.

The gateway handles HTTPS-origin forwarding, same-host static assets, native
WebSocket upgrades and the corresponding-source download. It blocks internal
adapter routes and unrelated Lichess surfaces. Tunnel ingress routes only the
apex and www to the loopback gateway; www redirects to the apex. Preserve mail
records. Production Nostr challenges sign `https://mutechess.org/club/login`.
The adapter uses `PUBLIC_ORIGIN` for these signatures and the native Host header,
while `LILA_ORIGIN` remains loopback.

`backup-crypt.mjs encrypt INPUT OUTPUT` uses AES-256-GCM with a root-only
32-byte `/etc/nosweatchess/backup.key`. Decryption authenticates the complete
archive before releasing plaintext. Keep the key owned by `root:root`, mode
`0600`; run the backup tooling as root. Backup and restore-staging directories
must be owned by `root:root`, mode `0700`, with backup files mode `0600`.
The website service account must not read the key, list backup files or delete
backups. The installer preserves this boundary on subsequent deployments and
only grants group read access to explicitly listed runtime configuration files.
Use verified Mongo database tools, an
operator-controlled maintenance window and restricted temporary files for
`mongodump --archive --gzip --db nosweat`. Encrypt, copy ciphertext off-host and
keep a separate protected off-host key. Restore only to an explicitly isolated
test namespace, verify documents/indexes, then remove test data and plaintext.
Never overwrite the live database during a restore test. Regular backup copying
and restore drills require ongoing operations; an initial snapshot alone does
not provide continuous disaster recovery.

### Live release gates and rollback

All live checks that can accept or reject a release must be committed and merged
**before** maintenance. Never add or change a check during the window. Before
pausing admissions, run the same checks against the currently serving release,
with an expected pass or fix-specific fail written down for each. Resolve an
unexpected baseline result before opening the window; do not drop a required
security check to proceed.

**Critical:** app/WebSocket/adapter/gateway health, sign-in, authorization matrix,
data continuity, a real game advancing, and deployed commit/tree/class hashes.
**Advisory:** all other checks, including page content and metadata. Record and
resolve advisory failures after the window; they cannot hold admissions or
trigger rollback. Reopen admissions as soon as the critical gates pass. Complete
non-disruptive security verification publication and the fresh
`inventory_verified=true` collection with games open. The release is complete
only when those security requirements also pass.

Use the [committed checks and baseline instructions](live-checks/README.md).
For a globally drained site, game progress is confirmed immediately after
reopening; it is not a reason to wait for a game while admissions are closed.
Before rollback, name the failed critical check and record evidence that the
application is at fault, excluding a checker defect. Never roll back a security
release for an advisory failure or a suspected test defect.

Read-only release rollback: stop app/WS/adapter/gateway, select the previous
known-good `current` symlink, then restart. Review schema compatibility first.
Drain games before planned restarts. At application startup, unfinished managed
Maia games are voided with `application_restart`; an unplanned restart therefore
does not resume those games. Never fabricate results or reset game records.
Inspect `journalctl -u nosweatchess-app` and the other units; HTTP request logging
is disabled. The public source archive includes the exact native fork and Mute Git trees,
remaining small patches, build instructions and licenses, but no accounts,
keys or backups.

For product behavior and current capacity, see the [site manual](../../docs/site-manual.md)
and [bot activity guide](../../docs/public-bot-activity.md).

## Browser analysis assets

Run `python3 deploy/lila/prepare-analysis.py /path/to/lila` from the verified main checkout before the full UI/native build. It copies `analysis/browser` and verifies both Maia model exports plus ORT Wasm against the checked-in pins. Keep these generated downloads out of native Git. The release payload must include `analysis/`; the installer compares every built browser asset against the main source/download pins before activation, and distributes the analysis sources/references with corresponding source.

For user-facing behavior, see the [site manual](../../docs/site-manual.md),
[analysis settings](../../docs/analysis-presentation.md),
[arrows](../../docs/arrow-behavior.md) and
[Brilliant detection](../../docs/brilliant-moves.md). These are the maintained
feature descriptions; this deployment guide does not define a separate policy.

## Native puzzles

The full official CC0 catalog is external to the release payload. Set
`MUTE_PUZZLE_ARCHIVE` to the downloaded, pinned `.csv.zst` when invoking the
standard installer. It verifies that archive before preparing the release, then
imports it with the installed native Chessops validator and Lichess path generator.
See [the catalog import procedure](../../puzzles/README.md) for the snapshot,
streaming validation and preservation rules. The installer installs the native
hourly refresh in system cron, sharing the existing maintenance lock; Mongo uses
a 2 GB cache within the owner-approved 5 GB memory limit.
Existing earned puzzle ratings, votes, rounds and user progress are retained.
The native web training, theme, history and difficulty routes are exposed;
unrelated mobile-batch, coordinate and embedded-frame surfaces remain outside
the public boundary. Review assistance remains gated until solving has ended.

## Feature references

[Nostr account behavior](../../docs/nostr-sign-in-backup.md) and
[Lightning support](../../docs/lightning-patrons.md) are maintained in their
feature guides. The private account-security regression requires an explicitly
isolated fixture; it is not a command to test an existing public account.

## Security version inventory

At release preparation, update `docs/security-inventory.json` for changed runtimes, pins or overrides, and verify it against staged jars/locks and the running services after activation. OpenClaw reads the deployed copy at `/opt/nosweatchess/current/corresponding-source/docs/security-inventory.json` together with the active `RELEASE.json`. Follow [the advisory review instructions](../../docs/security-maintenance.md); private Redis and Python environments are maintained separately from host APT.
