> **Retired prototype runbook.** This Node/Fastify service is stopped and disabled. Do not restart it as the current website. The deployed native Lila/Maia/Nostr alpha uses [deploy/public](../deploy/public/README.md); these older instructions are retained for historical reference.

# Private development server

This increment is a private, unrated technical alpha. Read [architecture.md](architecture.md) for what is implemented and what still blocks the finished MVP. Use a dedicated Ubuntu host; do not apply these host-wide PostgreSQL settings to an existing shared database server.

## Installed layout

- `/opt/club-maia/node-v24.22.1-linux-x64/`: Node 24.22.1, official Linux x64 archive SHA-256 `6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6`.
- `/opt/club-maia/tools/`: pnpm 11.25.0.
- `/opt/club-maia/venv/`: Python 3.14 virtual environment; install `worker/requirements.txt`.
- `/opt/club-maia/releases/<source-archive-hash>/`: immutable root-owned builds and matching source archive; `/opt/club-maia/app` points to the deployed release.
- `/srv/club-maia/models/maia3-79m.onnx`: external model, SHA-256 pinned in `src/policies.ts` and checked by the worker at every start. Directory accessible only to the app account/admin.
- `/etc/club-maia.env`: root-only environment configuration, based on `.env.example`. No signer private keys and no database passwords.
- `clubmaia`: system account without a login shell. PostgreSQL role of the same name, authenticated by local Unix peer credentials, owns `clubmaia` and the isolated `clubmaia_test` database.
- `club-maia.service`: the application plus one resident Python worker. `mbpfan` supplies the separately tested temperature-responsive cooling configuration.

## Bootstrap a fresh dedicated host

Install PostgreSQL, Python venv support and xz utilities from Ubuntu. Download the pinned Node archive from `https://nodejs.org/dist/v24.22.1/`, verify the SHA-256 above, extract under `/opt/club-maia`, and install pnpm 11.25.0 under `/opt/club-maia/tools` using that runtime's npm. Avoid replacing shared system runtimes.

Create system user `clubmaia` with home `/srv/club-maia` and shell `/usr/sbin/nologin`. As PostgreSQL admin, create login role `clubmaia`, then databases `clubmaia` and `clubmaia_test` owned by that role. The application performs its initial `CREATE TABLE IF NOT EXISTS` schema transaction at startup. No schema upgrades beyond this initial schema exist yet; introduce numbered migrations before changing it.

On this dedicated host set PostgreSQL `listen_addresses = ''` and restart PostgreSQL, preserving local peer authentication. Verify that `sudo -u clubmaia psql -d clubmaia` works and that no PostgreSQL TCP listener exists. Create the Python venv and install the pinned worker requirements. Place the model at the path above; do not commit it. The known export can be fetched from the Mobile Maia Preview Git LFS media endpoint, but its content must match the pinned hash regardless of URL/revision changes. Start with the same model/version used for the hardware benchmark.

Build and test a source checkout as a regular administrative user:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
# After installing in a path readable by the service user:
sudo -u clubmaia env MAIA_MODEL=/srv/club-maia/models/maia3-79m.onnx \
  /opt/club-maia/venv/bin/python -m unittest discover -s /path/to/worker -v
python3 scripts/package-source.py /tmp/club-maia-source.tar.gz
bash deploy/install-release.sh "$PWD" /tmp/club-maia-source.tar.gz
```

The initial installer expects `/opt/club-maia/app` to be absent or an existing release symlink. Do not overwrite an unknown directory. Deployment restarts the service, so unfinished games are voided under the explicit restart policy; schedule updates accordingly. Retain the previous release symlink target for rollback. Rollback also restarts the process and voids unfinished games. This initial schema does not support arbitrary backward-incompatible database downgrades.

## Access without a domain or Cloudflare

The app listens only at `127.0.0.1:3000`. Use a tested private SSH path and forward local port 3000 to the host's loopback port 3000. Then browse **http://127.0.0.1:3000** exactly; the origin is pinned for signatures, CSRF and WebSockets. Using `localhost`, another hostname or a different port requires a matching `ORIGIN` setting and service restart.

Use a NIP-07 browser signer. The browser requests one login signature, then uses an HttpOnly session cookie for gameplay. No per-move signatures, relay dependency or automatic publication. Key generation/restoration and NIP-46 are not implemented yet. If an in-app browser lacks the signer extension, use your regular browser through the same SSH forward.

Do not bind the app to all interfaces to bypass access setup. Domain, TLS/Cloudflare origin configuration, backups and the host/network isolation boundary remain later deployment tasks. The service unit restricts application IP egress to loopback; it does not isolate root or the entire host from the LAN. Proxy trust is disabled. Review trusted proxy/rate-limit/origin behavior explicitly when adding Cloudflare.

## Checks and tests

```sh
systemctl status club-maia mbpfan postgresql
curl --fail http://127.0.0.1:3000/health/ready
journalctl -u club-maia --since '10 minutes ago'
```

The readiness response includes active games, ten-game capacity, queued inference and unrated mode; it does not publish private account/session data. Session and authorization headers are redacted from logs. Visit the footer's **Source & licenses** link for the exact deployed application sources, build instructions and license notices.

For integration tests, create/start **only** the isolated instance using `deploy/start-test-instance.sh`. The service binds to port 3001 and uses `clubmaia_test`; never point smoke fixtures at a real-user database. `pnpm smoke` verifies signed authentication, challenge replay prevention, admission, real worker replies, WebSocket updates, idempotence, ownership, stale/illegal commands, PGN, and logout. `test/restart.ts prepare` / `check` verify recovery across a test-instance restart or deliberately killed test worker. These use disposable signed identities and scripted human-input fixtures, not bot-versus-bot play. Stop `club-maia-test` when finished.

Before public play, implement and test off-host encrypted backups/restoration. Existing PostgreSQL local files are persistence, not a backup plan. The app does not currently expose a server-side analysis endpoint; both browser Maia and Stockfish analysis remain required work.
