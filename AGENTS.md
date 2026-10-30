# Mute Chess implementation direction

## Upstream alignment (owner decision, October 30, 2026)

Read `docs/upstream-alignment.md` before changing native behavior. Stay as close
as possible to Lichess/Lila: our defined departures are Maia integration,
stacked premoves, bot-only quick pairing, limited feature exposure, branding
and Nostr identity. Other specifically requested adapters must remain bounded
and justified. Preserve native rules, clocks, ratings/provisional semantics,
anti-abuse controls, completion, direct invitations and normal settings behavior.
Prefer native services and small additive adapters over replacement subsystems.

Maintain the exact-path register in `deploy/lila/upstream-departures.json` and
feature documentation whenever a native departure changes. Explain the native
contract retained, why the hook is necessary, and its verification/rebase impact.
CI checks coverage and pin consistency; it cannot substitute for semantic review.
Remove obsolete patches when upstream provides an equivalent. Keep upstream
rebases separate from unrelated feature changes. See #75.

The owner's confirmed direction is recorded in `docs/chess-foundation.md` (28 October 2026): desktop/browser only; Lichess/Lila is the base for all exposed chess play and analysis; Mobile Maia / En Croissant / maiachess.com add the specified analysis capabilities. Cyberpunk/cypherpunk is the wrapper and branding.

Read that decision before changing architecture. The current Node/Fastify round implementation is an infrastructure prototype, not a decision to reimplement the Lichess chess experience. Do not expand a parallel custom rules/clock/premove/analysis-tree stack. Retain the native Lichess base and its tested behavior, adding clear adapters for Maia, Nostr and our supported human-versus-bot scope.

The owner retired the Node/Fastify prototype on 28 October 2026. Its service is stopped and disabled; source, configuration and database are retained for rollback/reference. Do not restart or expand it by default. The separate native Lila development stack is the active foundation. Do not conflate inference-only benchmarks with complete-stack capacity. Preserve concurrent homepage work. No Mobile Maia app release/change is implied. The owner subsequently authorized deploying the completed native Maia/Nostr alpha; the Mute Chess domain cutover remains pending separate publication approval; see `deploy/public/README.md` and the dated private deployment handover. Preserve the separate public service/data boundary.

Use confirmed bot identities/policies from issues #1/#2 rather than mockup names. Reuse the existing classification references and reliability safeguards; keep Stockfish evaluations, Maia likelihoods and classifier annotations semantically distinct. Preserve upstream licenses and exact-source provenance.


## Owner follow-up: native Lichess experience first

On 28 October the owner superseded the club landing page and manual bot challenge flow. Use the native Lichess homepage, quick-pair grid, custom time-control dialog, rounds and analysis. Anonymous games are casual; signed-in Nostr accounts start at native provisional 1500, then use native Glicko ratings. The server assigns an available bot within ±200 of the player's matching rating; no opponent chooser or direct challenges. Keep all existing Lichess styling/branding until the chosen Mute Chess logo is integrated. Branding work is limited to the logo concepts requested separately. Preserve NIP-07 as the recommended signer, with user-requested generated/imported browser keys as an alternative. Stacked premoves from Mobile Maia join the analysis/gameplay enhancement roadmap.


## Release discipline

The owner requires one permanent branch, `main`. Use short-lived feature branches and pull requests, review changes, pass checks, merge on GitHub, then deploy the merged main revision. Do not deploy unmerged or dirty code. Run `python3 deploy/public/verify-main.py` before preparing a release. Rebuild/verify the native source against that exact main patch. Record the main commit in RELEASE.json and verify the live revision. Delete merged feature branches; do not keep parallel release/development branches. This replaces the earlier deploy-before-push workflow.


## Standard chess only (owner decision, 29 October 2026)

Mute Chess supports standard chess only. Do not expose or add chess variants, including Chess960, Atomic, Crazyhouse, Antichess, Horde, Racing Kings, King of the Hill or Three-check. Standard-chess FEN positions, PGN imports and the board editor remain supported. Hide variant selectors and reject variant analysis URLs/imports. Keep upstream variant internals only where the native Lichess foundation needs them. Footer social links currently point only to the Mute Chess GitHub repository; there is no swag store.


## Issue-to-release workflow (owner decision, 29 October 2026)

For every new feature, create a GitHub issue first. Implement on a short-lived codex/ branch, create a PR referencing the issue with Closes/Fixes, review and pass required checks, merge on GitHub, verify the linked issue is closed, then deploy the verified main commit. Preserve one permanent main branch. Apply this to the active requested features as well; related fixes may share a PR with separate linked issues. Do not deploy unmerged code.


## Native computer analysis restoration (owner decision, 29 October 2026)

Restore the original Lichess computer-analysis chart, accuracy, judgments, review controls and analysis editor. Do not replace them with a custom full-game review, accuracy calculation, chart or classification dashboard. Stacked premoves, Maia integration and additive brilliant-move detection are the intended improvements. Preserve native judgment semantics and imported glyphs. Brilliant detection must use the validated Mobile Maia/En Croissant evidence without replacing native analysis. Until a dedicated fishnet service is configured, whole-game analysis uses Lichess’s native on-device Analysis editor; do not expose a server-analysis request that cannot complete.


## Mute Chess rebrand (owner decision, 29 October 2026)

The public brand is Mute Chess, the domain is mutechess.org and the repository
is Dash1971/mute-chess. The owner authorized publishing the prepared local
rebrand on 29 October 2026; the hosted repository has been renamed. Follow the
normal issue/PR/check workflow for source publication. Domain routing and live
deployment remain separate work. Preserve persisted identity stores,
database/schema fields, internal protocol/configuration names, service accounts
and deployment paths; a branding change must not reset data. Preserve the
separate, ongoing Quiet Signal design implementation.


## Quiet Signal brand (owner decision, 29 October 2026)

The owner selected the Quiet Signal Mute Chess concept and authorized its implementation and PR. Use the interrupted knight, graphite/chalk/mint palette and moss board documented in `design/quiet-signal/README.md`. This supersedes the earlier logo-only styling restriction above. Preserve native Lichess layouts and controls. Keep internal NoSweat identifiers, existing browser identity keys, services, database paths and deployed origins intact; a domain migration requires its own deployment work. Easter egg ideas remain proposals.

## Native community and learning (owner request, 29 October 2026)

Enable native forum, Puzzle Storm/Streak, basics/coordinates/practice/studies,
current human-versus-Maia games, and supported account preferences. Preserve native
models, scoring, security, ownership and abuse controls. Practice lessons use the
licensed, additive subset in `learning/`; never run upstream's destructive dev
seeder. Do not reveal Maia suggestions during practice/gamebook solving. Remove
blog/coaches and unsupported navigation. Footer socials now include GitHub and
the owner's existing Flotilla room (see `docs/native-learning-community.md`).
The owner deferred opening explorer after live testing confirmed Lichess now
requires authentication. Keep #42 open; do not ship a secondary Lichess login or
shared token setup without a renewed request.

## Focused play surface (owner decision, October 29, 2026)

The latest owner direction supersedes prominent community/learning navigation:
keep the time-control grid, direct bot matching, profile/game history, analysis,
Puzzles, Community, Tools and Donate. Hide Play, Learn and Watch menus, header social/search/notification
controls (except the retained Friends and direct challenge controls) and homepage updates/puzzle/event/tournament panels. Keep native feature
routes and implementation behind the focused surface. Remove lobby UI rather
than simulating activity. Contact and legal pages use the official Nostr identity;
do not invent an email, company or jurisdiction. See `docs/focused-play.md`.


## Friends and invitation games (owner correction, October 29, 2026)

Friends remain supported. Signed-in human players may challenge one another through
native Lichess invitations. This supersedes the earlier human-versus-Maia-only
restriction for direct invitations. Quick pairing and Custom Play remain exclusively
Maia; no human pool or public lobby. Preserve challenge preferences, blocking and
ownership; do not enable anonymous/open challenges, manual bot challenges, variants
or API tokens. See `docs/focused-play.md` and #57.


## Key-first sign-in (owner request, October 29, 2026)

Lead with generating/saving a Nostr key and tell users to back up their nsec in a
password manager. Existing nsec and browser signer paths must reuse the same
identity. Retain recommended NIP-07 signing. Show authenticator/recovery-code input
only after signed proof confirms 2FA is enabled, never as an initial field or an
unauthenticated public-key probe. Preserve fresh signature-bound retries, recovery
code replay protection and local encrypted-key storage. See #59.


## Control-dependent human timing (owner request, October 30, 2026)

Use Mobile Maia's complete timing implementation, including its 1+0 and
2+1/3+0/3+2 tiers, selected from original clock configuration. Count inference
inside the total target and preserve the low-clock added-wait cap. Version changes
in frozen game policy; never replace an active game's timing silently. See
`docs/bot-timing.md` and #60.

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

## Upstream credit and donation priority (owner decision, October 30, 2026)

Donate should encourage supporting Lichess first, especially for visitors who have
not donated to Lichess or can afford to support only one project. Link directly
to Lichess's patron page. Frame Mute Chess donations around its specific Maia
integration with the Lichess experience. Keep clear, linked credits on About for
Lichess/Lila, Maia, En Croissant, Mobile Maia and Stockfish, and link source and
license notices. See #67.

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


## Immediate forum posting (owner request, October 30, 2026)

Issue #81 removes the two-day and completed-game forum qualification for signed-in
human Mute Chess accounts. Preserve native bot denial, category permissions,
moderation, captcha, spam protections and rate limits. This supersedes the earlier
requirement to retain upstream age/game qualification; default upstream mode is
unchanged. See `docs/native-learning-community.md`.


## Friendly Nostr access and backup (owner request, October 30, 2026)

Issue #94 is authorized for implementation and a PR stacked on #83 by the owner's
subsequent chat request. Keep signer sign-in direct, guidance optional and backup
exports explicit. Preserve the existing browser key-store name/schema, identities,
NIP-07 and signed 2FA flow. No custom passphrase, local unlock or encrypted backup
format. Browser persistence is optional and must not block sign-in. See
`docs/nostr-sign-in-backup.md` for the UX, platform research and verification.


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
