# Weekly community Arenas — draft implementation

**Status:** draft implementation for [#311](https://github.com/Dash1971/mute-chess/issues/311).
The implementation is on draft PR #313 and is not merged or deployed. It does
not start a live event or change the live bot pool. It supersedes the one-human-per-Arena idea in
[#84](https://github.com/Dash1971/mute-chess/issues/84).

## Event setup

| Setting | Initial choice |
| --- | --- |
| Host | Owner-authorized human account; creation is not open to everyone |
| Format | Native Lichess Arena, standard chess, normal initial position |
| Duration | 120 minutes |
| Clock | 15+10 Rapid by default; editable per event through native controls |
| Entry | Signed-in human accounts, including new Nostr accounts; spectators can browse |
| Human limit | None imposed by the ten-participant bot target |
| Bot roster | At most ten existing managed bots, selected using event-speed ratings of 1200–1700 |
| Bot timing | Human timing enabled, including low-clock protection |
| Scoring and standings | Native mixed human/BOT standings and scoring |
| Recurrence | Host creates each weekly event manually; no new recurring scheduler |

Use the existing native tournament page, shareable URL, join/pause/rejoin,
standings, chat controls, spectator boards and account identity. Tournament
creation, editing and cancellation remain owner-authorized; ordinary human entry
uses native authentication, blocking, playban and tournament eligibility checks.
Do not impose an established-rating requirement that excludes new visitors by
default. Preserve other native abuse checks.

The initial bot band refers to **saved playing ratings**, not Maia model input.
Select a spread within 1200–1700, centered around 1500, once when preparing the
event. Freeze those identities for its duration. Earned ratings may move outside
the band during play; do not replace bots mid-event or reset their ratings.
If ten eligible bots cannot be reserved, show the shortage to the host rather
than creating accounts, changing ratings or silently widening the band.

## Participation rule

Let H be the number of active humans in this Arena:

`targetBots = max(0, 10 - H)`

| Active humans | Target bots available for pairing |
| ---: | ---: |
| 0 | 10 |
| 1 | 9 |
| 3 | 7 |
| 9 | 1 |
| 10 | 0 |
| 15 | 0; all fifteen humans can participate |

Count a human who is playing an unfinished Arena game or joined and available
in the native Arena waiting pool. Count each account once, not each browser tab.
Registration for a future event and spectating alone do not count. An explicit
pause/withdrawal removes an idle human from H immediately. A playing human still
counts even if disconnected or withdrawn until that game ends.

For idle humans who disappear without withdrawing, retain their place for a
short reconnect allowance before replacing them with a bot. The initial
value is **60 seconds**, using native lobby presence/waiting signals. This is an
Arena participation allowance, not a change to native in-game disconnect claims
or clocks. Rejoining restores participation without resetting points.

Reconcile eligibility before the next pairing batch, not just on a slow display
refresh. Humans are always admitted; the ten-participant target limits filler
bots, not human registrations or human-versus-human games.

## Withdrawing and returning bots

Use native tournament standing order, including its tie-breaking, rather than
model Elo or account rating. Use fixed roster order to break ties before any
standing exists.

- When H increases, withdraw the lowest-standing bots from future pairings first.
- Let every game already started finish normally. Withdrawal must not resign,
  abort, flag, delete or reassign its result.
- A bot finishing a game after withdrawal remains unavailable for new pairings.
- When H decreases, return the highest-standing withdrawn bots first, preserving
  their points, streak state and native tournament identity.
- Do not admit replacements for a retiring bot merely because it was withdrawn:
  include its unfinished game when checking occupied seats and engine capacity.
- Never seat one bot in two games, another event or ordinary quick pairing at the
  same time. Reserve the whole event roster until the event's bot games drain.

Ten is a **steady-state participation target**. Human arrivals can temporarily
put the number of playing/available participants above ten while withdrawn bots
finish games. At 15+10 this transition can take a substantial time; do not promise
instant replacement or interrupt a human's game to enforce the target.

Bots remain visibly labeled BOT and can lead or win. Do not rewrite standings
or remove their earned points when they withdraw. A separate human-winner award
or leaderboard would be a later product decision, not an implicit scoring change.

## Background activity and event lifecycle

1. **Create:** save a native future Arena and its owner, settings and roster plan.
   Creating an invitation days ahead must not pause background games for days.
2. **Prepare:** the host explicitly prepares the event. Suppress new ordinary
   background bot-versus-bot admissions and allow existing games to drain; reserve
   the selected roster once it is free. Show readiness before the host starts the
   event or its scheduled countdown reaches zero. Do not globally pause game
   admission: human quick pairing, friend games and Arena games remain usable.
3. **Run:** native Arena start and countdown control play. Bots fill the active
   participant target, including when no humans are present. Keep their managed
   waiting presence alive between games and respect native pairing rules.
4. **Finish or cancel:** stop bot re-entry and new event pairings using native
   tournament lifecycle behavior. Continue serving every existing bot game.
5. **Restore:** release roster reservations after their games finish, then remove
   only this event's background suppression. Respect any independent maintenance
   pause; never unpause the whole site as a side effect.

Initially support one prepared/running/draining managed Arena at a time. Store
its event association and reservations durably so restart recovery can reconcile
native games and tournament state without admitting duplicate seats or leaving
background play suppressed indefinitely. Preserve the existing worker failure
handling; no new fabricated outcomes or tournament-score writes.

With 15+10, games can last more than forty minutes and a two-hour event may have
only a few games per player. Keep Lichess's deadline rule: standings freeze at
zero, unfinished games continue but do not count toward the Arena. The invitation
and native help should make that behavior clear; do not silently extend scoring.

## Native integration boundaries

The implementation adds scoped integration rather than just exposing the tournament route:

- The public gateway currently treats tournaments as unsupported. Permit only the
  native Arena browsing, creation/editing, join/pause, standings/player, chat and
  socket paths needed for this feature. Retain method checks, CSRF, host gating
  and private-path denial; do not open all tournament APIs or other event formats.
- Native `Tournament` forms and controllers provide the host flow. Keep clocks
  configurable, default to 15+10/120 minutes, and enforce standard chess and the
  owner authorization on the server as well as the form. Do not enable Swiss,
  team battles, variants, prizes or arbitrary bot access as incidental additions.
- Native `TournamentApi`, waiting users and player records own joining, pausing,
  rejoining, pairing eligibility, score retention and the end-of-event rule.
  Reconcile the managed roster within the existing per-tournament sequencing.
- Reserve bot seats and validate shared capacity **before committing a native
  pairing batch**. A rejected reservation must not leave an announced pairing
  with no game. Keep native Arena pairing, not the quick-pool ±200 restriction.
- Our game insertion guard currently requires pool/friend/study authorization.
  Add a narrow Arena authorization for the prepared owner event and its exact
  native pairing/seats. Do not accept arbitrary `Source.Arena` games.
- The managed adapter currently polls its admitted `nosweat_game` records, not all
  tournament games. Register Arena bot turns with immutable frozen policies,
  native clocks and the existing worker. Human-versus-human games need no Maia
  record; one- and two-bot games must both work. For a human opponent, reuse the
  playing policy's opponent-rating conditioning and enable human timing.
- Count every Arena game containing Maia toward the existing shared twenty-game
  Maia cap. Human-versus-human games do not consume inference slots. Do not change
  worker count, infrastructure limits or native human game admission here.
- Native game completion remains responsible for chess rules, clock expiry,
  disconnects, rating/history writes and tournament results. Feed completion back
  into managed reservations and waiting eligibility without a second scoring
  system. Include live Arena games in the existing games/spectator views.

Document exact native departures when implementing these hooks. Use existing
translation catalogs for any added help, readiness, status, error or accessibility
text in all ten supported locales. Reuse native translated Arena UI wherever
possible. No deployment, backup, monitoring or scheduling framework is part of
this feature.

## Browser/event coverage requirements

Execution results for these checks are recorded on draft PR #313. This list
defines coverage; it is not a claim that the feature is live.

- Owner creates an event with 15+10 and 120-minute defaults, can choose a
  different supported clock next week, and obtains a shareable native URL.
- Non-owner creation/edit/cancel and forged event/pairing/bot reservations fail.
- Only existing eligible 1200–1700 bots enter the fixed roster; their saved
  ratings, identities and ordinary timing preferences are not overwritten.
- H = 0, 1, 3, 9, 10 and 15 produce the specified target; late registration,
  spectators, duplicate tabs, explicit pause and reconnect are handled correctly.
- A human arrival blocks a retiring bot's next pairing without ending its
  existing game. A rapid leave/rejoin cannot create duplicate seats.
- Returning bots follow native standing order and retain points and history.
- Human/human, human/bot and bot/bot pairings finish through native results;
  bot turns use the configured worker, human timing and normal clock protection.
- Capacity contention cannot publish a pairing that has no playable game or
  starve human-versus-human Arena pairings.
- Preparing the Arena suppresses background admissions without closing human
  play. End, cancellation and restart recovery restore only event-owned state.
- The deadline stops further scoring/pairing while existing games finish;
  only then are occupied bots released and background activity restored.
- Native Arena assets, sockets, public names/BOT labels and required routes
  work in the actual browser; new UI text passes ten-locale parity/render checks.

## Draft validation

The isolated native build passed application compilation and Scala formatting.
The six participation/reconnect tests, five native pairing-admission tests, two
saved-rating roster tests, and one native translation-render test passed. The
last test renders all six added strings in all ten supported locales. The Arena
UI build passed TypeScript checking, bundling, styles and translation generation.
All 120 existing/new adapter regressions passed, including Arena frozen policy,
human timing, gateway methods/sockets and denial of the affected tournament API
exports. Native patch reconstruction and the departure-register checks passed.

Browser testing uses a fresh private database and the existing native app,
WebSocket service and real 79M worker. It has exercised the host form defaults
and configurable clock/duration, ten saved-rating bot seats, non-owner refusals,
the 0/1/3/9/10/15-human participation matrix, duplicate tabs, spectators, explicit
pause/rejoin and idle reconnect expiry. Real bot/bot and human/bot games progressed,
a human moved on the browser board, and twenty simultaneous Maia games refused
the next admission.

This caught a configuration-loader bug at the actual native game-insertion
boundary: the host setting was interpreted as a list of objects. Admission now
uses the native string-sequence loader, with an executable regression for the
documented canonical-ID string list and the absent-setting default. The corrected
application was rebuilt and the private game tests resumed on that source.

The PR's validation record contains the detailed lifecycle/scoring outcomes and
screenshots. Private test games and identities never enter the public database.
No live configuration or service state is changed, and these checks authorize
neither merging nor deploying the draft.

## References

- [Native Arena rules](https://lichess.org/tournament/help).
- [Pinned tournament implementation](https://github.com/lichess-org/lila/tree/b551752d2a0e7a63459d9812825d95a633a98737/modules/tournament/src/main).
- [Existing background activity and shared capacity](public-bot-activity.md).
- [Feature and site behavior manual](site-manual.md).
- [Upstream alignment and departure policy](upstream-alignment.md).

## Host configuration and use

The feature is gated by the native `nosweat.arena.hosts` configuration list, which
defaults to empty. An operator must explicitly list the owner’s **canonical
account ID**, not the editable display name. This PR does not change live config
or grant any moderator/OAuth permissions.

After a reviewed release, open **Community → Arena tournaments**. Authorized
hosts can create an event with the native form, change its clock or start date,
and share the resulting URL. Open the event and choose **Prepare Arena bots**
before its start time. Preparation reserves ten existing eligible identities and
suppresses background admissions; it does not globally pause games. Refresh the
event to check whether background games have finished draining. Only one event
can hold that preparation reservation at a time.

The new `NoSweatArena` helper manages the filler seats and the singleton
`nosweat_arena` preparation record. `NoSweatService` retains the existing shared
admission queue and immutable bot-policy records. Native Arena insertion checks
the authorized event, native pairing and exact reserved bot seats. The adapter’s
versioned Arena timing wrapper preserves each bot’s configured policy and enables
human timing without overwriting it. The source register records the exact
patched paths.

Validation results and remaining browser acceptance checks are recorded in the
draft PR. No merge, deployment or live event is authorized by this implementation.
