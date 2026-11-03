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
or rating curve. This selected benchmark does not establish those hidden details.

The [illustrated study and reproducible methods](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/REPORT.md)
cover **618 moves from 299 games: 309 current Chess.com Brilliants and 309
explicitly non-Brilliant moves** from nelsi, hansen, KNVB, GothamChess and Hikaru.
Each move is matched to its full PGN, exact ply and visible SAN; rendered board
evidence provides an additional identity check when available. Live and daily
game URL namespaces are distinguished. Historical gallery entries and current
review labels are retained separately; an absent gallery entry is never treated
as a negative label.

The sample emphasizes sacrifices and challenging comparison moves, including
apparent legal offers, quiet defenses and exchanges. It also retains four Book
controls selected by the same pre-label rules. These are public player accounts,
not a representative sample of all players, rating levels or ordinary games.
The [benchmark results below](#618-move-benchmark) distinguish combined,
prospective and reserved-game evidence.

### Supplemental development examples outside the benchmark

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

These nine supplemental examples are outside the 618-move benchmark. They helped
develop the rules and remain regression/reference cases, not held-out validation
or evidence of beginner behavior. Fresh-confirmed examples should not be
conflated with historical gallery-only awards.

## The original En Croissant / Mobile Maia rule

Our independent [scoring reference](../analysis/reference/score.ts) and
[material reference](../analysis/reference/material.rs) are pinned to En Croissant
v0.15.0, commit `6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53`:
[score.ts](https://github.com/franciscoBSalgueiro/en-croissant/blob/6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53/src/utils/score.ts),
[chess.rs](https://github.com/franciscoBSalgueiro/en-croissant/blob/6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53/src-tauri/src/chess.rs).
On November 3, 2026, both files were verified byte-identical at the latest stable
[v0.15.1 release](https://github.com/franciscoBSalgueiro/en-croissant/releases/tag/v0.15.1),
commit `4932c9231517f6fd75e5a97902b207c7dc82e61f`. This verifies the scoring and
material source, not equivalence of entire applications or their evidence
collection. En Croissant is the external peer in this comparison.
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

## Exact Mute Chess policy: mute-chess-brilliant-v3

The [README](../README.md#more-chances-to-find-a-brilliant-move) specifies every
eligibility gate and threshold. The implementation is in the namespaced native
`ui/analyse/src/noSweatClassify.ts`, carried by our
[Lila patch](../deploy/lila/patches/lila-nostr-maia.patch). The original
`annotation()` and `isSacrifice()` remain unchanged for EC compatibility tests.
The classification worker explicitly selects `mute-brilliant-v3`; Mobile Maia
and the independent references are not modified.

The exact decision order is:

1. Calculate the EC annotation with the existing scores/material predicate.
   If it is `??`, `?` or `?!`, return it; a sacrifice does not rescue a bad move.
2. Apply the README's seven Mute eligibility conditions. In particular, use
   `W(best-before) - W(after) <= 5`, `after >= -100 cp`, and veto any *other
   evaluated* non-sacrificing candidate at `>= +600 cp`. Passing means provisional
   `!!`, even if the played move is second or outside the searched pair.
3. Clear sacrifice-derived EC `!!`/`!?` when the Mute material test rejects the
   alleged sacrifice. Otherwise, if the other gates fail, retain the EC label,
   except an EC `!!` becomes `!?` when its sacrifice remains above −200 cp,
   or blank otherwise. Native bad-move labels and non-sacrifice `!` are unchanged.
4. Corroborate every provisional `!!`/`!` through the existing whole-window
   reliability checks before publishing it. A withheld label is not an award.

Material qualification requires a legal piece offer. The original EC probe is
not an eligibility fallback: its root moves and capture-only continuations can
mistake both postponed gains and quiet tactical defenses for sacrifices. The
independent EC predicate and EC policy mode remain unchanged. For each
mover-owned non-pawn, non-king piece after the move, compute
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
it in the played game. Pawn-only sacrifices and offers that become capturable
only after a quiet continuation are intentionally ineligible. This conservative
rule does not prove creativity or remove every arguable award.

### Foregone-gain and defended-tactic corrections (#227)

In the reported `41.Qf5+` position, before FEN
`6r1/p1P3pk/1q1B1b1p/3Q4/8/7P/P4PP1/2R3K1 w - - 9 41`, the old EC probe
finds `c8=Q Rxc8 Rxc8` and reports +590 material. After `Qf5+`, it reports
+180 from White's perspective, which is also White's actual material balance
before the move. The old comparison mistook postponing a rook-for-pawn gain
for sacrificing 410 units. Black can only answer `Kh8` or `g6`; there is no
immediate legal piece offer. The corrected Mute policy publishes neither `!!`
nor a sacrifice-derived `!?` for this case. The exact position and its
Black-to-move mirror are regressions; existing selected positive examples remain.

The second reported case, `17...Bf5` in game186311900336, also has no profitable
same-square piece offer. The old probe follows `Rxf5 gxf5 Qxd3 Bxe5` and sees a
material loss, but does not search Black's quiet `...Rd1+` tactical reply after
`Rxf5`. Even comparing against raw pre-move material would retain that false
signal. Requiring the legal offer removes this case as well. Exact Bf5 and
White-to-move mirror regressions protect this behavior. The reported
`14...Ndxe5` passes that preliminary legal-offer test. Version3 adds the
material corroboration below, which rejects this routine pawn-winning tactic.

Version2 replaces the v1 material qualification and suppresses sacrifice-derived
EC labels when no legal offer exists. All nine selected historical examples
still pass the material-offer predicate, including the five fresh-confirmed
examples in the table above. There is no Stockfish search-budget or Mobile Maia
change. Existing computed badges are replaced on an explicit fresh full review;
imported annotations are preserved, including protection against a new v2
computed badge conflicting with an imported quality annotation.

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

## Material corroboration (#229)

Version3 adds one gate to the played move: the unchanged EC `isSacrifice()`
material heuristic must be true, **or** the after-score must contain an explicit
winning mate from the mover's perspective. A centipawn score, mate zero or losing
mate cannot activate the exception. The legal piece offer, quality, soundness,
safe-alternative and whole-window confirmation checks still apply. The same gate
must pass in corroborating windows; a later mating score does not override a
contradictory earlier window.

The EC material probe considers capture sequences across different squares. This
helps reject apparent offers that recover material elsewhere, including
`14...Ndxe5 15.Nxe5 Nxe5 16.fxe5 Rxd3`: equal-valued pieces are traded and Black
wins a pawn. It is a legacy heuristic rather than proof of a genuine sacrifice.
Its mate sentinel can also reject genuine mating offers, hence the explicit
winning-mate exception. The regression uses the exact position with controlled
stable scores to isolate the guard, not a new measured Stockfish evaluation.

Only Brilliant eligibility changes. The raw legal-offer predicate used for safe
alternatives and worker prefiltering remains unchanged. The guard reuses the EC
material result already computed by classification; it adds no material or
Stockfish search. En Croissant mode, accuracy and imported annotation protections
remain unchanged, including recognition of older computed provenance versions.

## 618-move benchmark

All policies receive the same saved Stockfish 18 evidence: one thread, 64 MB hash
and 300,000 requested nodes per position, with preceding/before/after windows.
The external peer is the **direct, unchanged En Croissant annotation rule**,
whose score/material source matches latest stable v0.15.1. Mute v2 and v3 use
their actual whole-window confirmation-aware outputs. Applying Mute's shared
confirmation wrapper to EC is a separate technical result, not the peer baseline.
This is a source replay on saved evidence, not an end-to-end Mobile Maia benchmark.

TP means a confirmed Chess.com Brilliant awarded `!!`; FN means one not awarded.
FP means an explicitly non-Brilliant move awarded `!!`; TN means one not awarded.
A withheld badge counts as no award. Agreement is `(TP + TN) / N`.

| Ruleset | TP / 309 | FN / 309 | FP / 309 | TN / 309 | Agreement / 618 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct En Croissant rule | 84 | 225 | 6 | 303 | 62.6214% |
| Mute v2 | 273 | 36 | 77 | 232 | 81.7152% |
| Proposed Mute v3 | 220 | 89 | 16 | 293 | 83.0097% |

The guard removes **61 extra awards** while losing **53 correctly recognized
Brilliants** relative to v2. It still recognizes more of these Brilliants than
EC, but it does not provide an unqualified improvement over v2. No named move is
hard-coded. The combined set includes examples used to choose the guard, so its
overall agreement is a retrospective description, not independent validation.

### Prospective and reserved-game checks

The v3 source was fixed before the 300 prospective moves were labeled. On those
150 Brilliants and 150 non-Brilliants from 146 games:

| Ruleset | TP | FN | FP | TN | Agreement / 300 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct En Croissant rule | 39 | 111 | 4 | 146 | 61.6667% |
| Mute v2 | 130 | 20 | 35 | 115 | 81.6667% |
| Proposed Mute v3 | 103 | 47 | 10 | 140 | 81.0000% |

The separately reserved subset contains **101 moves from 48 whole games: 51
Brilliants and 50 non-Brilliants**. It is part of the prospective 300 and combined
618, not another set to add to either total. Game assignment was frozen before
labeling, and position-overlap hygiene was fixed before policy scoring.

| Ruleset | TP / 51 | FN / 51 | FP / 50 | TN / 50 | Agreement / 101 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct En Croissant rule | 15 | 36 | 0 | 50 | 64.3564% |
| Mute v2 | 44 | 7 | 11 | 39 | 82.1782% |
| Proposed Mute v3 | 31 | 20 | 4 | 46 | 76.2376% |

V2 has higher overall agreement on both checks. V3 favors fewer extra awards at
the cost of more missed Brilliants; that balance is a product choice, not evidence
that it dominates v2. The [study report and methods](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/REPORT.md)
retain move-level outcomes, source freezes, stronger-search sensitivity and
selection limits. Mobile Maia's implementation remains unchanged.

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

New computed `!!` glyphs carry `mute-chess-brilliant-v3` provenance. Native
accuracy, evaluations, clocks, game outcomes, imported PGN glyphs and native tree
ownership are unchanged. Reviews are browser-local; this change does not run a
historical batch or silently change saved badges. Explicit reanalysis with
different engines/settings can produce different annotations.

## Validation and remaining uncertainty

The unchanged 3,075 EC boundary vectors and existing material/reference corpora
remain tests of the original algorithm. Tests replay both recorded score
budgets for the earlier fresh-confirmed examples, explicitly retaining the Nd7
tradeoff, exercise actual worker dispatch,
and cover exchanges, pinned captures, capture/promotion credit, terminal
positions, side-to-move perspective, soundness, safe alternatives, equivalent
sacrifices and confirmation vetoes. Replayed eligibility inputs are not a live
browser search; test corroboration windows are controlled fixtures.

The benchmark measures conditional label agreement on a balanced, offer-enriched
sample. Of the 309 negative controls, 163 meet the raw legal-offer predicate; all
observed extra awards occur in that subgroup. The other 146 controls receive no
Brilliant from any tested policy. Four Book controls remain in the predeclared
sample rather than being removed after seeing their labels. The report exposes
these subgroups; not every comparison move is a difficult sacrifice.

Moves share games, players and sometimes positions. These results do not establish
ordinary-game award frequency, population error rates, beginner behavior or
measured enjoyment. The combined results include development evidence; the
prospective and reserved-game checks above provide separate tests of the frozen
v3 policy. Broader games across rating levels would be needed to estimate normal
play behavior. This draft adds no telemetry, calibration run or general tooling.

Prepared with OpenAI Codex assistance. Automated checks are reported in the PR;
no human manual testing or upstream Lichess contribution is claimed.
