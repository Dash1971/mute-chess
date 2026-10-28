# Confirmed foundation: Lichess chess, augmented analysis, desktop club wrapper

Decision confirmed by the owner on 28 October 2026. This supersedes the provisional focused-service direction in `docs/architecture.md` and the earlier proposal to choose between a custom chess service and Lila.

## Product boundary

- **Desktop browsers only.** No mobile app, mobile chess layout or PWA project. Mobile Maia remains a separate product.
- **Lichess is the base for every chess function we expose**, including live play and analysis. Use Lila's round, clock, promotion, premove, replay, variation/tree, PGN and analysis machinery, with its native chess rules/adjudication and engine integration. Do not grow a parallel custom chess implementation.
- Add Maia/Nostr/bot-pool integration around that base. Human-versus-Maia only, with the confirmed 44 identities in [issue #1](https://github.com/Dash1971/club-maia/issues/1) and versioned policies/calibration tracked in [issue #2](https://github.com/Dash1971/club-maia/issues/2). No human-versus-human or bot-versus-bot feature.
- The cyberpunk/cypherpunk story, retro desktop layout, typography, colours and club notices are the **wrapper and branding**. They do not define new chess rules, control semantics, evaluation meaning or classification algorithms.
- Add the explicitly requested Mobile Maia / En Croissant / maiachess.com capabilities to Lichess analysis. Preserve their distinct semantics, upstream provenance and regression evidence.

This means an adapted **Lila-based chess application**, rather than a stand-alone copy of Chessground surrounded by newly implemented chess controllers. It does not require offering every unrelated feature of lichess.org (forums, tournaments, human matchmaking, etc.). Retain mature upstream behavior for the supported scope and make small, identifiable integration changes.

## Current state versus target

The running private alpha is still the earlier Node/Fastify/PostgreSQL prototype using Chessground/Chessops and a shared Maia79M worker. It is useful infrastructure/inference evidence, **not** the final chess foundation. Its clocks, round controller and persistence are custom code. No full Lila playing or analysis application has been built/deployed in this project yet.

Keep that prototype intact while bringing up the Lichess base separately. Reuse the verified Maia model/runtime, worker resource limits, hardware measurements, private administration and Nostr protocol work where suitable. Do not let sunk implementation work choose the chess architecture. Lila's existing server/data contracts may mean using its native services; retaining the prototype's Node/PostgreSQL architecture is not a requirement.

The pinned upstream source is prepared locally for adaptation. Dependency installation, a successful Lila build, the Lila WebSocket/MongoDB/Redis runtime and a full playing-to-analysis smoke test remain implementation work. The previous ten-game inference benchmark is not a benchmark of this larger stack.

## Source map

Exact source revisions and paths are recorded in `docs/chess-sources.json`.

| Responsibility | Base/source |
| --- | --- |
| Live round, clocks, move commands and reconnect | Lila `modules/round`, `modules/game`, `ui/round`, shared game clock/socket code and scalachess |
| Board interaction, premoves, promotion | Lila round/shared game controllers with Chessground |
| Replay, legal variations, PGN, analysis navigation | Lila `ui/analyse`, shared `ui/lib/src/tree`, analysis/game server modules |
| Stockfish search, evaluations and variations | Lila client-evaluation (`ui/lib/src/ceval`) and analysis integration |
| Human-move policy and outcome predictions | Pinned Maia3 model/encoder; the existing verified runtime plus a browser analysis adapter |
| Move-quality and sacrifice/brilliancy classification | Existing En Croissant-derived Mobile Maia rules and reliability safeguards, with the pinned independent reference/fixtures |
| Candidate comparison and Moves by rating | Mobile Maia Preview #200 and #26; CSSLab Maia platform interaction/source references |
| Branding and desktop room | Our wrapper, following issue #3; no replacement chess interaction model |

## Analysis additions

### Stockfish plus Maia on the same board

Keep Lichess's analysis tree and navigation as the single state model. A selected position/variation feeds both engines. Display multiple Stockfish candidate arrows/PVs and Maia candidate arrows/probabilities together, with engine labels, understandable colours and visibility controls. Selecting an engine candidate enters the same Lichess variation flow; returning restores the original position and path.

Stockfish centipawn/mate evaluations and PVs describe searched quality. Maia supplies legal-move-normalized human policy probabilities at the selected conditioning inputs/history. Maia expected score, if displayed, is win probability plus half draw probability; it is a third quantity. Do not turn Maia WDL or likelihood into a searched Stockfish evaluation. Do not use a bot's Temperature/Top-P playing distribution as its raw analysis probabilities.

For candidate comparison, include the played move, Maia candidates and Stockfish's choice. Search missing candidates under a bounded budget; the existing top Stockfish lines do not prove the evaluation of every Maia candidate. Show pending/unavailable data honestly. Every displayed value/arrow must refer to the same position, legal move and score perspective.

### En Croissant / Mobile Maia classification

Reuse the rules already validated in Mobile Maia against En Croissant v0.15.0. Port the independent reference and regression cases before adding the annotation layer. The TypeScript scoring rules and Rust material/capture search have different runtime needs; a browser worker/WASM adaptation must preserve their behavior. We are not embedding the native En Croissant desktop application.

Retain exact, complete same-depth MultiPV snapshots, mate/terminal handling, whole-decision corroboration for standout labels, cancellation and stale-result guards. Do not simplify away capture-root coverage with an arbitrary node cap or silently substitute Lichess's thresholds for these requested annotations. Keep imported PGN annotations and computed/versioned annotations distinguishable. Accuracy/ACPL and classification labels must retain their respective definitions.

### Moves by rating and candidate exploration

Use [Preview #200](https://github.com/Dash1971/maia-chess-android-preview/issues/200) as the concrete feature brief and [#26](https://github.com/Dash1971/maia-chess-android-preview/issues/26) for direct conditioning changes in analysis. The desktop adaptation does not inherit the mobile layout requirements.

- Interactive candidate comparison: move, raw Maia likelihood and Stockfish evaluation for that same move.
- An optional explorer shows probability changes across the supported 600–2600 conditioning range, with a readable table alongside charts.
- Sample a small set of ratings on demand; selecting a rating or move updates the current Lichess analysis context.
- Conditioning values describe model inputs, not established player/bot Elo. Preserve both inputs, model hash and history context in cache keys and displays where relevant.
- Navigation/position/rating/history changes cancel or invalidate old results. No old arrow, score or label may attach to a new tree node.

The maiachess.com implementation is an interaction/source reference. Import the required feature logic where appropriate with its license; no dependence on a private website API or wholesale import of that site's separate React analysis application.

## Integration order

1. Build and run the pinned Lila playing and analysis base privately on a separate port/data set. Verify native clocks, premoves, promotions, reconnect, legal endings, variation/PGN handling and browser Stockfish before theming or extensions.
2. Connect Maia opponents and Nostr identity through explicit adapters, enforce human-versus-Maia-only admission, preserve bot policy metadata, and validate the confirmed roster and provisional ratings. Benchmark the complete stack on the mini before claiming ten-game service capacity.
3. Fit those existing Lichess surfaces into the desktop club wrapper, preserving chess geometry, input feedback, keyboard navigation and state contracts. Keep concurrent homepage work separate until integration is verified.
4. Add the En Croissant/Mobile Maia classification layer and simultaneous SF/Maia analysis; then candidate interaction and the Moves by rating explorer. Validate against the existing references, including missing/mate results, fast navigation and worker cancellation.

Post-game analysis should run in browser workers where practical, keeping expensive review away from the mini's live Maia queue. Evaluate model size, WebGPU/WASM fallback, downloads/cache and signer compatibility against the actual Lichess asset/header setup. Do not claim these additions are implemented merely because their reference code is available.

## Upstream maintenance

Pin sources, preserve licenses/attribution and keep our changes clearly separated from upstream. Our AGPL source distribution must include the relevant corresponding sources and build instructions. Upstream Lichess contributions, if proposed later, must follow its AI disclosure and human review/testing policy; no upstream messages or pull requests were sent by this preparation step.
