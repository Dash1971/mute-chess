# Install Mute Chess

To play, open [mutechess.org](https://mutechess.org/). There is no desktop app
to install. This guide is for running your own local instance from source.

The current helpers target **Ubuntu 24.04 on x86-64, with systemd**. Use a fresh
machine or VM and a regular user with sudo access. The native build allows up to
5 GiB of Java heap, in addition to the memory used by the OS and other services.
Allow disk space for two source trees, dependencies, build output and models.
macOS, Windows and ARM installation are not covered by these helpers.

The running application consists of Lichess/Lila, lila-ws, MongoDB, Redis and the
Node/Python Maia adapter. Stockfish and Maia analysis run in the browser; the
server runs Maia3 79M for opponents. The repository's root Node/PostgreSQL app is
a retired prototype: `pnpm dev` at the root does not start the current site.

## 1. Install host prerequisites and clone the project

Run the commands below in **Bash**, keeping the same shell open so the exported
paths remain available. Run application/build commands as your regular user;
only commands explicitly prefixed with `sudo` need root.

```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates curl git git-lfs openjdk-21-jdk-headless \
  python3 python3-venv build-essential pkg-config unzip xz-utils \
  libatomic1 libgomp1 libjemalloc2 liblua5.1-0 liblzf1

git clone https://github.com/Dash1971/mute-chess.git "$HOME/mute-chess"
export MUTE_REPO="$HOME/mute-chess"
export MUTE_DEV="$HOME/mute-chess-local"
mkdir -p "$MUTE_DEV/tools" "$MUTE_DEV/sources"
git -C "$MUTE_REPO" rev-parse HEAD
```

Keep the printed Mute Chess revision with your installation notes. Its native
patches must be used with the upstream revisions below, not the latest Lila
branches.

## 2. Install the Node and Python runtimes

The existing helpers expect Node at
`/opt/club-maia/node-v24.22.1-linux-x64/bin` and the Python environment at
`/opt/club-maia/venv`. These historical paths are still used by the scripts.
On a fresh host, install the runtimes there:

```bash
cd "$MUTE_DEV/tools"
curl --fail --location --remote-name \
  https://nodejs.org/dist/v24.22.1/node-v24.22.1-linux-x64.tar.xz
curl --fail --location --output node-SHASUMS256.txt \
  https://nodejs.org/dist/v24.22.1/SHASUMS256.txt
grep ' node-v24.22.1-linux-x64.tar.xz$' node-SHASUMS256.txt | sha256sum --check -
sudo install -d /opt/club-maia
sudo tar -xJf node-v24.22.1-linux-x64.tar.xz -C /opt/club-maia

export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="/opt/club-maia/node-v24.22.1-linux-x64/bin:$JAVA_HOME/bin:$PATH"
node --version
java -version

sudo python3 -m venv /opt/club-maia/venv
sudo /opt/club-maia/venv/bin/python -m pip install \
  -r "$MUTE_REPO/worker/requirements.txt"

bash "$MUTE_REPO/deploy/lila/prepare-host.sh" "$MUTE_DEV"
export PATH="$MUTE_DEV/tools/pnpm/node_modules/.bin:$PATH"
```

`prepare-host.sh` downloads the checked sbt launcher and MongoDB archive,
installs the pinned pnpm and mongosh packages, and extracts the distribution's
Redis packages into the local tools directory. It does not require a shared
MongoDB or Redis service. Keep the Python dependency versions in
[`worker/requirements.txt`](../worker/requirements.txt).

## 3. Fetch and patch the native chess applications

```bash
git init "$MUTE_DEV/sources/lila"
git -C "$MUTE_DEV/sources/lila" fetch --depth=1 \
  https://github.com/lichess-org/lila.git \
  b551752d2a0e7a63459d9812825d95a633a98737
GIT_LFS_SKIP_SMUDGE=1 git -C "$MUTE_DEV/sources/lila" checkout --detach FETCH_HEAD
git -C "$MUTE_DEV/sources/lila" apply \
  "$MUTE_REPO/deploy/lila/patches/lila-nostr-maia.patch"

git init "$MUTE_DEV/sources/lila-ws"
git -C "$MUTE_DEV/sources/lila-ws" fetch --depth=1 \
  https://github.com/lichess-org/lila-ws.git \
  5089b84b5fe2da3f3e9e69d29363115cfddfc758
GIT_LFS_SKIP_SMUDGE=1 git -C "$MUTE_DEV/sources/lila-ws" checkout --detach FETCH_HEAD
git -C "$MUTE_DEV/sources/lila-ws" apply \
  "$MUTE_REPO/deploy/lila/patches/lila-ws-bind-address.patch"

bash "$MUTE_REPO/deploy/lila/configure.sh" "$MUTE_DEV"
python3 "$MUTE_REPO/deploy/lila/configure-adapter.py" "$MUTE_DEV"
```

The configuration helpers create local secrets and a shared adapter token
without printing them. Keep `$MUTE_DEV/config` private. Retain its secrets and
data when restarting an existing instance; replacing them is not an upgrade.

## 4. Prepare browser engines and the Maia opponent model

```bash
python3 "$MUTE_REPO/deploy/lila/prepare-analysis.py" "$MUTE_DEV/sources/lila"
python3 "$MUTE_REPO/deploy/lila/fetch-analysis-nets.py" "$MUTE_DEV"

cp "$MUTE_DEV/sources/lila/public/nosweat/analysis/models/79m.onnx" \
  "$MUTE_DEV/data/maia3-79m.onnx"
printf '%s  %s\n' \
  3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010 \
  "$MUTE_DEV/data/maia3-79m.onnx" | sha256sum --check -
```

The browser-asset helper fetches Maia models and ONNX Runtime assets using the
URLs, byte sizes and hashes in
[`analysis/browser/config.json`](../analysis/browser/config.json).
The 79M ONNX file is about 316 MB and is reused for the server opponent worker.
The Stockfish helper verifies the two standard-chess networks against the pinned
Lila Git LFS objects. Model weights are not included in the repository.

## 5. Install the adapter and build the site

```bash
cp -a "$MUTE_REPO/lila-adapter" "$MUTE_DEV/lila-adapter"
cd "$MUTE_DEV/lila-adapter"
npm ci --ignore-scripts
node build-browser.mjs "$MUTE_DEV/sources/lila/public/nosweat/nostr.js"

bash "$MUTE_REPO/deploy/lila/build.sh" "$MUTE_DEV" ui
bash "$MUTE_REPO/deploy/lila/build.sh" "$MUTE_DEV" lila
bash "$MUTE_REPO/deploy/lila/build.sh" "$MUTE_DEV" ws
```

Build the **complete UI**: a partial component build does not refresh every
asset or the complete manifest. Keep the adapter's roster/configuration files
and the matching native patch from the same Mute Chess revision.

## 6. Start the local databases and import the bundled content

Run from a normal logged-in Ubuntu user session with a working
`systemctl --user`. The helpers use transient user services.

```bash
bash "$MUTE_REPO/deploy/lila/start-private.sh" "$MUTE_DEV" data

export MUTE_MONGOSH="$MUTE_DEV/tools/mongosh/node_modules/mongosh/bin/mongosh.js"
export MUTE_DATABASE=mongodb://127.0.0.1:27018/nosweat_lila_dev

"$MUTE_MONGOSH" "$MUTE_DATABASE" --quiet --eval 'db.runCommand({ping:1}).ok'
"$MUTE_MONGOSH" "$MUTE_DATABASE" --quiet \
  --file "$MUTE_DEV/sources/lila/bin/mongodb/indexes.js"
"$MUTE_MONGOSH" "$MUTE_DATABASE" --quiet \
  --file "$MUTE_DEV/lila-adapter/indexes.js"

mkdir -p "$MUTE_DEV/puzzle-catalog"
export MUTE_PUZZLE_ARCHIVE="$MUTE_DEV/puzzle-catalog/lichess_db_puzzle.csv.zst"
curl -fL --retry 2 -o "$MUTE_PUZZLE_ARCHIVE" \
  https://database.lichess.org/lichess_db_puzzle.csv.zst
python3 "$MUTE_REPO/puzzles/import.py" "$MUTE_DATABASE" --mongosh "$MUTE_MONGOSH" \
  --archive "$MUTE_PUZZLE_ARCHIVE" --work-dir "$MUTE_DEV/puzzle-catalog" \
  --chessops "$MUTE_DEV/sources/lila/node_modules/.pnpm/chessops@0.15.1/node_modules/chessops"
python3 "$MUTE_REPO/learning/import.py" "$MUTE_DATABASE" --mongosh "$MUTE_MONGOSH"
```

If the initial ping fails while MongoDB is starting, wait for it to become
ready and rerun the ping before continuing. The repository already contains the
small pinned puzzle fixture and the licensed practice subset. Normal puzzle
installation downloads the pinned full official export; the importer verifies
its checksum and legal solutions before inserting missing records and generating
native randomized selection paths. See [puzzle data and hourly native path
refresh](../puzzles/README.md). Importers preserve existing progress and earned
ratings; do not run upstream's destructive development database seeder.

Your instance has its own database and bot accounts. The live site's earned
bot ratings, games and human accounts are not part of a source installation.

## 7. Start the application and open it

```bash
bash "$MUTE_REPO/deploy/lila/start-private.sh" "$MUTE_DEV" app
curl --fail --max-time 120 http://127.0.0.1:19663/club/roster --output /dev/null
bash "$MUTE_REPO/deploy/lila/start-adapter.sh" "$MUTE_DEV"

node "$MUTE_REPO/deploy/lila/smoke.mjs"
```

First startup provisions the managed roster, which can take time. If the
readiness request fails or times out, inspect the app log before retrying.
Open **http://127.0.0.1:19663/** in a current browser. Use that address
consistently; replacing it with `localhost` changes the origin used by login
and WebSockets. Create a disposable Nostr identity or play anonymously to check
that a bot responds. Keep the generated nsec backed up if you intend to retain
the account.

The smoke check verifies pages, local assets, PGN replay, the WebSocket handshake
and rejection of an unrelated origin. It does not play a game or certify a
public deployment.

If Ubuntu runs on another machine, forward **both** browser-facing ports:

```bash
ssh -N -L 19663:127.0.0.1:19663 -L 19664:127.0.0.1:19664 user@your-host
```

Then use the same `http://127.0.0.1:19663/` address on your own computer. MongoDB
and Redis stay on the Ubuntu machine and need no forwarded ports.

## Logs, stopping and restarting

```bash
systemctl --user status nosweat-lila-app nosweat-lila-ws nosweat-lila-adapter
journalctl --user -u nosweat-lila-app -n 100
journalctl --user -u nosweat-lila-adapter -n 100

systemctl --user stop nosweat-lila-adapter nosweat-lila-app nosweat-lila-ws \
  nosweat-lila-mongo nosweat-lila-redis
```

These services are not installed as boot-enabled system services. To restart,
reuse the same directory, configuration and data and repeat the startup commands
in steps 6–7; there is no need to reimport content or reapply patches. Use only
one instance of these named user services and ports per user at a time.

## Hosting on your own domain

The walkthrough above binds everything to loopback. Public hosting additionally
requires HTTPS, matching HTTP/WebSocket/Nostr origins, and appropriate service
and secret configuration. The existing
[public deployment notes](../deploy/public/README.md) describe our Ubuntu host;
the installer still assumes paths such as `/home/dash/no-sweat-lila` and the
`mutechess.org` domain. It is not a portable, one-command installer for arbitrary
domains. Review those assumptions and the site's Nostr/donation identity before
publishing your own fork; do not expose the private development listeners.

For build details, see the [native development notes](../deploy/lila/README.md).
This guide documents the existing helpers; command paths and pins were checked
against the repository, but this documentation change did not perform a new
end-to-end installation on a fresh Ubuntu VM.
