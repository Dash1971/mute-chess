# Accepted analysis presentation (#111)

The owner accepted the full-screen mockup on October 31, 2026. Preserve the native
three-column analysis layout, board artwork, orientation, engine controls, tree,
graph, accuracy, ACPL, glyph navigation and Learn from your mistakes. The changes
below are presentation adapters, not replacement chess or review systems.

The two Maia cards reserve their header, four candidate slots and Others footer
during loading, terminal positions, errors and move changes. Explicit Others
expansion scrolls inside the same card; each model's rating grid remains separate.
The fixed-height rating chart retains the 600–2600 and 0–100% scales, keyboard
selection and raw probabilities. Its move legend sits beside the heading. The
redundant Maia heading and expandable probability matrix are removed. The left
column grows naturally rather than hiding game information behind an internal
scrollbar. Native chart actions occupy a toolbar above its canvas.

White counts, centered classification labels and Black counts mirror Mobile Maia.
Only their arrangement changes: native accuracy/ACPL values and glyph-jump/learning
callbacks remain authoritative. Private Notes and spectator chat are omitted from
post-game analysis; stored notes and the native note service are untouched. The
obsolete notes-only chat fork is removed. The existing knight and wordmark retain
their artwork and size; their gap is two pixels.

## Opening name and ECO

Mobile Maia `lib/src/openings.dart` and `ReviewOpeningName` at
`8563954429c2fb53ce0fe0e16c73c5d8a73ccfe0` are the reference. Read the viewed move
path backward and match the latest recognized position, including variations and
legal en-passant normalization. Display `C00 · Opening name` under the board,
above the analysis tabs, centered as in Mobile Maia. The opening sits immediately
beneath the board: omit the native under-board margin and compensate for the empty
keyboard row in the three-column layout (#115). In the two-column layout, explicitly
collapse that unused grid track only when keyboard input is absent (#117). Keep the 28px row, placing its extra
vertical space below the name. Reserve that row even when no opening is known. Long
names stay on one line with an ellipsis and expose their full text by native
tooltip and a keyboard/click-accessible dialog, without moving other panels. Truncation is remeasured after fonts finish loading
as well as when its available width changes. The lower native player strip is
observed for size changes; reserve its width plus 8px on both sides of the opening
row (#119). This keeps the name centered and at the accepted vertical position
while leaving captured material and clocks unobstructed. Native strip rendering
and clock/material semantics are unchanged.

The same 3,810 CC0 Lichess opening rows bundled by Mobile Maia are reduced to
EPD/ECO/name in `public/nosweat/openings.json`. Their upstream source is
lichess-org/chess-openings `4b8622759e7ae6f93f011cc6c83a3823401ab45e`.
`OPENINGS_CC0.txt` accompanies the generated table. Reproduce it with:

```
python3 analysis/prepare-openings.py /path/to/mobile-maia/assets/openings/lichess_openings.tsv /path/to/patched-lila
```

The table loads once from this site's own static assets. It adds no external
opening-explorer dependency or authentication flow. While unavailable, a native
game-opening fallback is shown only when its defining node belongs to the viewed
path. Missing information leaves the reserved row empty.

## Phase lines and red grades

The native evaluation chart receives a small Chart.js drawing plugin. Mobile
Maia's `GamePhaseDetector` / `AnalysisGraphPainter` at the same revision supply
the material, sparse-back-rank and mixedness rules. Dashed boundaries and horizontal
Opening/Middlegame/Endgame labels describe only phases actually reached. Imported
endgames begin with Endgame. Short neighboring labels use separate text lanes.
Native graph data, scale, selection, tooltip, classifications, stored division and
accuracy calculations are unchanged; phase accuracy is still omitted.

Candidate blunders retain the Maia platform's 5/10 percentage-point Stockfish-loss
boundaries. Within the currently evaluated blunder group, order by mover win rate,
then centipawns and move ID, and cap the shade rank at five. This follows the
platform's ranking semantics, not probability buckets or new severity thresholds.
The accepted palette uses red shades throughout. Unsearched moves stay neutral;
the existing bounded searches and stale-result guards remain intact.

Puzzle analysis remains a separate compact surface. Each row stays on one line;
when width requires fewer leading previews, their unchanged raw probability joins
Other. Its expansion still contains every legal move with its original probability.

## Verification and rebase

Run native analyse/chart/lib/puzzle tests, full native UI type/build/format/lint
checks, and the departure-register checks. Browser checks must cover move/loading
frame stability, long opening names and details, variation lookup, summary jumps,
phase labels, chart actions above the plot, rating selection, Others, and narrow
puzzle rows. Rebase the small view/underboard/chart hooks against upstream;
namespaced opening and phase modules own the added behavior. No rules, clocks,
ratings, bot policy, identity or saved-note migration is part of this change.

## Standalone analysis board (#121)

The free standard analysis board exposes the same Analyze game action, native
local-review engine, evaluation chart, overall accuracy/ACPL, classifications and
Learn from your mistakes used after games. Computer analysis and Share & export
tabs retain the editable FEN/PGN inputs. Opening labels stay under the board.
A line needs at least one move. A FEN-only position retains selected-position
Stockfish/Maia analysis and asks the user to add moves for a sequence review.

These lines do not have a public game export. Their review omits optional native
division input; overall native accuracy/judgments are unchanged and the existing
chart plugin provides visual phase boundaries. Results stay in memory and are
keyed to the exact root/plies/FENs/moves. Edited/replaced mainlines cannot display
an old summary or receive a completed stale review. Clearing review preserves
entered moves and user/imported glyphs. No public game, identity or rating is
created or changed. Reloading an unsaved board does not persist its review.
