# Release order

Use one permanent branch: `main`. Open a short-lived PR, review it, pass GitHub checks, merge on GitHub, and only then deploy. Run `python3 deploy/public/verify-main.py` from a clean checkout of the current main commit. It rejects feature branches, dirty trees and main revisions without a successful push workflow. Rebuild the native app and full UI from the verified main patch; partial UI builds do not update the asset manifest.

A release must carry RELEASE.json with `gitCommit`, `branch: "main"`, and `sourceVerified: true`. The installer verifies the native working source patch against the main payload before activation. Preserve the merged commit and verification metadata in the public corresponding-source archive. Confirm the live X-NoSweat-Revision header after deployment. Delete merged feature branches. Never activate a feature branch and merge it later.

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

There is a two-game global cap. Anonymous games are casual. Nostr accounts start at native provisional 1500 and use native Glicko ratings; automatic pairing stays within ±200. The 44 bot priors remain estimates, with per-speed provisional seeds. Newly supported speed categories inherit blitz/rapid priors as explicit starting estimates. Existing speed ratings are never reset.
NIP-07 is recommended. Generate/import browser keys are encrypted into IndexedDB with a non-extractable wrapping key; same-origin code can still use them, so an external signer provides better isolation. Keys never go to the server or relays. NIP-46 remains work. The selected violet cyber-rook replaces only the logo; native Lichess styling stays. Augmented analysis, stacked premoves and capacity calibration remain work.
