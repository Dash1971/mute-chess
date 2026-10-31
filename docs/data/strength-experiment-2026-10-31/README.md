# October31 strength experiment qualification

These files are isolated qualification receipts, **not calibration evidence**.

- `presence/before-normal.json`: ordinary slow replay did not reproduce the timing-sensitive original race.
- `presence/before-delayed.json`: original code, private-only250ms Mongo update fault injection; returned ply0 after acknowledging ply52 at59.994seconds.
- `presence/after-delayed.json`: same fault injection with the native Tell-bus fix; monotonic legal prefix over145seconds, no rollback,149.262seconds including cleanup. WebSocket RoundCrowd confirmed one online round versus zero with the original adapter.
- `expanded-integration.json`:250 native bot accounts, both real79M worker processes,48 real legal model moves, native mate/Glicko persistence, human rated admission, busy/stale checks, native3000th admission accepted and3001st rejected, explicit stop and no ratings for aborted fixtures. Synthetic finished reservation documents test only the cursor/budget boundary.

All qualification uses port27028 / fresh `nosweat_calibration_q...` namespaces and private HTTP19763/WS19764. No public ratings or games are changed by these fixtures. Fault injection is disabled after each presence test. The fixture replays the long legal archived public game `mBPOFzst` solely as a controlled legal prefix. No fresh model-strength conclusion comes from replaying it.

Native clocks/rules/Glicko/idleTTL/GameProxy are unchanged. Adapter tests50/50, four Python encoder/endpoint/predictor tests,18 deployment tests and5 register tests passed before release. Native Scala formatting/stage passed; all three PR CI jobs passed before the receipt-only update.

Source and planned live evidence: [#137](https://github.com/Dash1971/mute-chess/issues/137), [design](../../strength-experiment.md), [presence fix #140](https://github.com/Dash1971/mute-chess/pull/140). Codex-assisted implementation and automated qualification; no human manual testing is claimed.
