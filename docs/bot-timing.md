# Control-dependent Maia timing

Owner request #60, October 30, 2026. Port the complete Mobile Maia
`sampleHumanMoveTime` at `8563954429c2fb53ce0fe0e16c73c5d8a73ccfe0`, including its
#86 control tiers. The earlier adapter copied the lognormal base/rare-pause formula
but omitted the control-specific transformation.

| Configured control | Total target, including inference |
| --- | --- |
| 1+0 | Half the base sample, capped at 3 seconds |
| 2+1, 3+0, 3+2 | 75% of the base sample, capped at 4.5 seconds |
| Other controls, correspondence, unlimited | Original base sample |

Apply these transformations after the 6% rare pause and before millisecond
rounding, exactly as the Dart reference does. Initial time/increment come from
Lila's authoritative clock configuration, not remaining time. Preserve the
existing additional-wait cap: subtract inference/queue elapsed time from the total
target, spend no more than 5% of the current remaining clock less a 250ms reserve,
and never add a wait if the target has already elapsed.

Timing version `lognormal-mobile-controls-clock-cap-v2` and the frozen policy hash
change for new games. Bot identities, conditioning, temperature/top-p rules,
opening variety and the per-game sampling seed contract are unchanged. Preserve
older snapshots for audit; deployment requires no active games, including native
friend games. Never hot-swap a policy inside an active game.

The pinned GPL source, independent expected boundary vectors and license are in
`third-party/mobile-maia-timing`. Tests compare rare-pause thresholds, rounding,
all four fast controls and unscaled controls. Native qualification records target,
actual and inference durations separately; polling/network/CPU time can exceed a
target and must not be represented as artificial waiting.
