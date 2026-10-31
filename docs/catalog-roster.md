# The expanded Maia opponent pool

The roster contains **10,000 persistent identities**: the original 250 reference
bots plus 9,750 new opponents. The new identities reuse measured Maia playing
policies; their names, history mode, sampling and timing personality persist.
This source release is prepared for deployment; the activation receipt below
must be completed before claiming it is live.

## Ratings

We retain every existing account's earned native ratings and game history.
New identities receive an assigned rating from the measured policy they use,
with **initial RD 100 and zero completed games**. Native Glicko marks RD below
110 as nonprovisional and continues updating the ratings normally. This is an
explicit, owner-approved bot initialization policy, not a change to Glicko or
the rating rules for humans. It does not promise that assigned ratings never
move or remain nonprovisional indefinitely after inactivity.

No account inherits another bot's game count or rating history. Profiles label
new ratings **Research-seeded** and link the methodology. Existing named accounts
keep their names. Twelve strong SignalTrain/Test placeholders receive display
names only; their handles, playing policies, ratings and histories stay intact.

The [research report](https://github.com/Dash1971/mobile-maia-research/blob/d12f93536442c636d56ec23313e89807a2771467/studies/bot-rating-establishment-2026-10-31/REPORT.md)
explains the Lichess starting reference, native rated games and sampling effects.
For this release, we can use direct measured-policy evidence rather than
extrapolating the report's smooth planning formula to thousands of new settings.

Equivalent effective policies are grouped (including argmax aliases), retaining
conditioning, history and opening behavior. Their per-speed reference rating is
the mean weighted by inverse recorded RD squared. This supplies a central
estimate when several accounts played the same policy; it is not a new
confidence interval or independent replication. There is no universal history
bonus or penalty. Reusing an exact history mode retains direct correspondence
with the measured policy.

New Blitz/Rapid templates below 800 are excluded rather than relabeled. The
original reference accounts remain untouched, including the one historical
Blitz rating slightly below 800 and Wintermute near 3,000. The useful supported
range is approximately **800–3,000 Blitz and 800–2,800 Rapid**. These are observed
roster ranges, not forced endpoints for the estimation formula.

### Other time controls

New Bullet priors use the measured Blitz reference plus a conditioning-matched
historical Lichess Bullet-minus-Blitz difference. Classical uses the corresponding
Rapid-to-Classical difference. These reuse the dated reference/nearest reliable
family rule documented in [the earlier mapping](bot-rating-adjustment.md).
Unreliable upper families fall back to the nearest family with established
ratings, RD at most110 and at least30 games in both source categories.

These are inferred cross-speed priors, not additional measured calibration.
UltraBullet uses the Blitz proxy and Correspondence the Rapid proxy; both are
explicitly unvalidated. All new catalog categories use the owner-requested
assigned nonprovisional initialization. Existing accounts, including their
unplayed/provisional categories, are never reseeded by this expansion.

## A Lichess-shaped distribution

The generator uses the archived official **weekly Blitz and Rapid distributions
from October30,2026**, conditioned on the supported800-and-up range. It matches
both distributions together because each playing policy has one paired
Blitz/Rapid strength vector. It never assigns unrelated speed ratings just to
force a histogram. Counts include the 250 preserved reference accounts.

| Rating band | Blitz identities | Rapid identities |
| --- | ---: | ---: |
| Below1,000 (approximately800–999) | 920 | 1,191 |
| 1,000–1,399 | 3,237 | 3,689 |
| 1,400–1,799 | 3,582 | 3,471 |
| 1,800–2,199 | 1,926 | 1,499 |
| 2,200–2,599 | 320 | 136 |
| 2,600+ | 15 | 14 |
| **Total** | **10,000** | **10,000** |

The largest cumulative mismatch at these boundaries is approximately0.005
percentage points for Blitz and0.119 for Rapid. The strongest Rapid tail cannot
exactly match the target while retaining all existing accounts. These are dated
weekly player distributions, not all registered accounts, and they do not
establish an exact Bullet or Classical distribution. Ratings will evolve.

## The strongest20 names

Ranked by the saved Blitz snapshot and new assigned ratings at preparation:

| Rank | Display name | Blitz rating |
| --- | --- | ---: |
| 1 | Wintermute | 3,042 |
| 2 | Durandal | 2,887 |
| 3 | Roy Batty | 2,867 |
| 4 | Kernel Ghost | 2,838 |
| 5 | Pris | 2,756 |
| 6 | WalterWobot | 2,756 |
| 7 | GLaDOS | 2,749 |
| 8 | Gaff | 2,749 |
| 9 | HAL9000 | 2,716 |
| 10 | Colossus | 2,709 |
| 11 | Eldon Tyrell | 2,706 |
| 12 | Judge Dredd | 2,697 |
| 13 | Joshua | 2,673 |
| 14 | Leon | 2,673 |
| 15 | Event Horizon | 2,617 |
| 16 | Molly | 2,587 |
| 17 | SHODAN | 2,586 |
| 18 | Neuromancer | 2,571 |
| 19 | Judge Fear | 2,556 |
| 20 | Judge Fire | 2,556 |

The [manifest](data/catalog-2026-11-01/catalog-manifest.json) also lists Rapid's
strongest20. Rankings may change through native games. Names never confer a
rating bonus. Wintermute and Neuromancer honor William Gibson's work;
Roy Batty, Pris, Gaff and Eldon Tyrell honor Blade Runner; Judge Dredd,
Judge Fear, Judge Fire and WalterWobot honor Judge Dredd/2000AD. Other
references include Durandal (Marathon), GLaDOS (Portal), HAL9000 (2001),
Colossus (Colossus: The Forbin Project), and Joshua (WarGames). These are homages without affiliation or
endorsement. [Naming source credits](../lila-adapter/catalog-names.json).

## Reproduce and audit

Run with Node24 or newer:

```sh
node lila-adapter/generate-catalog.mjs
node --test lila-adapter/test/catalog*.test.mjs
```

The generator uses only archived public evidence. It plays no games, performs
no neural inference and writes no database. Data under
[data/catalog-2026-11-01](data/catalog-2026-11-01) records reference configurations,
final native perfs, source frequencies, allocation and top20. Original44/206
roster files remain unchanged. `loadReferenceRoster` preserves the historical
250-policy cohort for completed research tools; `loadRoster` serves all10,000.

The deterministic allocation minimizes joint squared CDF error at
1000/1400/1800/2200/2600, with equal weight to Blitz/Rapid, a small repeat-count
tie penalty and a SHA-256 seed order.202 measured templates are reused. Timing
on/off and five timing styles are independently assigned by the existing hash
scheme; history matches the selected measured policy. The generator preserves
all policy attributes and checks exact native/adapter roster equality.

There is no increase in resident engines or concurrent games: the normal cap
remains2, with the existing shared presence lease, derived rating index,
uniform available matching within±200 and native rematch/rules/clocks intact.
Provisioning is bounded and idempotent; catalog collisions fail safely. Release
verification must show 9,750 legitimate zero-game assigned records added,
existing earned perfs/history unchanged, and all service/security checks healthy.

## Activation receipt

Pending verified-main deployment and live provisioning audit. Source generation
and passing tests alone are not a claim of live activation.
