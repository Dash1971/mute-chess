# Moves by Rating source audit

Moves by Rating includes current-position quality colors and Maia's move-hover
details. The native board/tree,
graph, accuracy, ACPL, whole-game classifications and review controls remain intact.

Reference: [CSSLab/maia-platform-frontend](https://github.com/CSSLab/maia-platform-frontend/tree/325b85c3b6427f2e8e691e1dcf4ab9d4dbf94ec3),
GPL-3.0, revision `325b85c3b6427f2e8e691e1dcf4ab9d4dbf94ec3`.

| Source | Behavior followed |
| --- | --- |
| [MovesByRating.tsx](https://github.com/CSSLab/maia-platform-frontend/blob/325b85c3b6427f2e8e691e1dcf4ab9d4dbf94ec3/src/components/Analysis/MovesByRating.tsx) | Filled curves, per-move colors, shared rating tooltip, adaptive axes, legend and endpoint labels |
| [useMoveRecommendations.ts](https://github.com/CSSLab/maia-platform-frontend/blob/325b85c3b6427f2e8e691e1dcf4ab9d4dbf94ec3/src/hooks/useAnalysisController/useMoveRecommendations.ts) | Deduplicated candidate union and quality shade ranks |
| [useEngineAnalysis.ts](https://github.com/CSSLab/maia-platform-frontend/blob/325b85c3b6427f2e8e691e1dcf4ab9d4dbf94ec3/src/hooks/useAnalysisController/useEngineAnalysis.ts) | Matched self/opponent rating sweep |
| [utils.ts](https://github.com/CSSLab/maia-platform-frontend/blob/325b85c3b6427f2e8e691e1dcf4ab9d4dbf94ec3/src/hooks/useAnalysisController/utils.ts) and [constants/analysis.ts](https://github.com/CSSLab/maia-platform-frontend/blob/325b85c3b6427f2e8e691e1dcf4ab9d4dbf94ec3/src/constants/analysis.ts) | Stockfish win-rate-loss quality boundaries and exact palettes |

## November presentation update (unreleased)

The draft for [#413](https://github.com/Dash1971/mute-chess/issues/413) follows
Maia's November chart presentation at
[`50083f295d7043b54eeaa2f53f459b1c5aee9937`](https://github.com/CSSLab/maia-platform-frontend/tree/50083f295d7043b54eeaa2f53f459b1c5aee9937).
This section describes the candidate source, not a deployed release. The earlier
reference above still supplies the unchanged quality/search behavior.

| November source | Adapted behavior |
| --- | --- |
| [useMoveRecommendations.ts](https://github.com/CSSLab/maia-platform-frontend/blob/50083f295d7043b54eeaa2f53f459b1c5aee9937/src/hooks/useAnalysisController/useMoveRecommendations.ts) | At most six natural compact-chart candidates |
| [MovesByRatingArea.tsx](https://github.com/CSSLab/maia-platform-frontend/blob/50083f295d7043b54eeaa2f53f459b1c5aee9937/src/components/Analysis/MovesByRatingArea.tsx) | Lighter nested curves, selected-rating shares and emphasis |
| [movesByRatingLayout.ts](https://github.com/CSSLab/maia-platform-frontend/blob/50083f295d7043b54eeaa2f53f459b1c5aee9937/src/components/Analysis/movesByRatingLayout.ts) | Standard axis tops, endpoint/strong interior-peak labels and collision avoidance |

## Selection and probabilities

In the compact chart, retain Stockfish's best evaluated move and Maia's
highest-peak-probability move. Add other moves whose peak across the full rating
sweep reaches 15%, ordered by peak probability, up to six total. When there is
room and no selected blunder, add the most likely Stockfish-classified blunder
whose peak reaches 5%. Deduplicate by UCI. Changing the selected rating does not
change this compact candidate set. An uncommon engine-best answer is retained
even when its model probability is very small.

This deliberately shows fewer moves than the previous uncapped union. The
[Maia Lab](maia-lab.md) candidate control remains independent: six or eight
candidates, retaining the best three evaluated roots before Maia's choices.
A move omitted from the compact graph can therefore still appear in Lab.

Each sample uses the same rating for self and opponent, independent of advanced
card opponent settings. Keep the original legal-policy probability; never
renormalize the plotted subset. The Y domain is the smallest fitting standard
top: 20%, 40%, 60%, 80% or 100%. Missing/nonfinite samples remain gaps. Position
changes clear old curves immediately; delayed/canceled inference cannot
republish them. Model weights, input history and opening-book policy are unchanged.

## Quality and search evidence

Good means Stockfish win-rate loss at most five percentage points, acceptable at
most ten, otherwise blunder. Rank available engine evidence within each quality
group by mover win rate, then raw White-perspective centipawns and stable move ID; cap shade rank
at four. The palettes, in rank order, are:

- Good: `#238b45 #41ab5d #74c476 #90D289 #AEDFA4`
- Acceptable: `#ffffcc #ffeda0 #fed976 #feb24c #ec7014`
- Blunder: `#fcbba1 #fc9272 #fb6a4a #ef3b2c #cb181d`

One move uses the same color in its curve, translucent area, points, legend,
endpoint and tooltip. Unknown scores stay neutral. These are quick current-
position estimates, separate from full-game classifications and raw likelihoods.

Shade ranking uses the complete legal-root pool rather than changing when Others
opens. Preserve Maia's exact palettes.

Follow Maia's `staged-root-probe` strategy: screen **every legal root** to depth 10,
publishing only complete MultiPV iterations. Then deepen up to four Maia moves
covering 95% policy per active channel, plus the played continuation, to depth 14;
deepen four Stockfish roots to 18; and finish selected candidates at 18. Retain the
complete root vector throughout. Native castling UCIs normalize to standard UCI.
Others only expands the presentation and schedules no analysis. Cards, chart,
legend and move popup share the same current mapping; chart Stockfish candidates
come from the current merged vector, not a stale earlier root search.

Good means loss <= 0.05 and acceptable <= 0.10 with no epsilon. Convert mates to
+/-10000 CP before the empirical lookup clamps to its +/-1000CP endpoints; do
not replace this empirical measure with 0/1. Color loss uses the maximum empirical
win rate. CP loss separately uses the best mover-relative CP. Ties in win-rate
loss follow raw White CP descending and UCI lexical order, including Black.

Mute uses native Stockfish 19/1MB and retains its existing 15 second per-phase
watchdog, cancellation and stale-result checks. Upstream Maia uses depth-only
searches without this watchdog. Completed complete vectors remain usable after a
deepening timeout; a timed-out worker is discarded before another search. Native
review callers retain their original two-PV defaults and whole-game policy.
Models/history, engine versions and Maia's opening-book overlay can still produce
different probabilities or evaluations; this is not a promise of identical numbers.

Move-hover details follow `MoveTooltip.tsx`: Maia raw probability (one decimal
percent), SF Eval (White perspective, two decimals or signed mate), SF Winrate
(the empirical mover-perspective lookup), and SF Eval Loss (mover-relative
move-minus-best CP, two decimals). Missing metrics are omitted. Keyboard focus
also opens the popup; Escape/destroy/navigation clean it up. The chart's existing
shared probability tooltip remains separate, matching Maia's chart interaction.

## Compact native integration

Keep the existing 190px frame and 149px compact plot. Main curves retain their
quality color; less prominent curves are thinner and translucent. Main washes
fade from 0.18 opacity to zero; minor washes start at 0.07. Only the chosen
rating has visible dots; other samples retain keyboard and pointer targets.

Endpoint names are separated vertically and connected back to their true values.
A strong interior peak may receive a SAN label. Selected-rating percentage labels
appear only where they fit without colliding with other labels or curves; the
shared tooltip retains all selected moves and precise raw probabilities. Hover
or focus raises the active curve and dims other curves without moving native
keyed chart elements. Native exact quality colors are retained, rather than
introducing a separate chart palette. Long translated axis captions fit the
compact plot; all text uses existing native catalog entries.

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
and departure-register checks. Regressions cover six-move selection, rare engine answers, likely-blunder
thresholds, independent Lab candidates, raw probabilities, all five axis tops,
label spacing, gaps, tooltip/keyboard behavior, quality shades,
complete all-root protocol publication, exact matched inputs, cancellation,
castling normalization, expansion-independent shading, merged-root ordering,
mate/Black parity, popup metrics/lifecycle, watchdog recovery and hover ownership. Automated/browser evidence is distinct from human acceptance testing.

After an upstream merge, compare opt-in all-root screening with native worker handling,
`ceval.hovering` ownership and key propagation. No private Maia API, remote
inference, new dependency, rules, ratings or classification change is involved.


The [November 27 draft comparison](records/2026-11-27-rating-chart413.md) records
real-position renderer screenshots, locale checks and validation limits.

The [October 31 validation record](records/docs398-maia-rating-chart-history.md#october-31-local-evidence)
retains the original test counts, source footprint, screenshots and study hold.
Those dated notes do not place the deployed chart on hold.

<details>
<summary>Historical section links</summary>

<a id="moves-by-rating-source-audit-146"></a>
- [Moves by Rating source audit (#146)](records/docs398-maia-rating-chart-history.md#moves-by-rating-source-audit-146)

<a id="october-31-local-evidence"></a>
- [October 31 local evidence](records/docs398-maia-rating-chart-history.md#october-31-local-evidence)

</details>
