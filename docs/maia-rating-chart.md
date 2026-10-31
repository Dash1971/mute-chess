# Moves by Rating source audit (#146)

The owner bounded this implementation to Moves by Rating. The existing two Maia
cards, their advanced opponent settings, native board/tree, graph, accuracy,
ACPL, review and learning controls retain their behavior and dimensions.

Reference: [CSSLab/maia-platform-frontend](https://github.com/CSSLab/maia-platform-frontend/tree/a6e52f5c811ee18863cb2f0e81f2433a5b9905de),
GPL-3.0, revision `a6e52f5c811ee18863cb2f0e81f2433a5b9905de`.

| Source | Behavior followed |
| --- | --- |
| [MovesByRating.tsx](https://github.com/CSSLab/maia-platform-frontend/blob/a6e52f5c811ee18863cb2f0e81f2433a5b9905de/src/components/Analysis/MovesByRating.tsx) | Filled curves, per-move colors, shared rating tooltip, adaptive axes, legend and endpoint labels |
| [useMoveRecommendations.ts](https://github.com/CSSLab/maia-platform-frontend/blob/a6e52f5c811ee18863cb2f0e81f2433a5b9905de/src/hooks/useAnalysisController/useMoveRecommendations.ts) | Deduplicated candidate union and quality shade ranks |
| [useEngineAnalysis.ts](https://github.com/CSSLab/maia-platform-frontend/blob/a6e52f5c811ee18863cb2f0e81f2433a5b9905de/src/hooks/useAnalysisController/useEngineAnalysis.ts) | Matched self/opponent rating sweep |
| [utils.ts](https://github.com/CSSLab/maia-platform-frontend/blob/a6e52f5c811ee18863cb2f0e81f2433a5b9905de/src/hooks/useAnalysisController/utils.ts) and [constants/analysis.ts](https://github.com/CSSLab/maia-platform-frontend/blob/a6e52f5c811ee18863cb2f0e81f2433a5b9905de/src/constants/analysis.ts) | Stockfish win-rate-loss quality boundaries and exact palettes |

## Selection and probabilities

Take the selected rating’s top three Maia moves, then Stockfish’s actual top
three roots, then the top Maia move at every sampled rating (600 through 2600 in
100-point steps). Deduplicate by UCI in that order. There is no three/four-move
cap or aggregate popularity ranking: four is the outcome in the reference
screenshot, not a rule.

Each sample uses the same rating for self and opponent, independent of advanced
card opponent settings. Keep the original legal-policy probability; never
renormalize the plotted subset. The Y domain is 0–60% unless any plotted sample
exceeds 60%, then 0–100%. Missing/nonfinite samples are gaps. Position changes
clear old curves immediately; delayed/canceled inference cannot republish them.

## Quality and search evidence

Good means Stockfish win-rate loss at most five percentage points, acceptable at
most ten, otherwise blunder. Rank available engine evidence within each quality
group by mover win rate, then mover centipawns and stable move ID; cap shade rank
at four. The palettes, in rank order, are:

- Good: `#238b45 #41ab5d #74c476 #90D289 #AEDFA4`
- Acceptable: `#ffffcc #ffeda0 #fed976 #feb24c #ec7014`
- Blunder: `#fcbba1 #fc9272 #fb6a4a #ef3b2c #cb181d`

One move uses the same color in its curve, translucent area, points, legend,
endpoint and tooltip. Unknown scores stay neutral. These are quick current-
position estimates, separate from full-game classifications and raw likelihoods.

The existing bounded engine queue searches three genuine root PVs for this
chart, then missing chart candidates. Default ReviewFish callers still request
two PVs. Completeness checks use the requested count and legal root count;
partial iterations do not qualify. Root budget stays depth 12/500ms, candidate
budget 300ms, with minimum depth 8, cancellation and stale-result guards intact.
Late rating leaders drain the queue even when they arrive during completion.

Maia’s site evaluates broader all-legal-root Stockfish coverage and overlays an
opening book through move five. Mute retains its selected local 5M/79M model,
history, engine and bounded search. Different inputs/coverage can change
probabilities, scores and relative shade ranks. This implementation matches the
chart’s selection/presentation rules; it does not promise identical numbers.

## Compact native integration

Keep the existing 190px frame and 149px plot. Every curve and legend item remains
available; a horizontal legend scroll and collision-adjusted endpoint labels
handle larger unions. Dense endpoint labels alone are bounded by available
height. Areas fade from 0.5 to zero opacity as in the reference.

Hover/focus uses native `ceval.hovering` and `setAutoShapes` without playing or
altering the tree. Ownership checks preserve a newer engine/explorer hover,
including a replacement for the same move. The shared tooltip shows SAN and raw
probabilities at the hovered rating. One roving chart tab stop supports arrow
navigation and Home/End; missing samples are skipped. Enter/Space retains the
existing native rating-selection action. Native board shortcuts are suppressed
only for chart navigation keys. Legend activation retains the native variation
preview/return action. These interactions are compact/native adaptations.

## Verification and maintenance

Run all native UI tests and build/type checks, targeted formatting/typed lint,
and departure-register checks. Regressions cover uncapped union order, raw
probabilities, 60/100 boundaries, gaps, tooltip/keyboard behavior, quality shades,
three-PV protocol completeness, actual matched input calls, stale cancellation,
hover ownership and late quality leaders. Independently reviewed by a second
Codex agent; automated/browser evidence is not human acceptance testing.

After rebasing, compare the three-PV protocol option with native worker handling,
`ceval.hovering` ownership and key propagation. No private Maia API, remote
inference, new dependency, rules, ratings or classification change is involved.


### October 31 local evidence

The full native UI suite passes 358 tests in 37 suites; the full UI build/type
check, formatting, typed lint and SCSS lint pass. The exact-path/pin check covers
245 Lila files and two lila-ws files; five register regressions pass.

A local native-browser build at the reference FEN shows four uncapped series,
a 60% domain and a raw-probability tooltip at keyboard-focused Maia 1600. A second
position exceeding 60% switches to 100%. Both card frames measure 184px and the
chart frame 190px. The six-move annotated fixture exercises imported glyphs,
actual native review/metrics and count-button jumps. All six summary symbol/name
gaps measure 7.77px with approximately 30px rows. Computed board brilliant fill
and unselected tree glyph are `rgb(21,170,191)`; the Good badge remains native
`rgb(34,172,56)`. Imported fixture labels are test annotations, not classifier
awards. Screenshots and logs are retained locally under
`maia-rating-chart-2026-10-31/`; this is automated browser evidence, not human
acceptance or a claim of deployment. Public deployment is held until the active
bot experiment’s verified final cleanup handoff.
