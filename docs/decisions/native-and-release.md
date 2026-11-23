# Owner decision record: native and release

Historical instructions retained from AGENTS.md. Read the [current rules](../../AGENTS.md)
first; later owner instructions supersede earlier conflicting entries.

## Native source of truth: Lila fork (#362/#363/#364)

Native application changes belong in `Dash1971/lila`, through pull requests
against its `main` branch. Preserve the existing NoSweat namespaces and keep
edits to upstream files to small hooks. The fork's `master` is an untouched,
fast-forward-only upstream mirror; never commit to it. Merge upstream into
native `main`, never rebase or force-push deployed history. Urgent upstream
security fixes use `git cherry-pick -x`.

Phase 1 merged in #368. The approved GitHub test file is metadata only.

`deploy/lila/native-pin.json` pins the native fork commit and upstream base.
Native PRs reference the Mute issue; companion PRs here bump that pin and carry
adapter/documentation changes, closing the issue. Build directly from the fork;
verify exact HEAD and clean status under the documented generated-file rules.
Releases and fresh security verification identify native source with
`nativeCommit` and `nativeTree`. The reviewed inventory records the same fork
repository, commit and tree, retaining upstream pins and security backports.

The owner approved one tree exception on November 23: the fork-only
`.github/workflows/mute.yml` test file is repository metadata, excluded from the
application-departure inventory. No other source path is exempt. See
[the fork contract](../../docs/native-fork.md). No newer upstream update or native
behavior change is authorized by the migration itself.

## Next application release: fast-xml-parser (#318)

Owner instruction, November 19, 2026: include #318's reviewed fast-xml-parser
5.12.0 native manifest/lock upgrade in the next planned application release.
Refresh the deployed security inventory and current verification records, then
confirm OpenClaw inventory_verified=true using a fresh collection. Keep the
live advisory visible until deployment; this draft is not installation evidence.

## Required security verification after every deployment (owner policy, November 7, 2026)

A deployment is not complete until the active release's security verification
record has been refreshed and OpenClaw's existing daily-report classifier accepts
it. This applies to every application deployment, including changes confined to
UI/styles and releases that retain dependency versions. Match the actual active
RELEASE.json commit, native fork commit/tree
and inventory hash; verify the deployed
libraries, browser sanitizer and running private runtime/backport fingerprints.
Update docs/security-inventory.json when versions, pins, backports or advisory
applicability change. An unchanged inventory alone does not verify a new release.

Coordinate every planned RELEASE.json change with the existing host-monitor
maintenance wrapper, declaring that exact path. After deployment, confirm the
monitor's expected release fingerprint matches the verified active release and
all other control hashes/isolation remain unchanged. A pre-existing mismatch
requires explicit release/provenance verification and a scoped recorded approval
of that release fingerprint; never reset unrelated baselines or suppress alerts.

Preserve original build receipts and their commit IDs. Use the matching current
release's real build evidence and observed runtime checks to produce a fresh
SECURITY_VERIFICATION.json; publish the same current verification at the existing
SECURITY279_BUILD.json reader path as documented in docs/security-maintenance.md.
Never claim a rebuild or check that did not run. Confirm inventory_verified=true
with a fresh collection using the existing classifier before declaring success;
keep unresolved/new advisories visible. No report-rule weakening, unrelated monitor-baseline
reset, scheduler change or new general tooling is authorized by this policy.

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
contract retained, why the hook is necessary, and its verification/upstream-merge impact.
CI checks coverage and pin consistency; it cannot substitute for semantic review.
Remove obsolete patches when upstream provides an equivalent. Keep upstream
merges separate from unrelated feature changes. See #75.

The owner's confirmed direction is recorded in `docs/chess-foundation.md` (28 October 2026): desktop/browser only; Lichess/Lila is the base for all exposed chess play and analysis; Mobile Maia / En Croissant / maiachess.com add the specified analysis capabilities. Cyberpunk/cypherpunk is the wrapper and branding.

Read that decision before changing architecture. The current Node/Fastify round implementation is an infrastructure prototype, not a decision to reimplement the Lichess chess experience. Do not expand a parallel custom rules/clock/premove/analysis-tree stack. Retain the native Lichess base and its tested behavior, adding clear adapters for Maia, Nostr and our supported human-versus-bot scope.

The owner retired the Node/Fastify prototype on 28 October 2026. Its service is stopped and disabled; source, configuration and database are retained for rollback/reference. Do not restart or expand it by default. The separate native Lila development stack is the active foundation. Do not conflate inference-only benchmarks with complete-stack capacity. Preserve concurrent homepage work. No Mobile Maia app release/change is implied. The owner subsequently authorized deploying the completed native Maia/Nostr alpha; the Mute Chess domain cutover remains pending separate publication approval; see `deploy/public/README.md` and the dated private deployment handover. Preserve the separate public service/data boundary.

Use confirmed bot identities/policies from issues #1/#2 rather than mockup names. Reuse the existing classification references and reliability safeguards; keep Stockfish evaluations, Maia likelihoods and classifier annotations semantically distinct. Preserve upstream licenses and exact-source provenance.


## Owner follow-up: native Lichess experience first

On 28 October the owner superseded the club landing page and manual bot challenge flow. Use the native Lichess homepage, quick-pair grid, custom time-control dialog, rounds and analysis. Anonymous games are casual; signed-in Nostr accounts start at native provisional 1500, then use native Glicko ratings. The server assigns an available bot within ±200 of the player's matching rating; no opponent chooser or direct challenges. Keep all existing Lichess styling/branding until the chosen Mute Chess logo is integrated. Branding work is limited to the logo concepts requested separately. Preserve NIP-07 as the recommended signer, with user-requested generated/imported browser keys as an alternative. Stacked premoves from Mobile Maia join the analysis/gameplay enhancement roadmap.


## Release discipline

The owner requires one permanent branch, `main`. Use short-lived feature branches and pull requests, review changes, pass checks, merge on GitHub, then deploy the merged main revision. Do not deploy unmerged or dirty code. Run `python3 deploy/public/verify-main.py` before preparing a release. Rebuild/verify the native source against that exact main pin. Record the main commit in RELEASE.json and verify the live revision. Delete merged feature branches; do not keep parallel release/development branches. This replaces the earlier deploy-before-push workflow.


## Standard chess only (owner decision, 29 October 2026)

Mute Chess supports standard chess only. Do not expose or add chess variants, including Chess960, Atomic, Crazyhouse, Antichess, Horde, Racing Kings, King of the Hill or Three-check. Standard-chess FEN positions, PGN imports and the board editor remain supported. Hide variant selectors and reject variant analysis URLs/imports. Keep upstream variant internals only where the native Lichess foundation needs them. Footer social links currently point only to the Mute Chess GitHub repository; there is no swag store.


## Issue-to-release workflow (owner decision, 29 October 2026)

For every new feature, create a GitHub issue first. Implement on a short-lived codex/ branch, create a PR referencing the issue with Closes/Fixes, review and pass required checks, merge on GitHub, verify the linked issue is closed, then deploy the verified main commit. Preserve one permanent main branch. Apply this to the active requested features as well; related fixes may share a PR with separate linked issues. Do not deploy unmerged code.


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


## Playing Maia opponent conditioning (November 1, #176)

For new human-versus-Maia games, use the human's native matching-speed rating as
the opponent model input, clamped to600–2600; anonymous play matches the bot self
input, assuming equal strength. Freeze signed-in human conditioning
at admission under a new explicit policy version. Keep the bot self input and
fixed sampling/history/timing, existing frozen games and study policies intact.
This differs from analysis/puzzle Maia, where both inputs match each selected
channel. Document engine choices in README and issue/PR. Fixed-input calibration
does not establish the new dynamic-human policy's strength; preserve earned
ratings and native matching/Glicko without rerating or starting research games.

## Homepage activity counters (owner correction, November 1, #181)

Restore the native live players-online and games-in-progress counters below
quick pairing. Preserve native counts, socket updates, number spreaders and
links. Keep the focused Maia pairing surface; do not restore unrelated lobby
buttons, feeds or navigation.

