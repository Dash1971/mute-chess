# Owner decision record: analysis and learning

Historical instructions retained from AGENTS.md (relative links adjusted). Read the [current rules](../../AGENTS.md)
first; later owner instructions supersede earlier conflicting entries.

## Mute-only brilliant experiment (owner request, November 2, 2026)

Issue #221 authorizes a draft PR for more generous, transparent brilliant-move
awards in Mute Chess. Keep Mobile Maia on the En Croissant rules. This supersedes
EC fidelity only for Mute's `!!` eligibility: retain the independent EC references,
other annotation rules, whole-window confirmation and native analysis contracts.
Document the exact experimental gates in README and the source comparison in
`docs/brilliant-moves.md`. No merge, deployment or general tooling change is
authorized by this draft request.

## Native computer analysis restoration (owner decision, 29 October 2026)

Restore the original Lichess computer-analysis chart, accuracy, judgments, review controls and analysis editor. Do not replace them with a custom full-game review, accuracy calculation, chart or classification dashboard. Stacked premoves, Maia integration and additive brilliant-move detection are the intended improvements. Preserve native judgment semantics and imported glyphs. Brilliant detection must use the validated Mobile Maia/En Croissant evidence without replacing native analysis. Until a dedicated fishnet service is configured, whole-game analysis uses Lichess’s native on-device Analysis editor; do not expose a server-analysis request that cannot complete.


## Analysis refinement (owner approval, October 30, 2026)

Use two separate Maia cards side by side on the left, with independent leading
probabilities and Others expansions. Click each Maia label to choose its rating
in a button grid; no dropdown. Put expected score (win plus half draw, side to
move) beside the model, and Moves by Rating across the full width below both
cards. Keep Stockfish and the native move tree on the right. Preserve the native
Lichess graph, overall accuracy, ACPL and Learn from your mistakes; omit phase
accuracy. The owner now explicitly requests all validated Mobile Maia/En Croissant
move classifications, superseding the earlier brilliant-only scope. Keep imported
annotations and complete-window standout confirmation. Fast whole-game analysis
is the default, with quality and advanced engine options behind Settings. Restore
Play as a direct link to quick pairing, without a dropdown. See #62.

For smoother premoves, follow Mobile Maia PR #111: never publish an intermediate
real board between projected updates. Preserve legal server destinations, native
clocks, sounds, committed history, cancellation, endings and single premoves. See
#61. Do not add counts, strips or extra clear controls.

## Analysis presentation polish (owner approval, October 30, 2026)

Issue #65: keep summary columns bounded for long names; newly chosen/edited public
names have a 20-character limit while existing longer names may remain unchanged.
Unnamed Nostr accounts display a compact npub; canonical handles, keys and game
history do not change. Candidate move colors use Maia platform's Stockfish
win-rate-loss mapping (green <=5 percentage points, amber <=10, red above), with
neutral missing evidence and independent raw Maia probabilities. Score circles
identify White/Black perspective, not advantage. Remove spectator discussion and
watcher furniture from replay/analysis, retaining compact native private Notes.

## Accepted analysis presentation (owner approval, October 31, 2026)

Implement the accepted full-screen mockup under #111, preserving the native
three-column layout and controls. Compact fixed Maia frames, an inline rating
legend, mirrored summary counts, chart actions above the plot and the tighter
existing logo gap are approved. Remove Private Notes UI without deleting saved
notes; this supersedes the earlier notes-only replay direction. Keep puzzle
analysis separate and its Maia rows on one line. Use graded red blunder shades
with the Maia platform's Stockfish ordering, never likelihood buckets. Opening
names follow Mobile Maia (including ECO code, path/variation lookup and bounded
long-name details), directly under the board. Add Mobile Maia's game-phase
labels and boundaries to the native graph; keep native evaluation, accuracy,
ACPL and learning semantics and continue to omit phase accuracy. Use American
English in communication and product text. See docs/analysis-presentation.md.

## October 31 account and analysis follow-up (#121/#122/#124/#125)

Enable the existing post-game native computer-review flow on the standalone
analysis board. Preserve its layout and editable moves; bind temporary review
results to their exact mainline without creating public games. Restore native
scroll-hiding header behavior and header player search, including public names.
This supersedes the earlier hidden-search direction. Move profile npub furniture
into an authenticated Nostr account section linked from the owner's profile and
settings. Local nsec reveal/copy is explicitly requested, with matching-account
checks, warnings and transient display; never transmit or publish private keys.
Include optional Primal onboarding and the owner's existing official profile.

The owner subsequently requested separate Import and Export tabs on the analysis
board (#133), using native Lichess field/copy/download styling. Keep import
drafts separate from read-only exports and preserve native parser/serialization
behavior. Do not reintroduce the combined transfer tab or compact custom strip.

## Native import controls correction (October 31, 2026)

Issue #153: the owner explicitly rejects permanent Import FEN/PGN buttons.
Restore pinned Lichess import markup/behavior: no FEN button, native validated
FEN change flow, and the thin PGN bottom action revealed on focus. This
supersedes earlier explicit-submit/blank-FEN adapters. Preserve separate tabs,
PGN draft isolation, native parser/serialization and native export styling.

## Native analysis-board export and initial Import (October 31, 2026)

Issue #155: match existing post-game ReplayUi FEN/Image/Share/PGN layout and native
copy controls on the standalone analysis board, including annotated/raw exports.
Reuse native rendering, dialogs, serializers and pure PGN parsing; never create a
public game to export an unsaved line. The owner selected the existing moss
colors for image/GIF exports; preserve them through the documented native renderer
theme extension. Keep public runtime/merge changes held until the experiment’s
verified FINAL cleanup handoff; the extra renderer role must not enter #157’s
continuation release. Issue #158 makes Import initially visible on standalone
boards, retaining existing post-game defaults. The owner reconsidered #156 and
chose to retain the current side-to-move score percentage; no favored-side display
conversion ships.

## Engine Analysis settings and stable underboard (November 1, 2026)

The owner authorized #150/#151: one shared Engine Analysis screen for Maia count,
retained ratings, Maia/Stockfish arrow colors/reset and Mobile Maia’s existing
Fast/Balanced/Thorough review choices. Default second Maia on; one-engine game
analysis fills both columns with eight raw-policy moves, while puzzle review
just omits its second row. Puzzle labels open the existing rating grid. Preserve
probabilities, classification colors, expected-score perspective and native
Stockfish/solving gates. This supersedes the earlier idea-only status. #168 fixes
long opening articles pushing the underboard away; bound/scroll the sidebar
without hiding opening text or changing tabs. See docs/analysis-presentation.md.

## Profile access and Maia conditioning (November 1, #173)

Keep the current engine settings gears and expose the same Engine Analysis
dialog from Profile & settings. Both Maia inputs must always use that channel’s
selected rating, as in Mobile Maia review.dart; remove the opponent-input control
and normalize old saved mismatches. Apply this to both analysis and puzzle review
without replacing native account/settings behavior.


## Native Engine Analysis preferences page (owner correction, November 1, #180)

Profile & settings must open Engine Analysis as a normal native account settings
page, matching its sidebar, heading, section spacing and native controls. Do not
open a modal from this settings-menu entry. Preserve existing analysis/puzzle
gear dialogs and the shared browser-local preference storage and behavior.
Keep the correction bounded; general tooling work requires separate discussion
and explicit owner approval as recorded in the workspace instructions.

## Readable opening article and 79M execution (November 1, #183/#184)

Allow WikiBook to retain its natural article height and scroll within the fixed
sidebar, preserving native collapse and underboard placement. The owner approved
implementing a GPU-first79M browser path with CPU fallback for testing. Keep
model bytes, input semantics, exact21chart samples, cancellation and deadlines
unchanged. Reuse pinned runtime assets and existing preparation; no general
benchmarking/deployment framework is part of this change.
