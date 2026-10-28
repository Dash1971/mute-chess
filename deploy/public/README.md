# Public native alpha

The owner authorized deploying nosweatchess.org after the native Maia/Nostr slice.
This is a separate runtime from the private development stack and the retired
Node prototype. Codex assisted implementation and automated verification; no
human manual acceptance or upstream contribution is claimed.

`install.py PAYLOAD` runs as root on the dedicated Ubuntu host. It creates the
`nosweatchess` service account, root-owned releases under `/opt/nosweatchess`,
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

The gateway handles HTTPS-origin forwarding, same-host static assets, native
WebSocket upgrades and the corresponding-source download. It blocks internal
adapter routes and unrelated Lichess surfaces. Tunnel ingress routes only the
apex and www to the loopback gateway; www redirects to the apex. Preserve mail
records. Production Nostr challenges sign `https://nosweatchess.org/club/login`.
The adapter uses `PUBLIC_ORIGIN` for these signatures and the native Host header,
while `LILA_ORIGIN` remains loopback.

`backup-crypt.mjs encrypt INPUT OUTPUT` uses AES-256-GCM with a root-only
32-byte `/etc/nosweatchess/backup.key`. Decryption authenticates the complete
archive before releasing plaintext. Use verified Mongo database tools, an
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

All games are unrated with a two-game global cap. The 44 bot priors are estimates.
NIP-07 desktop signer support is implemented; NIP-46 and private-key import are
not. Full branding, augmented analysis and capacity calibration remain work.
