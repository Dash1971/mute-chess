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

## Minimum starting time

New games require at least **one minute of initial time per side**, regardless
of increment. `1+0` and `1+5` remain available; `0+5`, `¼+0`, `½+5` and `¾+0` do
not. This applies to custom Maia games, human friend challenges, rematches and
new Arenas, with the shared native insertion check covering direct requests too.
A native Arena berserk action can still reduce a clock after the game starts.

Custom setup sliders, presets and accessible time dropdowns exclude sub-minute
choices. Old saved or URL-forced choices normalize to one minute while keeping
the increment. Maia requests, friend creation/acceptance (including old pending
invitations), and Arena forms/preparation reject unsupported clocks with a native
translated validation message in all ten supported locales.

Existing games can finish and historical UltraBullet ratings, statistics and
replays remain stored. Old short Arenas cannot be prepared for new play. The
policy is scoped to Mute's focused mode; the upstream time controls retain their
native choices outside that flag.

Legacy setup links normalize their forced time constraint as well as the visible
clock, so Play stays enabled after a sub-minute value becomes one minute. Other
forced options remain enforced, and the caller's options object is not mutated.
Native rematches of old short games are rejected before new-game side effects;
stale offer state is cleared and both owners receive the existing translated
minimum-clock message through the native rematch reload path. The browser clears
its loading/offer indicators, and ordinary rematch payloads are unchanged.

Arena berserk reduces a player's available time but retains the original game
clock configuration. A berserked `1+0` game therefore still uses the **Bullet**
rating, never UltraBullet. Native clock/speed/performance-key tests cover this.
