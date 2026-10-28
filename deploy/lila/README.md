# Private Lichess foundation

This is the separate development environment for the native Lila application.
The old Node/Fastify prototype is retired. Maia and NIP-07/NIP-98 Nostr adapters
now connect to native Lila accounts, rounds, clocks and analysis. The separate
public deployment is described in [../public](../public/README.md).

## Sources and tools

- Lila: `lichess-org/lila` at `b551752d2a0e7a63459d9812825d95a633a98737`.
- WebSockets: `lichess-org/lila-ws` at `5089b84b5fe2da3f3e9e69d29363115cfddfc758`.
- Apply `patches/lila-nostr-maia.patch` to Lila and
  `patches/lila-ws-bind-address.patch` to lila-ws. The first adds the club, native
  Nostr accounts/sessions, reserved human-versus-Maia admission and bot moves.
  The second adds configurable `http.host`, preserving the upstream default.
- Java 21 JDK, Node 24.22.1, pnpm 12.9.0 and sbt 2.0.11. Use the checked-in
  dependency lockfiles and the versions selected by each pinned Scala build.
- MongoDB Community 8.0.34 and the host distribution's Redis 8.0.5 packages are
  extracted under the development directory; no shared MongoDB/Redis service is
  reconfigured. MongoDB's archive is SHA-256 checked; sbt's launcher uses Maven's
  published SHA-1 checksum over HTTPS. Record the downloaded tools and lockfiles
  when reproducing this snapshot.
- Stockfish 19's standard-chess small and large networks are downloaded from
  the pinned Lila LFS sources and checked against their full SHA-256 and sizes.
  Networks for unsupported chess variants are not fetched.

Upstream licenses and notices remain in the retained source checkouts. Lila and
lila-ws retain their AGPL licenses; third-party tools/assets retain their own
terms. These scripts and the transport bind patch were authored with OpenAI
Codex assistance. Automated validation is recorded separately from human manual
testing; no upstream contribution or claim of human testing is implied.

## Prepare and build

The scripts target the existing dedicated Ubuntu mini. They use its existing
Node runtime at `/opt/club-maia/node-v24.22.1-linux-x64/bin` without modifying it.
The host needs Java 21 JDK, curl, Git, Python 3, tar, dpkg, xz and unzip. Installing
the JDK and unzip is the only required host package change for this increment.

Keep the two upstream checkouts in an `implementation-sources` directory. Apply
both patches once if starting with unmodified checkouts. Package with
`package-sources.sh SOURCE_DIRECTORY ARCHIVE_PATH`, then extract that archive
into `DEVELOPMENT_DIRECTORY/sources`. The packaging helper suppresses macOS
AppleDouble metadata, which otherwise looks like source files on Linux.

Copy the helpers to the development directory and run as its regular owner:

```sh
bash prepare-host.sh "$PWD"
bash configure.sh "$PWD"
bash build.sh "$PWD" ui
bash build.sh "$PWD" lila
bash build.sh "$PWD" ws
python3 fetch-analysis-nets.py "$PWD"
bash start-private.sh "$PWD" data
export PATH="/opt/club-maia/node-v24.22.1-linux-x64/bin:$PATH"
tools/mongosh/node_modules/.bin/mongosh \
  mongodb://127.0.0.1:27018/nosweat_lila_dev --quiet \
  --file sources/lila/bin/mongodb/indexes.js
bash start-private.sh "$PWD" app
node smoke.mjs
```

`configure.sh` preserves an existing generated secrets file. Do not copy secrets,
database contents, node_modules, build products or engine downloads into Git.
This development configuration is not a production deployment configuration.

## Runtime and access

| Service | Listener | Separate state |
| --- | --- | --- |
| Lila HTTP | `127.0.0.1:19663` | `sources/lila`, generated `conf/application.conf` |
| Lila WebSocket | `127.0.0.1:19664` | `config/ws.conf` |
| MongoDB | `127.0.0.1:27018` | `data/mongo`, database `nosweat_lila_dev` |
| Redis | `127.0.0.1:16379` | `data/redis` |

Forward both application ports through the existing authenticated SSH path.
Open `http://127.0.0.1:19663/analysis`; do not substitute `localhost`, because the
browser and WebSocket origin must agree. Database ports are not forwarded.

Services use transient `systemd --user` units named `nosweat-lila-{app,ws,mongo,redis}`
with memory limits, restart-on-failure and no new privileges. They are not enabled
for boot. They run as the development checkout's owner; production deployment
needs a dedicated service account, read-only release, restricted gateway,
backups, monitoring and a deliberate exposure review.

Inspect with `systemctl --user status nosweat-lila-app` and
`journalctl --user -u nosweat-lila-app`. Stop only these development services:

```sh
systemctl --user stop nosweat-lila-app nosweat-lila-ws nosweat-lila-mongo nosweat-lila-redis
```

## Validation boundary

`smoke.mjs` checks native pages, PGN replay, local assets, WebSocket upgrade and
rejection of an unrelated web origin. It only accepts loopback destinations.
Run the upstream premove, promotion, board-analysis, PGN and evaluation tests:

```sh
cd sources/lila
node ui/test premove promotion boardAnalysis pgnExport nodePGN winningChances
```

The private environment exposes development surfaces and must remain private.
The `../../lila-adapter` sidecar uses `npm ci`, the pinned external model and
`configure-adapter.py`/`start-adapter.sh`. Initialize `lila-adapter/indexes.js`
only on its explicitly guarded development database. Run its Node and Python
tests and `test/integration.mjs`; `--worker-failure` kills only that private
worker and checks native failure handling. Live moves, both clocks/colors,
reconnect, Nostr replay protection, resignation, PGN and crash recovery pass.
The public alpha admits at most two games, one per browser/account. Anonymous games are casual; Nostr accounts use native provisional 1500 and Glicko updates. The native quick-pair grid and custom time controls assign an available opponent within ±200, with no manual challenges. Build `lila-adapter/browser/login.mjs` with `node build-browser.mjs /path/to/lila/public/nosweat/nostr.js` before packaging assets.
The native stacked-premove and browser analysis extensions are documented in `../../analysis/PROVENANCE.md` and `../public/README.md`. Run `prepare-analysis.py` from the main repository to prepare pinned browser assets. Whole-game batch review, persistent computed annotations and capacity calibration remain future work. No ten-game full-stack capacity claim is made.
