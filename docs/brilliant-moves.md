# Brilliant moves: Mute Selective

For **Mute Selective**, we trained a small model on chess moves labeled by
Chess.com and combined it with basic soundness and legal-piece-offer checks.
The updated forest recognizes more reference Brilliants and gives fewer wrong
awards than the older forest on the fresh-account test below.
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

The frozen **128-tree model at 0.83 with PR285 complete-window confirmation**
was tested on 1,000 games from Witty_Alien using the site's **Stockfish 19 1MB
engine and Fast full-game review**. No moves from that account were used to train
the model or tune its cutoff.

| Version | Brilliants recognized | Wrong Brilliant awards |
| --- | ---: | ---: |
| Existing production | 721 / 1,234 | 57 / 30,423 |
| Older model + PR285 | 725 / 1,234 | 58 / 30,423 |
| **New Selective + PR285** | **774 / 1,234** | **38 / 30,423** |

Recognition is **62.7%**; false-positive rate is **0.125%**, using all 30,423
primary account-own gallery-negative moves as its denominator. Compared with the
older model on the same confirmation path, the update gains 95 genuine awards
and loses 46, while removing 27 wrong awards and adding 7: **net +49 genuine and
20 fewer wrong awards**. It still misses 460 reference Brilliants.

The test keeps complete games for scheduling and scores only the studied
account's moves. One positive before-position overlapping earlier research was
excluded from all three primary totals. Labels come from the complete captured
gallery and official PGNs: 496 have independent rendered-board/arrow checks;
739 have gallery-link, UUID/ply, mover and legal-PGN identity checks. The latter
are not independently board-verified. Gallery absence is the agreed negative
reference within these represented games. The fixed ranking was expanded from
200 to 1,000 games after partial results, without changing models or cutoffs.

See [native review validation](brilliant-native-review-validation.md),
[compact result counts](../analysis/data/brilliants-selective-fast-2026-11-06.json)
and the [published experiment](https://github.com/Dash1971/open-brilly-finder/blob/main/studies/brilliant-selective-2026-11-06/REPORT.md).
These are automated native replays, not a browser interaction test across every
device. The sample does not establish beginner behavior, population precision,
ordinary-game badge frequency or results for Balanced, Thorough or other engines.

### Historical 64-tree model and En Croissant comparison

The earlier 64-tree model recognized 108/200 Brilliants with 3/200 wrong awards
on a 400-move native SF19 Fast test. On the separate saved SF18 / 300,000-node
research inputs, it recognized 112/200 with 3/200 wrong awards, versus En
Croissant's 53/200 with 3/200. These are historical results for that earlier
model, not independent validation of the new forest. En Croissant was not
measured on the Witty_Alien sample. The [historical report](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/REPORT.md)
preserves the comparison and illustrated examples.

The older model missed the illustrated Bg2; the new forest recovers it on its
archived SF18 fixture. Both still withhold Brilliant on the personal Legal's
Mate and Greek Gift examples in the Fast diagnostic: Ne5 remains `!` and Bxh2+
remains `!?`. Those two examples are separate from the statistical test. The
Greek Gift has no confirmed Chess.com label in this study.

## Further improvement

The updated forest was trained on 6,293 labeled development moves with improved
tree settings and the same position features and hard chess checks. More
generous alternatives found more Brilliants but gave too many wrong awards for
the preferred tradeoff. Prioritize broader coverage while keeping wrong awards
low. Keep this fresh test separate from training, and test future changes on new
games rather than tuning against these labels.

## Exact frozen classifier

The [published selective study](https://github.com/Dash1971/open-brilly-finder/tree/main/studies/brilliant-selective-2026-11-06/)
provides the frozen model, training procedure and validation evidence. The native adapter is
`ui/analyse/src/noSweatBrilliantForest.ts`, with static weights in
`noSweatBrilliantForestModel.json`, carried by the
[Lila patch](../deploy/lila/patches/lila-nostr-maia.patch). The worker selects v5.
The internal v4 reference branch is not exposed as a review-mode choice.

The forest has **128 trees and 75 semantic features**, plus a missingness indicator
for each feature. Each tree returns its unweighted positive fraction at the
selected leaf; the classifier averages those fractions. The result is a model
score, not a calibrated probability. Both the current and corroborating engine
windows must each score **at least 0.83** and satisfy these hard gates:

1. At least two complete, distinct candidate roots before the move.
2. A raw legal piece offer after the played move.
3. At most **5 percentage points** lost relative to the best before-score under
   `W(cp) = 100 / (1 + exp(-0.00368208 * cp))`.
4. The after-score is at least **−100 cp**, from the mover's perspective.
5. Complete-window confidence, including nonempty matching quality metadata.

The model SHA-256 is
`1a7150fbe52f440922d94d3ae2af337383d63f370b52d0379aeee22d581d056c`.
Its trees have maximum depth 12, minimum two distinct cases per leaf and 24
candidate features per split. Missing numeric values route left. The cutoff is
a fixed decision threshold, not an 83% probability of a correct badge.

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
depths with the selected mode's time cap. Confirmation searches the same available
prior/before/after window as the initial decision: three positions, or two when
there is no preceding position. The six-search ceiling remains unchanged, so two
three-position confirmations can exhaust it. The forest itself adds no Stockfish
searches or roots. Its legal/material work runs in the cancellable classification worker;
worker failure, cancellation or the existing 10-second watchdog publishes no
result. Results are checked again before committing glyphs.

The legacy additive verifier supplies only two board positions, so prior history
and prior engine features are honestly missing. Full review supplies the available
three-position context to both the initial decision and any additional confirmation.
The additive path remains different from full review. Neither path is equivalent
to the saved fixed-budget SF18 research evidence merely because its source matches.

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

## Historical implementation parity and current limits

The [versioned validation record](../analysis/data/brilliants-v5-validation.json)
pins the original 64-tree model, native source and maintained patch, with its historical check results. The new model and fresh-account counts are pinned separately in the [selective Fast record](../analysis/data/brilliants-selective-fast-2026-11-06.json).

For the original model, the TypeScript feature adapter and integrated classifier were replayed against
all **848 development + 200 fresh cases** using their exact saved engine inputs:
no categorical/missingness, model-decision or integrated Brilliant differences
were found; floating differences were limited to machine rounding. EC result
objects also matched the independent reference replay. Focused tests cover input
validation, confirmation, actual worker dispatch, cancellation and glyph/import
protection. These checks validate implementation parity, not a second independent
accuracy test. These historical sets do not supply independent accuracy evidence for the updated forest.

The fixed research comparison used Stockfish 18, one thread, 64 MB hash and 300,000 requested nodes
per position with full PGN history. Native Stockfish 19 and timed modes produce
different inputs. Even changing only the research node budget changed predictions,
so source parity alone cannot establish native accuracy. The original 400-move replay and new 1,000-game test address SF19 Fast separately for their respective models. Saved-input parity does not establish behavior on every browser or device;
human review remains an important validation step.

The independent EC score/material sources are pinned to v0.15.0 commit
`6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53` and were verified byte-identical to
v0.15.1 commit `4932c9231517f6fd75e5a97902b207c7dc82e61f`, the latest stable
release checked on November 3, 2026. This is source equivalence, not equivalence
of complete applications or their engine collection. Source pins, full outcomes,
selection limitations and sensitivity results are retained in the public study.

Prepared with OpenAI Codex assistance. No upstream contribution, human manual
test is claimed.
