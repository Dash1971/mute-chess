# Upstream integration browser checks

These are the initial integration captures. See the [exact-pin review follow-up](../upstream-review-2026-11-23/README.md) for fresh standalone/post-game runs after the provenance review.

Actual Chrome captures from the private native stack on23 November2026; no mockups.
See [the integration report](../../upstream-integration-2026-11-23.md) for source,
build/test scope and limitations. Default desktop viewport; explicit390×844 viewport
for the two narrow checks, reset afterward. Disposable accounts contain no owner
credentials. Browser engines ran locally; no live service or live game was changed.

| Check | Capture | Observed result |
| --- | --- | --- |
| Focused home | [Desktop](home.jpg), [narrow](home-narrow.jpg) | Eleven clocks plus Custom, native counts and focused navigation. |
| Custom setup | [Minimum clock](custom-minimum.jpg) | Native modal closes; Home on the time slider stops at one minute. |
| Nostr login | [Sign-in page](nostr-login.jpg) | Existing key/signer controls and copy remain. No browser account/key was created. |
| Profile | [Identity help](profile-identity.jpg) | Public chosen name, permanent ID/npub and native closeable help dialog. |
| Puzzles | [Solving](puzzle-solving.jpg), [review](puzzle-review.jpg) | Engines gated during solving, Stockfish/Maia output and native best-move marks in review. Maia Lab opened successfully from review. |
| Standalone analysis | [Engine output](analysis.jpg), [classified line](analysis-classification.jpg) | Actual browser review completed; selected Qc6 blunder badge, arrows, tree colors, graph and six-class summary. The imported Scandinavian line was analyzed locally; it is not a saved game. |
| Terminal position | [Checkmate](terminal-position.jpg) | Board loads without a constructor error; Game Over and no legal Maia moves. |
| Post-game | [Completed review](post-game.jpg), [Lab](post-game-lab.jpg) | Disposable real ten-ply game: Done, accuracy/centipawn-loss summary and local move evaluations; shared Lab opens. |
| Maia Lab | [Desktop](maia-lab.jpg), [narrow](maia-lab-narrow.jpg) | Model probabilities, descriptions, correctly cased SAN, six candidates and slider below graph; End reaches2600. |
| Arena discovery | [Empty private timeline](arena-list.jpg) | Native calendar/history/help and finished section. No two-hour Arena event was run. Native Arena guards/settings/pairing are covered by the configured native tests. |

The desktop Lab capture is scrolled to its slider/table, while the narrow capture
shows the top of its scrollable dialog. A private WebSocket restart was also
checked after repeated backend rebuilds: the managed roster returned to10,000
plus the browser connection. The unchanged WS process had retained duplicate
presence counts during application-only restarts; this was not a source change.
