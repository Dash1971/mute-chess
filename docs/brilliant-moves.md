# Brilliant moves: Mute History Rule

Mute Chess's draft classifier uses explicit chess heuristics to recognize sound
piece offers, avoid repeated awards for an unchanged sacrifice, and reject
ordinary material-recovery combinations. It is our open implementation, not
Chess.com's unpublished formula. **Mobile Maia retains En Croissant.**

We recommend **Mute History Rule with the material-recovery guard**.
The forest remains a research comparison, not a native runtime or mode.
The PR remains a draft for Mute Dev to review and merge.
No merge, deployment or human manual testing is claimed.

## Evidence and its limits

The [illustrated study](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/REPORT.md)
contains **1,248 moves from 654 games**, with 613 recorded Chess.com Brilliants
and 635 explicitly non-Brilliant controls. Mute recognizes **478/613** Brilliants
and makes **35/635** extra awards: 78.0% recognition and 86.4% agreement.
En Croissant recognizes 166/613 with 10/635 extra awards and 63.4% agreement.
These combined figures include development examples; they are not an independent
accuracy estimate.

The frozen classifier was also tested on **200 fresh moves from 109 unseen
games**, balanced between explicit current Brilliant and non-Brilliant labels.
Mute recognizes **78/100 Brilliants** and makes **13/100 extra awards** (82.5%
agreement), versus direct En Croissant’s 27 matches and one extra award (63.0%).
The core History Rule and the rule with the guard make identical decisions.
The guard fixes `hxg6` and `hxg5` among the development examples without losing
any of the 400 matching awards there, but its benefit on fresh games remains
unproven. A separate 500-game discovery scan found no qualifying guard vetoes;
that scan is not additional labeled accuracy data.

A headless run of the actual native Stockfish 19 full-game review completed
10 games and classified 884 moves. Only 19 overlap the primary labeled sample:
seven matched Brilliants, two missed Brilliants, two extra awards and eight
correct non-awards. Checking all 13 native awards separately found nine current
Brilliant labels and four non-Brilliant labels. This prediction-selected audit is
not added to the primary sample. The guard again changed no decisions. This establishes
bounded native execution and limited labeled evidence, not browser interaction,
human testing, or accuracy across variable engines and review budgets.

The samples emphasize challenging comparisons from five established accounts.
They do not establish beginner behavior, ordinary-game badge frequency,
population precision, or measured fun. The 90% agreement goal remains unmet.
The recovery guard fixes two known mistakes without removing correct awards in
our tests. Include it with the History Rule; reducing the remaining false awards
is a priority for future research.

## Ordered decision rules

The exact code and finite proof limits are also documented in the
[research algorithm reference](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/README.md).
The native classifier is carried in the maintained
[Lila patch](../deploy/lila/patches/lila-nostr-maia.patch).

### 1. Require a sound, concrete piece offer

Use the mover's evaluation and
`W(cp) = 100 / (1 + exp(-0.00368208 * cp))` after clamping cp to ±1000;
signed mate scores map to ±1000. Require two distinct evaluated roots, no more
than five mapped percentage points lost relative to the best root, and an
after-score of at least −100 cp. The played move need not be uniquely best.

A raw offer concerns a mover-owned non-pawn, non-king piece that the opponent
can legally capture. Its optimal same-square capture/recapture gain must exceed
`max(0, moverMaterial(after) - moverMaterial(before)) + 100`. This credits
captures and promotions already made. Material units are pawn 90, knight/bishop
300, rook 500, queen 1000 and king 0. The same-square exchange helper permits
stopping; it is a local heuristic, not a full tactical solver.

Also require the independent En Croissant material predicate
`EC(before) > -EC(after) + 100`, a searched winning mate, or the bounded attributed
mate-acceptance exception. The exception requires a profitable acceptance and
literal legal mate-in-one reply tied to a newly offered or moved piece; an
unrelated preexisting mate trap cannot supply the evidence. Its proof is bounded
to 512 counted nodes; exhaustion establishes no exception.

### 2. Exclude routine winning alternatives and checked continuations

When remaining phase is at most 8 or the mover leads by at least 300 physical
material points, withhold Brilliant if another searched non-offering move scores
at least +600 cp. Phase weights are knight/bishop 1, rook 2 and queen 4, initially
24. This checks searched alternatives, not every legal move.

When the mover starts in check, a bounded unchanged-offer proof can reject an
ordinary continuation. It must account for every qualifying offer, rather than
mistaking the continued availability of an earlier sacrifice for a new idea.
Unknown history or an exhausted 512-node proof establishes no veto.

### 3. Confirm the award with a second completed engine window

Repeat the core decision using the preceding completed iteration. An explicit
independent confirmation may replace that second window, preserving the primary
window. Quality metadata must match, confirmation depth must not be lower, and
terminal evidence must be preserved. Contradictory or incomplete required engine
evidence withholds a standout award. Ordinary EC Great-move confirmation retains
its preceding-position requirements.

### 4. Avoid repeated badges for an unchanged sacrifice

Inspect the preceding three own decisions within a continuous six-ply history.
An origin must independently earn a confirmed, unsuppressed core award from its
original engine windows. Imported labels, provisional badges and earlier
suppressed History Rule decisions cannot establish origins.

For a quiet current award, withhold it if an earlier origin accounts for every
currently offered physical piece: each piece remains unmoved and unreplaced, has
the same exchange liability, and qualified against the earlier capture credit.
Current checks, captures, promotions and actual castling are exempt from this
repeat rule. Preserve a new qualifying acceptance permitting literal mate, or a
new checking-fork reply that safely wins more than 100 net material points after
every legal check evasion. Fork novelty compares checking-piece role and checking
destination. The shared proof budget is 512 counted nodes.

Missing earlier engine windows cannot prove an origin. Incomplete physical
history or proof exhaustion establishes no veto. A complete result with no
proven origin does not imply that all historical engine evidence was available.
Legacy two-position callers therefore cannot provide the same history coverage
as full review.

### 5. Reject existing offers that best defense accepts and safely refunds

This narrowly targets ordinary material transactions; it is not a ban on
captures or temporary sacrifices. Apply only to a non-promoting capture that
neither gives check nor answers a check. All qualifying offered pieces must be
unmoved by the target move.

Both completed after-position engine windows must choose a first-root reply
that actually accepts a qualifying offer. Different roots may qualify, but a
later PV capture or the continuation played in the game is insufficient.

Every qualifying acceptance must already have been legal, with the same
attacker/victim identities and exchange gain, before the target capture. This
uses a before-position clone with the opponent to move solely to compare static
capture geometry; it invents no actual move or historical event. A capture that
opens a new sacrifice lane is protected.

For every qualifying acceptance, search for one legal noncapture,
nonpromotion reply by the original mover. Against **every legal opponent reply**,
require an explicit legal, nonchecking, nonterminal capture that restores the
physical material balance to within 100 points of its pre-target value, after
subtracting the opponent's maximum same-square recapture gain. Do not use an
unstable raw material leaf, a mate sentinel, or a single principal variation as
a recovery certificate. Unresolved checking captures do not establish recovery.

The whole target shares a 100,000-node, one-second limit. Unknown or exhausted
proofs retain the core History Rule decision. This is a finite local material
certificate; it does not claim to solve all subsequent tactical play. No account,
rating, game ID, square whitelist or observed Chess.com label enters the rule.

The `hxg6` certificate uses `...Qc5+` and covers all four legal check evasions.
The `hxg5` certificate uses `...Ba6` and covers all 43 legal replies: moving the
bishop allows recovery of the other rook, while moving that rook leaves the
bishop available. These are conditional acceptance branches, not claims that the
opponent must accept the offer or play the illustrated continuation.

## Native behavior and release boundary

Full review supplies its existing preceding six plies and engine evidence;
these rules add no engine searches or new review settings. The existing six-search
confirmation allowance remains. Legal/material work runs in the cancellable
classification worker. Failure, cancellation or the existing watchdog publishes
no result. Results are checked again before committing glyphs.

A proved repeat or material-recovery veto clears final and provisional computed
Brilliant eligibility rather than requesting more confirmation searches.
Independent EC behavior, native accuracy and centipawn loss remain unchanged.
Imported PGN judgments remain authoritative. Computed provenance generations are
protected against accidental replacement; explicit fresh review may replace a
computed judgment. There is no silent historical batch rewrite.

The saved research uses Stockfish 18, 300,000 requested nodes, one thread, 64 MB
hash and full legal PGN history. Native SF19, timed budgets and legacy incomplete
history paths produce different inputs. Reference parity and passing native
builds do not establish their award accuracy or browser performance.

En Croissant sources are pinned to commit
`6f2d2628f0fbe11cb62a7dd2f9c102bb52907d53`, verified byte-identical to v0.15.1 for
the copied score/material functions. Original GPL/AGPL notices and source
attribution remain authoritative. Prepared with OpenAI Codex assistance.
