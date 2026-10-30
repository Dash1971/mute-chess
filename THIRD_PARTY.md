# Upstream code and assets

Mute Chess is AGPL-3.0-only. Upstream works retain their licenses and notices; the application supplies a source archive from its footer.

| Component                                                 | Pinned version/source                                                                                                        | Reuse                                                                                                           | License                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Chessops](https://github.com/niklasf/chessops)           | npm 0.15.1, lockfile integrity                                                                                               | Server/client rules, legal moves, SAN, FEN, game endings, Chessground destinations                              | GPL-3.0-or-later; `third-party/CHESSOPS-LICENSE`                             |
| [Chessground](https://github.com/lichess-org/chessground) | npm 10.5.0, lockfile integrity                                                                                               | Board interaction, animation, coordinates, board/piece CSS                                                      | GPL-3.0-or-later; `third-party/CHESSGROUND-LICENSE`                          |
| Cburnett chess pieces                                     | Embedded unmodified in Chessground 10.5.0's `chessground.cburnett.css`                                                       | Board artwork by Colin M. L. Burnett                                                                            | GPL-2.0-or-later, used under GPLv3; `third-party/CBURNETT-GPL2-LICENSE`      |
| [CSSLab Maia3](https://github.com/CSSLab/maia3)           | Reference source `1e13597c42d4858b7cfd7cfdae01e297263364b2`                                                                  | NumPy adaptation of board encoder, mirrored move vocabulary and UCI history handling in `lila-adapter/maia_worker.py` | AGPLv3; `third-party/MAIA3-LICENSE`                                          |
| Maia3-79M weights                                         | Official `UofTCSSLab/Maia3-79M`, FP32 ONNX export SHA-256 `3454b03ae78baa64a87b345fdb1a457265d912caec531039b074f07eda0d8010` | One shared CPU worker                                                                                           | Preserve upstream model license and attribution; weights are external to Git |

The piece attribution/license is recorded by upstream Lichess in its [COPYING.md](https://github.com/lichess-org/lila/blob/master/COPYING.md), preserved in `third-party/LICHESS-COPYING.md`. Exact SVG source forms extracted from the bundled CSS are in `third-party/cburnett-source/`.

The ONNX file is the existing Mobile Maia export, generated with `tool/export_maia3_onnx.py` from the released Maia3 architecture/checkpoint. The four legal-logit references in `test/maia-reference.json` were generated against the official source revision above and checkpoint SHA-256 `3fc6181d5db789b45a15305732148757ae74efa3e0028e81ba335b462dac45c2`; export parity is tested on this host. The export's source and recipe are available in [Mobile Maia Preview](https://github.com/Dash1971/maia-chess-android-preview), with that project's licenses preserved. No Mobile Maia application/release code was modified.

The Node prototype incorporates Chessops and Chessground as pinned dependencies rather than detached source fragments. The native Lichess application uses the complete [Lila](https://github.com/lichess-org/lila) checkout at `b551752d2a0e7a63459d9812825d95a633a98737` and [lila-ws](https://github.com/lichess-org/lila-ws) at `5089b84b5fe2da3f3e9e69d29363115cfddfc758`, retaining their AGPL licenses and complete source/asset notices. The native Nostr/Maia and WebSocket bind patches and build instructions are in `deploy/lila/`; the public source archive includes both pinned upstream trees, our patches, the adapter, deployment scripts and these notices. No Lichess accounts, production databases or public chess services are reused. Native playing and analysis pages retain upstream presentation while the full club wrapper remains work.

Other npm dependency sources, exact versions and integrity hashes are recorded in `pnpm-lock.yaml`; dependency distributions carry their license files. The runtime uses Fastify and plugins (MIT), node-postgres (MIT), nostr-tools (Unlicense), Zod (MIT), ONNX Runtime (MIT), NumPy (BSD-3-Clause), and python-chess (GPL-3.0-or-later). See those distributions for their complete notices.

The Mute Chess Quiet Signal knight and board are original, Codex-assisted SVG artwork. Its outlined wordmark uses unmodified Space Grotesk, SIL OFL 1.1; the font, license, checksum and pinned source are retained in `third-party/space-grotesk/`. Reproduction instructions and the AI-assisted design provenance are in `design/quiet-signal/README.md`. These assets are for this independent fork, not an upstream Lichess contribution. The earlier cyber-rook concept used Oxanium (Severin Meyer), SIL OFL 1.1; its font and notices remain in `third-party/oxanium/` for the archived exploration.

## Native analysis extensions

Mobile Maia premove projection, browser inference worker/client/encoder and En Croissant-derived classification retain their source pins and adaptations in [analysis/PROVENANCE.md](analysis/PROVENANCE.md). The independent EC scoring/material references and fixtures are under analysis/reference. En Croissant GPL-3.0 is retained as third-party/EN-CROISSANT-GPL3-LICENSE. ONNX Runtime MIT and full third-party notices accompany the browser vendor sources; exact runtime/model download hashes are in analysis/browser/config.json. Native Stockfish remains distributed by the pinned Lila source/assets and its original notices. Generated model/runtime downloads are excluded from Git and corresponding-source archives; exact sources and reproduction recipes are provided.

## Lichess puzzle database

The starter puzzle catalog in puzzles/ is a pinned subset of https://database.lichess.org/#puzzles, CC0-1.0. See puzzles/catalog.json, README.md and CC0-1.0.txt for source, selection and exact hashes. Native Lila puzzle code retains its upstream AGPL-3.0 license.

Lightning invoice and zap verification uses pinned `@noble/curves` 2.0.1, `@noble/hashes` 2.0.1 and `@scure/base` 2.0.0 (MIT), also used by the pinned nostr-tools dependency. Their original distribution licenses and package-lock integrity hashes are retained. BOLT-11 and NIP-57 are protocol references; the integration does not copy another wallet implementation.

## Native practice lesson snapshot

The 20 standard-chess practice studies (229 chapters) in `learning/` are derived
from lichess-org/lila-db-seed at `b5d06f115c51d6f12167b9629fb21f087bf2e833`, under
its MIT license, reproduced in `learning/LICENSE.md`. Original lesson explanations
and attribution are retained; local ownership and contributor memberships are
sanitized. See `learning/README.md` and `catalog.json` for reproduction and hashes.

Mobile Maia's full control-dependent human timing and independent Dart vectors
are pinned, with GPL-3.0, in [third-party/mobile-maia-timing](third-party/mobile-maia-timing/README.md).
The adapter port preserves configured-control tiers and counts inference inside
the total target; its existing low-clock cap on additional waiting remains.

Maia candidate quality uses the empirical Stockfish CP/winrate lookup and category
boundaries from CSSLab/maia-platform-frontend at
`a6e52f5c811ee18863cb2f0e81f2433a5b9905de`, GPL-3.0. The source references, original
license and provenance are retained in `third-party/maia-platform-quality/`.
