# Brilliant detection with the site's engine

**Mute Selective recognized 54% of the Chess.com Brilliants in this test, while
giving three wrong awards among 200 explicitly non-Brilliant moves.** This
supports “roughly half” for the tested default Fast full-game review.

## What we tested

We replayed 215 complete games containing 200 confirmed Chess.com Brilliants and
200 moves explicitly labeled non-Brilliant. None of these games was used to
train the original model. The model and its cutoff stayed fixed.

The replay uses the site's Stockfish 19 1MB JavaScript, WebAssembly and neural
network assets, with one thread, 16 MB hash and Fast review's depth-12 target and
500 ms limit per position. It uses the native completed-iteration parser and
full-game classifier, including earlier moves and the six-search confirmation
limit. Labels are used for scoring, never for deciding moves or scheduling
confirmation searches.

## Results

| Full-game Fast review | Chess.com Brilliants found | Wrong awards on non-Brilliants |
| --- | ---: | ---: |
| Existing site code | **108 / 200 (54%)** | **3 / 200** |
| Complete-window confirmation fix | **108 / 200 (54%)** | **3 / 200** |

All 400 target decisions agree between the two implementations. The fix restores
information that confirmation should have included; it does not increase the
recognition rate in these examples.

The negative examples include 139 moves labeled Best, Excellent, Good or `!`:
two received wrong awards. Another 61 have error labels: one received a wrong
award. These counts describe the selected examples, not how often an ordinary
game will receive a badge.

The separate fixed-Stockfish-18 research comparison recognized 112/200 Brilliants
with three wrong awards; En Croissant recognized 53/200 with three wrong awards
under those same research inputs. The site's Fast result is 108/200, not 112/200.
En Croissant was not independently re-reviewed with SF19 in this test.

## What the fix changes

The model considers the position before the move, after the move, and the
preceding position when available. Additional Brilliant confirmation previously
searched only the before/after positions, dropping that earlier information.
It now checks the complete available window. The six-search ceiling remains;
two three-position confirmations can use the entire allowance.

The model, threshold, imported-annotation protection and cancellation rules are
unchanged. No merge or deployment is part of this validation.

## Why Bxh2 can still miss

In [12...Bxh2+](https://mutechess.org/game/bJPg3bse/black#24), Black offers a bishop
for a winning king attack. It is a useful diagnostic example, but has no confirmed
Chess.com label in this study.

Paired replays with identical initial analysis give the same result before and
after the fix: Interesting in Fast and Balanced; an unconfirmed standout is
withheld in Thorough. A fresh review can therefore finish without an Interesting
badge. Restoring the missing information does not guarantee that the model will
approve this sacrifice. There is no move-specific exception.

## Limits and evidence

These are automated local replays of the native engine and review code on one
Mac, not 400 browser UI interactions. Timed searches and bounded position checks
can vary with device, browser and system load. The 400-move result does not
establish the same recognition rate for Balanced, Thorough, other engine choices
or the legacy additive verifier. The three-mode Bxh2 check is a diagnostic, not a
measurement of those modes across the corpus.

The [400 outcomes and frozen source hashes](../analysis/data/brilliants-native-fast-2026-11-06.json)
record the measured result. The [algorithm documentation](brilliant-moves.md)
describes the model and its safeguards. Future improvements should be tested
with native engine analysis while keeping false awards low.
