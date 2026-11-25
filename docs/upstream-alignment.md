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
- Owner-hosted native Arenas with managed Maia filler seats, as implemented in #313/#320 and described in [the Arena guide](arenas.md). Issue #324 restores native discovery and spotlight presentation around the approved-host event filter.
- Mute Chess branding, with clear upstream credits and licenses.
- **US English for the English UI**, including inherited catalog text, help,
  titles and accessibility labels. Existing locale IDs, translation keys and
  protocol/storage identifiers remain intact; see the [English policy](us-english-ui.md).
- Nostr login, public names and the approved account/security integration.

Other explicitly requested adapters, such as Lightning patronage and fixed bot personalities, are documented departures too. Their approval is not permission to redesign unrelated native behavior. New differences need a concrete product reason and a documented maintenance cost.

Native chess rules, legal destinations, clocks, game completion, Glicko calculations and provisional criteria, anti-abuse checks, analysis-tree ownership, direct invitations and normal account/preferences behavior remain upstream responsibilities. Prefer native controls, events and services over new implementations. Do not weaken those contracts to simplify an experiment. The completed bot rating/capacity run in #73 is historical evidence, not authorization to start more games.

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
initial fork-based conflict inventory for #365. Those conflicts are now resolved;
see the [integration report](upstream-integration-2026-11-23.md) for the resolved integration and its dated validation evidence.

1. Record old/new upstream commits and review intervening changes. Fast-forward the fork's untouched `master` mirror, then **merge** the selected upstream commit into native `main` through a reviewed PR. Never rebase or force-push native history. The owner selected a two-week cadence after the first upstream merge (#365).
2. Resolve conflicts against each departure's documented reason, adopt native equivalents, and remove obsolete hooks. Record the reason when declining an upstream change. Keep new behavior in namespaced files and edits to upstream files small; avoid reformatting or whole-file rewrites. Urgent security backports use `git cherry-pick -x` so their provenance is retained.
   For registered `derivedCopies`, compare their `derivedFrom` source at the new upstream base, port applicable changes, and update `upstreamBlob` in the same PR; the departure check rejects an unreviewed upstream blob change.
3. Run the fork's `mute.yml` native checks and affected integration checks. Exercise login, pairing, clocks, results/ratings, premoves, analysis, profiles and reconnect behavior as relevant. Preserve licenses and exact source provenance.
4. Open the companion PR here to update `native-pin.json` and update the register/build documentation for an upstream-base change. Pass this repository's checks before merging. Build and deploy verified Mute `main` through the existing release procedure; release metadata records both upstream revisions and the native fork commit/tree.

An upstream update is its own reviewed change. Do not mix a broad upstream merge into an unrelated feature PR.

The native fork's existing `mute.yml` publishes a read-only upstream drift
summary on Mondays at 09:17 Asia/Tokyo and on PR/push/manual runs (#365).
It records the fork, upstream and merge-base commits, unique conflicted paths,
modified upstream file/line counts and added Mute files separately. Scheduled
runs omit the full UI/Scala jobs; normal PR/push/manual checks remain. History
or Git errors fail the report instead of claiming zero conflicts. Reports live
in the GitHub Actions run summary; no branch is merged or pushed automatically.

## Integration references

Current behavior is documented in the [site manual](site-manual.md),
[bot catalog](catalog-roster.md), [bot policies](bot-population.md),
[analysis guide](analysis-presentation.md) and [Arena guide](arenas.md).
The exact-path departure register retains the reasons and upstream review
obligations for native hooks and derived copies. Historical trials, migrations
and issue-specific hooks are in the [integration record](records/upstream-integration-history.md);
they do not authorize new jobs or rating writes.

<details>
<summary>Historical section links</summary>

<a id="bounded-native-bot-trial-80"></a>
- [Bounded native bot trial (#80)](records/upstream-integration-history.md#bounded-native-bot-trial-80)

<a id="applied-one-time-external-rating-anchor-103"></a>
- [Applied one-time external rating anchor (#103)](records/upstream-integration-history.md#applied-one-time-external-rating-anchor-103)

<a id="continuous-strength-study-137"></a>
- [Continuous strength study (#137)](records/upstream-integration-history.md#continuous-strength-study-137)

<a id="shared-engine-analysis-settings-and-bounded-opening-text-150151168"></a>
- [Shared Engine Analysis settings and bounded opening text (#150/#151/#168)](records/upstream-integration-history.md#shared-engine-analysis-settings-and-bounded-opening-text-150151168)

<a id="assigned-bot-catalog-initialization-172"></a>
- [Assigned bot catalog initialization (#172)](records/upstream-integration-history.md#assigned-bot-catalog-initialization-172)

<a id="human-game-maia-conditioning-176"></a>
- [Human-game Maia conditioning (#176)](records/upstream-integration-history.md#human-game-maia-conditioning-176)

</details>

<details>
<summary>Preserved earlier section URLs</summary>

<a id="explicit-one-time-external-rating-anchor-103-draft"></a>
- [Explicit one-time external rating anchor (#103, draft)](https://github.com/Dash1971/mute-chess/blob/699d101af78934ed29f9beba5794191c7d2504e9/docs/upstream-alignment.md#explicit-one-time-external-rating-anchor-103-draft)

</details>
