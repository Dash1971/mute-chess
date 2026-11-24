# Analysis presentation

The native Lichess board, move tree, graph, accuracy, ACPL and Learn from your
mistakes remain the foundation. Maia probabilities, Stockfish evaluations and
move classifications are separate. This guide describes the current interface;
[implementation history](records/analysis-presentation-history.md) retains the
issue-by-issue changes and their validation.

## Maia cards and rating chart

Two independently rated Maia cards show their leading moves and raw probabilities.
Their frames reserve space during loading, errors, terminal positions and move
changes. Others expands the remaining legal moves within the card. With one Maia
enabled, its card fills the sidebar and shows eight leading moves; its saved
second-channel rating is retained. Puzzle review uses compact separate rows.

Moves by Rating samples 600–2600 and uses the adapted candidate union and adaptive
60%/100% scale from [maiachess.com's source](maia-rating-chart.md). Probabilities
are not renormalized to the displayed candidates. Move-quality colors use
Stockfish evidence, not move popularity. The current-position expected score is
win plus half draw for the side to move, distinct from game accuracy.
[Maia Lab](maia-lab.md) expands this into rating curves, a Move map and rule-based
position descriptions. Assistance stays unavailable during puzzle/practice solving.

## Layout, openings and phases

The desktop layout keeps the native board, Maia sidebar and Stockfish/tree areas.
The sidebar is bounded to board height; long WikiBook articles scroll within it
instead of pushing Import/Export off the page. Candidate expansions also scroll
inside their cards. Narrow layouts retain the native responsive behavior.

The latest recognized opening on the viewed path appears below the board as
`ECO · Opening name`. The row stays reserved when unknown. Long names truncate
and expose full text through a tooltip and keyboard/click-accessible details.
The bundled CC0 opening table adds no remote explorer dependency.

The evaluation graph retains native values and navigation while adding game-phase
boundaries and classification markers. White/Black summary counts flank the
labels. Phase accuracy is omitted. Private Notes and spectator chat are hidden
without deleting saved notes. The tree, board badges and review summary share
the six-class move palette; Maia candidate-quality colors remain separate.

## Review, import and export

Whole-game browser analysis runs inside Computer analysis with progress and Stop.
Switching under-board tabs does not cancel it; navigation, stale-line guards and
explicit Stop control the job. A stopped classification pass retains completed
native review. Standalone results remain temporary; post-game results retain
existing browser-local persistence. No replacement accuracy formula is used.

The [current Brilliant classifier](brilliant-moves.md) is Mute Exchange. Its
policy and evidence supersede older additional-search descriptions in historical
notes. Mobile Maia keeps its own existing classifier.

Import and Export are separate tabs. Valid FEN edits use the native change flow;
PGN uses its native focus-revealed action. Draft import text survives tab changes
and is never substituted for the actual tree during export. Standard-chess FEN
and PGN retain Maia integration; variants remain unsupported.

Export uses native FEN, Image, Share and annotated/raw PGN controls. Serialization
includes the current tree, variations, comments, evaluations, imported headers
and annotations. Unsaved analysis does not create a public game. See
[export details](analysis-export.md).

## Engine Analysis settings

Profile & settings → Engine Analysis opens a normal native settings page. Board
and puzzle-review settings controls use the shared dialog and browser-local
preferences. Each Maia channel's two conditioning inputs match its selected
rating. A second Maia defaults on when no explicit preference exists.

Fast, Balanced and Thorough review modes and advanced Stockfish controls retain
their existing consumers. Model/history choices are under Advanced Maia settings.
Four validated color controls and Reset arrow colors configure source colors;
changing arrow appearance redraws without recomputing inference. Geometry,
tapering, agreements and badge layering are documented in
[the arrow guide](arrow-behavior.md). Hiding arrows does not expose solving hints
or discard engine settings.

## Verification and upstream merges

Use the existing native UI/Scala checks and exact departure inventory. Review
frame stability, long openings, variation lookup, summary navigation, phase labels,
Others, rating selection, narrow puzzle rows, settings and import/export. Preserve
source licenses and the [analysis provenance](../analysis/PROVENANCE.md).

<details>
<summary>Historical section links</summary>

<a id="accepted-analysis-presentation-111"></a>
- [Accepted analysis presentation (#111)](records/analysis-presentation-history.md#accepted-analysis-presentation-111)

<a id="opening-name-and-eco"></a>
- [Opening name and ECO](records/analysis-presentation-history.md#opening-name-and-eco)

<a id="phase-lines-and-red-grades"></a>
- [Phase lines and red grades](records/analysis-presentation-history.md#phase-lines-and-red-grades)

<a id="standalone-analysis-board-121"></a>
- [Standalone analysis board (#121)](records/analysis-presentation-history.md#standalone-analysis-board-121)

<a id="brilliant-evidence-and-actual-exports-130131"></a>
- [Brilliant evidence and actual exports (#130/#131)](records/analysis-presentation-history.md#brilliant-evidence-and-actual-exports-130131)

<a id="native-import-and-export-tabs-133"></a>
- [Native Import and Export tabs (#133)](records/analysis-presentation-history.md#native-import-and-export-tabs-133)

<a id="review-spacing-and-brilliant-color-148"></a>
- [Review spacing and brilliant color (#148)](records/analysis-presentation-history.md#review-spacing-and-brilliant-color-148)

<a id="shared-board-and-summary-classification-colors-225"></a>
- [Shared board and summary classification colors (#225)](records/analysis-presentation-history.md#shared-board-and-summary-classification-colors-225)

<a id="import-control-correction-153"></a>
- [Import control correction (#153)](records/analysis-presentation-history.md#import-control-correction-153)

<a id="native-export-parity-and-initial-tab-155158"></a>
- [Native export parity and initial tab (#155/#158)](records/analysis-presentation-history.md#native-export-parity-and-initial-tab-155158)

<a id="engine-analysis-settings-150151-november-1-2026"></a>
- [Engine Analysis settings (#150/#151, November 1, 2026)](records/analysis-presentation-history.md#engine-analysis-settings-150151-november-1-2026)

<a id="account-menu-access-and-matched-inputs-173"></a>
- [Account-menu access and matched inputs (#173)](records/analysis-presentation-history.md#account-menu-access-and-matched-inputs-173)

<a id="readable-wikibook-and-79m-browser-acceleration-183184"></a>
- [Readable WikiBook and 79M browser acceleration (#183/#184)](records/analysis-presentation-history.md#readable-wikibook-and-79m-browser-acceleration-183184)

<a id="inline-browser-computer-analysis-208"></a>
- [Inline browser computer analysis (#208)](records/analysis-presentation-history.md#inline-browser-computer-analysis-208)

<a id="arrow-and-annotation-layering-219"></a>
- [Arrow and annotation layering (#219)](records/analysis-presentation-history.md#arrow-and-annotation-layering-219)

<a id="move-tree-classification-palette-287"></a>
- [Move-tree classification palette (#287)](records/analysis-presentation-history.md#move-tree-classification-palette-287)

<a id="arrow-behavior-reference-328"></a>
- [Arrow behavior reference (#328)](records/analysis-presentation-history.md#arrow-behavior-reference-328)

<a id="maia-lab-337340"></a>
- [Maia Lab (#337/#340)](records/analysis-presentation-history.md#maia-lab-337340)

</details>
