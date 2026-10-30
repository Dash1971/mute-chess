# Applied bot rating anchor correction

Owner-approved operation completed 2026-10-30 21:40:40 JST, using the installed verified-main
source `b8f9573344f45931b9e6f09de0e93eb5aaf7f8a5`. [Receipt](receipt.json), [exact before/after changes](changes.csv),
and [fresh public Lichess reference snapshot](reference.json).

All 44 managed bots were verified against the reviewed plan. The 176 pool rows
contain 91 earned-rating translations of −75 and 85 unplayed Bullet/Classical
priors. Thirty existing standard aggregates received the same translation.
Chrome Sparrow, Patchwork and Sideband's earned Bullet results were preserved
with only the common rating shift. The 24 upper-band fallback priors retain
broad uncertainty. The table records the values at application, not a promise
that ratings will remain fixed after subsequent games.

RD, volatility, counts, timestamps and histories were preserved for earned
ratings. Unplayed prior RD was retained or broadened according to the reviewed
policy. Human/unmanaged perfs, all account documents, games and rating history
were hashed before and after the operation and matched exactly. Native BSON
Double types and the full 44-document after-image were verified. No new games
or inference jobs were started for this correction.

Writers and admission were stopped only after zero-active-game checks. A fresh
encrypted database backup was copied off-host and its hash and protected key
verified. Native app startup rebuilt the rating catalog and caches; the full
after-image was checked again before admission reopened. Representative 600,
1600 and 2600 bots passed native API and all four performance-page checks.
The fixed migration ID and durable audit prevent a second subtraction.

The earlier draft preview remains historical evidence. Fresh references moved
slightly since that draft; the unplayed-speed mapping uses this operation's
dated reference snapshot. Original roster seeds and historical game ratings
remain unchanged. #100 remains the external/human alignment audit; this event
does not establish exact equality with human Lichess ratings.
