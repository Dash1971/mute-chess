# Sampling evidence and the original rating priors

The original 44 identities retain their configured sampling policies and earned
native ratings. This audit records evidence for interpreting their rating drift;
it does not change either. [#100](https://github.com/Dash1971/mute-chess/issues/100)
tracks verification of the Lichess reference policy and future prior mapping.

## What is implemented

There are eleven identities per sampling profile, spanning conditioning inputs
600–2600. Temperature/top-p remain fixed per identity, with independent persistent
history/timing assignments. This roster uses four discrete profiles rather than
continuous random slider values. Non-Full profiles sample at 1/1 for both colors'
first five moves, then use their assigned settings. Full always uses 1/1.

| Profile | Temperature | Top-p | Original increment above the reference-derived base |
| --- | ---: | ---: | ---: |
| Full | 1.0 | 1.0 | 0 |
| Balanced | 1.0 | 0.95 | +75 |
| Focused | 0.5 | 0.9 | +250 |
| Argmax | 0 | immaterial | +300 |

The roster stores top-p 1 for Argmax; the sampler bypasses top-p at temperature
zero. Every game freezes its policy and independent sampling seed. The study
only overrides added human waits; it preserves sampling/history/conditioning.

## Measured Mobile Maia evidence

The [Mobile Maia sampling report](https://github.com/Dash1971/mobile-maia-research/blob/a2d90a94aac930fe17109f5e7e1b2e351c18b4fd/studies/maia3-sampling/REPORT.md)
and its raw result tables provide these direct-match gains over Full:

| Setting | Games | Relative match Elo | Marginal 95% interval |
| --- | ---: | ---: | ---: |
| 1/.95 | 1,200 | +71.04 | +52.22 to +90.29 |
| .5/.9 | 600 | +270.37 | +237.23 to +307.07 |
| Argmax | 600 | +322.67 | +288.06 to +361.73 |

These experiments used the same pinned 79M export, conditioning 1600/1600,
history off, inclusive nucleus selection and the tested sampling from move one.
They are direct pairwise measurements, not a universal additive or linear law.
The original seed increments were rough priors rather than these exact results.

## Reference-baseline audit

The historical roster field `baseline_assumption` explicitly treated the
Lichess reference as comparable to Full, unverified. The owner corrected this
on October 30 and supplied a screenshot of [ComradeRamen's September 26
post](https://discord.com/channels/1275283861890138122/1275283861890138125/1553341614368493649).
It shows `maia3-79m_1600` together with the explicit temperature 1 / top-p 95%
configuration. The same post is cited in the research repository's
[Discord notes](https://github.com/Dash1971/mobile-maia-research/blob/a2d90a94aac930fe17109f5e7e1b2e351c18b4fd/studies/maia3-sampling/discord-evidence.md).
The owner also confirms that configuration for the reference family. The
October 28 rating snapshot and September 26 configuration evidence have
separate dates; the post's pictured ratings are not substituted for the later
snapshot. Exact history/opening/nucleus-boundary semantics remain transfer
checks in #100.

Taking the confirmed p95 reference as a planning baseline gives:

| Profile | Illustrative offset from a p95 reference |
| --- | ---: |
| Full | −71.04 |
| Balanced | 0 |
| Focused | +199.33 |
| Argmax | +251.63 |

This subtraction expresses the measurements on a common tentative reference;
it is not a direct measured matchup with a Lichess reference account. Pairwise
Elo need not be perfectly transitive. There is no measured uncertainty interval
for these transferred estimates, and the original marginal intervals must not
be presented as transfer confidence bounds.

The final trial report compares each native rating both with its original
assigned roster seed and with this explicitly illustrative prior:

```text
original reference-derived base = original assigned rating − original increment
illustrative prior = base + measured profile gain − measured p95 gain
drift from assigned = earned native rating − original assigned rating
```

Keep original seeds intact for provenance; never apply these estimates as
post-hoc replacements for earned perfs. A shared absolute offset cannot be
identified by closed-pool play alone. Other conditioning inputs, persistent
history, five Full opening moves, sampler implementation and human opposition
can change the transfer. Future continuous personalities need additional
validation rather than a promised Elo value for each slider notch.

The owner identified a uniform **−75-point** shift as a candidate baseline
correction. The report shows that scenario alongside current native ratings;
it is not applied by the report. A common per-speed adjustment can preserve
earned relative differences, history and native uncertainty/volatility. Compare
the final Balanced/core bands to the p95 reference before selecting an amount;
the +71 result at 1600 is a useful magnitude rather than an exact universal
offset. Do not recompute each bot from its original seed after self-play.
