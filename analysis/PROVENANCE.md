# Native analysis and premove extensions

Codex-assisted implementation for the Mute Chess fork; no upstream contribution or human manual testing is claimed.

Stacked premove projection follows Mobile Maia `lib/src/premoves.dart`, revision `78d45c2563bdd565614e776212254d2eb33fee59` (AGPL-3.0). Native Lila/Chessground remain the input, legal-destination, round, clock and server authority.

Browser Maia client/worker, history encoder and bounded 5M loader are adapted from Dash1971/mobilemaia.org at `4b3afc058adcdb54c879f1903ed2270a33e9f68c` (AGPL-3.0). Changes: .js module filenames for native Play MIME compatibility, same-origin asset paths and Mute Chess cache namespace. ONNX Runtime JS/loaders retain MIT and all notices in browser/vendor; runtime source/version/integrity and both model hashes/source commits are pinned in browser/config.json. No model is trained or changed here. 5M is the lightweight analysis default; 79M is opt-in. These model choices do not alter the live bots' 79M policy.

The scoring oracle and material reference come from Mobile Maia at `78d45c2563bdd565614e776212254d2eb33fee59`, copying En Croissant v0.15.0 `6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53` (GPL-3.0). Its license is retained under third-party. Independent annotation boundary and live-search fixtures are retained unchanged. The runtime port uses Chessops, exact complete MultiPV iterations, cancellable worker capture search without a node truncation, and whole-decision-window corroboration for !/!!. Computed labels are separate from imported PGN glyphs.

The interaction brief is Mobile Maia Preview issues #200 and #26; no private maiachess.com API or separate React board is used. Native Stockfish 19 assets and native analysis tree/variations are reused.

The earlier custom whole-game review/accuracy dashboard was removed at the owner’s direction on 29 October 2026. Whole-game charting, accuracy, ACPL, judgments, review navigation and browser persistence now use the pinned native Lichess Analysis editor. The independent En Croissant/Mobile Maia classifier and material references remain available for additive brilliant-move work; they do not replace native judgments or accuracy.

The board arrow selection and agreement composition are ported from Mobile Maia `review.dart` (`_stockfishMoves`, `_maiaMoveColors`, `_arrows`, `_agreementArrows`) and `ReviewBoardOverlayPainter` at the same revision. Exactly two distinct Stockfish roots are shown, plus one top move per independently rated Maia channel. SF uses `#3d9be9` / `#8ac8f5`, Maia uses `#e89b3c` / `#e85d68`. SF/Maia agreement uses the SF shaft and Maia head. Two Maias agreeing split the head and, without SF agreement, the shaft. Each unique move is one owned Chessground SVG; quarter-square Maia shaft width and head geometry follow Mobile Maia and never depend on likelihood. Inferior SF-only shafts retain Lila's taper. Regression fixtures reproduce Mobile Maia's distinct, SF-second agreement and double-Maia agreement cases, including flipped orientation. The native SF parser also accepts skipped/same-depth rank windows without publishing duplicate or mixed-depth PVs, and rejects duplicate-root cached results as finished evaluations.

Preview issue #200 drives the left-side candidate panel: raw legal policy at both ratings, live top-two SF evaluations plus bounded searches for missing candidates, played/SF-choice semantics, native variation preview/return, direct 600–2600 input changes, and a compact 21-sample rating chart with keyboard-accessible points and shared raw-probability tooltips. Full context (model hash, both rating inputs, history and position) keys inference caches. While enabled, the rating sweep loads incrementally on navigation and reuses context-keyed samples; every plotted rating uses matched self/opponent inputs. Advanced engine preferences remain in native Analysis Menu → Settings. No mockup numbers, private website API, telemetry, or remote inference service is used.

The custom arrow geometry is centered at (50,50) inside Chessground’s per-square 100×100 SVG before rotation. This corrects the half-square offset in both orientations. Regression coverage maps actual SVG transforms through Chessground’s fixed viewport contract across pawn, knight, diagonal and promotion moves at four board sizes; browser measurements confirm zero origin/tip error in both orientations.

Native puzzle review reuses the same policy encoder, preferences and arrow renderer through ui/lib/src/nosweat. The puzzle-specific controller starts Maia only in visible review with the native engine enabled and cancels publication across position/puzzle changes, hidden pages and shutdown. The Lichess puzzle source position is used directly with its absolute ply; no original game history or unknown player metadata is invented. Dataset provenance and reproducible preparation/import instructions are in puzzles/. No En Croissant puzzle code was ported.

The native graph now displays small circles for its existing six quality glyphs using Mobile Maia/En Croissant colors (blunder red, mistake orange, inaccuracy yellow, brilliant cyan, good teal, interesting lime). These are native glyph markers, not a second classification system. Native summary/accuracy calculations and chart interaction remain authoritative.

Automatic brilliant detection is additive after the native Analysis editor saves its review. A complete capture-root material search runs in the cancellable worker before separate exact two-PV Stockfish searches (depth 14 / 1200ms baseline; at least depth 16 / 1800ms whole-window confirmation). The same independent classifier must corroborate the full decision window. Imported quality glyphs and native negative judgments are preserved. Confirmed `!!` glyphs carry `mobile-maia-brilliant-v1` provenance and persist in the native browser review. The serialized review is kept separate from the UI's completed tree nodes so native memoized position helpers cannot corrupt the saved result.

Maia current-position expected score reuses the inference value head: stable softmax over [loss, draw, win], then win + half draw, from the side-to-move perspective. Model, ratings, history and position key the same cache as raw policy. Paused, stale, failed and terminal inference does not reuse a previous score. No additional model invocation is needed.

## October 30 approved refinement

Mobile Maia PR [#111](https://github.com/Dash1971/maia-chess-android-preview/pull/111),
commit `4fb5d3cf04b9eac862940fb870eacd7e2dd541f5`, provides the projection-continuity
behavior: consume a validated queued move before publishing the board, retain
queued destinations through acknowledgements, and reveal the authoritative board
on invalid queues/endings. The native controller adaptation preserves legal
server destinations, transport cancellation, clocks, promotion and move sounds.
White/Black regressions inspect every Chessground update, not just settled state.

The owner approved separate side-by-side Maia cards, full-width Moves by Rating,
clickable rating labels, and the six Mobile Maia/En Croissant categories in the
native summary. This supersedes the earlier brilliant-only scope. Overall
accuracy, ACPL, best lines, evaluation chart and Learn from your mistakes remain
native Lichess. Existing imported quality glyphs take precedence. Ordinary
classifications require complete two-PV evidence; `!`/`!!` require
whole-window corroboration. Fast defaults to depth 12 / 500 ms per position;
Balanced uses 14 / 1000 ms and Thorough 16 / 1500 ms, following current Mobile
Maia `stockfish.dart` at `8563954429c2fb53ce0fe0e16c73c5d8a73ccfe0`. Confirmation
targets two additional depths with the selected mode's time budget; incomplete,
stale or vetoed standout results are withheld. The October 31 audit below
supersedes the original reuse of native baseline PVs. Saved-game scores and
classifications use native browser-review persistence; standalone board review
remains in memory. Quality is separate from native accuracy.

## October 31 brilliant-classification audit (#130)

The actual full-game integration discarded the earlier complete MultiPV
iteration needed by Mobile Maia's confidence policy, reused backward native
review searches with different session ownership, and independently rechecked
every provisional award. Hiding the tab could cancel classification while the
dialog reported Done. A passing single Opera-move fixture did not qualify that
full pipeline.

The corrected `mobile-maia-full-review-v2` path follows Mobile Maia PRs
[#58](https://github.com/Dash1971/maia-chess-android-preview/pull/58),
[#62](https://github.com/Dash1971/maia-chess-android-preview/pull/62), and
[#64](https://github.com/Dash1971/maia-chess-android-preview/pull/64), including
`0cdcefa`, `9f5c5dd`, and `13336ce`. It retains uncapped complete capture-root
search, exact same-depth current/earlier iterations, an isolated one-thread
forward evidence session, all-mode complete-decision corroboration, and separate
confirmation windows. Stable decisions consume no additional searches;
unsupported candidates share at most six searches targeting depth 14/16/18 with
500/1000/1500 ms limits. Those are search budgets, not total wall-time promises.
Explicit stop, page departure and stale-line changes discard unpublished
results. Tab hiding does not cancel an explicitly started background-capable
review. Cancellation is never reported as successful completed classification.

Native evaluation scores, accuracy, ACPL, graph and learning remain unchanged;
classification evidence is collected separately with the selected browser
engine. PGN annotations remain authoritative. The unchanged additional Mobile
Maia corpora cover both engines and all modes (821 moves, 838 positions, 17 runs),
in addition to the 3,075 independent boundary vectors and Rust material oracle.
The full Byrne–Fischer fixture checks Na4/Be6/Ne2+ and rejects Qa3 Brilliant.
Real browser SF19 traces are independently replayed through the unmodified EC
function and Rust material values as release evidence. Engine/search inputs can
legitimately change awards: the current SF19 Fast run also corroborated 15...Nxc3;
the independent EC replay agreed on all 82 moves. No rule forces a named game's
brilliant count.

## Standalone board transfer (#131)

The separate Import and Export tabs (#133) use native Lichess under-board fields
and `copy-me` controls, with explicit PGN copy/download and FEN copying.
Chessops' native PGN model/serializer writes the
actual tree, variations, quality NAGs, comments, evaluation tags, original import
headers and a starting FEN. Unsubmitted import text is never exported. Standard
Mute Chess imports retain those headers and annotations; upstream-mode behavior
is unchanged. These explicit exports do not persist the board review itself.

The presentation follows pinned Lila `ReplayUi.scala`, `_round-underboard.scss`,
and the shared `_copy-me.scss` component. Blank PGN import drafts are distinct from
read-only output; FEN starts with the current native position. The default upstream `renderInputs` behavior is preserved;
only the standalone Mute Chess board requests the separate PGN draft mode.
Issue #153 removes the permanent custom import buttons: FEN restores native
validated change behavior, and PGN restores the native thin, focus-revealed
bottom action and unchanged field geometry. Local
clipboard/download callbacks replace a saved-game export URL for this unsaved
context; the native panel and control styling are reused.

## Maia candidate-quality colors (#65)

Reference: CSSLab/maia-platform-frontend at
`a6e52f5c811ee18863cb2f0e81f2433a5b9905de`, GPL-3.0. Its
`src/hooks/useAnalysisController/utils.ts` and `src/constants/analysis.ts` classify
Stockfish win-rate loss as good through 0.05, acceptable through 0.10, and blunder
above 0.10. `src/lib/analysis.ts` supplies the empirical CP-to-winrate lookup,
rounded to 0.1 pawn and clamped at +/-10 pawns. The lookup is retained in the
native `noSweatCandidateQuality.ts`, with the reference source/license in
`third-party/maia-platform-quality/`. Issue #111 restores ranking shades inside the evaluated blunder group, ordered
by Stockfish mover win rate (then CP/move ID), with the accepted five-red palette
and separate light-theme contrast adaptations. Forced mate scores
use exact winning/losing outcomes. These estimates do not alter probabilities,
full-game annotations, accuracy, or Stockfish board arrows.

A separate native local Stockfish queue searches the root and visible candidates
under bounded depth/time (depth 12; root 500ms, missing candidate 300ms). Only
complete results of at least depth 8 receive a color. Both cards share quality
evidence for the same move; Others adds its visible moves to the queue. Position,
rating, visibility, and analysis-toggle generation guards discard stale work.
Unsearched/failed moves stay neutral. This is a quick estimate, not guaranteed
perfect objective truth or an assertion of identical search budgets to Maia's site.


## Accepted presentation, opening names and phases (#111)

Mobile Maia at `8563954429c2fb53ce0fe0e16c73c5d8a73ccfe0` supplies the
`OpeningNames`, `ReviewOpeningName`, `GamePhaseDetector` and graph phase-label
reference. The native namespaced ports preserve its position-path lookup, ECO
format and phase rules. The 3,810 opening rows come from the same Mobile Maia
CC0 TSV, generated from lichess-org/chess-openings
`4b8622759e7ae6f93f011cc6c83a3823401ab45e`. The native patch retains the
compact data and CC0 license; `analysis/prepare-openings.py` reproduces them.
See `docs/analysis-presentation.md` for the approved boundaries and verification.


## Maia Moves by Rating source audit (#146)

The chart follows CSSLab/maia-platform-frontend
`a6e52f5c811ee18863cb2f0e81f2433a5b9905de`: `MovesByRating.tsx`,
`useMoveRecommendations.ts`, `useEngineAnalysis.ts`, `utils.ts`, and
`constants/analysis.ts`. The candidate union, three quality palettes, ranked
shades, raw probabilities, matched 600–2600 sweep, shared tooltip and adaptive
60%/100% axis follow those sources. The native queue requests a genuine third
Stockfish root only for this chart; existing review/classification calls retain
their two-PV contract. See `docs/maia-rating-chart.md` for exact rules and retained
compact/native adaptations.

The selected local Maia model/history and bounded Stockfish evidence remain our
inputs. Maia’s opening-book overlay and broader all-legal-root engine searches
are not imported, so probabilities, evaluations and shade ranks may differ.
Missing samples remain gaps, stale curves clear, and unscored moves stay neutral.
The rendering does not change full-game labels, native accuracy or board arrows.

Issue #148 aligns the analysis brilliant tree/badge color with Mobile Maia’s
`#15aabf`, and separates summary symbols/names using En Croissant’s grid principle.
This is presentation only: native board SVG geometry and glyph navigation remain
unchanged. See `docs/analysis-presentation.md` for source pins and rebase checks.


## Native standalone export parity (#155/#158)

The owner’s reference is pinned Lila ReplayUi.scala/HtmlHelper.scala and
_round-underboard.scss, not a new export design. The standalone adapter reuses
FEN/Image/Share/PGN rows, native copy-me controls, dialogs and annotated/raw action
labels. Raw follows native rebuilt mainline semantics without comments/NAGs,
evaluations/clocks or sidelines; annotated preserves the actual tree and clocks.
Native ParseImport/importer.parseImport remain pure and bounded before feeding
GifExport; no public import or persistence occurs. Native GIF/image rate limits,
renderer and saved-game behavior remain authoritative. Position-share/embed URLs
represent the current position, since the board has no saved public game.

The official lila-gif source at a92511ae3be69c0c0a4002c39fa6cf92f4c93768 receives
only the documented moss-theme extension, preserving native #c7cfba/#668478 colors
and original sprite bytes. Exact source/toolchain/generator pins, artifact receipt,
licenses and runtime isolation are in deploy/public/gif-renderer.md. See
[the adapter contract](../docs/analysis-export.md). Import opens by default only
on standalone boards. After auditing Mobile Maia ae8fc4ab, the owner chose to keep
our existing side-to-move expected-score display; that audit changes no model
outputs, cache entries or score presentation.

## 79M browser execution (#184)

Use the already pinned ONNX Runtime1.31.1 WebGPU bundle and asyncify loader,
renamed from.mjs to.js without byte changes for native Play MIME compatibility.
Original hashes, sizes and source URLs are in browser/config.json. The GPU WASM
asset is fetched once during existing asset preparation, verified and served
same-origin. Runtime selection tries GPU for79M, then at most4CPU threads when
isolated, then1;5M retains its bounded1-thread loader. No model conversion,
retraining, provider-specific policy changes or reduced rating samples occur.
Task-specific tests exercise backend fallbacks, unchanged input/output contracts
and the existing watchdog; they are not device performance or accuracy evidence.
