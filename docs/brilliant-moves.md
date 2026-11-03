# Brilliant moves: Mute Selective

For **Mute Selective**, we trained a small model on chess moves labeled by
Chess.com and combined it with basic soundness and legal-piece-offer checks.
It recognizes more Chess.com Brilliants than
En Croissant while keeping undeserved badges low in our tests.
**Mobile Maia keeps its existing En Croissant classifier.**

The browser downloads the model with the analysis JavaScript and runs it locally
in a background worker. Stockfish provides evaluations; the model uses those and
facts about the position to decide whether to award Brilliant. This decision-tree
model runs in ordinary JavaScript, without ONNX, a GPU requirement, ChatGPT or a
remote classification service. It does not learn during play. Both the trained
model and the code used to train it are openly published.

En Croissant decides its Brilliant badge using rules written by its developers.
Mute Selective uses basic chess checks plus patterns learned from Chess.com’s
labeled examples. Both still rely on engine analysis.

This is our open implementation, not Chess.com's unpublished formula.
No human manual testing is claimed.

## What the tests show

The [illustrated study](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/REPORT.md)
compares unchanged classifiers on **400 labeled moves from 215 games** that were
not used to train the model. There are 200 confirmed Chess.com Brilliants and
200 moves explicitly classified non-Brilliant. The same model, threshold and
feature calculations were fixed before these labels; no retraining or tuning
was used to produce the results.

| Classifier | Brilliants recognized | Undeserved Brilliant badges |
| --- | ---: | ---: |
| Mute Selective | **112 / 200** | **3 / 200** |
| En Croissant | 53 / 200 | 3 / 200 |

The selective classifier finds about **2.1 times as many Brilliants**, with the
same number of wrong badges in these tests. It recognizes 56% of the studied
Brilliants; 112 of its 115 awards match Chess.com. Overall agreement is 77.3%,
versus En Croissant's 62.5%. These are different measurements, not interchangeable
claims of accuracy.

On the newest 200 moves, Mute Selective recognizes 57/100 Brilliants with 2/100
wrong awards, versus En Croissant's 27 and one. History Rule with recovery
recognizes 78 but gives 13 wrong awards. We examined methods that found more
Brilliants, but their wrong awards were too frequent to justify choosing them.
History and its recovery guard are comparisons, not additional runtime filters.
The selective model independently rejects both illustrated hxg6/hxg5 tactics;
it misses some genuine ideas, including the illustrated quiet Bg2.

## How we plan to improve

Keep the model fixed for this release. More labeled examples can help a future
version, particularly missed genuine Brilliants and difficult ordinary tactics.
The 400 current test moves can become training examples, but they then cease to
be an independent test of the new model. Reserve different complete games,
exclude duplicate positions across the training/test boundary, and finish
training before testing the new version on those games. Favor
changes that recognize more genuine Brilliants while keeping wrong awards low;
do not improve recognition simply by lowering the threshold. Publish both counts
for each candidate and compare it with this fixed baseline.

The samples emphasize nearby tactical comparisons from five established
accounts. They do not establish ordinary-game badge frequency, beginner behavior,
population precision or measured fun. The fixed SF18 research inputs and saved
native parity do not establish classification accuracy under native SF19 or
variable timed review profiles. The recent native History review does not
validate this selective model. Browser interaction and human testing remain
outside the completed evidence.

## Exact frozen classifier

The [versioned research reference](https://github.com/Dash1971/mute-chess-research/tree/main/studies/brilliant-moves/reference/v5)
provides the frozen extractor, model and protocol. The native adapter is
`ui/analyse/src/noSweatBrilliantForest.ts`, with static weights in
`noSweatBrilliantForestModel.json`, carried by the
[Lila patch](../deploy/lila/patches/lila-nostr-maia.patch). The worker selects v5.
The internal v4 reference branch is not exposed as a review-mode choice.

The forest has **64 trees and 75 semantic features**, plus a missingness indicator
for each feature. Each tree returns its unweighted positive fraction at the
selected leaf; the classifier averages those fractions. The result is a model
score, not a calibrated probability. Both the current and corroborating engine
windows must each score **at least 5/6** and satisfy these hard gates:

1. At least two complete, distinct candidate roots before the move.
2. A raw legal piece offer after the played move.
3. At most **5 percentage points** lost relative to the best before-score under
   `W(cp) = 100 / (1 + exp(-0.00368208 * cp))`.
4. The after-score is at least **−100 cp**, from the mover's perspective.
5. Complete-window confidence, including nonempty matching quality metadata.

Mate scores use the reference's signed normalization. The played move need not
be the first or uniquely best root. The raw offer test considers mover-owned
non-pawn, non-king pieces and legal captures followed by optimal same-square
recaptures, with either side allowed to stop. A profitable acceptance must exceed
`max(0, moverMaterial(after) - moverMaterial(before)) + 100`. This credits immediate
captures and promotions rather than mistaking their proceeds for a sacrifice.
Material values are pawn 90, knight/bishop 300, rook 500 and queen 1,000.

The EC material heuristic, mating replies, phase-aware safe alternatives,
checked continuations, attribution, avoidability, physical refunds and prior
engine context are **predictors, not additional hard vetoes**. V5 is not the old
EC-material gate followed by a model. No player identity, game ID, move lookup,
Chess.com label, rating whitelist or Maia likelihood is a runtime predictor.

The feature-specific probes retain the frozen reference's bounds: attribution,
avoidability and stalemate checks use bounded legal proofs; the physical probe
examines three plies of captures/promotions, including legal check evasions,
within 10,000 nodes and 250 ms. Unknown results remain explicitly missing rather
than being invented. Native numeric inputs reject NaN and infinity.

The native adapter adds one conservative safeguard beyond the frozen research
reference: **an incomplete physical probe prevents both provisional and final
Brilliant awards**. No physical timeout was observed in either the 1,048-case parity
replay or the additional 200-case parity check, so this guard changes none of
those recorded decisions. It addresses an unrepresented
missingness condition on slower devices; it is not a claim of calibrated behavior
under timeouts. Other optional unknowns, including avoidability unknowns seen in
training, retain the frozen model's handling.

## Confirmation, fallback and native behavior

The classifier evaluates the current and previous complete engine iterations.
An independent confirmation can replace the second window while leaving the
first unchanged. Its metadata must match, its completed depth must not be lower,
and terminal evidence must be preserved. A contradictory or incomplete window
withholds the standout award. Ordinary EC `!` retains its preceding-position
confirmation requirements.

Full review retains its existing six-search confirmation allowance. Fast targets
depth 12 / 500 ms per position, Balanced 14 / 1,000 ms, and Thorough 16 / 1,500 ms.
Only unsupported standout candidates consume that allowance, targeting two more
depths with the selected mode's time cap. The forest adds no Stockfish searches
or roots. Its legal/material work runs in the cancellable classification worker;
worker failure, cancellation or the existing 10-second watchdog publishes no
result. Results are checked again before committing glyphs.

The legacy additive verifier supplies only two board positions, so prior history
and prior engine features are honestly missing. Full review normally supplies
three positions, but its two-review confirmation of `!!` also leaves the second
window's prior engine features missing. These paths are not equivalent to the
saved three-position, fixed-budget research evidence and remain native validation
caveats. No fabricated history or extra search fills the gap.

When the forest does not award `!!`, ordinary EC annotations retain their normal
meaning and confirmation. Sacrifice-derived `!!`/`!?` is cleared if there is no
raw legal piece offer; an EC `!!` otherwise falls back to `!?` when its sacrifice
and score permit it. The original EC policy and reference functions remain
available unchanged. Accuracy and centipawn loss calculations are unchanged.

Computed v5 badges carry `mute-chess-brilliant-v5` provenance. Imported PGN
judgments remain authoritative, and computed provenance versions v1–v5 are
recognized by conflict protection. Native evaluations, analysis-tree ownership,
clocks and outcomes are unchanged. Explicit fresh review may replace computed
judgments; there is no historical batch or silent rewrite of saved badges.

## Verification and limits

The [versioned validation record](../analysis/data/brilliants-v5-validation.json)
pins the model, native source and maintained patch, with the actual check results.

The TypeScript feature adapter and integrated classifier were replayed against
all **848 development + 200 fresh cases** using their exact saved engine inputs:
no categorical/missingness, model-decision or integrated Brilliant differences
were found; floating differences were limited to machine rounding. EC result
objects also matched the independent reference replay. Focused tests cover input
validation, confirmation, actual worker dispatch, cancellation and glyph/import
protection. These checks validate implementation parity, not a second independent
accuracy test. The fresh set must not be used to retune this model or threshold.

The research used Stockfish 18, one thread, 64 MB hash and 300,000 requested nodes
per position with full PGN history. Native Stockfish 19 and timed modes produce
different inputs. Even changing only the research node budget changed predictions,
so source parity cannot establish native accuracy. Saved-input parity does not establish behavior on every browser or device;
human review remains an important validation step.

The independent EC score/material sources are pinned to v0.15.0 commit
`6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53` and were verified byte-identical to
v0.15.1 commit `4932c9231517f6fd75e5a97902b207c7dc82e61f`, the latest stable
release checked on November 3, 2026. This is source equivalence, not equivalence
of complete applications or their engine collection. Source pins, full outcomes,
selection limitations and sensitivity results are retained in the public study.

Prepared with OpenAI Codex assistance. No upstream contribution, human manual
test is claimed.
