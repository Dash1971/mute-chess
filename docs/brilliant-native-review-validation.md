# Brilliant detection with the site's engine

## Updated selective forest: fresh-account validation

**New Selective recognized 774 of 1,234 reference Brilliants (62.7%), with 38
wrong awards among 30,423 non-Brilliant moves (0.125%).** The frozen 128-tree
forest uses a 0.83 cutoff with PR285's complete-window confirmation. This section
records pre-release validation; the update was subsequently merged in
[PR #285](https://github.com/Dash1971/mute-chess/pull/285).

We analyzed 1,000 complete games from Witty_Alien, an account outside the
model's development set. The model was trained on 6,293 earlier labeled moves;
no Witty_Alien examples were used for training or cutoff selection.

| Version | TP / FN | FP / TN |
| --- | ---: | ---: |
| Existing production | 721 / 513 | 57 / 30,366 |
| Older model + PR285 | 725 / 509 | 58 / 30,365 |
| **New Selective + PR285** | **774 / 460** | **38 / 30,385** |

Against the older model with the same confirmation path, New Selective gains
95 genuine awards and loses 46; it removes 27 wrong awards and adds 7. That is
**49 more genuine awards and 20 fewer wrong awards**, a 34% reduction in wrong
awards. Against production, the net change is +53 genuine and 19 fewer wrong.
False-positive rate uses all primary account-own non-Brilliant moves, not the
number of awards or a balanced set of tactical controls.

All versions share the same initial SF19 small-network WASM Fast evidence:
one thread, 16 MB hash, depth 12 / 500 ms. Confirmation uses depth 14 / 500 ms,
with the unchanged six-position allowance per version per game. Only exact
ordered confirmation groups share evidence. The new model's classifications
stay separate from the old model's cache. Both players' moves are scheduled;
only Witty_Alien's moves are scored. Gallery labels never enter classification
or confirmation scheduling.

The sample follows a fixed SHA-ranked order of novel games in the complete
captured year-gallery. It was expanded from 200 to 1,000 games after partial
results were visible, with unchanged ranking, model and cutoff. Prior games
were excluded, and primary scoring removes before-position overlap with earlier
research. One positive was excluded; all three versions awarded it, so unmasked
true-positive totals are one higher for each version.

Of 1,235 gallery-positive labels before that exclusion, 496 have independently
captured rendered-board and arrow checks; 739 have gallery-link, UUID/ply,
mover and legal-PGN identity checks. The latter are not independently
board-verified. Own moves absent from the complete gallery are treated as
negative only within these gallery-represented games. This is one account,
not a universal estimate of Chess.com agreement or ordinary-game badge frequency.

The two personal examples remain misses under Fast: Legal's Mate Ne5 is `!`,
and the Greek Gift Bxh2+ is `!?`. They are excluded from the statistical test;
the Greek Gift has no confirmed Chess.com reference label here. No special-case
move exception was added.

The [compact result record](../analysis/data/brilliants-selective-fast-2026-11-06.json)
contains all confusion matrices, paired changes and the exact model hash.
[Published study and reproduction evidence](https://github.com/Dash1971/open-brilly-finder/blob/main/studies/brilliant-selective-2026-11-06/REPORT.md)
and the [reader addendum](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/REPORT.md#november-6-2026-addendum-more-brilliants-fewer-wrong-badges)
provide context. Independent recount verified all 1,000 games and completion
receipts. These automated native replays do not establish identical behavior on
every browser, device, review mode or engine.

## Historical original-model validation

The following 400-move test describes the earlier 64-tree model. Its games are
not independent test evidence for the updated forest. The SF18 En Croissant
comparison is also historical; En Croissant was not tested on Witty_Alien.

**The original 64-tree Mute Selective model recognized 54% of the Chess.com Brilliants in this test, while
giving three wrong awards among 200 explicitly non-Brilliant moves.** This
supports “roughly half” for the tested default Fast full-game review.

### What the earlier test covered

We replayed 215 complete games containing 200 confirmed Chess.com Brilliants and
200 moves explicitly labeled non-Brilliant. None of these games was used to
train the original model. The model and its cutoff stayed fixed.

The replay uses the site's Stockfish 19 1MB JavaScript, WebAssembly and neural
network assets, with one thread, 16 MB hash and Fast review's depth-12 target and
500 ms limit per position. It uses the native completed-iteration parser and
full-game classifier, including earlier moves and the six-search confirmation
limit. Labels are used for scoring, never for deciding moves or scheduling
confirmation searches.

### Earlier results

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

### What the confirmation fix changes

The model considers the position before the move, after the move, and the
preceding position when available. Additional Brilliant confirmation previously
searched only the before/after positions, dropping that earlier information.
It now checks the complete available window. The six-search ceiling remains;
two three-position confirmations can use the entire allowance.

The model, threshold, imported-annotation protection and cancellation rules are
unchanged. No merge or deployment is part of this validation.

### Why Bxh2 can still miss

In [12...Bxh2+](https://mutechess.org/game/bJPg3bse/black#24), Black offers a bishop
for a winning king attack. It is a useful diagnostic example, but has no confirmed
Chess.com label in this study.

Paired replays with identical initial analysis give the same result before and
after the fix: Interesting in Fast and Balanced; an unconfirmed standout is
withheld in Thorough. A fresh review can therefore finish without an Interesting
badge. Restoring the missing information does not guarantee that the model will
approve this sacrifice. There is no move-specific exception.

### Historical limits and evidence

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
