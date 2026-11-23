# Owner decision record: bot pool and research

Historical instructions retained from AGENTS.md (relative links adjusted). Read the [current rules](../../AGENTS.md)
first; later owner instructions supersede earlier conflicting entries.

## Control-dependent human timing (owner request, October 30, 2026)

Use Mobile Maia's complete timing implementation, including its 1+0 and
2+1/3+0/3+2 tiers, selected from original clock configuration. Count inference
inside the total target and preserve the low-clock added-wait cap. Version changes
in frozen game policy; never replace an active game's timing silently. See
`docs/bot-timing.md` and #60.

## Bot population and calibration boundaries (owner decision, October 30, 2026)

Target a 10,000-identity roster shaped by Lichess's observed per-speed rating
distributions. Sampling, move-history on/off, human timing on/off and one of five
timing styles persist per bot. Preserve uniform selection within the supported
rating window; do not add recent-opponent avoidance. Only the human clicking
Rematch can request another game. Use native limited preset chat with brief bot
replies in bot games (#70), retaining friend chat. Keep attributes transparent on
profiles and methodology in GitHub.

Implement scalable presence/rating lookup first (#72), retaining the current 44
identities and earned ratings for that infrastructure release. The combined
bot-versus-bot run must actually set/update native Glicko ratings while measuring
full-stack capacity, but remains planning-only in #73: agree a bounded server
pilot and compute/runtime budget before any calibration or load test. No run on
the owner's Mac, unattended overnight job or capacity increase is authorized by
the infrastructure work. Timezone availability, breaks and country-inspired
personas are deferred in #71. See #69 and `docs/bot-population.md`.

## Rating goal and initial trial timing (owner decision, October 30, 2026)

An established human Mute Chess rating should roughly translate to established
Lichess strength in the corresponding speed pool; this is an empirical project
goal, not a claimed guarantee. Keep native Glicko-2 and validate the alignment.
For the initial 44-bot Blitz/Rapid experiment in #73, disable added human-timing
waits using a separately versioned study policy, retaining native clocks and
fixed sampling/history settings. Do not change production personalities. The
owner accepts setting clock-pressure concerns aside for this initial scope;
1+0 Bullet timing is later validation. Record the run's agreed limits and
execution status in #73; this documentation update does not start a job.
Use matched Maia3 cross-speed evidence as provisional Bullet/Classical priors
later, not as a universal offset or a reason to reset earned ratings. See #78.

## Authorized public rating trial (owner correction, October 30, 2026)

The owner authorized #73/#80 and corrected the separate-database assumption:
the actual bot-versus-bot games must update the PUBLIC bots' native ratings and
remain in their public histories. Preserve earned ratings, human results and
native Glicko/provisional/safeguard behavior; qualification alone is isolated.
The owner raised the target to ten concurrent games. Ramp 1 → 2 → 5 → 10, count
human pool games in that ceiling, retain one game per bot, and keep the hard
90-minute / 100-admitted-game budget with admissions ending at 75 minutes.
No automatic extension or forced establishment. See `docs/native-bot-trial.md`.
This explicitly supersedes the planning-only and no-capacity-increase limits
above for this bounded, reviewed trial; other population/chat/timezone work
remains separate.

## Second capacity step (owner choice, October 30, 2026)

After the unchanged first public batch, the owner selected a second bounded trial
up to 22 concurrent games using the current 44 bots (#91). Use two pinned model
workers under a four-core inference budget; ramp 10 → 15 → 20 → 22. Retain the
90-minute / 100-admitted-game limit per run, one game per identity, ±200 matching
and earned public ratings. Do not force 22 when eligible pairs are unavailable.
No 50-game run or roster expansion is authorized by this choice.

## Next calibration batch (owner authorization, October 30, 2026)

The owner authorized one additional batch of 200 public games (#98), continuing
from the earned results of the first 200. Use calibration-200-v1: hard ceiling
200 admissions, up to 22 games, two workers/four logical CPU quota, 2,000 MiB
worker-group memory, no added human waits, native Blitz/Rapid and Glicko.
Keep the 90-minute deadline and stop admissions at 75 minutes. Preserve native
perfs/history, one game per bot, ±200 matching and all safeguards. No automatic
extension, forced establishment, roster expansion or normal-play cap change.
Report how many bot-speed ratings meet the native provisional threshold.


## Continuous strength experiment (owner authorization, October 31, 2026)

Issue #137 authorizes a bounded experiment predicting rating from conditioning,
fixed history, temperature and top-p. Temperature/top-p are 0–1 inclusive, with
zero endpoints deterministic. Preserve existing 44 identities/earned perfs;
expand to 200 training configurations plus 50 held out, with #92 sci-fi naming.
The eight-hour budget includes preparation: absolute stop October 31,
10:34:39 UTC /19:34:39 JST, at most 3,000 public games. Retain 22-game ceiling,
two workers/400% logical CPU/2,000 MiB, no added study human waits, native
Glicko/rules/clocks/safeguards and +/-200 eligibility. Resolve/qualify #101 first.
Follow issue/PR/check/GitHub merge/verified-main deployment. No extension or
restart after failure; report partial/inconclusive evidence honestly. See
`docs/strength-experiment.md`. This supersedes earlier planning-only/44-account
limits only for the explicitly bounded experiment; no 10,000-account release
or manufactured established ratings is authorized.


## Bounded Moves by Rating and review polish (October 31, 2026)

Issue #146 follows maiachess.com’s source for Moves by Rating only: complete
candidate union, exact quality palettes and adaptive scale inside the existing
compact native layout. Other analysis cards/panels remain unchanged. Discuss
broader ideas before implementing them. Issue #148 separately requests the
Mobile Maia cyan brilliant badge and En Croissant-inspired summary symbol/label
spacing. Preserve classifications, counts, native metrics and navigation.


## Explicit timing amendment (#147, October 31 at 07:04 UTC)

The owner subsequently allowed finishing the intended 3,000 aggregate games by
22:00 JST / 13:00 UTC October 31, with admissions ending 21:30 JST / 12:30 UTC.
This supersedes only the overall eight-hour time limit above. Preserve the
original live segment's immutable deadlines and evidence. A validation-only
continuation requires normal predecessor completion, verified cleanup, no active
games, reviewed/qualified merged-main source and the exact frozen primary
snapshot/predictions. Never restart after failure, refit with held-out outcomes,
increase the game cap or reset earned ratings. All other resource/scientific
guards remain. See `docs/strength-validation-continuation.md`.

## Overnight rating establishment (new owner approval, October 31, #163)

After the completed first study, the owner explicitly approved more games using
the SAME250 bots, policies, Lichess-derived anchor and earned native Glicko perfs.
Do not shrink the roster or replace the methodology. New run `r20261031n163`,
profile `rating-establishment-v1`, has at most3,000 ADDITIONAL public games and
an eight-hour preparation-inclusive window from13:30 to21:30UTC October31;
admissions stop21:00UTC (November1 06:00JST), games stop06:30JST. Stop admissions
early when all250 have native nonprovisional Blitz AND Rapid ratings, then drain.
No forced flags/RD/counts, reseeding or another baseline subtraction. Retain22
total managed games including humans, two server workers/400%CPU/2,000MiB,
native±200/rules/clocks/ratings, no added study waits and no inference on the Mac.
Keep the200/50split and fixed training-only V2 method, freeze after training
establishment before new held-out games, and never tune with test outcomes.
This is a NEWauthorization, not a restart of the old run/failed fixture; preserve
all old evidence and timestamps. Pre-public preparation faults may be diagnosed
and repaired within this budget; public driver/integrity failure stops with no
automatic public retry. Follow the normal issue/PR/check/GitHubmerge/verified-main
release and actual private qualification/backup/off-host/cleanup safeguards.
The owner has supplied all required input and is sleeping; continue autonomously.
See `docs/overnight-rating-establishment.md`.

## Calibrated 10,000-bot roster (owner approval, November1,2026, #172)

The owner approved expanding to10,000 identities using measured Maia strength:
approximately800–3000Blitz and800–2800Rapid, with Lichess-shaped per-speed
allocation. The owner explicitly confirmed NEW bot ratings should be assigned
nonprovisional, calibrated from measured policies. Initialize those new bot perfs
with RD100, native volatility/default counts and truthful zero games; retain
native Glicko/provisional thresholds and updates. This supersedes the earlier
provisional-only initialization restriction for newcatalog identities. Preserve
all250 existing perfs/history/settings and human rating semantics. Do not add
calibration games, raise capacity, copy earned history, force permanent flags or
change matching. Reference-derived Bullet/Classical priors and UltraBullet/
Correspondence proxies must remain transparently identified. Use sci-fi and
cyberpunk homages for strong bots; keep Wintermute and other earned identities.
Only strong SignalTrain/Test placeholders receive public display-name aliases;
canonical IDs/usernames/history remain unchanged. See docs/catalog-roster.md,
source manifest and the exact-path departure register. Follow issue/PR/check/
GitHubmerge/verified-main deployment and backup-preserving provisioning audit.
## Distinctive legacy bot aliases (November 13, #322)

The owner authorized replacing generic generated labels as well as every remaining SignalTrain/SignalTest
public label using the existing alias mechanism, drawing on sci-fi, Metal Gear,
other fitting games, early computing history, Wipeout and electronic music. Retain existing aliases and
all canonical IDs, policies, ratings, games and history. Assign Elon Musk to an
existing lower-rated identity, without changing its rating. Proper names remain
untranslated. Keep this as a separate draft; no live writes, merge or deployment.
