# Mute Chess foundation

Mute Chess uses native Lichess/Lila for chess play and review, adding Maia
opponents and analysis, Nostr identity, Open Brilly Finder and a focused Mute
interface. It runs in desktop and mobile browsers. We preserve native rules,
clocks, game endings, ratings, legal move handling and review-tree semantics.
We do not maintain a parallel chess server or clock engine.

## Current product

- Standard chess only, with the native quick-pairing grid and custom real-time
  clocks of at least one minute. Anonymous games are casual; Nostr users start
  with native provisional ratings and retain native Glicko updates.
- Quick pairing selects an available Maia opponent within the supported rating
  window. Signed-in humans can invite each other directly. The pool has
  [10,000 managed identities](catalog-roster.md), preserving earned histories.
- Background games top up to five total games; the shared Maia-driven ceiling is
  twenty. [Owner-hosted Arenas](arenas.md) use native pairing and scoring,
  configurable Maia fillers and unlimited human entry.
- Native puzzles, Chess basics, Practice and the forum are exposed. Hidden
  inherited features stay hidden or show the translated unsupported notice.
- Browser analysis uses Stockfish and Maia, native review/accuracy and additive
  [Brilliant detection](brilliant-moves.md). Engine settings, arrow behavior and
  supported features are detailed in [the site manual](site-manual.md).
- Nostr identities retain public keys and permanent account links while public
  names can change. No email is required; private keys stay private.

## Source and maintenance

The [architecture guide](architecture.md#source-authority) explains the two
repositories and native pin. Follow [maintenance](maintenance.md) and the
[fork contract](native-fork.md) for reviewed upstream integration.

The retired Node/Fastify prototype is retained in
[`archive/node-prototype/`](../archive/node-prototype/README.md). It is not a
supported replacement runtime. The [original foundation record](records/foundation-2026-10-28.md)
retains the early design decisions and their dated corrections; its old roster,
capacity, feature restrictions and implementation plans are historical.
