# Release order

Use one permanent branch: `main`. Open a short-lived PR, review it, pass GitHub checks, merge on GitHub, and only then deploy. Run `python3 deploy/public/verify-main.py` from a clean checkout of the current main commit. It rejects feature branches, dirty trees and main revisions without a successful push workflow. Rebuild the native app and full UI from the verified main patch; partial UI builds do not update the asset manifest.

A release must carry RELEASE.json with `gitCommit`, `branch: "main"`, and `sourceVerified: true`. The installer verifies the native working source patch against the main payload before activation. Preserve the merged commit and verification metadata in the public corresponding-source archive. Confirm the live X-NoSweat-Revision header after deployment. Delete merged feature branches. Never activate a feature branch and merge it later.

# Public native alpha

The owner authorized deploying nosweatchess.org after the native Maia/Nostr slice.
This is a separate runtime from the private development stack and the retired
Node prototype. Codex assisted implementation and automated verification; no
human manual acceptance or upstream contribution is claimed.

`install.py PAYLOAD` runs as root on the dedicated Ubuntu host. It creates the
separate `nosweat-{gateway,app,ws,adapter,mongo,redis}` service accounts,
root-owned releases under `/opt/nosweatchess`,
separate secrets under `/etc/nosweatchess`, and data under `/srv/nosweatchess`.
Prepare/build the pinned sources using `../lila/README.md`. The payload includes
both patches, adapter code with `npm ci --omit=dev`, the public club assets,
gateway, installer, pinned Python requirements, BUILD.md, LICENSE,
THIRD_PARTY.md, the complete `third-party` directory and deployment scripts.
Include `design/quiet-signal` and `design/logo-explorations/final` (excluding
`node_modules` and Python environments). The installer checks for the brand sources
before preparing a release and includes them with the corresponding-source archive.
The installer copies staged Java libraries and builds an independent Python
environment. The external model is SHA-256 verified. Keep keys and data out of
the payload and source archive.

The fresh Mongo database is `nosweat` on loopback port 27019. Apply upstream
`lila/bin/mongodb/indexes.js` and this directory's guarded `indexes.js` before
accepting logins. Redis is on 16380. Native HTTP/WS/adapter ports are
29663/29664/29665; the gateway is 29660. All listeners bind loopback. Six
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
it does not replace UFW rules. It is required by the six services and by the
Cloudflare connector at boot. Established connections/replies are allowed.
New connections from each identity are limited as follows:

| Identity | New outbound connections |
| --- | --- |
| Gateway | Loopback native HTTP 29663 and WebSockets 29664 |
| Application | Loopback Mongo 27019, Redis 16380 and adapter 29665 |
| WebSockets | Loopback Mongo 27019 and Redis 16380 |
| Adapter | Loopback native HTTP 29663 |
| Mongo / Redis | None; replies to clients remain allowed |
| Cloudflare connector | Loopback gateway 29660, local stub DNS, Cloudflare tunnel endpoints on 7844 |

New connections to the public databases are rejected from other local identities,
including private development processes; root keeps an administration path. The
private adapter accepts new connections only from the app or root. This phase
enforces the local database boundary through Linux UIDs/network policy; it does
not add database passwords or per-collection database roles. App and WebSocket
services retain the database access required by native Lichess, including seen-at
updates. Kernel/root compromise and abuse through an authorized app connection
remain outside that boundary.

Before migration, block new admissions, verify zero active games, stop app writers
and make a consistent encrypted database/configuration rollback snapshot. Keep
the previous units, file ownership and configuration for rollback. Verify the
account/access matrix, nftables persistence and successful real native Maia/Nostr
play, WebSocket reconnect, analysis, PGN and source delivery after migration.
Do not mark a live game finished merely to make maintenance proceed.

The gateway handles HTTPS-origin forwarding, same-host static assets, native
WebSocket upgrades and the corresponding-source download. It blocks internal
adapter routes and unrelated Lichess surfaces. Tunnel ingress routes only the
apex and www to the loopback gateway; www redirects to the apex. Preserve mail
records. Production Nostr challenges sign `https://nosweatchess.org/club/login`.
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

Read-only release rollback: stop app/WS/adapter/gateway, select the previous
known-good `current` symlink, then restart. Review schema compatibility first.
App or worker restarts void active games rather than fabricate results.
Inspect `journalctl -u nosweatchess-app` and the other units; HTTP request logging
is disabled. The public source archive includes exact upstream trees and our
patches, with build instructions and licenses, but no accounts, keys or backups.

There is a two-game global cap. Anonymous games are casual. Nostr accounts start at native provisional 1500 and use native Glicko ratings; automatic pairing stays within ±200. The 44 bot priors remain estimates, with per-speed provisional seeds. Newly supported speed categories inherit blitz/rapid priors as explicit starting estimates. Existing speed ratings are never reset.
NIP-07 is recommended. Generate/import browser keys are encrypted into IndexedDB with a non-extractable wrapping key; same-origin code can still use them, so an external signer provides better isolation. Keys never go to the server or relays. NIP-46 remains work. The selected Quiet Signal identity uses the MuteChess knight, graphite/mint palette and a native moss board theme. Existing board choices, internal identifiers, storage and deployment origins remain intact; see `design/quiet-signal/README.md`. Capacity calibration remains work; native premove and analysis extensions are described below.

## Browser analysis assets

Run `python3 deploy/lila/prepare-analysis.py /path/to/lila` from the verified main checkout before the full UI/native build. It copies `analysis/browser` and verifies both Maia model exports plus ORT Wasm against the checked-in pins. Keep these generated downloads out of the native patch and Git. The release payload must include `analysis/`; the installer compares every built browser asset against the main source/download pins before activation, and distributes the analysis sources/references with corresponding source.

Stacked premoves are enabled by default in standard live rounds with native premoves enabled. As requested by the owner, feedback is confined to projected pieces and square tints; no enabled label, count, move strip or Clear button is added. Board menu offers native single premoves. The projected board never changes committed state. Escape and right-click cancel the queue; server reload/takeback, socket close/open, game end and leaving the page discard it. Promotion choices are retained per queued move; execution requires current server legal destinations.

Post-game and standalone native analysis offer explicit local Maia startup, 5M/79M model selection, 600–2600 mover/opponent conditioning inputs, optional history, raw legal policy, candidate previews/return, bounded Stockfish comparisons and on-demand rating samples. The move-review button runs the EC/Mobile Maia classifier in an owned cancellable worker, separately from imported PGN glyphs. Standout annotations require the whole decision window to agree in complete exact-depth iterations. Unknown/cancelled values are never filled with a substitute. Full-game review evaluates every mainline position in a separate browser Stockfish queue, publishes Mobile Maia White/Black accuracy and a navigable evaluation graph, then classifies every move. Fast/Balanced/Thorough match Mobile Maia depth/time settings; unsupported standout labels may use a bounded six-search confirmation budget and remain withheld without corroboration. Stop/Resume reuses completed evaluations; navigation preserves the review, while changes to the mainline or quality invalidate it. Incomplete evaluations never produce full-game accuracy; per-move classifier failures are identified explicitly. Maia model/rating/history/arrows and review-quality controls are in Analysis Menu → Settings, saved locally. The native SF switch controls two SF choices and two independent Maia channels (primary input and optional second input, default2400). One top move per Maia is drawn, with Mobile Maia orange/red and blue/light-blue SF colors; agreement becomes one split/composite arrow. Maia shafts never taper. The left-side candidate panel includes the played/SF-preferred moves, separate raw probabilities, bounded missing-candidate SF searches, native preview/return, direct rating input changes and optional on-demand five-sample chart/table spanning600–2600. Computed annotations are session-only and never enter the exported PGN. Persisted reports and calibration remain work.

## Native puzzles

The release includes the pinned CC0 starter catalog and import tooling in corresponding-source/puzzles. The installer verifies and inserts only absent puzzles into the isolated native puzzle database, and refreshes only this catalog's namespaced native selection paths. Existing puzzle ratings, votes, rounds and user progress are retained. The native web training, theme, history and difficulty routes are exposed; unrelated puzzle mobile-batch, coordinate and embedded-frame surfaces remain outside the public boundary. Catalog paths are static and do not require Lichess's production path-regeneration cron. Review assistance is gated until solving has ended, using the native completion/reveal state and engine preference.

## Nostr account settings

Edit profile includes an optional public name, editable after signup. Canonical handles and Nostr identities stay stable. The native header, profile links and game-player views display the public name while using the handle for navigation.

`/club/security` enrolls or disables authenticator 2FA with a fresh action-bound Nostr signature. Login requires a second factor whenever native TOTP is present. Authenticator counters and hashed recovery codes are consumed atomically; five factor attempts are permitted per account per minute. Enrollment/disable revoke existing sessions and establish a new current session. The browser generates the setup secret locally, displays a local QR/manual key, then submits the signed secret and authenticator confirmation. Recovery codes appear once and require the Nostr key to use.

Native session management is available at `/account/security`; password/email and API-token management remain unavailable. Run `node lila-adapter/test/account-security.mjs` against the isolated private stack for disposable-account qualification; `ACCOUNT_TEST_ORIGIN` selects a different origin. The script never uses an existing account and prints no keys, secrets, cookies or recovery codes.
