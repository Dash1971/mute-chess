# Mute Chess

**Stay human. Play bots.**

[Mute Chess](https://mutechess.org/club)

Mute Chess is a free, open-source chess project built on Lichess. It combines
human-like Maia opponents, multiple stacked premoves, and Maia alongside Stockfish
analysis, with a familiar interface for desktop and mobile browsers.

## Rating goal

We aim for a player's established Mute Chess rating, earned against Maia bots,
to roughly match their established Lichess strength in the same time-control
category. We will measure and improve that alignment through bot calibration
and human/reference validation while retaining Lichess's native Glicko-2 system.
Our initial bot ratings are estimates, and this alignment remains under
validation. See the [bot rating methodology](docs/bot-population.md).

We started from observed Lichess Maia ratings, then used rated games and native
Glicko-2 to establish a varied reference roster. Our illustrated
[bot-rating report](https://github.com/Dash1971/mobile-maia-research/blob/140e2eb411923930fb0d5950b92abf6f3c0166dd/studies/bot-rating-establishment-2026-10-31/REPORT.md)
explains the reference, the measured effects of engine settings, and how the
expanded pool is calibrated.

The [live pool contains 10,000 persistent opponents](docs/catalog-roster.md).
The original 250 reference bots retain their earned ratings and game histories.
The 9,750 new identities reuse measured playing policies and start with assigned
nonprovisional ratings labeled **Research-seeded**, with zero completed games.
Native Glicko-2 updates those ratings as they play. Keeping playing strength close
to Lichess remains a goal we will monitor over time.

## The chess

- **Lichess with our name and logo.** Familiar boards, clocks, game history,
  variations, and analysis, with mouse and touch controls.
- **Human-like opponents only.** Join the pool and play a clearly identified Maia
  bot. Every opponent has a persistent identity; there is no human-versus-human
  matchmaking.
- **Multiple stacked premoves.** Queue a sequence of moves with board highlights,
  cancellation, and promotion support.
- **Maia and Stockfish together.** Compare Stockfish's evaluations and best lines
  with the moves Maia predicts humans would play at different rating levels.
- **Game review.** Explore candidate moves, compare moves by rating, and review
  move classifications, accuracy, and the evaluation graph.
- **Nostr accounts.** Use a Nostr identity for your account and saved games, or
  play casual games anonymously.

Play at [mutechess.org](https://mutechess.org/).
We're building in public, and feedback from players helps shape the project.
The Quiet Signal visual identity is documented in [the brand guide](design/quiet-signal/README.md).

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
[rating methodology](docs/bot-population.md).

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
[analysis details](docs/analysis-presentation.md).

Browser analysis downloads its model from mutechess.org and caches it locally.
The 79M model tries WebGPU, with a multi-threaded CPU fallback where supported.
Visitors do not download the model from GitHub; deployment can fetch a pinned
upstream copy if the server's existing model is unavailable.

## The club, 2097

Neural implants have put Stockfish 99 and 4750 Elo in everyone's head. Nobody can
trust a human opponent anymore.

A few nonchippers discover an old SSD containing a copy of the Lichess repository.
They use it to form the Mute Chess Club, playing bots trained on human games
from the before times, 2023. The missed mates, questionable sacrifices, and
occasional moments of brilliance are all still there.

To keep human chess alive, they stopped playing humans.

## Contribute and fork

Contributions and forks are welcome. Help improve the chess experience, test on
different browsers and devices, improve accessibility, work on analysis tools,
or make the documentation clearer.

- [Report a bug or suggest an improvement](https://github.com/Dash1971/mute-chess/issues).
- [Explore the product roadmap](https://github.com/Dash1971/mute-chess/issues/3).
- [Discuss bot identities](https://github.com/Dash1971/mute-chess/issues/1)
  and [help with strength calibration](https://github.com/Dash1971/mute-chess/issues/2).
- Open a pull request, or fork the project and share what you build.
- Follow the [upstream maintenance policy](docs/upstream-alignment.md).

For substantial changes, open an issue first so we can discuss the approach.
For bug reports, include what happened, what you expected, and your browser and
device.

## Source and licenses

Mute Chess is noncommercial and licensed under the
[GNU Affero General Public License v3.0](LICENSE).

The project builds on [Lichess](https://github.com/lichess-org/lila),
[Maia](https://github.com/CSSLab/maia3),
[Stockfish](https://github.com/official-stockfish/Stockfish), and other free and
open-source work. Upstream licenses, notices, and source attribution are retained.

See [third-party notices](THIRD_PARTY.md),
[analysis source provenance](analysis/PROVENANCE.md), and the
[pinned upstream source inventory](docs/chess-sources.json) for the components,
source versions, and reproduction references.
