# Official Lichess image/GIF renderer

Source: https://github.com/lichess-org/lila-gif

Pinned commit: `a92511ae3be69c0c0a4002c39fa6cf92f4c93768`.

The renderer is AGPL-3.0-or-later; its original license is retained
beside this file. The exact official source tar, including `theme/piece/LICENSE.txt`
and Apache-2.0 `theme/font/LICENSE.txt`, is required in every renderer artifact and
published corresponding-source archive. Piece sets retain their original varied
licenses; the renderer embeds official prerendered sprites and Noto Sans. The
bounded `lila-gif-moss.patch` adds the seventh board theme with native Mute Chess
moss colors through the official generator. The original six themes and sprites
remain unchanged. Corresponding source also includes this exact patch and all
40 generated Quiet Signal sprites, with content hashes in the build receipt.

Pins, locked build instructions, binary receipt verification, isolated runtime,
the moss extension and deployment hold are documented in
[`deploy/public/gif-renderer.md`](../../deploy/public/gif-renderer.md). No renderer
build or live installation is claimed by the source integration tests.
