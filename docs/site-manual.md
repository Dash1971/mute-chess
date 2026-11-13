# Mute Chess feature and site behavior manual

Detailed explanations of how Mute Chess behaves during play and across its
features. For a quick overview, see the [README feature guide](../README.md#feature-guide).

- [Bot pool behavior](#bot-pool-behavior): pairing, capacity, background games and ratings.
- [Engine settings](#engine-settings): playing Maia, browser analysis, models and move history.
- [Disconnect grace periods and reconnecting](#disconnect-grace-periods-and-reconnecting).

## Bot pool behavior

### Why 10,000 bots?

We want quick pairing to feel like joining a pool: a varied cast of familiar
opponents, with different playing styles and more accounts around the ratings
where most players are. A large roster makes repeat opponents less common
without changing Lichess's matchmaking rules. These are persistent identities,
not 10,000 engines running at once. Human-versus-Maia and automatic games share
a 20-game cap. Human-versus-human friend games use their separate native
admission path and do not consume that Maia cap.

Background bots only top up to five total unfinished games, counting
human-versus-Maia and human-versus-human games too. With three human games, at
most two background games are started; with five or more human games, no new
background games start. Existing background games finish naturally as human
activity increases, and top-ups resume when the total drops below five.

Background games alternate **5+3 Blitz** and **10+5 Rapid**, with human timing
enabled so visitors can watch at a natural pace. Available bots are selected
randomly, then paired within 200 points of their current rating for that time
control. Maintenance uses a manual pause and drain: new games stop being admitted
and existing games finish before the release. See
[public bot activity](public-bot-activity.md) for implementation details.

The bots also play one another, building public game histories and updating
their ratings through native Glicko-2. A November 2026 activity check found
about **1,770 completed bot-versus-bot games per day including maintenance
pauses and outages**, or an estimated **2,700 per day with uninterrupted
operation**. Human games and the earlier calibration runs are excluded.

Across the roster, that works out to:

| Average games per bot | Including recent interruptions | With uninterrupted operation |
| --- | ---: | ---: |
| Per week | 2.5 | 3.8 |
| Per month | 11 | 16 |
| Per year | 130 | 200 |

Automatic games split evenly between **Blitz and Rapid**: roughly **65–100
games per bot per year in each speed**, or one every four to six days. That
cadence should generally keep those ratings established as Glicko-2 balances
new results against uncertainty from inactivity. Selection is random, so some
bots play more than others; it is not a guarantee for every account. Automatic
play does not currently refresh Bullet or Classical ratings.

These are projections from roughly 60 hours of activity, not annual observations;
they assume the same roster size, capacity and playing pace. Ongoing games help
maintain ratings, while alignment with human Lichess strength remains a separate
validation goal. See the [activity rules](public-bot-activity.md) and
[dated activity check](https://github.com/Dash1971/mute-chess/issues/236).

### Rating goal and calibration

We aim for a player's established Mute Chess rating, earned against Maia bots,
to roughly match their established Lichess strength in the same time-control
category. We will measure and improve that alignment through bot calibration
and human/reference validation while retaining Lichess's native Glicko-2 system.
Our initial bot ratings are estimates, and this alignment remains under
validation. See the [bot rating methodology](bot-population.md).

We started from observed Lichess Maia ratings, then used rated games and native
Glicko-2 to establish a varied reference roster. Our illustrated
[bot-rating report](https://github.com/Dash1971/mobile-maia-research/blob/140e2eb411923930fb0d5950b92abf6f3c0166dd/studies/bot-rating-establishment-2026-10-31/REPORT.md)
explains the reference, the measured effects of engine settings, and how the
expanded pool is calibrated.

The [live pool contains 10,000 persistent opponents](catalog-roster.md).
The original 250 reference bots retain their earned ratings and game histories.
The 9,750 new identities reuse measured playing policies and start with assigned
nonprovisional ratings labeled **Research-seeded**, with zero completed games.
Native Glicko-2 updates those ratings as they play. Keeping playing strength close
to Lichess remains a goal we will monitor over time.

### Players and rating statistics

The [player directory](https://mutechess.org/player) uses Lichess's leaderboard,
ranked-list and rating-distribution views. Players share the same lists across
standard time controls; FIDE, tournament and separate bot sections are omitted.
These lists read current saved ratings, including starting ratings before games
are played, and refresh within a minute. Statistics describe current site ratings,
not weekly activity, and cover the full 400–4000 rating range. Closed accounts and
accounts marked for cheating, boosting or a ranking ban are excluded. This display
does not write ratings, histories or native competitive rankings.
See [#187](https://github.com/Dash1971/mute-chess/issues/187).

## Engine settings

**Playing Maia:** each bot keeps its configured Maia self-rating input, sampling,
move-history and timing settings. The opponent input uses your native Mute Chess
rating for the game's time-control category at game start, limited to Maia's
600–2600 input range. Anonymous games match the bot’s self-rating input, assuming
equal strength. The input stays fixed throughout
the game; existing games retain their original policy. Maia's trained model
determines its response to the opponent input; no extra aggression rule is added.
This does not change
matchmaking or native Glicko ratings. Bot calibration measured fixed self/opponent
inputs; this new human-opponent conditioning has not been separately calibrated.
See [#176](https://github.com/Dash1971/mute-chess/issues/176) and the
[rating methodology](bot-population.md).

**Analysis Maia:** each channel uses its selected rating for both inputs, matching
Mobile Maia. Engine Analysis is available through the analysis gears and
**Profile & settings → Engine Analysis**, which opens a normal account settings
page. The board gears retain their quick settings dialog. Two Maia channels are enabled by default.
With one enabled, game analysis uses the extra space for more moves; puzzle review
simply removes the second row. Settings include each Maia rating, Maia/Stockfish
arrow colors, and Fast/Balanced/Thorough computer review. Preferences are saved in
the current browser. See [#150](https://github.com/Dash1971/mute-chess/issues/150),
[#151](https://github.com/Dash1971/mute-chess/issues/151),
[#173](https://github.com/Dash1971/mute-chess/issues/173), and
[analysis details](analysis-presentation.md).

Browser analysis downloads its model from mutechess.org and caches it locally.
The 79M model tries WebGPU, with a multi-threaded CPU fallback where supported.
Visitors do not download the model from GitHub; deployment can fetch a pinned
upstream copy if the server's existing model is unavailable.

### 5M or 79M Maia model for analysis

Choose the model in **Profile & settings → Engine Analysis → Maia model**, or
under **Advanced Maia settings** in the analysis gear dialog. **5M** is the
lightweight default (about 21 MB of model weights); **79M** is the larger option
(about 316 MB). Both run in your browser. The larger model needs more memory and
computation; it can give different predictions, but a larger network does not
guarantee a better answer to every tactical position. Maia predicts human moves
and game outcomes; use Stockfish to assess the strongest continuation.

**Use move history** is available in both settings locations and defaults to
**on**. It supplies up to eight recent board positions, repeating the earliest
available position when fewer are present. Turning it off supplies the current
board repeated across all eight input frames. This changes Maia's information
and can change both move probabilities and expected score. Preferences apply to
analysis in this browser; they do not change a playing bot's configured policy.
Each analysis channel uses its selected rating for both player and opponent.

#### Why predictions can differ from maiachess.com

In the comparison on November 3, 2026, the Maia website's model was a different
network: its served ONNX file was about
46 MB, with roughly 22.7 million FP16 weight elements, and takes only the current
board. It is neither our 5M nor our 79M export. Turning our history off therefore
does not reproduce its model. See its pinned [model selection][maia-model-source]
and [board encoding][maia-input-source].

For example, after **1.e4 d5 2.exd5 Qxd5 3.Nc3 Qe6+ 4.Be2 Qc6**, independent
CPU runs with **2600 for both rating inputs** produced:

| Model | History input | Probability of Bb5 | White expected score |
|---|---|---:|---:|
| Mute 5M | Eight recent positions | 7.1% | 55.3% |
| Mute 79M | Eight recent positions | 7.0% | 61.4% |
| Mute 79M | Current board repeated | 12.4% | 68.0% |
| Maia website model | Current board only | 20.1% | 67.3% |

The website displayed Bb5 at 20.2%; the small difference from the CPU run has
not been isolated. These are model predictions, not measured human success rates
for this position. Expected score means **win probability plus half the draw
probability**. Mute displays it for the side to move, which is White here.

The website's displayed **77.8%** in this example has a separate explanation:
its analysis bar uses a **Stockfish-to-score lookup during the first ten plies**,
rather than Maia's own value. Stockfish +5.82 rounds to its +5.8 lookup entry,
which is 77.8%. Comparing that bar directly with Mute's Maia score mixes two
different estimates. See the pinned [bar logic][maia-bar-source] and
[lookup table][maia-score-source].

[maia-model-source]: https://github.com/CSSLab/maia-platform-frontend/blob/3e5ef6d86287481cdbf730c1499d5023ae79eb48/src/contexts/MaiaEngineContext.tsx
[maia-input-source]: https://github.com/CSSLab/maia-platform-frontend/blob/3e5ef6d86287481cdbf730c1499d5023ae79eb48/src/lib/engine/tensor.ts
[maia-bar-source]: https://github.com/CSSLab/maia-platform-frontend/blob/3e5ef6d86287481cdbf730c1499d5023ae79eb48/src/pages/analysis/%5B...id%5D.tsx
[maia-score-source]: https://github.com/CSSLab/maia-platform-frontend/blob/3e5ef6d86287481cdbf730c1499d5023ae79eb48/src/lib/analysis.ts

### Analysis move colors

Current-position move colors follow Maia's complete legal-move evaluation and
ranked palettes. Cards and Moves by Rating share the same colors; opening Others
only expands the list. Move-hover details show Maia probability, White-perspective
Stockfish evaluation, mover win rate and evaluation loss. These estimates remain
separate from whole-game classifications. See the [source audit](maia-rating-chart.md).

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

## Community Arenas

[Weekly community Arenas](arena-plan.md) use native Arena pairing, clocks, scores
and results. Approved hosts can configure human-only events or managed Maia
fillers (default saved-rating range 1400–1700, target ten active participants).
Human entry remains unlimited. See the guide for setup and bot behavior.

The native discovery/menu/homepage alignment in #324 is a draft follow-up; its
schedule, Finished history and homepage spotlight are not deployed yet.

## Related feature guides

- [Maia opponents, game capacity and background activity](public-bot-activity.md).
- [Analysis boards, engine preferences and move insights](analysis-presentation.md).
- [Nostr identity and account access](nostr.md).
- [Saving and restoring your sign-in key](nostr-sign-in-backup.md).
- [Chess basics, practice and community features](native-learning-community.md).
