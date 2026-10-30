> **October 29 correction (#57):** retain native friends and allow direct invitations between signed-in human players. Quick pairing remains Maia-only, without a public human pool. This supersedes earlier human-versus-Maia-only restrictions for invitation games.

> **28 October follow-up:** restore the native Lichess homepage and interaction model. Defer the retro wrapper. Replace only the logo after the owner chooses a concept. Anonymous play is casual; Nostr accounts use provisional 1500 and native rating updates. Pair automatically with a random available opponent within ±200, using the native quick-pair controls and custom dialog. Keep NIP-07 recommended and add generated/imported browser keys. This overrides earlier unrated/manual-opponent alpha UX below.

# Confirmed foundation: Lichess chess, augmented analysis, desktop club wrapper

Decision confirmed by the owner on 28 October 2026. This supersedes the provisional focused-service direction in `docs/architecture.md` and the earlier proposal to choose between a custom chess service and Lila.

## Product boundary

- **Desktop browsers only.** No mobile app, mobile chess layout or PWA project. Mobile Maia remains a separate product.
- **Lichess is the base for every chess function we expose**, including live play and analysis. Use Lila's round, clock, promotion, premove, replay, variation/tree, PGN and analysis machinery, with its native chess rules/adjudication and engine integration. Do not grow a parallel custom chess implementation.
- Add Maia/Nostr/bot-pool integration around that base. Human-versus-Maia only, with the confirmed 44 identities in [issue #1](https://github.com/Dash1971/mute-chess/issues/1) and versioned policies/calibration tracked in [issue #2](https://github.com/Dash1971/mute-chess/issues/2). No human-versus-human or bot-versus-bot feature.
- The cyberpunk/cypherpunk story, retro desktop layout, typography, colors and club notices are the **wrapper and branding**. They do not define new chess rules, control semantics, evaluation meaning or classification algorithms.
- Add the explicitly requested Mobile Maia / En Croissant / maiachess.com capabilities to Lichess analysis. Preserve their distinct semantics, upstream provenance and regression evidence.

This means an adapted **Lila-based chess application**, rather than a stand-alone copy of Chessground surrounded by newly implemented chess controllers. It does not require offering every unrelated feature of lichess.org (forums, tournaments, human matchmaking, etc.). Retain mature upstream behavior for the supported scope and make small, identifiable integration changes.

## Current state versus target

The owner retired the earlier Node/Fastify/PostgreSQL prototype on 28 October 2026. Its service is stopped and disabled, with a rollback backup of its deployed source, configuration and database. Its Chessground/Chessops implementation and shared Maia79M worker remain useful infrastructure/inference references; its custom clocks, round controller and persistence are **not** the chess foundation. The pinned native Lila application and lila-ws service build and run privately with separate MongoDB/Redis data. The native Maia/Nostr adapters now work with the confirmed roster, one active game per human, a two-game global cap and unrated 5+3/10+5 play. See the current deployment notes.

Continue with the separate Lichess base; do not restart or expand the retired prototype by default. Reuse the verified Maia model/runtime, worker resource limits, hardware measurements, private administration and Nostr protocol work where suitable. Do not let sunk implementation work choose the chess architecture. Lila's existing server/data contracts may mean using its native services; retaining the prototype's Node/PostgreSQL architecture is not a requirement.

The private baseline has passed its frontend/backend builds, 83 selected upstream frontend tests, and HTTP/WebSocket checks including PGN replay, built assets and origin rejection. Browser inspection verified native legal moves, variation navigation, PGN output and Stockfish 19 analysis. Build/runtime helpers and the isolated WebSocket bind-address patch are in [deploy/lila](../deploy/lila/README.md). Automated adapter integration now covers live Maia replies, both native clocks/colors, reconnect, stale retries, resignation/PGN, Nostr replay rejection and worker-crash voiding. Further human acceptance and broader ending/promotion coverage remain useful. The previous ten-game inference benchmark is not a benchmark of this larger stack.

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

Keep Lichess's analysis tree and navigation as the single state model. A selected position/variation feeds both engines. Display multiple Stockfish candidate arrows/PVs and Maia candidate arrows/probabilities together, with engine labels, understandable colors and visibility controls. Selecting an engine candidate enters the same Lichess variation flow; returning restores the original position and path.

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

## Stacked premoves

Add Mobile Maia-style multiple queued premoves as an explicit gameplay enhancement to native Lichess round controls. Port the behavior with source provenance rather than adding another rules engine. Each queued move must be validated against the authoritative position when its turn arrives. Clear the remaining queue on an illegal move, server resync, takeback, terminal game or loss of ownership; never replay queued commands after reconnect. Cover castling, en passant, promotion, branching captures, cancellation and fast bot replies. Preserve the native single-premove option and input feedback. This is enhancement scope, not an assertion that the feature is already shipped.

## 29 October implementation

The native extension implements projected multiple premoves with Mobile Maia's last-use square tints and native promotion picker. The owner explicitly requires no extra enabled label, queue count, move strip or Clear button. Preserve desktop Escape/right-click cancellation and the single/multiple preference in the native board menu. Authoritative server destinations validate execution, including the acknowledgement gap after a human move. No unsent queue is replayed after socket closure/resync.

The selected-move analysis increment includes local Maia3 5M/79M, raw legal policy, same-move SF candidate comparison, preview/return in the native tree, conditioning/history controls and on-demand rating samples. The independent EC/Mobile Maia scoring/material references and whole-window corroboration are retained for additive brilliant detection. The owner subsequently removed the custom full-game review and selected-move reclassification UI: whole-game accuracy, judgments and charting use native Lichess, as recorded below. Engine preferences live in native Analysis Menu → Settings. Board arrows now follow Mobile Maia’s two SF choices and top move from two independently rated Maia channels, including split agreement colors and fixed Maia widths. Issue #200’s candidate comparison and optional rating chart/table occupy the native left-side panel. Confirmed additive brilliant annotations now use native browser-review persistence.


## 29 October scope decision: standard chess only

The owner explicitly excluded all chess variants. Analysis, editing, imports and play support standard chess only, including ordinary custom FEN positions. No variant selector, variant play/analysis URL or variant PGN import is part of this product. Preserve upstream rules internals as dependencies, without presenting them as supported features. The swag store is removed. The footer social section currently contains only [our GitHub repository](https://github.com/Dash1971/mute-chess). The account control must expose native profile viewing and editing for Nostr-authenticated users.

## Puzzles (owner clarification, 29 October 2026)

Use native Lichess puzzle solving, ratings, solution validation, post-completion review and next-puzzle behavior. No En Croissant puzzle port is required. Extend review with the same two Stockfish / two independently rated Maia channels and shared arrow geometry. Engine assistance is prohibited during solving, including pending work carried over from the previous puzzle. Preserve ordinary Lichess hints and reveal behavior. The starter catalog is a pinned, legally validated subset of the official CC0 Lichess database; its positions and original game links are real, while unavailable game metadata is omitted.


## Native computer analysis restoration (owner decision, 29 October 2026)

Restore the original Lichess computer-analysis chart, accuracy, judgments, review controls and analysis editor. Do not replace them with a custom full-game review, accuracy calculation, chart or classification dashboard. Stacked premoves, Maia integration and additive brilliant-move detection are the intended improvements. Preserve native judgment semantics and imported glyphs. Brilliant detection must use the validated Mobile Maia/En Croissant evidence without replacing native analysis. Until a dedicated fishnet service is configured, whole-game analysis uses Lichess’s native on-device Analysis editor; do not expose a server-analysis request that cannot complete.

## Nostr profile and security settings (owner clarification, 29 October 2026)

The optional signup name may be skipped. Users must be able to set an editable **public name** afterward in Edit profile. Render it in the account header, profiles and game/player displays while retaining the native account handle and Nostr identity for links, ratings and game history. This does not authorize migrating canonical user IDs or publishing a Nostr profile event.

Nostr login remains passwordless. Optional authenticator 2FA requires both a fresh Nostr signature and an authenticator or unused recovery code. Enrollment/disable also require fresh signatures, confirmed authenticator possession for enrollment, atomic single-use codes, per-account attempt limits and session revocation. Recovery codes are shown once and stored only as hashes. Use native Lichess TOTP and session machinery. Keep native profile/preferences/session views where appropriate, remove dead password/email/API links, and keep API/token routes disabled. Test security changes with disposable identities; never enroll or alter the owner’s credentials.

## Native graph and Maia score (owner clarification, 29 October 2026)

Add small Mobile Maia/En Croissant colored circles for quality glyphs on the original Lichess evaluation graph. Retain native chart geometry, accuracy, ACPL, judgments, tooltips, selection and learning flow. Add only independently confirmed automatic brilliant moves; never replace native negative judgments or imported quality annotations.

“Score %” means Maia expected game score for the current position: win probability plus half draw probability. Show it beside each Maia channel with the side-to-move perspective. Keep it distinct from raw move likelihood, Stockfish evaluation and full-game accuracy.

## 29 October community and learning follow-up

The owner requested native forums, Storm/Streak, learning (without coaches),
watching current games and the remaining supported preference categories. Keep
native Lichess interfaces and behavior, with our existing bot-only and standard-only
boundaries. Link the existing Flotilla Mute Chess room alongside GitHub; remove blog
navigation. See `docs/native-learning-community.md` and `learning/README.md` for
scope and licensed lesson provenance. The opening explorer is deferred by the
owner because the live Lichess API now requires separate authentication (#42).

## October 30 approved analysis and premove refinement

The owner approved the revised native analysis mockup (#62): two separate Maia
cards side by side on the left, full-width Moves by Rating below, Stockfish on the
right. Each model label opens a 600–2600 rating button grid; each channel owns its
leading probabilities and Others expansion. Expected score is win plus half draw
for the side to move. Retain the native graph and Learn from your mistakes. Show
all six validated Mobile Maia/En Croissant classes with overall native accuracy
and ACPL, omitting phase accuracy. This explicitly supersedes the earlier
brilliant-only limit; imported quality annotations and whole-window standout
confirmation remain required. Whole-game analysis defaults to bounded Fast with
lightweight native Stockfish. Quality and advanced engine controls live in
Settings, rather than a mandatory setup dialog. Play links directly to quick
pairing without a menu. Opening explorer remains deferred.

For stacked premove continuity (#61), use Mobile Maia PR #111. Opponent moves and
acknowledgements update the committed native state while the board publishes only
the final projected plan. Invalid/cancelled queues and endings reveal the actual
position. Clock updates precede premove execution; native move transport,
promotion, sounds, legality and single premoves remain authoritative.

## Upstream maintenance direction (October 30, #75)

Stay as close as possible to native Lichess/Lila outside the defined product
departures. Maintain the rationale, exact native file inventory, verification
and rebase instructions in [upstream-alignment.md](upstream-alignment.md) and
`deploy/lila/upstream-departures.json`. Prefer native configuration and small
adapter hooks; preserve rules, clocks, ratings, completion, ownership and abuse
controls. Register coverage is a maintenance check, not evidence that a behavior
change is justified. Review that explicitly in every affected PR.

## October 30 analysis presentation follow-up (#65)

Bound summary player columns and use a compact npub for generated unnamed Nostr
handles. Newly chosen/edited public names are limited to 20 characters; unrelated
profile edits preserve an existing longer name. Full npubs remain available on
profiles, and canonical identities/links/history are unchanged. Both Maia cards
color moves using the pinned Maia platform empirical CP-to-winrate lookup and
5/10 percentage-point Stockfish-loss boundaries; missing evidence is neutral.
This is separate from Maia probability and the full-game EC classification.
Expected-score circles identify the score's White/Black side. Replay has compact
native private Notes, with spectator discussion and watcher furniture removed.


## Compact puzzle Maia presentation (#105, October 30, 2026)

Puzzle review keeps a simpler surface than the full game-analysis cards. Each
Maia row has an explicit 8-pixel model-label gap, three move/probability groups
without dot separators, and an underlined **Other %** control. It opens that
model's complete legal-move list; each model expands independently. The raw
legal policy is preserved, including the probability mass outside the top three,
without applying bot sampling settings or renormalizing the visible moves.
Very small positive values display as `<0.1%`, with precision available on hover.
The native move action still explores a selected legal move.

This follows Mobile Maia Preview's `_maiaProbabilityRow` /
`_showMaiaProbabilities` in `lib/src/review.dart`, inspected at revision
`8563954` of Dash1971/maia-chess-android-preview. The browser uses an inline,
keyboard-accessible expansion rather than the app's bottom sheet. Wrapped
move groups retain a clear label gutter on narrow screens. Native puzzle
solving, hints, review mode, Stockfish controls, arrows and inference cancellation
remain unchanged; Maia assistance is still withheld while solving, hidden,
in threat mode or with the engine disabled. Full game-analysis cards retain
their richer layout.

Rebase checks: puzzle channel DOM interactions, empty/pending states, native
review gating tests, narrow and desktop browser layout, native UI formatting,
lint, type checking and build. The presentation hook remains in the existing
namespaced puzzle adapter and puzzle stylesheet; no native controller behavior
or server changes are needed.


## Accepted compact analysis (#111, October 31, 2026)

The accepted full-screen presentation is specified in
[analysis-presentation.md](analysis-presentation.md). It supersedes the earlier
wrapped puzzle rows, flat candidate blunder color and retained Private Notes UI.
Preserve all native chess and review contracts. Mobile Maia is the reference for
ECO opening names under the board and the graph's game-phase boundaries.
