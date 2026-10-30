# Staying aligned with Lichess

Owner decision, October 30, 2026: Mute Chess is a maintained adaptation of Lichess, not an independently maintained replacement for its server. Keep upstream behavior wherever our defined product differences do not require a change. This rule applies to every feature and fix, including bot infrastructure.

## Supported differences

- Maia analysis and the approved Mobile Maia / En Croissant analysis additions.
- Multiple stacked premoves around native move handling.
- Managed Maia opponents in quick pairing; native direct friend invitations remain supported.
- A focused feature surface: no Watch/Learn navigation or opening explorer, standard chess only, and the previously approved Puzzles, Community, Tools and profile functions. Hidden upstream implementation can remain; do not delete large native subsystems merely to hide a feature.
- Mute Chess branding, with clear upstream credits and licenses.
- Nostr login, public names and the approved account/security integration.

Other explicitly requested adapters, such as Lightning patronage and fixed bot personalities, are documented departures too. Their approval is not permission to redesign unrelated native behavior. New differences need a concrete product reason and a documented maintenance cost.

Native chess rules, legal destinations, clocks, game completion, Glicko calculations and provisional criteria, anti-abuse checks, analysis-tree ownership, direct invitations and normal account/preferences behavior remain upstream responsibilities. Prefer native controls, events and services over new implementations. Do not weaken those contracts to simplify an experiment. The bot rating/capacity run in #73 is still planning-only.

## Maintained departure register

[`upstream-departures.json`](../deploy/lila/upstream-departures.json) records the exact Lila and lila-ws revisions, every file in our native patches, each area's rationale and its verification. This is an inventory of the existing footprint, not proof that every hunk is already the smallest possible change.

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

The register uses complete source paths within the [native patch](../deploy/lila/patches/lila-nostr-maia.patch). The separate lila-ws patch only makes its listener bind address configurable for the loopback gateway deployment; it does not change chess or messaging semantics. [Bot methodology](bot-population.md) documents assignment, timing and calibration limits.

## Updating upstream

1. Record old/new upstream commits and review release notes and intervening changes for affected areas. Update the register, build instructions and CI pins together.
2. Apply our patches to a clean checkout of the new revisions. Resolve each conflict against its documented reason, adopt new native equivalents, and remove obsolete hunks and register entries. Do not restore an old fork implementation over a native fix without explaining why.
3. Reconstruct and compare the complete patch, retain license/source provenance, and run native formatting/compilation plus affected native UI, adapter and integration checks. Exercise login, pairing, clocks, results/ratings, premoves, analysis, profiles and reconnect behavior as relevant.
4. Review in GitHub, merge to the one permanent `main` branch, then build and deploy that exact verified revision with the existing backup and live-game protections. Record both upstream revisions and the native patch hash in the release metadata.

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
