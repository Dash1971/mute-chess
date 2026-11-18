# Supported real-time surface (#267, #269–272)

Learn has exactly Chess basics (`/learn`) and Practice (`/practice`), matching the owner’s clarified Lichess reference. The original native labels are reused in every locale. Other Learn dropdown entries are absent only from the focused Mute navigation.

Correspondence and Puzzle Racer are absent from focused profile sidebars. Correspondence also leaves exposed leaderboards and rating-distribution selectors. Stored ratings, Racer scores and historical game records are retained; historical replay/statistics URLs are not rewritten or deleted. Storm, Streak and ordinary puzzles remain supported.

Custom Maia and direct-friend setup offer only real-time clocks. Old saved and URL-forced correspondence/unlimited choices reset to real-time while retaining valid minutes/increment. The public Maia endpoint rejects non-real-time modes before admission and builds only clocked games. Native friend creation and acceptance reject clockless requests, including old pending invitations. The shared focused insertion gate also rejects playable games without a real-time clock, covering rematches/bypasses without changing moves, finishes, native clock math or ratings. Existing games may finish; this change does not cancel or migrate them. Outside the focused flag, native setup/insertion behavior remains unchanged.

Public Import game navigation and its GET/POST endpoints are disabled. Its Request a computer analysis checkbox invoked the server-side Fishnet analyzer, not browser review; Mute has no Fishnet service. PGN/FEN import on the analysis board, study PGN imports, exports and existing imported-game replays remain intact. Old imported replay metadata shows a translated non-link label rather than pointing to the disabled form. The obsolete focused PGN-variant guard inside the now-disabled public importer is removed; pure import/parser services are unchanged.

Trade-off: users can no longer create a new public, saved game URL through the old importer; the analysis board and studies remain the supported import destinations. Existing correspondence/unlimited history stays readable, but new games and rematches in those modes are rejected. No accounts, ratings, scores or histories are deleted.

Validation: 13 native UI regressions cover setup normalization plus the existing real lobby/bootstrap/game-start-sound flow. Existing gateway boundary tests exercise the actual handler and deny import/Racer/correspondence routes while retaining analysis/study/learn/practice routes. Native formatting and exact patch/departure coverage are checked; new messages and reused Learn labels are verified in all ten supported catalogs. This is PR preparation only: no merge or deployment.

## Bot profile UltraBullet and 404 recovery

Focused bot profiles omit UltraBullet: Lila's native `PerfStatApi.data` rejects
UltraBullet statistics for BOT accounts, so exposing the link leads to a 404.
Seeded ratings and all game/history data remain intact. Human UltraBullet links
and non-focused upstream profile rendering are unchanged.

Focused 404 pages show a translated title and a home link, retaining native HTTP
404 status and optional diagnostic text. They omit the inherited ChessPursuit
mini-game iframe: the asset gateway serves its `index.html` as
`application/octet-stream`, causing Chrome to download the file even when the
iframe is not visible. Removing the embed avoids downloads on every focused 404
without broadening the gateway's MIME policy or weakening `nosniff`. Non-focused
upstream 404 pages and the embedded/snippet error view remain unchanged.

Reproduction: open `/@/PearlDrifter`, then UltraBullet. Before this fix Chrome
shows `/@/PearlDrifter/perf/ultraBullet` as a 404 and downloads `index.html` from
`/assets/vendor/ChessPursuit/bin-release/index.html`. After the fix the bot profile
has no UltraBullet link, and direct visits to unsupported URLs retain a plain
404 with a working home link and no mini-game request. Verify the title and link
in en-GB, de-DE, es-ES, fr-FR, hi-IN, ja-JP, ko-KR, pt-BR, ru-RU and zh-CN.

## Temporarily hidden Study entry points

Restoration is tracked in [#123](https://github.com/Dash1971/mute-chess/issues/123).
Hide creation/discovery controls with small Mute-only view guards; preserve native
Study forms, translation keys, routes and stored content so these can be restored.

| Surface | Native source | Native label / action |
| --- | --- | --- |
| Puzzle review board menu | `ui/puzzle/src/view/boardMenu.ts`, `studyButton` | `site:toStudy`; POST `/study/as` with puzzle PGN/FEN, orientation and gamebook mode |
| Analysis board and post-game menu | `ui/analyse/src/view/actionMenu.ts`, `studyButton` | `site:toStudy`; POST `/study/as` with current analysis/exported PGN |
| Board editor | `ui/editor/src/view.ts`, `studyButton` | `site:toStudy`; POST `/study/as` with FEN, orientation and variant |
| Profile Study count (when nonzero) | `app/views/user/show/header.scala`, number menu | `site:nbStudies`; native `Study.byOwnerDefault` link |

The first three guards use the existing `data-brand="mutechess"` document flag;
the profile uses `env.noSweat.enabled`. Non-Mute rendering stays native. Remove
these guards to restore the controls; no schema/data migration is required.

Already hidden in the compact Mute navigation: Learn's Study link in
`modules/web/src/main/ui/TopNav.scala` and the new-user welcome Study suggestion
in `modules/user/src/main/ui/UserShow.scala`. Current Learn navigation remains
Chess basics and Practice; #123's older Study-only menu idea is not implemented.

Retained intentionally: historical Study links in profile activity
(`modules/activity/src/main/ActivityUi.scala`) and the homepage timeline
(`modules/timeline/src/main/TimelineUi.scala`), direct `/study/...` URLs and Study
pages' own controls. Native Practice uses Study content internally and must keep
working. The disabled public Import game form also retains its native Study
privacy link in source (`modules/game/src/main/ui/GameUi.scala`); it is not an
exposed entry point. These are documented rather than deleting native services
or rewriting existing records. The larger puzzle rating chart remains a mockup.
