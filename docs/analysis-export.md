# Native analysis-board export (#155/#158)

The reference is the existing post-game Lichess panel at pinned Lila
`b551752d2a0e7a63459d9812825d95a633a98737`:
`modules/analyse/src/main/ui/ReplayUi.scala`,
`modules/ui/src/main/helper/HtmlHelper.scala`,
`ui/analyse/css/_round-underboard.scss`, `ui/lib/css/component/_copy-me.scss`,
`ui/analyse/src/serverSideUnderboard.ts` and `analyse.gifDialog.ts`.

The standalone board now uses the same four rows and native components. No export
CSS or new color/button design is introduced. Post-game rendering stays native.

| Native row | Temporary-board adapter |
| --- | --- |
| FEN | Current viewed FEN, native read-only copy-me input/button |
| Image | Native GIF dialog; native position-image link/copy control using current orientation, theme and piece set |
| Share | Native embed dialog structure and copy-me URL for the current position |
| PGN | Native Download annotated / Download raw copy-me targets and selectable PGN text |

The board has no public game ID. Share and embed represent the current **position**
through native `/analysis/standard?fen=...` and `/embed/analysis?fen=...`, with its
orientation. They do not invent a saved-game URL, retain review or publish a game.
Annotated/raw PGN downloads carry the entered line. Generated clipboard/download
callbacks are the small local replacement for native saved-game export URLs.

Annotated PGN uses the existing Chessops model/serializer over the actual tree,
including headers, starting FEN, result, variations, comments, NAGs, evaluations
and known clocks (including zero). Raw follows native game.PgnDump/api.PgnDump
semantics: rebuilt mainline SAN and headers, without annotations, clocks or
variations. Unsubmitted import drafts never become export content.

## Unsaved GIF contract

`GET /analysis/export.gif` accepts a decoded PGN of at most 5000 characters and
600 plies, the existing native bounds. NoSweatAnalysisGif validates complete legal
replay and declared/resolved Standard/FromPosition variants; this includes
rejecting Chess960 tags that native import might otherwise downgrade at a FEN.
It invokes **pure** importer.parseImport, never importAsGame or database insertion.
The controller uses the existing native export-image limiter, GifExport.fromPov
and streamed response. The synthetic in-memory game is never stored.

The existing native GIF dialog generates this temporary-line URL; saved games
retain their original native URL and all controls. The unsaved dialog omits
clocks/glyph toggles because the raw mainline carries no persisted clock/analysis
evidence. Names/ratings and orientation retain native behavior. Excessive lines
have an unavailable GIF action with guidance to download PGN, avoiding truncation.
The image and GIF renderer is the pinned official lila-gif with the owner-approved
moss-theme extension; see [its reproducible build/runtime contract](../deploy/public/gif-renderer.md).

The gateway exposes only native read-only `/export/fen.gif`, `/embed/analysis`,
and saved-game embed paths. The renderer itself stays loopback/app-only. Native
validation/rate limits and the separate database/security boundary remain.

## Initial tab and expected score

Import is initially selected on the standalone board (#158); no automatic focus
or post-game default change is introduced. FEN and PGN fields retain native
behavior from #153. Native review remains available through Computer analysis.
The owner canceled #156 after source comparison; the current side-to-move score
percentage remains byte-for-byte unchanged.

## Verification and release boundary

Automated checks include actual-DOM row/field/callback/draft tests; actual-tree
annotated/raw/clock and Blob downloads; image/share/GIF URL encoding and bounds;
native pure-parser legal/invalid/length/plies/variant/FEN tests; full native UI
build and root Scala compilation; gateway route negatives; renderer artifact
integrity and isolation tests. Linux CI builds the exact patched official
renderer and checks actual image/GIF responses, exact moss colors and orientation.
Local browser evidence covers default Import, export row labels/native controls
and native GIF dialog. CI/browser evidence is not human acceptance testing.

Do not merge this required renderer dependency into the active #157 continuation
release. Merge/deploy remains HELD until the bot experiment’s verified FINAL
cleanup handoff. No public runtime, data, configuration, or shared server build
path is changed by source preparation or CI. A release must include the qualified
renderer artifact, verified clean main, successful push CI and normal native
runtime preflight. The post-hold live verification must test actual app/gateway
image and GIF downloads; source/CI does not claim deployment.
