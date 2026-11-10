# Mute Chess feature and site behavior manual

Detailed explanations of how Mute Chess behaves during play and across its
features. For a quick overview, see the [README feature guide](../README.md#feature-guide).

## Disconnect grace periods and reconnecting

Maia uses Lichess's native disconnect detection and grace periods before
automatically claiming an abandoned game. For an ordinary connection loss, the
base wait starts when the server detects that the player is offline:

| Time control | Signed-in player | Anonymous player |
| --- | ---: | ---: |
| Bullet (including UltraBullet) | 30 seconds | 15 seconds |
| Blitz | 1 minute | 30 seconds |
| Rapid | 2 minutes | 1 minute |
| Classical | 5 minutes | 2 minutes 30 seconds |

These are base values, not fixed guarantees. The native rules halve the wait
when the disconnected player is at least four material points behind, and may
shorten it further for an account with a history of abandoning games. If the
browser explicitly signals that the player left or closed the game, the base
wait is 10 seconds. The final grace period is never shorter than 10 seconds.
Maia requests the claim on its next healthy adapter poll after the grace expires,
so processing can add a short delay.

**Players can reconnect and continue before the game ends.** Reconnecting clears
the offline timer and intentional-leave status; the native round checks the
disconnect status again before accepting a claim. A reconnect or move before
the claim is processed can therefore prevent it. Reconnecting after a completed
claim does not reopen the game.

Both players must have moved, it must be the human's turn, and Maia must be
connected for an automatic disconnect claim. A connected player thinking for a
long time is not considered disconnected. The clock keeps running during the
grace period, so the game can end on time before the disconnect claim becomes
available. Background bot games keep their no-claim rule, and human-versus-human
friend games retain Lichess's manual claims. Older games created with the
no-claim rule do not gain automatic disconnect claims. See
[abandoned-game handling](public-bot-activity.md#abandoned-human-games-302).

## Related feature guides

- [Maia opponents, game capacity and background activity](public-bot-activity.md).
- [Analysis boards, engine preferences and move insights](analysis-presentation.md).
- [Nostr identity and account access](nostr.md).
- [Saving and restoring your sign-in key](nostr-sign-in-backup.md).
- [Chess basics, practice and community features](native-learning-community.md).
