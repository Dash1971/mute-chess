# Shared Maia Lab

Open **Moves by rating · Open Maia Lab** in puzzle **review**, standalone analysis
or post-game analysis. The three entry points use one native accessible dialog,
the existing browser Maia models/Stockfish worker and the same current-position
evidence. No inference is sent to a server. There is no additional model download
beyond the model chosen in Engine settings.

The larger chart shows six or eight real legal candidates, retaining the best
three evaluated roots before Maia's selected-rating leaders. It samples both
players at the same rating from 600 through 2600 in steps of 100, preserving raw
legal policy probabilities; displayed candidates are not renormalized. Missing
rating samples remain gaps. The slider and chart keyboard interaction select a
local viewing rating without changing either existing Maia channel preference.

The table, selected-move details, chart and Move map use the same ranked quality
palette. Hover/focus previews through native ceval ownership checks; selecting a
move highlights its source/destination on the native readonly mini-board. Only
**Explore selected move** closes the dialog and explicitly enters a native
analysis variation. Current arrows, classification badges, native graph, accuracy,
ACPL, learning, mainline and stored annotations keep their existing behavior.

The Move map places empirical Stockfish win-rate loss in percentage points on
its horizontal axis (stronger moves on the left), and raw selected-rating Maia
probability on its vertical axis. Unknown engine evidence is omitted. The table
keeps every displayed candidate accessible when dots coincide. This direct loss
scale is a documented adaptation of upstream's retained MoveMap component.

## Position descriptions

The rule-based summaries adapt [Maia's GPL source](../third-party/maia-platform-descriptions/README.md),
not an LLM. They consider all 21 rating levels, identify tempting blunders,
list up to three similar-strength continuations, describe the overall outcome
and indicate how often an acceptable move is the model's first choice. They do
not assert measured human difficulty, recompute game classifications or invent
engine evidence. Whole sentences, controls, help, errors and accessibility labels
ship in en-GB, de-DE, es-ES, fr-FR, hi-IN, ja-JP, ko-KR, pt-BR, ru-RU and zh-CN.

A description waits for every legal root to have finite depth-12 evidence and
for every rating sample to arrive. Game analysis retains its usual depth-10
screen; opening Lab requests a bounded depth-12 all-root pass through the same
queue, preserving deeper scores already available. Puzzle review samples ratings
and requests the existing bounded Stockfish all-root search only after opening
Lab. Closing it stops further puzzle samples and cancels its root search.
Existing cancellation, worker recovery and per-phase watchdogs remain intact.

Navigation, engine/model/history changes, hiding the page, disabling analysis or
returning to puzzle solving invalidates the dialog's context. Pending work may
finish internally but cannot publish old results. A failed search produces an
unavailable state; a terminal position has no invented move or continuation.

## Upstream comparison and limits

Upstream source pin: `15cef70619bbd7d70c5b0575af3bcf907aeed62c`. Descriptions use
Maia's 0.08 W/D/L proximity, 0.5/9 mean tempting-move probability, 0.10 empirical
win-rate-loss, 40% treachery and 2/9, 6/9 findability thresholds. The adaptation
requires complete evidence and uses simpler deterministic translated templates.
Colors retain Mute's earlier pinned empirical lookup; current-position palette
estimates remain separate from full-game classifications. Different model sizes,
history, score depth and evidence may produce different descriptions from Maia.

Human bars were an unavailable advanced-view idea in the approved mockup; they
are not included here. Upstream's separate forecasting service, conditional
Lichess-game integration and hidden panel are not a browser-only drop-in.

## Verification

Native tests cover all three integration points and solving/threat/engine gates;
raw probabilities, legal candidate limits, missing/depth/malformed evidence,
full-range descriptions, native catalog functions/placeholder order, dialog
updates/closure and sampling cancellation. Existing chart, quality, snapshot,
review, classification and native UI regressions run unchanged. The native UI
build compiles both entry bundles, shared dialog CSS and all locale catalogs.
Browser/render evidence is recorded with the PR; fixtures are distinguished from
live engine analysis.

### November 18 browser evidence

These screenshots render the **actual shared component and compiled native locale
catalogs/styles**, with deterministic legal-position/engine/policy test fixtures.
They are UI/lifecycle evidence, **not live model predictions or three separate
full native pages**. Native controller integration tests separately cover puzzle
review, standalone and post-game providers and assistance gates.

- [Desktop dialog](maia-lab/desktop.jpg)
- [Move map](maia-lab/move-map.jpg)
- [German narrow layout](maia-lab/german-narrow.jpg)
- [All ten compiled locales](maia-lab/locales.json): localized labels, no unresolved
  placeholders, no horizontal dialog overflow and no overflowing detail labels.

Also exercised eight candidates, linked source/destination highlights, returning
between chart/map, a 320px map, and native Escape cleanup. Modal control keys
cannot invoke the underlying board shortcuts. Forced mates retain signed mate
notation; pawn-loss metrics are withheld when they would compare a CP value
with a mate proxy. Empirical win-rate lookup percentages are labeled explicitly
and are not forced-mate probabilities. Native UI suite: 462 passing tests.
