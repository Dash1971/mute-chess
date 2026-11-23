# Staying aligned with Lichess

Owner decision, October 30, 2026: Mute Chess is a maintained adaptation of Lichess, not an independently maintained replacement for its server. Keep upstream behavior wherever our defined product differences do not require a change. This rule applies to every feature and fix, including bot infrastructure.

## Native Git history (#362/#363)

The native source of truth is [Dash1971/lila](https://github.com/Dash1971/lila),
pinned by [`native-pin.json`](../deploy/lila/native-pin.json). Native changes
are reviewed there; the companion PR here bumps the pin and records the fork commit/tree. The adapter, deployment and feature documentation stay here.

The migration changes how source is carried and verified, without changing
application files. The sole approved
tree exception is the fork's GitHub test file, `.github/workflows/mute.yml`;
it is omitted from the application-departure inventory. See [history, equality evidence and
the development workflow](native-fork.md). The existing small WebSocket,
Redis and GIF patches remain patches.

## Supported differences

- Maia analysis and the approved Mobile Maia / En Croissant analysis additions,
  with the owner-approved [Mute-only brilliant experiment](brilliant-moves.md) (#221).
- Multiple stacked premoves around native move handling.
- Managed Maia opponents in quick pairing; native direct friend invitations remain supported.
- A focused feature surface: no Watch navigation or opening explorer; Learn contains only Chess basics and Practice, standard chess only, and the previously approved Puzzles, Community, Tools and profile functions. Hidden upstream implementation can remain; do not delete large native subsystems merely to hide a feature.
- Owner-hosted native Arenas with managed Maia filler seats, as implemented in #313/#320 and described in [the Arena guide](arena-plan.md). Draft #324 restores native discovery and spotlight presentation around the approved-host event filter.
- Mute Chess branding, with clear upstream credits and licenses.
- Nostr login, public names and the approved account/security integration.

Other explicitly requested adapters, such as Lightning patronage and fixed bot personalities, are documented departures too. Their approval is not permission to redesign unrelated native behavior. New differences need a concrete product reason and a documented maintenance cost.

Native chess rules, legal destinations, clocks, game completion, Glicko calculations and provisional criteria, anti-abuse checks, analysis-tree ownership, direct invitations and normal account/preferences behavior remain upstream responsibilities. Prefer native controls, events and services over new implementations. Do not weaken those contracts to simplify an experiment. The bot rating/capacity run in #73 is still planning-only.

## Maintained departure register

[`upstream-departures.json`](../deploy/lila/upstream-departures.json) records the exact Lila and lila-ws revisions, every native fork departure and remaining WebSocket patch file, each area's rationale and its verification. This is an inventory of the existing footprint, not proof that every hunk is already the smallest possible change.

Run:

```sh
python3 deploy/lila/check-upstream.py
python3 -m unittest discover -s deploy/lila -p 'test_*.py'
```

CI rejects an unregistered native file, an obsolete/duplicate entry, a missing rationale, or a pin inconsistent with CI/build documentation. Exact paths are required; broad wildcard exceptions are not allowed. Changes inside an already registered file still require review of their purpose and upstream impact: path coverage alone cannot judge behavior.

Every PR must update the affected register entry and supporting feature documentation when its scope changes. Explain the native behavior retained, the smallest necessary hook, why native configuration alone is insufficient, and how to verify it after an upstream update. Prefer additional code in our namespaced adapter files; avoid broad native refactors or formatting churn. Remove patches when upstream gains an equivalent solution.

## Bot infrastructure integration points (#74)

| Native location | Why the change exists | Upstream behavior retained |
| --- | --- | --- |
| `app/NoSweatService.scala` | Our adapter's admission, fixed policies and bounded provisioning; use a derived rating-band index instead of reading every account per pairing. | Native game construction, speed ratings and game completion. Revalidate the chosen account/rating; preserve uniform selection within ±200 and the existing concurrency limit. |
| `modules/bot/src/main/PoolCatalog.scala` | A rebuildable in-memory index of native perfs, refreshed after native rating writes. | Native MongoDB perfs remain the rating authority; no new rating formula or public rating resets. |
| `modules/bot/src/main/ManagedPresence.scala` and `OnlineApiUsers.scala` | Represent an always-available managed roster with one health lease instead of thousands of expiring account heartbeats. | Existing individual API-bot presence remains unchanged; managed bots go offline on lease expiry. |
| `modules/core/src/main/socket.scala` and `modules/socket/src/main/RemoteSocket.scala` | A small roster-presence event bridge, with transition-only native presence announcements and reannouncement after a WebSocket restart. | Existing WebSocket protocol and ordinary user/API-bot handling. No lila-ws protocol fork. |
| `app/views/noSweatBot.scala` and the native profile header | Disclose the bot's actual fixed settings and link the methodology. | Existing native profiles, game history and account identity. |

The register uses complete source paths within the [pinned native fork](https://github.com/Dash1971/lila). The separate lila-ws patch makes its listener bind address configurable for the loopback gateway deployment. The native fork and WebSocket patch also align existing transitive Netty/Jackson runtime dependencies to patched versions through `security-dependencies.sbt` (#232); remove those overrides when the pinned upstream builds select equivalent safe versions. These build-only overrides do not change chess or messaging semantics. [Bot methodology](bot-population.md) documents assignment, timing and calibration limits.

## Updating upstream

The [23 November 2026 trial report](upstream-merge-2026-11-23.md) records the
first fork-based conflict inventory and the unresolved integration gates for #365.

1. Record old/new upstream commits and review intervening changes. Fast-forward the fork's untouched `master` mirror, then **merge** the selected upstream commit into native `main` through a reviewed PR. Never rebase or force-push native history. The owner selected a two-week cadence after the first upstream merge (#365); phase 1 performs no upstream merge or scheduling change.
2. Resolve conflicts against each departure's documented reason, adopt native equivalents, and remove obsolete hooks. Record the reason when declining an upstream change. Keep new behavior in namespaced files and edits to upstream files small; avoid reformatting or whole-file rewrites. Urgent security backports use `git cherry-pick -x` so their provenance is retained.
3. Run the fork's `mute.yml` native checks and affected integration checks. Exercise login, pairing, clocks, results/ratings, premoves, analysis, profiles and reconnect behavior as relevant. Preserve licenses and exact source provenance.
4. Open the companion PR here to update `native-pin.json` and update the register/build documentation for an upstream-base change. Pass this repository's checks before merging. Build and deploy verified Mute `main` through the existing release procedure; release metadata records both upstream revisions and the native fork commit/tree.

An upstream update is its own reviewed change. Do not mix a broad upstream rebase into an unrelated feature PR.

## Bounded native bot trial (#80)

The owner explicitly approved public bot-versus-bot rating games, retained in
public histories, and a bounded ramp to ten concurrent games. The added
`app/NoSweatStudy.scala` service uses native construction, BOT moves, completion
and Glicko persistence. The small Game Env reservation exception requires two
enabled BOT users and an explicit deployment/run scope; non-study games retain
the normal admission contract. Study and human pool admissions share the
existing serial queue, capacity and busy-seat checks. Friend invitations, round
rules, clocks, rating mathematics and anti-abuse checks are unchanged.

The study flag defaults off; native deadlines, heartbeat failure handling and
the one-shot server supervisor bound execution. Qualification uses a disposable
database, whereas the authorized run updates existing public perfs without
reset/import. Rebase verification must exercise both BOT seats, native rating
writes after FinishGame, disabled/public/qualification scope checks, and normal
human-pool admission while the flag is on. See [methodology](native-bot-trial.md).

## Explicit one-time external rating anchor (#103, draft)

The owner requested a draft operational correction for existing bots, including
Bullet/Classical reference priors. This is isolated in `deploy/calibration/` and
[its runbook](bot-rating-adjustment.md); no native patch paths or Glicko formula
change is introduced. Preserve native perfs, histories, uncertainty/provisional
rules and all subsequent native rating updates. The fixed-cohort migration is
manual, audited and guarded by a maintenance window, exact snapshot/plan, backup,
compare-and-set recovery and normal native cache/index rebuild. It never runs as
part of app startup or deployment, and draft authorization does not apply it.

## Continuous strength study (#137)

The owner authorized 250 total identities and a dated, bounded3000-game experiment
on October31. Keep the original44 file and perfs unchanged; the namespaced adapter
loads an additive configuration file and the native public roster is generated
from that same concatenation. The only new native control is a study-plan entry
and explicit absolute admission/deadline bounds in NoSweatStudy; normal play,
matchmaking selection, rules, clocks, perfs and native Glicko/provisional semantics
remain upstream. All model fitting/evaluation is separate Python research tooling
and cannot write ratings. Rebase verification checks exact roster agreement,
blocked held-out admission before prediction freeze, original-policy hashes,
native3000th/3001st admission boundaries, deadline/heartbeat cleanup and existing
human admission. See strength-experiment.md and the exact-path register.

The owner's later timing amendment (#147) permits a conditional validation-only
continuation after normal predecessor cleanup. Its namespaced study profile and
deadline branch retain the same native run records and aggregate admission cap;
no upstream rating, round or matching behavior changes. Rebase verification must
also reject failed/incomplete predecessors, changed frozen evidence and admission
3,001 across segments. See [the dated amendment](strength-validation-continuation.md).

Issue #163 separately authorizes an overnight establishment follow-up for the
same250 bots and earned perfs. Its new namespaced profile only adds fixed
13:30–21:30UTC scope/deadline guards and a3,000-new-admission/22-game plan; old
profiles remain unchanged. Native provisional flags determine establishment;
the external scheduler prioritizes unsettled bot/speed pairs without writing
ratings. Rebase verification covers exact new public/private run IDs, fixed
cutoffs, admission3000/3001 and unchanged native Glicko/shared human capacity.
See [the bounded follow-up](overnight-rating-establishment.md).

## Shared Engine Analysis settings and bounded opening text (#150/#151/#168)

The namespaced shared UI dialog and preference extension expose the approved
one/two-Maia toggle, per-channel arrow colors and existing Mobile Maia
Fast/Balanced/Thorough modes. Native analysis settings retain a small link to it;
puzzle review labels reuse the game-analysis rating grid. No server settings,
rules, review/classification math or account preferences are replaced. Native
Stockfish advanced controls remain native. Colors are validated before SVG and
presentation changes do not invalidate inference. Rebase checks must cover both
analysis and puzzle call sites, old saved preferences, two-column single-engine
probabilities and review assistance gates.

The prior desktop sidebar display override let a long WikiBooks article grow a
shared CSS grid row and push Import/Export below the viewport. Restore a bounded
board-height flex sidebar with native article scrolling. Retain the same content,
opening toggle and bottom-tab selection. Verify long in-book/out-of-book layouts
and narrower native breakpoints. See [presentation details](analysis-presentation.md).

Issue #173 adds a small Engine Analysis action to the existing authenticated
account menu, handled by its existing native account UI module. The owner subsequently corrected this presentation in #180: the menu now opens
a normal page through the existing authenticated preferences route, reusing the
native AccountPage layout and controls. Board gear dialogs remain available;
shared browser-local bindings preserve the same preferences without account writes. Both Maia conditioning inputs now always match
the selected channel rating, following Mobile Maia exactly. Legacy mismatched
preferences are normalized, and actual inference-call regressions cover both
analysis and puzzle channels.


## Assigned bot catalog initialization (#172)

The owner-approved10,000-identity catalog adds configuration-backed policy
references and a narrow initialization helper. New catalog accounts alone receive
RD100/zero-game assigned ratings; existing native Glicko formulas, RD110
provisional threshold, earned perfs and all human accounts remain unchanged.
Explicit six-speed seeds retain measured/inferred provenance. Whole-roster
identity validation, fresh-account marker checks and one-time default-only
public-name aliases prevent collisions or reseeding. Native zero-game display
uses its existing latest/Perf contract. Profiles add one Research-seeded basis
row. Rebase tests cover explicit priors, truthfulnb0, native nonprovisional
status, collision refusal, legacy fallback and display-only aliases. The shared
presence/index/±200 matching and normal2-game cap stay unchanged. See
[catalog methodology and reproducible manifest](catalog-roster.md).
## Human-game Maia conditioning (#176)

The bounded NoSweatService admission hook forwards the human's already-loaded
native matching-speed rating to the private adapter; no extra rating lookup or
rating formula is introduced. The adapter clamps and freezes the opponent input
under a separate version. Bot profiles describe the actual rule instead of two
fixed inputs. Native game creation, matching, clocks, ratings, completion, old
frozen games and study policies remain unchanged. Rebase checks must verify the
perf key/default at admission, authenticated freeze forwarding, input bounds,
versioned compatibility and unchanged self/history/sampling/timing controls.


Security maintenance #279 also aligns existing jsoup/Guava/Jakarta Mail dependencies and the native browser/build graph while retaining upstream pins. See [the maintained version inventory](security-inventory.json) and [advisory review instructions](security-maintenance.md). Update this inventory and verify staged/runtime versions whenever changing private runtimes or security overrides.
