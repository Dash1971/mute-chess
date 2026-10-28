> **Historical prototype architecture.** The owner has now confirmed Lichess/Lila as the base for all chess play and analysis. See [the current foundation decision](chess-foundation.md). The implementation below describes the still-running infrastructure prototype, not the target architecture.

# Private server alpha: initial reuse decision

The 28 October 2026 spike selects a focused TypeScript service for the **server-side technical alpha**, with Lichess's Chessground and Chessops and one private Maia3 Python worker. This is an initial implementation choice, not a claim that a full Lila adaptation has been benchmarked against the completed MVP.

Upstream [Lila](https://github.com/lichess-org/lila) uses Scala/Play, MongoDB, a Redis-connected separate WebSocket service, and scalachess. Its mature round/reconnect/analysis/rating code is valuable, but installing a complete Lichess runtime would add infrastructure and assumptions unrelated to this human-versus-Maia-only slice. We inspected its documented architecture; we did not build a runnable reduced Lila fork. That provisional choice was superseded by the owner's decision to use Lichess/Lila for all chess. The prototype is retained as infrastructure/inference evidence while the replacement is built separately.

## Running implementation

- Node 24, Fastify HTTP/WebSocket application, one clock-owning process.
- PostgreSQL: users, expiring challenges, revocable hashed sessions, game state, append-only versioned move/result snapshots and command receipts. Unix socket/peer authentication; no database password or TCP listener.
- Chessops is authoritative for move legality, castling, en passant, promotion, SAN/FEN, material and position endings; current-position draw claims and automatic fivefold/75-move rules are implemented around it.
- Clock math uses monotonic process time. Timeouts continue after player disconnects. Bot queueing and inference count toward its clock. Every accepted move/result is persisted transactionally before broadcast. Process restart voids unfinished games and never fabricates clock reconstruction or rating penalties.
- One pinned Maia79M FP32 session in a child process, JSON lines over pipes. Two inference threads, no busy spinning, maximum ten outstanding inference jobs, eight-second inference deadline. Application admission is ten active games and one active game per account. No network inference port.
- Bot identities share versioned policies. There are 24 named configuration entries over six conditioning settings. Both Elo inputs, model hash, actual history mode, full-probability sampling and 500–1,200 ms total target thinking time are pinned per game. These are uncalibrated technical-alpha defaults. The separate 44-bot roster/rating proposal has not been adopted automatically.
- Nostr NIP-98 login plus an explicit one-time, pubkey-bound server challenge and body digest; session cookie is HttpOnly/SameSite=Strict (Secure with HTTPS origin). Private keys remain in the signer. Browser currently supports NIP-07 only; authenticated gameplay does not touch relays.
- WebSockets restore an authoritative snapshot after reconnect and enforce identity, origin, payload/connection/message limits. HTTP is also available for commands and reconciliation.
- Chessground UI: bot/control selection, clocks, move list, current-game restoration, rematch, resignation/draw claim, saved games and PGN. It is an initial functional interface, not finished product design.
- Linux systemd service under `clubmaia`, no sudo/login shell, read-only application/model files, memory/CPU limits, outbound IP access restricted to loopback. Listen only on `127.0.0.1`. Domain/tunnel deferred. This is not a replacement for the outstanding host/network isolation boundary.

## Not shipped in this increment

Rated games/Glicko-2 updates, human calibration, rating-based matchmaking, local key creation/encrypted recovery/NIP-49, NIP-46 remote signers, premoves, intended-move draw claims, draw offers, post-game Stockfish and Maia analysis, opt-in Nostr PGN publishing, account rename/profile UI, off-host backup/restore and public deployment. A winner/result and saved PGN are implemented; a rating change is deliberately not invented. Both engines remain required for the finished MVP.

## Failure boundaries

The database advisory lock prevents two game processes from owning clocks on one database. Only a single replica is supported. A worker exit ends the parent service so systemd recovery voids unfinished games; individual inference errors also void the affected game. Unknown persistence errors fail the process rather than acknowledging an uncommitted move. A process restart can interrupt active games: show the recorded void reason and reconnect.

Integration fixtures use signed disposable test identities and fixed human-input sequences against real Maia replies. These exercise transport/correctness and are not bot-versus-bot matches or strength calibration. Tests use a separate database and loopback port 3001; the deployed development service uses port 3000.
