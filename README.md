# Mute Chess

**Stay human. Play bots.**

[Mute Chess](https://mutechess.org/club)

Mute Chess is a free, open-source chess project built on Lichess. It combines
human-like Maia opponents, multiple stacked premoves, and Maia alongside Stockfish
analysis, with a familiar interface for desktop and mobile browsers.

## Install and self-host

**Want to play?** Open [mutechess.org](https://mutechess.org/); no app installation
is needed.

**Want to run your own instance?** Follow the [installation guide](docs/installation.md)
for a fresh Ubuntu 24.04 x86-64 machine: prerequisites, pinned Lichess sources,
Maia models, configuration, build commands, local services and verification.
The current helpers use systemd and a few fixed paths; public hosting on your own
domain requires additional configuration. The root Node app is a retired prototype.

## Feature guide

### Your key, your chess identity

No email or password to remember. Create a Nostr key in your browser, bring an
existing nsec, or sign in with a NIP-07 browser signer. The same identity connects
your profile, ratings and saved games. Signing in does not post to Nostr.

Your npub is your permanent public identity. Chosen usernames can change and are
unique without regard to capitalization; existing account and bot names are reserved.
Human profiles show a subtle npub link: click to copy the npub, or use the browser's
copy-link action for its permanent profile URL. Hovercards show a
compact npub identity link too. Search accepts a
full npub or `nostr:npub…` as well as display names. Managed opponents retain
their names and BOT tag. Native internal IDs keep existing games and links stable.

Your secret key stays with you. Keep a separate backup: browser storage alone
is not a recovery plan. An optional authenticator adds a second factor to sign-in.

<p align="center">
  <img src="docs/screenshots/2026-11-02-nostr-login.jpg" width="760" alt="Mute Chess sign-in with create-a-key, browser signer and existing nsec options; no secret key is entered">
</p>

### Plan more than one move ahead

Queue a sequence of premoves while your opponent is thinking. Projected pieces
and square highlights show your plan; each move still has to be legal when its
turn arrives. Escape or right-click clears the queue, and reconnecting or ending
the game clears it too.

Use **Allow multiple premoves** in the game board's menu to choose between the
stacked behavior and native single premoves.

<p align="center">
  <img src="docs/screenshots/2026-11-02-stacked-premoves.jpg" width="1000" alt="An anonymous casual game with the native board menu open and Allow multiple premoves enabled">
</p>

*The board menu in a casual game; this capture shows the option, not a queued sequence.*

### See the human move as well as the engine move

Stockfish looks for strong moves. Maia predicts what people might play. Put both
beside the same board, with two independently rated Maia channels, move
probabilities and shared board arrows. Click a candidate to explore it in the
native analysis tree.

**Moves by Rating** shows how a move's likelihood changes from Maia 600 to 2600.
Review a whole game with the familiar Lichess graph, accuracy and mistake-review
controls. Maia likelihood, expected score and Stockfish evaluation describe
different things; a popular human move is not automatically the best move.

<p align="center">
  <img src="docs/screenshots/2026-11-02-maia-analysis.jpg" width="1100" alt="Ruy Lopez analysis with Maia 1500 and Maia 2400 probability cards, the Moves by Rating chart, Stockfish and board arrows">
</p>

### More chances to find a brilliant move

Brillies are part of the fun. Our proposed **Mute History Rule** brings
Chess.com-like sacrifice badges to an open platform, with rules anyone can
inspect. It checks move quality and position context, remembers earlier offers,
and follows material recovery so an ordinary trade does not automatically earn
Brilliant.

We studied **1,048 labeled moves from 545 games**, starting from En Croissant
and comparing both classifiers with Chess.com on the same positions.

| On the studied examples | Mute Chess | En Croissant |
| --- | ---: | ---: |
| Chess.com Brilliants recognized | **400 / 513** | 139 / 513 |
| Extra awards on non-Brilliant moves | **22 / 535** | 9 / 535 |
| Overall agreement | **87.1%** | 63.5% |

Mute recognizes about **2.9 times as many Brilliants**, with more extra awards.
These results describe the studied examples; **fresh-game testing is underway
before release**. Mobile Maia keeps its existing En Croissant rules.

See the [illustrated research report](https://github.com/Dash1971/mute-chess-research/blob/main/studies/brilliant-moves/REPORT.md)
for the ideas and board examples, or the [exact algorithm](docs/brilliant-moves.md)
for every threshold and exception.

### Opponents with an identity

Meet a persistent cast of [10,000 Maia opponents](docs/catalog-roster.md), from
quiet circuit dwellers to familiar cyberpunk and science-fiction homages. Their
profiles show ratings, game histories, locations, flairs and the settings behind
their play: Maia input, sampling, move history and timing style.

Wintermute lives in Villa Straylight, Freeside, and wears the Circuit Knight.
Other opponents have their own combination of identity and playing settings.
Quick pairing finds an available bot near your rating; model rating inputs and
the bot's earned playing rating are kept distinct.

<p align="center">
  <img src="docs/screenshots/2026-11-02-bot-profile.jpg" width="1000" alt="Wintermute’s real bot profile with Circuit Knight flair, native speed ratings, fixed Maia settings and game history">
</p>

### A little flair of your own

Our six original cyberpunk flairs are available to human profiles as well as bots.
Open **Edit profile**, choose a flair and look in **Bot flairs**. Keep a favourite
beside your name, whether you prefer circuitry, a neon fox or a mischievous ghost.

| Circuit Knight | Synthetic Eye | Neural Chip |
| :---: | :---: | :---: |
| <img src="docs/screenshots/flairs/symbols.mute-circuit-knight.webp" width="60" alt="Circuit Knight flair"> | <img src="docs/screenshots/flairs/symbols.mute-synthetic-eye.webp" width="60" alt="Synthetic Eye flair"> | <img src="docs/screenshots/flairs/symbols.mute-neural-chip.webp" width="60" alt="Neural Chip flair"> |
| **Neon Fox** | **Origami Crane** | **Ghost Terminal** |
| <img src="docs/screenshots/flairs/symbols.mute-neon-fox.webp" width="60" alt="Neon Fox flair"> | <img src="docs/screenshots/flairs/symbols.mute-origami-crane.webp" width="60" alt="Origami Crane flair"> | <img src="docs/screenshots/flairs/symbols.mute-ghost-terminal.webp" width="60" alt="Ghost Terminal flair"> |

[Original artwork and credits](design/bot-flairs/README.md).
The screenshots above were captured from the real site on 2 November 2026;
see [capture details](docs/screenshots/README.md).

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

Current-position move colors follow Maia's complete legal-move evaluation and
ranked palettes. Cards and Moves by Rating share the same colors; opening Others
only expands the list. Move-hover details show Maia probability, White-perspective
Stockfish evaluation, mover win rate and evaluation loss. These estimates remain
separate from whole-game classifications. See the [source audit](docs/maia-rating-chart.md).

## Players and rating statistics

The [player directory](https://mutechess.org/player) uses Lichess's leaderboard,
ranked-list and rating-distribution views. Players share the same lists across
standard time controls; FIDE, tournament and separate bot sections are omitted.
These lists read current saved ratings, including starting ratings before games
are played, and refresh within a minute. Statistics describe current site ratings,
not weekly activity, and cover the full 400–4000 rating range. Closed accounts and
accounts marked for cheating, boosting or a ranking ban are excluded. This display
does not write ratings, histories or native competitive rankings.
See [#187](https://github.com/Dash1971/mute-chess/issues/187).

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
