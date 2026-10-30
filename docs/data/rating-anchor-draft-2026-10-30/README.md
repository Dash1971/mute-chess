# Draft rating-adjustment preview — October 30, 2026

**Review only: no public mutation, merge or deployment.** The CSV was computed
from a read-only snapshot of the existing 44 bot accounts and the linked public
Lichess reference snapshot. Its source revision is deliberately all zeroes, so
this illustrative plan cannot match an installed verified-main release.

- [Exact before/after preview](preview.csv): 176 pool ratings plus 30 derived
  standard snapshots. 91 earned pool ratings translate by −75; 85 unplayed
  Bullet/Classical ratings use the mapped cross-speed reference difference.
- [Scope, dates and hashes](preview.json).
- [Dated Lichess ratings/RD/game counts](../lichess-maia-adjustment-reference-2026-10-30.json).
- [Disposable database qualification](qualification.json): interrupted updates
  and restores, repeated-run protection, changed data, native BSON Double types,
  and unchanged humans, external bots, accounts, games and rating history.
- [Rules, limitations and later operating procedure](../../bot-rating-adjustment.md).

Chrome Sparrow, Patchwork and Sideband already have one Bullet result each;
these receive only the common earned-rating shift. Twenty-four unplayed upper
band rows visibly use the nearest supported reference family rather than sparse
or provisional source offsets. All unplayed estimates retain broad provisional
uncertainty. Original roster seeds, game histories, RD/volatility for earned
ratings and native Glicko remain intact.

The qualification uses synthetic accounts in a new private namespace and runs
no games or inference. It is not evidence of a production application. Prepare
and review a fresh installed-main plan and authenticated encrypted backup before
any later approved execution.
