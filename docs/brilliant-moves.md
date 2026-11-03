# Brilliant moves: precision-first Mute v5

Mute Chess's draft `mute-chess-brilliant-v5` uses a fixed forest to award more
sound sacrifices than the En Croissant reference while keeping extra awards low.
It changes Mute's computed Brilliant eligibility. Mobile Maia stays unchanged.
This is an open experiment, not a reproduction of Chess.com's unpublished
classification formula or an objective measure of creativity.

**Draft only: no merge or deployment is authorized.** Native Stockfish 19 and
variable timed review profiles remain unvalidated. No human manual testing is
claimed.

## What the fresh test shows

The [public study](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/REPORT.md)
contains 1,048 moves from 545 games: 848 development moves and a separate fresh
200-move test from 106 games. The model, threshold, feature extraction and test
selection protocol were frozen before the fresh labels were collected. The fresh
set contains 100 currently confirmed Chess.com Brilliants and 100 explicitly
non-Brilliant controls, balanced across five public accounts. Prior development
games and positions were excluded. Historical gallery disagreements and controls
that turned out to be Brilliant were retained separately, not silently relabeled
or counted in the primary 200.

| Classifier | True awards | Missed Brilliants | Extra awards | Correct non-awards | Agreement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct En Croissant rule | 26 | 74 | 2 | 98 | 62% |
| Mute v5 fixed forest | 55 | 45 | 1 | 99 | 77% |
| Separate temporal-rule comparator S | 78 | 22 | 5 | 95 | 86.5% |

V5's badge precision is 55/56, or **98.2%**; its recognition rate is **55%**.
Neither is overall agreement. The **90% agreement goal remains unmet**. S trades
more extra awards for more recognized Brilliants and is not the native default.
The direct, unchanged EC rule is the external peer; imposing Mute's confirmation
wrapper on EC is a separate comparison, not a replacement for that baseline.
All receive the same saved engine evidence.

The controls emphasize nearby, challenging moves rather than a random sample of
ordinary play. Moves share games and accounts. The results do not establish
population badge precision, beginner behavior, normal award frequency or measured
fun. One extra `Rxd7+` award remains. The known ordinary `Ndxe5` tactic is rejected,
but genuine `Nxd5` and quiet `Bg2` examples are missed. Those illustrations must
not be presented as successful Mute awards or added to the fresh-test totals.

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
Brilliant awards**. No physical timeout was observed in the 1,048-case parity
replay, so this guard has no observed effect there. It addresses an unrepresented
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
so source parity cannot establish native accuracy. Browser/device runtime and
human review remain necessary before a release decision.

The independent EC score/material sources are pinned to v0.15.0 commit
`6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53` and were verified byte-identical to
v0.15.1 commit `4932c9231517f6fd75e5a97902b207c7dc82e61f`, the latest stable
release checked on November 3, 2026. This is source equivalence, not equivalence
of complete applications or their engine collection. Source pins, full outcomes,
selection limitations and sensitivity results are retained in the public study.

Prepared with OpenAI Codex assistance. No upstream contribution, human manual
test, merge or deployment is claimed.
