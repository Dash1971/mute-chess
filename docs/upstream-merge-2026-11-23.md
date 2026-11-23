# Upstream merge trial — 23 November 2026

**Historical trial:** conflicts have since been resolved in the
[separate integration report](upstream-integration-2026-11-23.md). The measurements
and unresolved-state statements below describe the original trial.

This is the first, report-only stage of [#365](https://github.com/Dash1971/mute-chess/issues/365).
The isolated trial reproduced **48 conflicted files and 69 text-conflict hunks**.
No conflicts have been resolved and the merged application has not been compiled,
run or deployed. The native and Mute PRs remain drafts; deployed pins, inventories,
services, admission settings and scheduled jobs are unchanged.

Codex assisted the source analysis and report. The checks below are automated;
no human gameplay testing or upstream contribution is claimed.

## Pinned inputs and measurements

Collected on 23 November 2026 at 11:39 JST (02:39 UTC), with Git 2.53.0.
The checked upstream tip was still the same tip used in #362's earlier trial,
so the unchanged conflict count is expected, rather than evidence of new drift.
This time the trial used the real fork history, with no reconstructed patch.

| Input | Commit |
| --- | --- |
| Mute repository baseline | `69839d81e228f9de96a64fc8646ca1e3901d3f81` |
| Native fork `main` | [`335cc0ac04d3c7e5ad8a527c84c3551b206620a9`](https://github.com/Dash1971/lila/commit/335cc0ac04d3c7e5ad8a527c84c3551b206620a9) |
| Chosen upstream | [`b071608bc4ce71b31cda36ffa493100e3dc3580f`](https://github.com/lichess-org/lila/commit/b071608bc4ce71b31cda36ffa493100e3dc3580f) |
| Verified merge base / deployed upstream base | `b551752d2a0e7a63459d9812825d95a633a98737` |

| Measurement | Result |
| --- | ---: |
| Upstream commits since the base | 686 |
| Files changed upstream | 1,868 |
| Mute application departure files | 474 |
| Fork changes including its approved workflow | 475 |
| Application paths changed on both sides | 137 |
| Overlapping paths merged automatically | 89 |
| Conflicted paths | 48 |
| Text-conflicted paths | 45 |
| Upstream-delete/Mute-modify paths | 3 |
| Text-conflict hunks | 69 |

The 69 hunks count actual `<<<<<<< HEAD` markers in the 45 content-conflicted
working files. The three structural conflicts have no text markers and are
counted separately. Every conflicted path maps to the existing exact-path
[departure register](../deploy/lila/upstream-departures.json).

The [machine-readable evidence](data/upstream-merge-2026-11-23.json) contains all
48 paths, their index-stage blob IDs/modes, marker line numbers, departure areas,
137 overlapping paths, 89 automatically merged paths and security ancestry checks.
An independent `git merge-tree --write-tree --name-only --no-messages` run
returned the same 48 conflicted paths as the real trial index. Automatic textual
merging is not compilation or behavior validation.

## Relocated code: port the Mute hooks

Git reports these as deletions/modifications, not detected renames. The target
locations below were established by inspecting upstream definitions and callers.

| Deleted path | Upstream destination | Mute behavior to retain |
| --- | --- | --- |
| `app/views/lobby/home.scala` | `app/views/home.scala` (`views.home`) | Focused quick-pair page, branded graph/title/social image, Maia admission data, approved Arena spotlight and hidden upstream panels. |
| `app/views/insight.scala` | `modules/insight/src/main/InsightUi.scala` | Basic non-engine Insights, public display names, translated client labels, own-account controls and native privacy. Check controller and JS call sites together. |
| `modules/web/src/main/ui/openGraph.scala` | `modules/web/src/main/ui/OpenGraph.scala`; graph model in `modules/ui/src/main/Page.scala` | Port the focused `muteChessOpenGraph` transformation and its layout call site. The upstream model still defaults `siteName` to `lichess.org`; a case-only file change alone would lose Mute previews. |

## Security and dependency review before resolution

All five backports recorded in the current inventory are ancestors of the chosen
upstream commit. Four conflict textually; `SecurityApi.scala` does not. These
ancestry results identify source provenance only. They do not justify clearing
advisories or changing the deployed inventory before the integrated code is tested.

| File | Recorded upstream fix | In upstream ancestry | Trial result |
| --- | --- | --- | --- |
| `modules/markdown/src/main/MarkdownRender.scala` | [34830b8316fe](https://github.com/lichess-org/lila/commit/34830b8316fea29a93c6b797236f79203ad021e8) | Yes | Conflict |
| `app/controllers/Study.scala` | [e71a2964ec3b](https://github.com/lichess-org/lila/commit/e71a2964ec3b3c6da7fa7c4ec6b53de53bba4326) | Yes | Conflict |
| `app/controllers/Tournament.scala` | [8f583aaf9db9](https://github.com/lichess-org/lila/commit/8f583aaf9db9fe32aebdbe460a789dd5630f17f6) | Yes | Conflict |
| `modules/relay/src/main/RelayRoundForm.scala` | [3cf8d5c524eb](https://github.com/lichess-org/lila/commit/3cf8d5c524ebac6eb71d392bf45f4113128b8bdb) | Yes | Conflict |
| `modules/security/src/main/SecurityApi.scala` | [e6f4cf2f451e](https://github.com/lichess-org/lila/commit/e6f4cf2f451e8c83dfeba207173b64dfd34c469b) | Yes | No text conflict |

Specific resolution notes:

- **Study:** upstream `CanView` now wraps `CanViewOr` and supplies the private
  unauthorized/forbidden continuations itself. Adapt the old call to that API;
  retain authentication and both normal/private `divisionOnly` response checks.
- **Markdown:** the conflict is in the diagnostic logging line. Upstream already
  calls `scalalib.StringUtils.escapeHtmlRaw` on the fallback. Preserve that actual
  escaping behavior and run the existing regression.
- **Tournament/API:** use the upstream export implementation behind the required
  visibility gate; keep Mute's approved Arena-host restriction and native team
  membership behavior. Preserve the configurable Maia Arena edit form. Taking
  the whole upstream controller would discard Mute guards/settings.
- **Relay:** upstream contains resolved-IP validation. Retain rejection of private,
  loopback and blocked addresses, the existing Mute error/privacy decisions and
  regression access where needed; do not equate an error-message conflict with
  an absent fix.
- **Moderator OAuth:** `SecurityApi.scala` merged without a conflict. Still run
  the production TOTP/role-filter regression; an automatic merge is not proof.
- **Dependencies:** upstream explicitly selects Netty native transport
  `4.2.21.Final` in `project/Dependencies.scala`; Mute's automatically retained
  `security-dependencies.sbt` forces Netty `4.2.19.Final`. Review the complete
  resolved Netty/Jackson families and other security targets before retaining,
  updating or removing overrides. No dependency resolution/build ran in this trial.
- **Lock:** reconcile manifest intent first, including the pinned translation
  parser, then regenerate `pnpm-lock.yaml` with the supported pnpm version.
  Do not choose one lockfile side or hand-merge its nine conflict hunks.

## Conflict inventory by departure area

These areas retain their existing register rationales and verification entries;
this report changes none of them.

| Departure area | Files | Text hunks |
| --- | ---: | ---: |
| `application-wiring` | 1 | 1 |
| `basic-insights-and-unsupported-navigation` | 5 | 9 |
| `branding-and-layout` | 4 | 5 |
| `focused-feature-surface` | 2 | 4 |
| `focused-native-features` | 9 | 8 |
| `maia-analysis-and-review` | 8 | 11 |
| `maia-bot-pool` | 1 | 1 |
| `markdown-parser-error-escaping` | 1 | 1 |
| `nostr-and-public-profiles` | 2 | 2 |
| `owner-hosted-arena` | 9 | 11 |
| `security-dependency-alignment` | 2 | 10 |
| `study-private-chapter-config` | 1 | 1 |
| `supported-localization` | 1 | 1 |
| `tournament-export-and-relay-security` | 2 | 4 |

## All 48 conflicted paths

| Path | Text hunks | Kind | Departure area |
| --- | ---: | --- | --- |
| `app/controllers/Account.scala` | 1 | Content | `nostr-and-public-profiles` |
| `app/controllers/Api.scala` | 1 | Content | `tournament-export-and-relay-security` |
| `app/controllers/Challenge.scala` | 1 | Content | `focused-feature-surface` |
| `app/controllers/Importer.scala` | 1 | Content | `focused-native-features` |
| `app/controllers/Insight.scala` | 3 | Content | `basic-insights-and-unsupported-navigation` |
| `app/controllers/Study.scala` | 1 | Content | `study-private-chapter-config` |
| `app/controllers/Tournament.scala` | 3 | Content | `owner-hosted-arena` |
| `app/http/ErrorHandler.scala` | 1 | Content | `maia-bot-pool` |
| `app/http/HttpRequestHandler.scala` | 1 | Content | `application-wiring` |
| `app/http/RequestContext.scala` | 1 | Content | `supported-localization` |
| `app/views/base/page.scala` | 1 | Content | `branding-and-layout` |
| `app/views/insight.scala` | 0 | Upstream deleted; Mute modified | `basic-insights-and-unsupported-navigation` |
| `app/views/lobby/home.scala` | 0 | Upstream deleted; Mute modified | `focused-native-features` |
| `app/views/study.scala` | 2 | Content | `branding-and-layout` |
| `bin/package.json` | 1 | Content | `security-dependency-alignment` |
| `modules/analyse/src/main/ui/AnalyseUi.scala` | 2 | Content | `maia-analysis-and-review` |
| `modules/markdown/src/main/MarkdownRender.scala` | 1 | Content | `markdown-parser-error-escaping` |
| `modules/relay/src/main/RelayRoundForm.scala` | 3 | Content | `tournament-export-and-relay-security` |
| `modules/tournament/src/main/TournamentApi.scala` | 1 | Content | `owner-hosted-arena` |
| `modules/tv/src/main/TvUi.scala` | 1 | Content | `focused-native-features` |
| `modules/ublog/src/main/ui/UblogPostUi.scala` | 1 | Content | `focused-native-features` |
| `modules/user/src/main/UserRepo.scala` | 1 | Content | `nostr-and-public-profiles` |
| `modules/web/src/main/StaticContent.scala` | 2 | Content | `branding-and-layout` |
| `modules/web/src/main/ui/layout.scala` | 1 | Content | `focused-native-features` |
| `modules/web/src/main/ui/openGraph.scala` | 0 | Upstream deleted; Mute modified | `branding-and-layout` |
| `pnpm-lock.yaml` | 9 | Content | `security-dependency-alignment` |
| `translation/dest/arena/de-DE.xml` | 1 | Content | `owner-hosted-arena` |
| `translation/dest/arena/es-ES.xml` | 1 | Content | `owner-hosted-arena` |
| `translation/dest/arena/fr-FR.xml` | 1 | Content | `owner-hosted-arena` |
| `translation/dest/arena/ja-JP.xml` | 1 | Content | `owner-hosted-arena` |
| `translation/dest/arena/ko-KR.xml` | 1 | Content | `owner-hosted-arena` |
| `translation/dest/arena/ru-RU.xml` | 1 | Content | `owner-hosted-arena` |
| `translation/dest/arena/zh-CN.xml` | 1 | Content | `owner-hosted-arena` |
| `ui/analyse/src/ctrl.ts` | 1 | Content | `maia-analysis-and-review` |
| `ui/analyse/src/explorer/explorerCtrl.ts` | 1 | Content | `maia-analysis-and-review` |
| `ui/analyse/src/local/localAnalysisDialog.tsx` | 2 | Content | `maia-analysis-and-review` |
| `ui/analyse/src/study/chapterNewForm.ts` | 1 | Content | `maia-analysis-and-review` |
| `ui/analyse/src/view/roundTraining.ts` | 1 | Content | `maia-analysis-and-review` |
| `ui/insight/src/chart.ts` | 2 | Content | `basic-insights-and-unsupported-navigation` |
| `ui/insight/src/insight.ts` | 2 | Content | `basic-insights-and-unsupported-navigation` |
| `ui/insight/src/table.ts` | 2 | Content | `basic-insights-and-unsupported-navigation` |
| `ui/lib/src/ceval/ctrl.ts` | 2 | Content | `maia-analysis-and-review` |
| `ui/lib/src/setup/view/timeControl.ts` | 3 | Content | `focused-feature-surface` |
| `ui/lobby/src/ctrl.ts` | 1 | Content | `focused-native-features` |
| `ui/lobby/src/setupCtrl.ts` | 1 | Content | `focused-native-features` |
| `ui/lobby/src/view/setup/modal.ts` | 1 | Content | `focused-native-features` |
| `ui/lobby/src/view/table.ts` | 1 | Content | `focused-native-features` |
| `ui/puzzle/src/ctrl.ts` | 1 | Content | `maia-analysis-and-review` |

## Resolution order and remaining release gates

1. Port the three deleted view/helper hooks to their upstream locations, with
   controller/layout call sites. Preserve branding, public names and Insights.
2. Resolve authorization and Nostr integration, request/error handling, Arena
   forms/visibility and the security conflicts above against their register rationale.
3. Reconcile setup, lobby, analysis and puzzle integration. Keep standard chess,
   supported clocks, managed pairing, browser engines, premoves and Brilliant
   detection; avoid exposing upstream pages/features merely because they merge.
4. Reconcile the seven Arena locale conflicts and verify all ten supported locales.
   Finish manifests, resolve actual dependency versions and regenerate the lock.
5. Make the real native merge commit with the fork and chosen upstream as parents.
   Native CI, full builds and focused manual/private-stack checks must pass before
   any pin bump or deployment. Recheck the previously fixed repeated-build
   translation generation when building the new upstream source.
6. Capture/compare current home, game, analysis, puzzle, profile and sign-in pages.
   [Existing screenshots](screenshots/README.md) are partial, dated baselines;
   they do not cover every current page/state. Check desktop/narrow layouts,
   supported navigation/routes, friends/challenges, clocks/results/ratings,
   reconnect, Maia Lab, bot filling, Nostr sign-in and settings.
7. Only after native integration is reviewed: update the Mute pin/base/register
   and justified security inventory entries in the companion integration PR.
   A later authorized release still needs fresh runtime security verification.

`conf/routes`, build/dependency declarations and many other upstream files can
change without a conflict. Include them in the feature-exposure and API review.
This stage adds no weekly job, merge automation, shared infrastructure or new
release procedure. Cadence/drift reporting remains later #365 work.

## Reproduction

Use a disposable directory, not the build checkout or either permanent branch.
`rerere` is enabled before merging, with automatic index updates disabled.
The following are the operations used; verify the fetched refs against the full
SHAs above before proceeding if rerunning against moving branch names.

```sh
git init trial && cd trial
git config rerere.enabled true
git config rerere.autoupdate false
git config merge.conflictStyle merge
git config user.name "Mute Chess trial (Codex)"
git config user.email trial@mutechess.invalid
git remote add origin https://github.com/Dash1971/lila.git
git remote add upstream https://github.com/lichess-org/lila.git
for remote in origin upstream; do
  git config "remote.$remote.promisor" true
  git config "remote.$remote.partialclonefilter" blob:none
done
export GIT_LFS_SKIP_SMUDGE=1
git fetch --filter=blob:none --shallow-since=2026-10-26 --no-tags upstream master
git fetch --filter=blob:none --shallow-since=2026-10-26 --no-tags origin main
git merge-base origin/main upstream/master
git checkout -b codex/upstream365-trial origin/main
git merge --no-commit --no-ff upstream/master
git ls-files --unmerged
git diff --name-only --diff-filter=U
```

Expected merge base: `b551752d2a0e7a63459d9812825d95a633a98737`. The merge exits 1 because conflicts
remain; `HEAD` stays at the fork commit and `MERGE_HEAD` records the chosen
upstream. No merge commit was created. The draft upstream PR initially points
at the untouched upstream tip as a review container, not a Mute-integrated build.
A later resolved merge commit can have parents fork/upstream and advance that
branch without force-pushing, because the upstream tip is its ancestor.
