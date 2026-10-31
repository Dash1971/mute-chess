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

We use a varied reference pool of 250 Maia bots to estimate starting ratings
from playing settings, anchored in observed Lichess Maia ratings. The estimates
averaged about 116 rating points of error in Blitz and Rapid. The illustrated
[report explains the method, results and limits](https://github.com/Dash1971/mobile-maia-research/blob/ff92969acbc1df8fef97a40aa3bc3b564b7d8fa5/studies/bot-rating-establishment-2026-10-31/REPORT.md),
with linked data and reproduction tools. Each new bot keeps its own provisional
rating and earns its own history through Lichess's native rating system.

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
