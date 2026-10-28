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
NIP-07 is recommended. Generate/import browser keys are encrypted into IndexedDB with a non-extractable wrapping key; same-origin code can still use them, so an external signer provides better isolation. Keys never go to the server or relays. NIP-46 remains work. The selected violet cyber-rook replaces only the logo; native Lichess styling stays. Augmented analysis, stacked premoves and capacity calibration remain work.

## Restricted monitoring access

After review, merge, checks and `verify-main.py`, run
`install-monitor-access.py --public-key PUBLIC_KEY_FILE --source-ip CONTROLLER_IP`
as root. This installs a separate `nosweat-monitor` identity with root-owned
authorized keys, an exact forced command, disabled forwarding/PTY/RC, and sudo
permission for four fixed operations only. It reloads validated SSH configuration
and systemd unit metadata without restarting chess services. It preserves current
SSH administrators; configuration rollback copies are root-only under `/var/backups`.

The controller keeps its dedicated private key and pins the host key separately.
Do not store either machine's private configuration or credentials in this repo.
The SSH commands are exactly `status`, `logs`, `contain-public`, and
`emergency-poweroff`; shells, additional arguments, SFTP/SCP, arbitrary sudo and
forwarding are denied. Reading a private key is unnecessary: generate it on the
controller and transfer only the public half. The controller source address is
restricted; review/update it deliberately if DHCP changes the controller address.

`status` returns selected service properties, listener addresses, tunnel readiness,
disk/inode availability, raw hardware sensor values, fixed-file hashes, effective
isolation-policy fingerprint (ignoring counters/handles), and latest backup time.
`logs` returns at most 250 service/sudo/security and 250 kernel records from the
last ten minutes, with selected fields and bounded, best-effort-redacted messages.
Treat all messages as untrusted and keep returned logs private. This is a bounded
diagnostic window, not a complete journal shipping/cursor solution; truncation
is reported and an independent collector is required for guaranteed continuity.
It does not add missing HTTP access/security-event instrumentation.

`contain-public` first creates a persistent root-only latch at
`/var/lib/nosweatchess-security/contained`, then stops cloudflared, gateway,
adapter, WS and app. Mongo, Redis, SSH, logging and isolation remain running.
Start conditions on the seven application/data/connector units prevent their
activation while latched; the isolation guard is never gated. `emergency-poweroff`
performs the same containment and requests OS shutdown. These are disruptive
capabilities, even though the account cannot obtain a general root shell.
No restart/unlatch capability is granted. An operator investigates, removes the
root-only latch and starts the approved services manually to restore service.

The installer does not invoke either emergency operation or configure alert
delivery/scheduling. Test allowed reads and denied operations on the live host;
test emergency command construction with mocks and reserve a full stop/reboot
drill for an agreed no-game maintenance window. Keep the monitor's model away
from arbitrary execution credentials and use corroborated evidence for emergency
actions so attacker-written logs cannot directly cause shutdowns.
