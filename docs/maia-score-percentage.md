# Maia score percentage

The percentage beside each Maia rating on the analysis board is **expected game
score for the side to move**. It estimates how players at that selected rating
would score if many human games continued from the position. It is an estimate,
not a promise about the result of this game.

Maia predicts three outcomes: a win, a draw and a loss. A win earns one point, a
draw half a point and a loss zero. The displayed number is:

`Score % = 100 × (P(win) + ½ × P(draw))`

For example, 20% wins, 40% draws and 40% losses give a **40% score**: 20 points
from wins plus 20 points from draws per 100 games. A 40% score does **not** mean
a 40% chance of winning outright. A score of 50% is an even expected result;
above 50% favors the side to move, and below 50% favors the other side.

The side to move changes after each move, so check the tooltip for **White** or
**Black expected score** when comparing positions. The two Maia cards can show
different scores for the same position because they use different selected
ratings. The estimate also depends on the chosen 5M or 79M model and whether
move history is enabled. These are model forecasts, not observed frequencies of
human wins from that exact position.

**Move probability** answers a different question: how often Maia expects a
player to choose a particular legal move. **Stockfish evaluation** assesses
searched chess strength. Neither is the Maia score percentage, and this number
is separate from the full-game accuracy shown by the native review.

## Where the idea comes from

We adopted the idea of showing Maia's outcome percentage from
[maiachess.com's analysis](https://www.maiachess.com/analysis) and its
[open-source frontend](https://github.com/CSSLab/maia-platform-frontend), and use the
Maia-3 model's win/draw/loss output for Mute Chess's score. The
[Maia-3 engine documentation](https://github.com/CSSLab/maia3#use-with-nibbler-or-another-chess-gui)
describes that output as a human-game outcome prediction, distinct from a
Stockfish search evaluation. [Mobile Maia's explanation and reliability
study](https://github.com/Dash1971/mobile-maia-research/blob/main/studies/score-reliability-2026-10-27/REPORT.md)
explains the same expected-points interpretation and why small changes or
occasional jumps should be treated cautiously.

The maiachess.com [November 2026 update](https://www.maiachess.com/blog/2026-november-update)
mentions a win-percentage display fix, but it is not a formula guide. In our
November 3 comparison, its analysis bar used a Stockfish-to-score lookup in
early positions. Mute Chess's Maia card score comes from its selected Maia
model, so percentages on the two sites need not match. See
[why predictions can differ](site-manual.md#why-predictions-can-differ-from-maiachesscom)
for the comparison and links to the website's source.
