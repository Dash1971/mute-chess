# Brilliant moves: the Mute Chess experiment

Owner direction, November 2, 2026, [#221](https://github.com/Dash1971/mute-chess/issues/221):
make the site more fun by awarding more sound sacrifices as brillies, and publish
exactly how the algorithm works. This is a Mute Chess change. Mobile Maia stays
with En Croissant. The draft PR does not authorize merging or deployment.

## What we can say about Chess.com

Chess.com's [official classification explanation](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc)
describes a best or nearly best piece sacrifice that leaves an acceptable
position, without an easy win already available. It reports greater generosity
for newer players. It does not publish the exact sacrifice test, numerical gates
or rating curve. Those details cannot be recovered from this small sample.

The profile galleries of [Nelson Lopez](https://www.chess.com/member/nelsi/stats/all-brilliant-moves?time=0),
[Eric Hansen](https://www.chess.com/member/hansen/stats/all-brilliant-moves?time=0),
[Ju Wenjun](https://www.chess.com/member/Juwen/stats/all-brilliant-moves?time=0) and
[Aman Hambleton](https://www.chess.com/member/KNVB/stats/all-brilliant-moves?time=0)
were inspected in Safari on November 2, 2026. Nine gallery examples from six games
were transcribed and compared with the unchanged En Croissant annotation
function under local Stockfish 18 evidence. The engine used one thread, 64 MB
hash, and 300,000/1,500,000-node budgets per position. Complete, exact, same-depth
MultiPV iterations were retained, with a forward preceding/before/after window
and hash cleared for each comparison. The material calculation was a Python
translation of the pinned reference, not a live Mobile Maia/Mute application run.

| Move | Gallery | Fresh Chess.com review observed | EC, 300k / 1.5m nodes | Mute v1 eligibility, same scores |
| --- | --- | --- | --- | --- |
| [Ju 19.Bb2](https://www.chess.com/analysis/game/live/172016241890?move=36) | `!!` | `!!`, +0.62 | `!?` / `!?` | `!!` / `!!` |
| [Aman 11.Bxh7+](https://www.chess.com/analysis/game/live/186066291740?move=20) | `!!` | `!!`, +0.86 | `!?` / `!?` | `!!` / `!!` |
| [Hansen 31.Nd7](https://www.chess.com/analysis/game/live/183990510823?move=60) | `!!` | `!!`, +4.21 | blank / blank | `!!` / `!!` |
| [Hansen 34.Rxd6](https://www.chess.com/analysis/game/live/183990510823?move=66) | `!!` | Not rechecked | `!?` / `!?` | `!!` / `!!` |
| [Hansen 29.Rxa1](https://www.chess.com/analysis/game/live/184007910437?move=56) | `!!` | `!!`, +6.40 | `!!` / `!!` | `!!` / `!!` |
| [Nelson 19.f5](https://www.chess.com/analysis/game/live/186399008010?move=36) | `!!` | `!!`, +2.08 | `!?` / `!!` | `!!` / `!!` |
| [Ju 19.Rxd5](https://www.chess.com/analysis/game/live/119215241095?move=36) | `!!` | `?!`, +0.79 | `!?` / `?!` | `!!` / `?!` |
| [Ju 20.Nf5](https://www.chess.com/analysis/game/live/119215241095?move=38) | `!!` | `?!`, +0.48 | blank / blank | `!!` / `!!` |
| [Ju 27.Nxf7+](https://www.chess.com/analysis/game/live/119215241095?move=52) | `!!` | Not rechecked | blank / blank | `!!` / `!!` |

Evaluations in the fresh-review column are White's advantage, not Mute's scoring
inputs. A blank means no EC annotation, not a bad move. Earlier local runs also
left Nelson's move below the EC uniqueness cutoff, illustrating search sensitivity.
The [recorded inputs, scores, PGNs and limitations](data/brilliants-2026-11-02/comparison.json)
retain this evidence. The two gallery/fresh-review disagreements are observations;
we do not know whether they result from engine, algorithm or historical changes.

The Mute column replays eligibility, before real review corroboration. Rxd5's
two recorded windows disagree, so using them as baseline/confirmation withholds
its award. Nf5 qualifies under both local score windows even though fresh
Chess.com calls it inaccurate. That disagreement is retained openly; neither
matching historical trophies nor rejecting a named move is hard-coded.

This is a selected positive sample of four titled players. It is not a random
corpus, a precision/recall estimate, evidence of beginner behavior, or proof of
Chess.com's hidden implementation. The new gates were chosen with these examples
in view; they are development examples, not held-out validation. Fresh-confirmed
examples should not be conflated with historical gallery-only awards.

## The original En Croissant / Mobile Maia rule

Our independent [scoring reference](../analysis/reference/score.ts) and
[material reference](../analysis/reference/material.rs) are pinned to En Croissant
v0.15.0, commit `6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53`:
[score.ts](https://github.com/franciscoBSalgueiro/en-croissant/blob/6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53/src/utils/score.ts),
[chess.rs](https://github.com/franciscoBSalgueiro/en-croissant/blob/6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53/src-tauri/src/chess.rs).
The inspected Mobile Maia preview was `8563954429c2fb53ce0fe0e16c73c5d8a73ccfe0`:
[MoveClassifier](https://github.com/Dash1971/maia-chess-android-preview/blob/8563954429c2fb53ce0fe0e16c73c5d8a73ccfe0/lib/src/review_widgets.dart).

The EC function first assigns `??`, `?`, `?!` for mapped winning-chance losses
strictly greater than 20, 10 and 5 percentage points. Otherwise it awards `!!`
when the played move is the first candidate, its mapped score exceeds the second
candidate by more than 10 points, and material sacrifice detection succeeds.
Sacrifices outside that branch can receive `!?` if the resulting score is above
−200 cp. The `!` branch has its own uniqueness and preceding-position test.
Mobile Maia adds reliable evidence collection and whole-window corroboration.

The EC material predicate is `M(before) > -M(after) + 100`, excluding terminal
positions. `M` considers every legal root move followed by a material-only
capture search; either side can stop capturing. This is a heuristic, not a
Stockfish evaluation. It can miss meaningful temporary piece offers because
later captures restore material. In Hansen's Nd7 example its net change is only
90 material units, below the strict greater-than-100 test.

## Exact Mute Chess policy: mute-chess-brilliant-v1

The [README](../README.md#more-chances-to-find-a-brilliant-move) specifies every
eligibility gate and threshold. The implementation is in the namespaced native
`ui/analyse/src/noSweatClassify.ts`, carried by our
[Lila patch](../deploy/lila/patches/lila-nostr-maia.patch). The original
`annotation()` and `isSacrifice()` remain unchanged for EC compatibility tests.
The classification worker explicitly selects `mute-brilliant-v1`; Mobile Maia
and the independent references are not modified.

The exact decision order is:

1. Calculate the EC annotation with the existing scores/material predicate.
   If it is `??`, `?` or `?!`, return it; a sacrifice does not rescue a bad move.
2. Apply the README's six Mute eligibility conditions. In particular, use
   `W(best-before) - W(after) <= 5`, `after >= -100 cp`, and veto any *other
   evaluated* non-sacrificing candidate at `>= +600 cp`. Passing means provisional
   `!!`, even if the played move is second or outside the searched pair.
3. If those gates fail, retain the EC label, except an EC `!!` becomes `!?`
   when its sacrifice remains above −200 cp, or blank otherwise.
4. Corroborate every provisional `!!`/`!` through the existing whole-window
   reliability checks before publishing it. A withheld label is not an award.

Material qualification is the OR of the unchanged EC heuristic and a new piece
offer test. For each mover-owned non-pawn, non-king piece after the move, compute
the opponent's best material gain from legal captures on that piece's square.
After each capture, the other side may capture on that same square or stop;
the best result is found recursively. Recaptures, legal pins, en passant where
relevant and promotion gains use Chessops legality and the published material
values. Quiet continuations and captures on other squares are not part of this
local exchange calculation: Stockfish judges the position's actual soundness.

Credit is `max(0, moverMaterial(after) - moverMaterial(before))` using raw board
material, so a free capture or promotion cannot masquerade as an equal/lower-value
piece offer. A local exchange gain must be **strictly greater** than credit plus
100. An already-attacked piece may remain offered; the opponent need not accept
it in the played game. The EC branch still permits material sacrifices without
an immediate non-pawn offer, including some multi-pawn sacrifices. A single
pawn worth 90 units does not by itself clear its 100-unit threshold.

The +6.00 gate is intentionally generous and limited to the roots already
searched, normally two. We do not search every possible safe alternative, add
an exhaustive relevance search, or assert a solved position. Equal-scoring
sacrifices do not suppress one another. A sacrifice reaching +8 can qualify if
the evaluated safe alternative does not already win comfortably.

There is no player-rating adjustment, Maia-likelihood threshold, shallow-engine
surprise test, opening exclusion, underpromotion bonus, per-game quota, or random
award. Underpromotion can qualify only through the same material and soundness
rules. This is an attempt to celebrate good sacrifices, not an objective measure
of creativity or a promise to match Chess.com.

## Confirmation, persistence and cost

The existing browser worker and selected Stockfish engine perform the review.
Fast targets depth 12 / 500 ms per position, Balanced 14 / 1000 ms, Thorough
16 / 1500 ms. Each complete snapshot contains exact, distinct, legal same-depth
roots; partial iterations and score bounds are not accepted as a comparison.

An earlier complete before/after window must produce the same standout label.
Alternatively the existing independent confirmation session may corroborate it,
with matching quality metadata and no shallower completed depth. `!` also needs
the preceding position when applicable. An explicit contradictory confirmation
overrides apparent prior stability. Only unsupported standouts consume the
existing six-search allowance per full-game review; verification targets two
additional depths with the selected mode's time cap. Exhausted allowance or
failed/stale/canceled evidence withholds the badge. No extra Stockfish roots or
search budgets are introduced by the experiment.

The older additive brilliant-only verifier uses the same Mute worker predicate:
baseline depth 14 / 1200 ms, then before/after confirmation at least depth 16
and at least two depths above baseline, 1800 ms each. Material and exchange work
stay in the cancellable classification worker, with its existing 10-second
request watchdog and bounded material cache; a failure publishes no result.

New computed `!!` glyphs carry `mute-chess-brilliant-v1` provenance. Native
accuracy, evaluations, clocks, game outcomes, imported PGN glyphs and native tree
ownership are unchanged. Reviews are browser-local; this change does not run a
historical batch or silently change saved badges. Explicit reanalysis with
different engines/settings can produce different annotations.

## Validation and remaining uncertainty

The unchanged 3,075 EC boundary vectors and existing material/reference corpora
remain tests of the original algorithm. New tests replay both recorded score
budgets for the five fresh-confirmed examples, exercise actual worker dispatch,
and cover exchanges, pinned captures, capture/promotion credit, terminal
positions, side-to-move perspective, soundness, safe alternatives, equivalent
sacrifices and confirmation vetoes. Replayed eligibility inputs are not a live
browser search; test corroboration windows are controlled fixtures.

The experiment intentionally awards more sacrifices, but has no measured
real-game award rate or false-positive rate yet. The selected sample helped
choose the rules. A future independent set containing ordinary trades, unsound
sacrifices and games across rating levels would be needed to quantify those
rates; this draft adds no telemetry, calibration run or general tooling.

Prepared with OpenAI Codex assistance. Automated checks are reported in the PR;
no human manual testing or upstream Lichess contribution is claimed.
